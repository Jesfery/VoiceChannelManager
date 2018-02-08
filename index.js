/*jshint esversion: 6 */

/**
 * A simple discord.js bot to manage Voice Channels.
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