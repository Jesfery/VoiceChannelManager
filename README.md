# Discord Voice Channel Manager

A simple discord.js bot to manage Voice Channels.

Will manage channels in any category that the bot has MANAGE_CHANNELS, MANAGE_ROLES, MOVE_MEMBERS, VIEW_CHANNEL and CONNECT permissions in the following ways;

* Updates the name of voice channels to represent the activity of the majority of members in the channel.
* Ensures that there is always one empty voice channel available in the category
* Allows for users to do the following things on the Voice Channel they are connected to
  - Set the userLimit using the 'setmax' command
  - Allow or disallow voice activation using the 'setvad' command
  - Lock the channel so that only members currently in it may join using the 'lock' command
  - Boot a user from the voice channel using the 'boot'/'kick' command
  
Dynamic command handling is based on https://github.com/discordjs/guide/tree/master/code_samples/command-handling/dynamic-commands

### Configuration (config.json)

##### "prefix"

The prefix that the command listener will respond to (default is '!')

##### "token"

The app bot user token. Found in the Discord application console - https://discordapp.com/developers/applications/me/