const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Permissions, MessageManager, Embed, Collection, AuditLogEvent, Events, GuildMember, GuildHubType, ChannelType} = require(`discord.js`);
const fs = require('fs');
const client = new Client({ intents: [Object.keys(GatewayIntentBits)] }); 

client.commands = new Collection();

require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

(async () => {
    for (file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    client.login(process.env.token)
})();


//join-to-create

const joinschema = require('./Schemas.js/jointocreate');
const joinchannelschema = require('./Schemas.js/jointocreatechannels');

client.on(Events.VoiceStateUpdate, async (oldState, newState ) => {

    try{
        if (newState.member.guild === null) return;
    } catch (err) {
        return;
    }

    const joindata = await joinschema.findOne({ Guild: newState.guild.id});
    const joinchanneldata = await joinchannelschema.findOne({ Guild: newState.guild.id, User: newState.member.id});

    const voicechannel = newState.channel;

    if (!joindata) return;

    if(!voicechannel) return;
    else {

        if (voicechannel.id === joindata.Channel) {
            if (joinchanneldata) {

                try {
                    return await newState.member.send({ content: `You already have a voice channel open right now!`, ephemeral: true});
                } catch (err) {
                    return;
                }
            } else{
                try {
                    const channel = await newState.member.guild.channels.create({
                        type: ChannelType.GuildVoice,
                        name: `${newState.member.user.username}-room`,
                        userLimit: joindata.VoiceLimit,
                        parent: joindata.Category
    
                    })
    
                    try{
                        await newState.member.voice.setChannel(channel.id);
                    } catch (err) {
                        return;
                    }
    
                    setTimeout(() => {
                        joinchannelschema.create({
                            Guild: newState.member.guild.id,
                            Channel: channel.id,
                            User: newState.member.id
                        })
                    }, 500)

                } catch(err) {
                    try{
                        await newState.member.send({ content: `I could not create your channel, I may be missing permissions`});
                    } catch (err) {
                        return;
                    }
    
                    return;
                }
    
                try {
    
                    const embed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTimestamp()
                    .setAuthor({ name: `Join to Create system`})
                    .setFooter({ text: `Channel Created`})
                    .setTitle('> Channel Created')
                    .addFields({ name: `Channel Created`, value: `> Your voice channel has been \n> created in **${newState.guild.name}**`})
    
                    await newState.member.send({ embeds: [embed] });
                } catch (err) {
                    return;
                }
            }
        } 
    }
})

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {

    try {
        if (oldState.member.guild === null) return;
    } catch (err) {
        return;
    }

    const leavechanneldata = await joinchannelschema.findOne({ Guild: oldState.member.guild.id, User: oldState.member.id});
    if (!leavechanneldata) return;
    else {
        const voicechannel = await oldState.member.guild.channels.cache.get(leavechanneldata.Channel);

        try{
            await voicechannel.delete();
        } catch (err) {
            return;
        }

        await joinchannelschema.deleteMany({ Guild: oldState.guild.id, User: oldState.member.id});
        try {
    
            const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTimestamp()
            .setAuthor({ name: `Join to Create system`})
            .setFooter({ text: `Channel Delete`})
            .setTitle('> Channel Delete')
            .addFields({ name: `Channel Deleted`, value: `> Your voice channel has been \n> deleted in **${newState.guild.name}**`})

            await newState.member.send({ embeds: [embed] });

        } catch( err ){
            return;
        }
    }

})

//remider

const remindSchema = require('./Schemas.js/remindSchema');
const { channel } = require('diagnostics_channel');
setInterval(async () => {

    const reminders = await remindSchema.find();
    if (!reminders) return;
    else{

        reminders.forEach( async reminder => {

            if (reminder.Time > Date.now()) return;

            const user = await client.users.fetch(reminder.User);

            user?.send({
                content: `${user}, you asked me to remind you about: \`${reminder.Remind}\``
            }).catch(err => {return;});

            await remindSchema.deleteMany({
                Time: reminder.Time,
                User: user.id,
                Remind: reminder.Remind
            });
        })
    }

}, 1000 * 5)



//Mod logs

client.on(Events.ChannelCreate, async channel => {

    channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const name = channel.name;
        const id = channel.id;
        let type = channel.type;

        if (type == 0) type = 'Text'
        if (type == 2) type = 'Voice'
        if (type == 13) type = 'Stage'
        if (type == 15) type = 'Form'
        if (type == 5) type = 'Announcement'
        if (type == 4) type = 'Category'

        const channelID = '1118095040200323106';
        const mChannel = await channel.guild.channels.cache.get(channelID);

        const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('Channel Created')
        .addFields({ name: "Channel Name", value: `${name} (<#${id}>)`, inline: false})
        .addFields({ name: "Channel Type", value: `${type}`, inline: false})
        .addFields({ name: "Channel ID", value: `${id}`, inline: false})
        .addFields({ name: "Created By", value: `${executor.tag}`, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Logging System"})

        mChannel.send({ embeds: [embed] })

    })
} )

client.on(Events.ChannelDelete, async channel => {

    channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const name = channel.name;
        const id = channel.id;
        let type = channel.type;

        if (type == 0) type = 'Text'
        if (type == 2) type = 'Voice'
        if (type == 13) type = 'Stage'
        if (type == 15) type = 'Form'
        if (type == 5) type = 'Announcement'
        if (type == 4) type = 'Category'

        const channelID = '1118095040200323106';
        const mChannel = await channel.guild.channels.cache.get(channelID);

        const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Channel Deleted')
        .addFields({ name: "Channel Name", value: `${name}`, inline: false})
        .addFields({ name: "Channel Type", value: `${type}`, inline: false})
        .addFields({ name: "Channel ID", value: `${id}`, inline: false})
        .addFields({ name: "Deleted By", value: `${executor.tag}`, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Logging System"})

        mChannel.send({ embeds: [embed] })

    })
} )

client.on(Events.GuildBanAdd, async member => {

    member.guild.fetchAuditLogs({
        type: AuditLogEvent.GuildBanAdd,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const name = member.user.username;
        const id = member.user.id;

        const channelID = '1118095040200323106';
        const mChannel = await member.guild.channels.cache.get(channelID);

        const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Member Banned')
        .addFields({ name: "Channel Name", value: `${name} (<#${id}>)`, inline: false})
        .addFields({ name: "Member ID", value: `${id}`, inline: false})
        .addFields({ name: "Banned By", value: `${executor.tag}`, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Logging System"})

        mChannel.send({ embeds: [embed] })

    })
} )

client.on(Events.GuildBanRemove, async member => {

    member.guild.fetchAuditLogs({
        type: AuditLogEvent.GuildBanRemove,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const name = member.user.username;
        const id = member.user.id;

        const channelID = '1118095040200323106';
        const mChannel = await member.guild.channels.cache.get(channelID);

        const embed = new EmbedBuilder()
        .setColor('White')
        .setTitle('Member Unbanned')
        .addFields({ name: "Channel Name", value: `${name} (<#${id}>)`, inline: false})
        .addFields({ name: "Member ID", value: `${id}`, inline: false})
        .addFields({ name: "Unbanned By", value: `${executor.tag}`, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Logging System"})

        mChannel.send({ embeds: [embed] })

    })
} )


client.on(Events.MessageUpdate, async (message, newMessage) => {

    message.guild.fetchAuditLogs({
        type: AuditLogEvent.MessageUpdate,
    })
    .then(async audit => {
        const { executor } = audit.entries.first()

        const mes = message.content;

        if (!mes) return;

        const channelID = '1118095040200323106';
        const mChannel = await message.guild.channels.cache.get(channelID);

        const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('Message Edited')
        .addFields({ name: "Old Message", value: `${mes}`, inline: false})
        .addFields({ name: "New Message", value: `${newMessage}`, inline: false})
        .addFields({ name: "Edited By", value: `${executor.tag}`, inline: false})
        .setTimestamp()
        .setFooter({ text: "Mod Logging System"})

        mChannel.send({ embeds: [embed] })

    })
} )