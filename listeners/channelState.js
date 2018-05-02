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
    let activities = {},
        max = 0,
        activityName, channelName;

    channel.members.forEach(member => {
        let activity = utils.get(member, 'presence.activity'),
            name = utils.get(activity, 'name');

        if (utils.get(activity, 'type') === 'STREAMING') {
            name = utils.get(activity, 'details');
        }

        if (name && name !== '') {
            if (activities[name] !== undefined) {
                activities[name]++;
            } else {
                activities[name] = 1;
            }
        }

    });

    for (let n in activities) {
        if (activities.hasOwnProperty(n)) {
            if (activities[n] > max) {
                max = activities[n];
                activityName = n;
            }
        }
    }

    if (index === undefined) {
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
        client.guilds.forEach(guild => {
            guild.channels.filter(channel => {
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

        client.on('voiceStateUpdate', (oldMember, newMember) => {
            let newUserChannel = newMember.voiceChannel,
                oldUserChannel = oldMember.voiceChannel,
                oldCategoryID,
                newCategory;

            //If a user enters of leaves a configured category, update it.
            if (oldUserChannel !== undefined && canActOn(oldUserChannel) && (newUserChannel === undefined || !newUserChannel.equals(oldUserChannel))) {
                oldCategoryID = oldUserChannel.parentID;
                manageChannels(oldUserChannel.parent);
            }

            if (newUserChannel !== undefined && canActOn(newUserChannel) && (oldUserChannel === undefined || !newUserChannel.equals(oldUserChannel))) {
                if (oldCategoryID !== newUserChannel.parentID) { //No need to manage the same category twice.
                    manageChannels(newUserChannel.parent);
                }
            }
        });

        client.on('presenceUpdate', (oldMember, newMember) => {
            let newUserActivity = utils.get(newMember, 'presence.activity'),
                oldUserActivity = utils.get(oldMember, 'presence.activity'),
                newUserChannel = newMember.voiceChannel;

            if (newUserChannel && (!newUserActivity || !oldUserActivity || !newUserActivity.equals(oldUserActivity)) && canActOn(newUserChannel)) {
                //Shouldnt be necessary to manage an entire category when the presence updates.
                newUserChannel.setName(getChannelName(newUserChannel));
            }
        });
    }
};