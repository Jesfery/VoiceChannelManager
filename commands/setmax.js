const utils = require('../utils.js');

module.exports = {
	name: 'setmax',
	description: 'Set the maximum number of users that can connect to your voice channel. \'0\' will reset it.',
    usage: 'maxUsers',
    cooldown: 5,	
    guildOnly: true,

    execute(message, args) {
        return new Promise((resolve, reject) => {
            let maxInt = Number.parseInt(args[0]),
                subject = '',
                voiceChannel = message.member.voiceChannel,
                targetUsers = [],
                userCount = voiceChannel.members.size;
        
            if (voiceChannel === undefined) {
                reject('User not connected to a voice channel');
                return;
            }
        
            if (Number.isNaN(maxInt) || maxInt < 0 || maxInt >= 100) {
                reject('Invalid user limit: ' + maxInt);
                return;
            }

            if (maxInt > 0 && maxInt < userCount) {
                reject('User limit is lower than the current user count');
                return;
            }

            voiceChannel.members.forEach(function(member) {
                if (member.id !== message.member.id) {
                    targetUsers.push(member);
                }
            });

            if (userCount > 1) {
                utils.vote('Set user limit of ' + voiceChannel.name + ' to ' + maxInt + '? Please vote using the reactions below.', message.channel, {
                    targetUsers: targetUsers,
                    time: 10000
                }).then(results => {
                    if (((results.agree.count + 1) / userCount) > 0.5) { //+1 for requesting user
                        voiceChannel.edit({
                            userLimit: maxInt
                        }).then(() => {
                            resolve('New userLimit set');
                        });
                    } else {
                        resolve('Request rejected by channel members');
                    }
                });
            } else {
                voiceChannel.edit({
                    userLimit: maxInt
                }).then(() => {
                    resolve('New userLimit set');
                });
            }
        });
	}
};