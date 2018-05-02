const utils = require('../utils.js');
let votePending = {};

function doLock(voiceChannel) {
    let everyone,
        promise,
        perms,
        promises = [];

    //Reset CONNECT overwrites
    perms = voiceChannel.permissionOverwrites.map(overwrite => ({
        deny: overwrite.denied.remove('CONNECT').bitfield,
        allow: overwrite.allowed.remove('CONNECT').bitfield,
        id: overwrite.id,
        type: overwrite.type,
    }));

    promise = voiceChannel.edit({
        permissionOverwrites: perms
    });

    //Set CONNECT on for current members (and this bot)
    promise = promise.then(() => {
        promises = [];
        voiceChannel.members.forEach(member => {
            promises.push(voiceChannel.overwritePermissions(member, {
                'CONNECT': true
            }));
        });
        promises.push(voiceChannel.overwritePermissions(voiceChannel.client.user, {
            'CONNECT': true
        }));
        return Promise.all(promises);
    });

    //Set CONNECT off for all roles
    promise = promise.then(() => {
        let promises = [];

        voiceChannel.guild.roles.forEach(role => {
            promises.push(voiceChannel.overwritePermissions(role, {
                'CONNECT': false
            }));
        });

        return Promise.all(promises);
    });


    return promise;
}

module.exports = {
    name: 'lock',
    description: 'Lock the voice channel so only the current occupants can join',
    usage: '',
    cooldown: 20,
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

            userCount = voiceChannel.members.size;

            if (userCount === 1) {
                resolve('Why?');
                return;
            }

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
            utils.vote('Lock ' + voiceChannel.name + '? Please vote using the reactions below.', message.channel, {
                targetUsers: targetUsers,
                time: 10000
            }).then(results => {
                if (((results.agree.count + 1) / userCount) > 0.5) { //+1 for requesting user
                    doLock(voiceChannel).then(() => {
                        resolve('Channel locked');
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
