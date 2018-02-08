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

function resetUserLimit(voiceChannel) {
	voiceChannel.edit({
        userLimit: 0
    });
}

function updateChannelActivity (channel) {
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

    channelName = channel.name.split('(')[0].trim();

    if (max > 0) {
        channelName = channelName + ' (' + activityName + ')';
    }

	return channel.setName(channelName);
}

module.exports = {
    init: function(client) {

        //Update channel state at startup
        client.guilds.forEach(guild => {
            guild.channels.filter(channel => {
                return canActOn(channel);
            }).forEach(channel => {
                let channelEmptied = channel.members.size === 0;
                updateChannelActivity(channel).then((channel) => {
                    if (channelEmptied) {
                        resetUserLimit(channel);
                    }
                });
            });
        });

        client.on('voiceStateUpdate', (oldMember, newMember) => {
            let newUserChannel = newMember.voiceChannel,
                oldUserChannel = oldMember.voiceChannel,
                channelEmptied,
                channelOccupied;
        
            if(oldUserChannel !== undefined && canActOn(oldUserChannel)) {
                channelEmptied = utils.get(oldUserChannel, 'members.size') === 0;
                updateChannelActivity(oldUserChannel).then((channel) => {
                    if (channelEmptied) {
                        resetUserLimit(channel);
                    }
                });
            } 
            if(newUserChannel !== undefined && canActOn(newUserChannel)){
                channelOccupied = utils.get(newUserChannel, 'members.size') === 1;
                updateChannelActivity(newUserChannel).then(() => {

                });
            }
        });
        
        client.on('presenceUpdate', (oldMember, newMember) => {
            let newUserActivity = utils.get(newMember, 'presence.activity'),
                oldUserActivity = utils.get(oldMember, 'presence.activity'),
                newUserChannel = newMember.voiceChannel;
        
            if (newUserChannel && (!newUserActivity || !oldUserActivity || !newUserActivity.equals(oldUserActivity)) && canActOn(newUserChannel)) {
                updateChannelActivity(newUserChannel);
            }
        });        
    }
};