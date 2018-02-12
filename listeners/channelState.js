/*jshint esversion: 6 */

const utils = require('../utils.js');
const { categories } = require('../config.json');

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

    console.log('emptyVoiceChannels.size => ' + emptyVoiceChannels.size);
    console.log('voiceChannels.size 1. => ' + voiceChannels.size);

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

        console.log('voiceChannels.size 2. => ' + voiceChannels.size);

        voiceChannels.forEach(channel => {
            channel.setName(getChannelName(channel, index));
            index++;
        });
    });

}

function getChannelName(channel, index) {
    let activities = {},
        max = 0, activityName, channelName;

    channel.members.forEach(member => {
        let activiy = utils.get(member, 'presence.activity'),
            name = utils.get(activiy, 'name');

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
        
            if(oldUserChannel !== undefined && canActOn(oldUserChannel) && (newUserChannel === undefined || !newUserChannel.equals(oldUserChannel))) {
                oldCategoryID = oldUserChannel.parentID;
                manageChannels(oldUserChannel.parent);
            } 
            if(newUserChannel !== undefined && canActOn(newUserChannel) && (oldUserChannel === undefined || !newUserChannel.equals(oldUserChannel))){
                if (oldCategoryID !== newUserChannel.parentID) {
                    manageChannels(newUserChannel.parent);
                }
            }
        });
        
        client.on('presenceUpdate', (oldMember, newMember) => {
            let newUserActivity = utils.get(newMember, 'presence.activity'),
                oldUserActivity = utils.get(oldMember, 'presence.activity'),
                newUserChannel = newMember.voiceChannel;
        
            if (newUserChannel && (!newUserActivity || !oldUserActivity || !newUserActivity.equals(oldUserActivity)) && canActOn(newUserChannel)) {
                newUserChannel.setName(getChannelName(newUserChannel));
            }
        });        
    }
};