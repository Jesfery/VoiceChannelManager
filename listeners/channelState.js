const utils = require('../utils.js');

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
function manageChannels(category) {
    let guild = category.guild,
        voiceChannels,
        emptyVoiceChannels,
        promises,
        createNewChannel = false;

    voiceChannels = category.children.filter(channel => {
        return channel.type === 'voice';
    });

    emptyVoiceChannels = voiceChannels.filter(channel => {
        return channel.members.size === 0;
    });

    //Ensure one empty channel
    promises = [];
    if (emptyVoiceChannels.size > 0) {
        emptyVoiceChannels.forEach(channel => {
            let permissionOverwrites = category.permissionOverwrites.map(() => {});
            if (channel.id === emptyVoiceChannels.first().id) {
                //Edit happens in lockPermissions. Set userLimit on channel data.
                /*promises.push(channel.edit({
                    userLimit: 0
                }));*/
                channel.userLimit = 0;
                promises.push(channel.lockPermissions());
            } else {
                promises.push(channel.delete());
                voiceChannels.delete(channel.id);
            }
        });
    } else if (emptyVoiceChannels.size === 0) {
        createNewChannel = true;
    }

    Promise.all(promises).then(() => {
        let index = 1,
            channelName;

        voiceChannels = category.children.filter(channel => {
            return channel.type === 'voice';
        });

        voiceChannels.forEach(channel => {
            channelName = getChannelName(channel, index);
            if (channelName !== channel.name) {
                channel.setName(channelName);
            }
            index++;
        });

        if (createNewChannel) {
            guild.channels.create('Voice #' + index, {
                type: 'voice',
                parent: category
            });
        }
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

        if(member.user.bot) {
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
                oldCategoryID,
                newCategory;

            //If a user enters of leaves a configured category, update it.
            if (oldUserChannel != null && canActOn(oldUserChannel) && (newUserChannel == null || !newUserChannel.equals(oldUserChannel))) {
                oldCategoryID = oldUserChannel.parentID;
                manageChannels(oldUserChannel.parent);
            }


            if (newUserChannel != null && canActOn(newUserChannel) && (oldUserChannel == null || !newUserChannel.equals(oldUserChannel))) {
                if (oldCategoryID !== newUserChannel.parentID) { //No need to manage the same category twice.
                    manageChannels(newUserChannel.parent);
                }
            }
        });

        client.on('presenceUpdate', (oldPresence, newPresence) => {
            if (oldPresence == null || !oldPresence.equals(newPresence)) {
                let newUserChannel = utils.get(newPresence, 'member.voice.channel');
                if (newUserChannel != null) {
                    //Shouldnt be necessary to manage an entire category when the presence updates.
                    newUserChannel.setName(getChannelName(newUserChannel));
                } 
            }
        });
    }
};