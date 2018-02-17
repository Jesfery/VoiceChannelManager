const utils = require('../utils.js');
let votePending = {};

function doRelaxPtt(voiceChannel) {
    let everyone,
        promise,
        perms;

    //Reset VAD overwrites
    perms = voiceChannel.permissionOverwrites.map(overwrite => ({
        deny: overwrite.denied.remove('USE_VAD').bitfield,
        allow: overwrite.allowed.remove('USE_VAD').bitfield,
        id: overwrite.id,
        type: overwrite.type,
    }));

    promise = voiceChannel.edit({
        permissionOverwrites: perms
    });

    return promise;
}

module.exports = {
    name: 'relaxptt',
    description: 'Allow voice activation in the current voice channel',
    cooldown: 5,
    guildOnly: true,

    execute(message, args) {
        return new Promise((resolve, reject) => {
            let subject = '',
                voiceChannel = message.member.voiceChannel,
                targetUsers = [],
                userCount;

            if (voiceChannel === undefined) {
                resolve('User not connected to a voice channel');
                return;
            }

            if (voiceChannel.parentID !== message.channel.parentID) {
                resolve('Cannot manage the voice channel');
                return;
            }

            if (votePending[voiceChannel.id] === true) {
                resolve('There is already a vote pending on that channel');
                return;
            }

            voiceChannel.members.forEach(member => {
                if (member.id !== message.member.id) {
                    targetUsers.push(member);
                }
            });

            if (userCount > 1) {
                votePending[voiceChannel.id] = true;
                utils.vote('Force push to talk for ' + voiceChannel.name + '? Please vote using the reactions below.', message.channel, {
                    targetUsers: targetUsers,
                    time: 10000
                }).then(results => {
                    if (((results.agree.count + 1) / userCount) > 0.5) { //+1 for requesting user
                        doRelaxPtt(voiceChannel).then(() => {
                            resolve('PTT relaxed');
                        });
                    } else {
                        resolve('Request rejected by channel members');
                    }
                    delete votePending[voiceChannel.id];
                }).catch(() => {
                    delete votePending[voiceChannel.id];
                });
            } else {
                doRelaxPtt(voiceChannel).then(() => {
                    resolve('PTT relaxed');
                });
            }
        });
    }
};