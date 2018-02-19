const utils = require('../utils.js');
let votePending = {};

module.exports = {
    name: 'boot',
    description: 'Boot a user from the voice channel',
    aliases: ['kick'],    
    usage: '@user',
    cooldown: 120,
    guildOnly: true,

    execute(message, args) {
        return new Promise((resolve, reject) => {
            let subject = '',
                voiceChannel = message.member.voiceChannel,
                targetUsers = [],
                userCount,
                user;

            if (voiceChannel === undefined) {
                resolve('User not connected to a voice channel');
                return;
            }

            if (voiceChannel.parentID !== message.channel.parentID) {
                resolve('Cannot manage the voice channel');
                return;
            }

            if (!message.mentions || message.mentions.size === 0 || !(user = message.mentions.members.first())) {
                resolve('No user mentioned');
                return;
            }


            if (message.author.id === user.id) {
                resolve('Why?');
                return;
            }

            userCount = voiceChannel.members.size;
            voiceChannel.members.forEach(member => {
                if (member.id !== message.member.id) {
                    targetUsers.push(member);
                }
            });

            if (votePending[voiceChannel.id] === true) {
                resolve('There is already a vote pending on that channel');
                return;
            }
            votePending[voiceChannel.id] = true;
            utils.vote(message.author.toString() + ' has requested that ' + user.toString() + ' be kicked from ' + voiceChannel.name + '? Please vote using the reactions below.', message.channel, {
                targetUsers: targetUsers,
                time: 10000
            }).then(results => {
                if (((results.agree.count + 1) / userCount) > 0.5) { //+1 for requesting user
                    voiceChannel.overwritePermissions(user, {
                        'CONNECT': false
                    }).then(() => {
                        let newChannel = voiceChannel.parent.children.find(channel => {
                            return channel.type === 'voice' && channel.members.size === 0;
                        });
                        user.setVoiceChannel(newChannel).then(() => {
                            resolve('User removed');
                        });
                    });
                } else {
                    resolve('Request rejected by channel members');
                }
                delete votePending[voiceChannel.id];
            }).catch(() => {
                delete votePending[voiceChannel.id];
            });
        });
    }
};