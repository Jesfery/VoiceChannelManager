function resetUserLimit(voiceChannel) {
    if (voiceChannel.type !== 'voice' || voiceChannel.name.indexOf('Voice #') === -1) {
        return;
	}
	
	voiceChannel.edit({
        userLimit: 0
    });
}


function updateChannelGame (channel) {
    let games = {},
        max = 0, gameName, channelName;

    if (channel.type !== 'voice' || channel.name.indexOf('Voice #') === -1) {
        return;
    }

    channel.members.forEach(member => {
        console.log(member.displayName);

        let name = member.presence && member.presence.game && member.presence.game.name;

        if (name && name !== '') {
            console.log(name);

            if (games[name] !== undefined) {
                games[name]++;
            } else {
                games[name] = 1;                
            }
        }

    });

    for (let n in games) {
        if (games.hasOwnProperty(n)) {
            console.log(n + ': ' + games[n]);

            if (games[n] > max) {
                max = games[n];
                gameName = n;
            }
        }
    }

    channelName = channel.name.split('(')[0].trim();

    if (max > 0) {
        channelName = channelName + ' (' + gameName + ')';
    }

	channel.setName(channelName);
}

module.exports = {
    init: function(client) {

        //Update channel state at startup
        client.guilds.forEach(guild => {
            guild.channels.filter(channel => {
                return channel.type === 'voice';
            }).forEach(channel => {
                updateChannelGame(channel);
            });

        });

        client.on('voiceStateUpdate', (oldMember, newMember) => {
            let newUserChannel = newMember.voiceChannel,
                oldUserChannel = oldMember.voiceChannel;
        
            if(oldUserChannel !== undefined) {
                updateChannelGame(oldUserChannel);
                if (oldUserChannel.members.size === 0) {
                    resetUserLimit(oldUserChannel);
                }
            } 
            if(newUserChannel !== undefined){
                updateChannelGame(newUserChannel);
            }
        });
        
        client.on('presenceUpdate', (oldMember, newMember) => {
            let newUserGame = newMember.presence.game,
                oldUserGame = oldMember.presence.game,
                newUserChannel = newMember.voiceChannel;
        
            if (newUserChannel && (!newUserGame || !oldUserGame || !newUserGame.equals(oldUserGame))) {
                updateChannelGame(newUserChannel);
            }
        });        
        
    }
};