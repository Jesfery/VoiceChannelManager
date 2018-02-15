const Discord = require('discord.js');
const fs = require('fs');
const { prefix } = require('../config.json');

function canActOn(channel) {
    let perms;

    if (channel.type === 'dm') {
        return true;
    }

    if (!channel.parent) {
        return false;
    }

    perms = channel.parent.permissionsFor(channel.client.user);
    return perms.has('MANAGE_CHANNELS') && perms.has('CONNECT') && channel.type === 'text';
}

module.exports = {
    init: function(client) {

        client.commands = new Discord.Collection();
        
        const commandFiles = fs.readdirSync('./commands');
        
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            client.commands.set(command.name, command);
        }
        
        const cooldowns = new Discord.Collection();

        client.on('message', message => {
            if (!message.content.startsWith(prefix) || message.author.bot || !canActOn(message.channel)) return;
        
            const args = message.content.slice(prefix.length).split(/\s+/);
            const commandName = args.shift().toLowerCase();
        
            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
            if (!command) return;
        
            if (command.guildOnly && message.channel.type !== 'text') {
                return message.reply('I can\'t execute that command inside DMs!');
            }
        
            if (command.args && !args.length) {
                let reply = `You didn't provide any arguments, ${message.author}!`;
        
                if (command.usage) {
                    reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
                }
        
                return message.channel.send(reply);
            }
        
            if (!cooldowns.has(command.name)) {
                cooldowns.set(command.name, new Discord.Collection());
            }
        
            const now = Date.now();
            const timestamps = cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;
        
            if (!timestamps.has(message.author.id)) {
                timestamps.set(message.author.id, now);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }
            else {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
                }
        
                timestamps.set(message.author.id, now);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }
        
            try {
                command.execute(message, args).then(resp => {
                    if (typeof resp === 'string') {
                        message.channel.send(resp);
                    }
                }).catch(err => {
                    message.reply('there was an error trying to execute that command!');
                    console.log(err);    
                });
            }
            catch (error) {
                console.error(error);
                message.reply('there was an error trying to execute that command!');
            }
        });

    }
};