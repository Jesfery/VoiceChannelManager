/*jshint esversion: 6 */

// discord.js module
const Discord = require('discord.js');

// Discord Token, located in the Discord application console - https://discordapp.com/developers/applications/me/
const { token, prefix } = require('./config.json');

// Instance of Discord to control the bot
const bot = new Discord.Client();

/**
 * Utility function to get a deep property value without all the && this && that malarkey
 *
 * @param {Object} obj the object
 * @param {String} key the deep property key
 *
 * @return {Object} the deep property value
 *
 */
function get(obj, key) {
    return key.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, obj);
}

/**
 * Updates the name of a voice channel to represent the game that the majority
 *  of members in the channel are playing.
 * 
 * Only acts on channels that are prefixed with 'Voice #'
 * 
 * @param {VoiceChannel} channel the voice channel
 */
function updateChannelGame (channel) {
    var games = {},
        max = 0, gameName, channelName,
        bitrate = channel.bitrate;

    //Ensure that we only act on voice channels that are prefixed with 'Voice #'.
    // This should be tightened up at some point to perhaps work on a list or a
    // category.
    if (channel.type !== 'voice' || channel.name.indexOf('Voice #') !== 0) {
        return;
    }

    channel.members.forEach(member => {
        var name = get(member, 'presence.game.name');

        if (name && name !== '') {
            if (games[name] !== undefined) {
                games[name]++;
            } else {
                games[name] = 1;                
            }
        }

    });

    for (var n in games) {
        if (games.hasOwnProperty(n)) {
            if (games[n] > max) {
                max = games[n];
                gameName = n;
            }
        }
    }

    channelName = channel.name.split('(')[0].trim();

    if (max > 0) {
        channelName = channelName + ' (' + gameName + ')';
    }

    //Do this because discord.js has some issue.
    if (bitrate <= 96) {
        bitrate = bitrate * 1000;
    }

    return channel.edit({
        name: channelName,
        bitrate: bitrate
    });
}

function setMax(voiceChannel, textChannel, max, cb, errCb) {
    var maxInt = Number.parseInt(max),
        bitrate = voiceChannel.bitrate,
        agree = '✅',
        disagree = '❌',
        mesage;

    //Do this because discord.js has some issue.
    if (bitrate <= 96) {
        bitrate = bitrate * 1000;
    }

    if (voiceChannel === undefined) {
        errCb('User not connected to a voice channel');
        return;
    }

    if (voiceChannel.name.indexOf('Voice #') !== 0) {
        errCb('Cannot be used in this channel');
        return;
    }

    if (Number.isNaN(maxInt) || maxInt < 0 || maxInt >= 100) {
        errCb('Invalid user limit: ' + max);
        return;
    }

    if (voiceChannel.members.size === 1) {
        voiceChannel.edit({
            userLimit: maxInt,
            bitrate: bitrate
        }).then(c => {
            cb('New user limit set');
        });        
        return;
    }

    message = [];
    voiceChannel.members.forEach(member => {
        message.push(member.toString());
    });
    message = message.join(' ');
    message += '\n\nSet user limit of ' + voiceChannel.name + ' to ' + maxInt + '? Please vote using the reactions below.';

    //Vote
    textChannel.send(message).then(msg => {
        message = msg;
        return message.react(agree);
    }).then(function() {
        return message.react(disagree);
    }).then(function() {
        return message.awaitReactions(function(reaction) {
            return reaction.emoji.name === agree || reaction.emoji.name === disagree;
        }, {
            time: 10000
        });
    }).then(function(reactions) {
        var changeOked = false;

        if (reactions.get(agree)) {
            changeOked = true;
            voiceChannel.members.forEach(function(member) {
                changeOked = changeOked && (reactions.get(agree).users.get(member.id) !== undefined);
            });
        }

        if (changeOked) {
            voiceChannel.edit({
                userLimit: maxInt,
                bitrate: bitrate
            }).then(c => {
                cb('New user limit set');
            });
        } else {
            errCb('Vote failed');
        }
    });

}

/**
 * Resets voice channel user limit to 0
 * @param {VoiceChannel} voiceChannel the voice channel
 */
function resetUserLimit(voiceChannel) {
    var bitrate = voiceChannel.bitrate;

    if (voiceChannel.type !== 'voice' || voiceChannel.name.indexOf('Voice #') !== 0) {
        return;
    }

    if (bitrate <= 96) {
        bitrate = bitrate * 1000;
    }

    voiceChannel.edit({
        userLimit: 0,
        bitrate: bitrate
    });
}

// Gets called when the bot is successfully logged in and connected
bot.on('ready', function() {
    //Update channel state at startup
    bot.guilds.forEach(guild => {
        guild.channels.filter(channel => {
            return channel.type === 'voice';
        }).forEach(updateChannelGame);
    });
});

//Called when a user enters or leaves a voice channel.
bot.on('voiceStateUpdate', (oldMember, newMember) => {
    var newUserChannel = newMember.voiceChannel,
        oldUserChannel = oldMember.voiceChannel,
        resetUsers;

    if(oldUserChannel !== undefined) {
        resetUsers = (oldUserChannel.members.size === 0);
        updateChannelGame(oldUserChannel).then(function() {
            if (resetUsers) {
                resetUserLimit(oldUserChannel);
            }
        });
    } 
    if(newUserChannel !== undefined){
        updateChannelGame(newUserChannel);
    }
});

//Called when a member's presence/game changes
bot.on('presenceUpdate', (oldMember, newMember) => {
    var newUserGame = get(newMember, 'presence.game'),
        oldUserGame = get(oldMember, 'presence.game'),
        newUserChannel = newMember.voiceChannel,
        presenceChanged = !newUserGame || !oldUserGame || !newUserGame.equals(oldUserGame);

    if (newUserChannel && presenceChanged) {
        updateChannelGame(newUserChannel);
    }
});

// Listen for messages sent to the server where the bot is located
bot.on('message', message => {
    var author = message.author,
        textChannel, voiceChannel, max;

    // So the bot doesn't reply to iteself
    if (message.author.bot) return;

    // Check if the message starts with the '!' trigger
    if (message.content.indexOf(prefix) === 0) {

        // Get the user's message excluding the '!'
        var text = message.content.substring(1);

        text = text.split(' ');

        if (text[0] === 'setmax' || text[0] === 'clearmax') {

            textChannel = message.channel;
            voiceChannel = message.member.voiceChannel;
            
            if (text[0] === 'clearmax') {
                max = 0;
            } else {
                max = text[1];
            }

            setMax(voiceChannel, textChannel, max, msg => {
                message.channel.send(msg);
            }, error => {
                message.channel.send(error);
            });

        }

    }
});

bot.login(token);