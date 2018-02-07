/*jshint esversion: 6 */

// discord.js module
const Discord = require('discord.js');

// Discord Token, located in the Discord application console - https://discordapp.com/developers/applications/me/
const { token } = require('./config.json');

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

    channel.edit({
        name: channelName,
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
        oldUserChannel = oldMember.voiceChannel;

    if(oldUserChannel !== undefined) {
        updateChannelGame(oldUserChannel);
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

bot.login(token);