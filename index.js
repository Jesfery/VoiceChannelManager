/**
 * A simple discord.js bot to manage Voice Channels.
 *
 * Dynamic command handling based on https://github.com/discordjs/guide/tree/master/code_samples/command-handling/dynamic-commands
 */
const Discord = require('discord.js');
const { token } = require('./config.json');

const commandListener = require('./listeners/command.js');
const channelStateListener = require('./listeners/channelState.js');

const client = new Discord.Client();

client.once('ready', () => {
    commandListener.init(client);
    channelStateListener.init(client);
    console.log('Ready!');
});

client.login(token);