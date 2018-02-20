const utils = require('../utils.js');
let votePending = {};

function doSetVad(voiceChannel, state, exclude) {
    let everyone,
        promise,
        perms,
        allowVad = (state === 'on');

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

    //Set VAD for all bar the excluded role
    promise = promise.then(() => {
        let promises = [];

        voiceChannel.guild.roles.forEach(role => {
            promises.push(voiceChannel.overwritePermissions(role, {
                'USE_VAD': (exclude && exclude.id === role.id) || allowVad
            }));
        });

        return Promise.all(promises);
    });

    return promise;
}

module.exports = {
    name: 'setvad',
    description: 'Allow or disallow Voice Activation. When disallowing, a role to exclude can be passed.',
    usage: 'on|off [exclude]',
    cooldown: 20,
    guildOnly: true,

    execute(message, args) {
        return new Promise((resolve, reject) => {
            let subject = '',
                voiceChannel = message.member.voiceChannel,
                targetUsers = [],
                userCount,
                state = args.shift(),
                exclude = args.join(' ');
                
            if (voiceChannel === undefined) {
                resolve('User not connected to a voice channel');
                return;
            }

            if (voiceChannel.parentID !== message.channel.parentID) {
                resolve('Cannot manage the voice channel');
                return;
            }

            if (['on', 'off'].indexOf(state) === -1) {
                resolve('"on" or "off" must be passed');
                return;
            }

            //Exclude is only applicable when turning off
            if (state !== 'off') {
                exclude = undefined;
            }

            if (exclude && exclude.length > 0) {
                exclude = voiceChannel.guild.roles.find('name', exclude);
                if (!exclude) {
                    resolve('Exclusion role not found');
                    return;
                }
            }

            userCount = voiceChannel.members.size;
            voiceChannel.members.forEach(member => {
                if (member.id !== message.member.id) {
                    targetUsers.push(member);
                }
            });

            if (userCount > 1) {
                if (votePending[voiceChannel.id] === true) {
                    resolve('There is already a vote pending on that channel');
                    return;
                }
                votePending[voiceChannel.id] = true;
                utils.vote('Set voice activation "' + state + '" for ' + voiceChannel.name + '? Please vote using the reactions below.', message.channel, {
                    targetUsers: targetUsers,
                    time: 10000
                }).then(results => {
                    if (((results.agree.count + 1) / userCount) > 0.5) { //+1 for requesting user
                        doSetVad(voiceChannel, state, exclude).then(() => {
                            resolve('Voice activation set to "' + state + '"');
                        });
                    } else {
                        resolve('Request rejected by channel members');
                    }
                    delete votePending[voiceChannel.id];
                }).catch(() => {
                    delete votePending[voiceChannel.id];
                });
            } else {
                doSetVad(voiceChannel, state, exclude).then(() => {
                    resolve('Voice activation set to "' + state + '"');
                });
            }
        });
    }
};