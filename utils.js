/*jshint esversion: 6 */

/**
 * Utility function to get a deep property value without all the && this && that malarkey
 * 
 * @param {Object} obj the object
 * @param {String} key the deep property key
 * 
 * @return {Object} the deep property value
 */
function get(obj, key) {
    return key.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, obj);
}

/**
 * Calls a vote in a text channel. Needs to be tidied. Investigate Async/Await.
 * 
 * @param {String} subject The subject to be voted on
 * @param {TextChannel} channel The text channel to run the vote in
 * @param {Object} options Vote options
 * @param {Array} options.selections The available selections. Defaults to agree/disagree
 * @param {Number} options.time Time to listen for reactions in ms. Defalts to 5 seconds.
 * @param {Array} options.targetUsers Users to limit the vote to.
 * 
 */
function vote(subject, channel, options) {
    let {
        selections = [{
            name: 'agree',
            emoji: '✅'
        }, {
            name: 'disagree',
            emoji: '❌'
        }],  
        time = 5000,
        targetUsers
    } = options;

    if (targetUsers && targetUsers.length > 0) {
        let mentions = [];

        targetUsers.forEach(function (user) {
            mentions.push(user.toString());
        });

        subject = mentions.join(' ') + '\n\n' + subject;
    }

    return new Promise((resolve, reject) => {

        channel.send(subject).then(message => {
            let index = 0;

            (function cb() {
                if (index < selections.length) {
                    message.react(selections[index].emoji).then(cb);
                } else {
                    message.awaitReactions(function(reaction) {
                        return selections.findIndex(function(selection) {
                            return reaction.emoji.name === selection.emoji;
                        }) !== -1;
                    }, {
                        time: time
                    }).then(function tallyResults(reactions) {
                        let results = {};

                        selections.forEach(function(selection) {
                            let result = {
                                count: 0,
                                users: []
                            };
                            let reaction = reactions.get(selection.emoji);

                            reaction && reaction.users.forEach(function(user) {
                                if (targetUsers && targetUsers.length > 0) {
                                    if (targetUsers.findIndex(function(targetUser) {
                                        return targetUser.id === user.id;
                                    }) === -1) {
                                        return;
                                    }
                                }
                                result.count++;
                                result.users.push(user);
                            });

                            results[selection.name] = result;
                        });

                        resolve(results);
                    });
                }
                index++;
            })();

        });

    });
}

module.exports = {
    get: get,
    vote: vote
};