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
 * Calls a vote in a text channel. Could be tidied a bit. Investigate Async/Await?
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

    //Alert target users via mentions
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
                    //React to message with available options
                    message.react(selections[index].emoji).then(cb);
                } else {
                    //Wait the configured time for user reactions.
                    // Only accept requested reactions from targeted users.
                    message.awaitReactions((reaction, user) => {
                        let include = selections.findIndex((selection) => {
                            return reaction.emoji.name === selection.emoji;
                        }) !== -1;

                        if (targetUsers && targetUsers.length > 0) {
                            include = include && targetUsers.findIndex((targetUser) => {
                                return targetUser.id === user.id;
                            }) !== -1;
                        }

                        return include;
                    }, {
                        time: time
                    }).then(function (reactions) {
                        //Tally reactions, then resolve the vote promise with the results
                        let results = {};

                        selections.forEach(function(selection) {
                            let reaction = reactions.get(selection.emoji),
                                result = {
                                    count: 0,
                                    users: []
                                };

                            if (reaction) {
                                reaction.users.forEach(function(user) {
                                    result.count++;
                                    result.users.push(user);
                                });
                            }

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