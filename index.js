/*jshint esversion: 6 */

/**
 * Discord Voice Channel Manager
 * A simple discord.js bot to manage Voice Channels.
 *
 * Presently, it only updates the name of a voice channel to represent the game that the majority of members in the channel are playing.
 *
 * Will also set the userLimit of an occupied channel by vote.
 *
 * Comand handling based on https://github.com/discordjs/guide/tree/master/code_samples/command-handling/dynamic-commands
 */
const Discord = require('discord.js');
const { token } = require('./config.json');

const commandListener = require('./listeners/command.js');
const channelStateListener = require('./listeners/channelState.js');

const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
    commandListener.init(client);
    channelStateListener.init(client);
});

client.login(token);