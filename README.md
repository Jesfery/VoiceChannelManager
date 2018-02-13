# Discord Voice Channel Manager

A simple discord.js bot to manage Voice Channels.

Can be configured to manage voice channels in a number of categories in the following ways

* Updates the name of voice channels to represent the activity of the majority of members in the channel.
* Ensures that there is always one voice channel available in the category
* Allows for users to set the userLimit of the voice channel they're connected to, via a 'setmax' command. If there are a number of members in the channel a vote is called in the text channel that the command was made in and the majority of users must vote positively for the new userLimit to be set.

Dynamic command handling is based on https://github.com/discordjs/guide/tree/master/code_samples/command-handling/dynamic-commands

### Configuration (config.json)

##### "prefix"

The prefix that the command listener will respond to (default is '!')

##### "token"

The app bot user token. Found in the Discord application console - https://discordapp.com/developers/applications/me/

##### "categories"

Guilds and categories can be configured via the config.json "categories" property. The structure of the property should look like;

```javascript
"categories": {
    "guild-id-1": [
        "category-id-1",
        "category-id-2",
        //...
    ],
    "guild-id-2": [
        "category-id-1",
        "category-id-2",
        //...
    ],
    //...
}
```


