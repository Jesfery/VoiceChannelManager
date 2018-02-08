/*jshint esversion: 6 */

const utils = require('../utils.js');

function canActOn(channel) {
    return channel.type === 'voice' && channel.name.indexOf('Voice #') === 0;
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
            console.log(n + ': ' + activities[n]);

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
                let restUserLimit = channel.members.size === 0;
                updateChannelActivity(channel).then(() => {
                    if (restUserLimit) {
                        resetUserLimit(channel);
                    }
                });
            });
        });

        client.on('voiceStateUpdate', (oldMember, newMember) => {
            let newUserChannel = newMember.voiceChannel,
                oldUserChannel = oldMember.voiceChannel,
                restUserLimit = utils.get(oldUserChannel, 'members.size') === 0;
        
            if(oldUserChannel !== undefined && canActOn(oldUserChannel)) {
                updateChannelActivity(oldUserChannel).then(() => {
                    if (restUserLimit) {
                        resetUserLimit(oldUserChannel);
                    }
                });
            } 
            if(newUserChannel !== undefined && canActOn(newUserChannel)){
                updateChannelActivity(newUserChannel);
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