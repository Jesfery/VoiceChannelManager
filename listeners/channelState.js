const utils = require('../utils.js');
const { categories } = require('../config.json');

/**
 * Checks to see if the voice channel is a child of one of the configured categories
 * 
 * @param {VoiceChannel} channel the voice channel
 */
function canActOn(channel) {
    let guildId = channel.guild.id,
        parentId = channel.parentID,
        guildCategories = categories[guildId];

    if (!guildCategories) {
        return false;
    }

    if(!parentId || guildCategories.indexOf(parentId) === -1) {
        return false;
    }

    return channel.type === 'voice';
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
        promises;

    voiceChannels = category.children.filter(channel => {
        return channel.type === 'voice';
    });

    emptyVoiceChannels = voiceChannels.filter(channel => {
        return channel.members.size === 0;
    });

    //console.log('emptyVoiceChannels.size => ' + emptyVoiceChannels.size);
    //console.log('voiceChannels.size 1. => ' + voiceChannels.size);

    //Ensure one empty channel
    promises = [];
    if (emptyVoiceChannels.size > 0) {
        emptyVoiceChannels.forEach(channel => {
            if (channel.id === emptyVoiceChannels.first().id) {
                /*promises.push(channel.edit({
                    userLimit: 0
                }));*/
                channel.userLimit = 0;
            } else {
                promises.push(channel.delete('auto management'));
                //voiceChannels.delete(channel.id);
            }
        });
    } else if (emptyVoiceChannels.size === 0) {
        promises.push(guild.channels.create('Voice', {
            type: 'voice',
            parent: category
        }));
    }

    Promise.all(promises).then(() => {
        let index = 1;

        voiceChannels = category.children.filter(channel => {
            return channel.type === 'voice';
        });

        //console.log('voiceChannels.size 2. => ' + voiceChannels.size);

        voiceChannels.forEach(channel => {
            channel.setName(getChannelName(channel, index)).catch(() => {
                //For some reason this list collection sometimes doesn't update after the Promises have been resolved,
                // so some of the channels have been deleted. The catch is a bit of a hack. I'll look into a better 
                // solution.
            });
            index++;
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
    let activities = {},
        max = 0, activityName, channelName;

    channel.members.forEach(member => {
        let activity = utils.get(member, 'presence.activity'),
            name = utils.get(activity, 'name');

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
    init: function(client) {

        //Update channel state at startup
        client.guilds.forEach(guild => {
            guild.channels.filter(channel => {
                let guildCategories = categories[guild.id];
                return guildCategories && guildCategories.indexOf(channel.id) !== -1;
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
            if(oldUserChannel !== undefined && canActOn(oldUserChannel) && (newUserChannel === undefined || !newUserChannel.equals(oldUserChannel))) {
                oldCategoryID = oldUserChannel.parentID;
                manageChannels(oldUserChannel.parent);
            }

            if(newUserChannel !== undefined && canActOn(newUserChannel) && (oldUserChannel === undefined || !newUserChannel.equals(oldUserChannel))){
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