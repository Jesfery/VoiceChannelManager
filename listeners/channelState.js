const utils = require('../utils.js');
const Discord = require('discord.js');

/**
 * Checks to see if the voice channel is a child of a category we can manage
 * 
 * @param {VoiceChannel} channel the voice channel
 */
function canActOn(channel) {
    let perms;

    if (!channel.parent) {
        return false;
    }

    perms = channel.parent.permissionsFor(channel.client.user);
    return perms.has('MANAGE_CHANNELS') && perms.has('CONNECT') && channel.type === 'voice';
}

/**
 * Manages the voice channels in a category by
 *  Ensuring that there is always one empty voice channel.
 *  Resetting vacated voice channels
 *  Naming occupied voice channels in accordance with the activity of the
 *   majority of occupants.
 * 
 * @param {CategoryChannel} category The category
 */
function manageChannels(cat) {

    cat.fetch()
        .then((category) => {
            let guild = category.guild;

            let voiceChannels = category.children.filter(channel => {
                return channel.type === 'voice';
            });

            let index = 1,
                channelName;

            let populatedChannels = voiceChannels.filter(channel => {
                return channel.members.size > 0;
            });

            populatedChannels.forEach(channel => {
                channelName = getChannelName(channel, index);
                renameChannel(channel, channelName);
                index++;
            });

            let emptyVoiceChannels = voiceChannels.filter(channel => {
                return channel.members.size === 0;
            });

            emptyVoiceChannels.forEach(channel => {
                channel.delete();
            });

            guild.channels.create('Voice #' + index, {
                type: 'voice',
                parent: category
            });
        });
}

/**
 * Gets the name for a channel based on the activity of it's members
 * 
 * @param {VoiceChannel} channel The voice channel
 * @param {Number} [index] The index of the channel passed. If not passed the, current name will be used
 */
function getChannelName(channel, index) {
    let activityNames = {},
        max = 0,
        activityName, channelName;


    channel.members.forEach(member => {
        let activities = utils.get(member, 'presence.activities');

        if (member.user.bot) {
            return;
        }

        let name = null;
        activities.forEach(activity => {
            if (activity.type === 'PLAYING') {
                name = activity.name;
            }
        });

        if (name && name !== '') {
            if (activityNames[name] != null) {
                activityNames[name]++;
            } else {
                activityNames[name] = 1;
            }
        }

    });

    for (let n in activityNames) {
        if (activityNames.hasOwnProperty(n)) {
            if (activityNames[n] > max) {
                max = activityNames[n];
                activityName = n;
            }
        }
    }

    if (index == null) {
        channelName = channel.name.split('(')[0].trim();
    } else {
        channelName = 'Voice #' + index;
    }

    if (max > 0) {
        channelName = channelName + ' (' + activityName + ')';
    }

    return channelName;
}

const renameCoolDowns = new Discord.Collection();
const rateLimit = (1000 * 60 * 10) + 1000;

/**
 * An attempt to avoid rate limits. If it can delete and recreate the channel it will. Otherwise, 
 *  it will queue the latest name until such time as it can rename it.
 * @param {Channel} channel the channel to be renamed
 * @param {String} name the new name of the channel
 */
function renameChannel(channel, name) {
    if (channel.members.size === 0) { //Empty channel. Delete and re-create
        let category = channel.parent;
        channel.delete().then(() => {
            guild.channels.create(name, {
                type: 'voice',
                parent: category
            });
        });
        return;
    }

    if (channel.name === name) {
        return;
    }

    let channelCoolDown;
    let channelId = channel.id;
    if (!renameCoolDowns.has(channelId)) {
        channelCoolDown = new Discord.Collection();
        channelCoolDown.set('count', 0);
        channelCoolDown.set('name', undefined);
        //I'll put the timeout in the collection for now, but its not in use atm.
        console.log(`Cooldown started for channel: ${channelId}(${channel.name})`);
        channelCoolDown.set('timeout', setTimeout(() => {
            let ccd = renameCoolDowns.get(channelId);
            let queuedName = ccd.get('name');
            if (queuedName !== undefined) {
                ccd.get('channel').fetch()
                    .then((queuedChannel) => {
                        console.log(`Completing rename of channel: ${channelId}(${queuedChannel.name}). New name should be ${queuedName}`);
                        queuedChannel.setName(queuedName).catch((e) => {
                            //Channel likely deleted before the timeout completed. Ignore.
                        });
                    })
                    .catch((e) => {
                        //Channel likely deleted before the timeout completed. Ignore.
                    });
            }
           renameCoolDowns.delete(channelId);
        }, rateLimit));
        renameCoolDowns.set(channelId, channelCoolDown);
    } else {
        channelCoolDown = renameCoolDowns.get(channelId);
    }     
    let count = channelCoolDown.get('count');
    count++;
    console.log(`${count} requests to rename channel: ${channelId}(${channel.name}). Requested name is '${name}'`);
    channelCoolDown.set('count', count);
    channelCoolDown.set('channel', channel);

    if (count < 3) {
        channel.setName(name).catch((e) => {
            //Channel likely does not exist. Ignore.
        });
    } else {
        console.log(`Queueing name '${name}' for channel: ${channelId}(${channel.name})`);
        channelCoolDown.set('name', name);
    }
}

module.exports = {
    init: function (client) {

        //Update channel state at startup
        client.guilds.cache.forEach(guild => {
            guild.channels.cache.filter(channel => {
                let perms;

                if (channel.type !== 'category') {
                    return false;
                }

                perms = channel.permissionsFor(client.user);
                return perms.has('MANAGE_CHANNELS') && perms.has('CONNECT');
            }).forEach(category => {
                manageChannels(category);
            });
        });

        client.on('voiceStateUpdate', (oldState, newState) => {
            let newUserChannel = newState.channel,
                oldUserChannel = oldState.channel,
                newCategoryID;

            //If a user enters or leaves a configured category, update it.
            if (newUserChannel != null && canActOn(newUserChannel) && (oldUserChannel == null || !newUserChannel.equals(oldUserChannel))) {
                newCategoryID = newUserChannel.parentID;
                manageChannels(newUserChannel.parent);
            }

            if (oldUserChannel != null && canActOn(oldUserChannel) && (newUserChannel == null || !newUserChannel.equals(oldUserChannel))) {
                if (newCategoryID !== oldUserChannel.parentID) { //No need to manage the same category twice.
                    manageChannels(oldUserChannel.parent);
                }
            }
        });

        client.on('presenceUpdate', (oldPresence, newPresence) => {
            if (oldPresence == null || !oldPresence.equals(newPresence)) {
                let newUserChannel = utils.get(newPresence, 'member.voice.channel');
                if (newUserChannel != null) {
                    //Shouldnt be necessary to manage an entire category when the presence updates.
                    renameChannel(newUserChannel, getChannelName(newUserChannel));
                } 
            }
        });
    }
};