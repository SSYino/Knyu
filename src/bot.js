require("dotenv").config();
const { msgCheck, Commands } = require('./message-check.js');
const startup = require('./on-ready.js');
const runSlash = require('./run-slash-commands.js');
const { PrismaClient } = require('@prisma/client')
const { Client, Intents, GuildMember } = require('discord.js');
const { Player } = require("discord-player")
const prisma = new PrismaClient()
const client = new Client({
    partials: ['MESSAGE', 'USER', 'GUILD_MEMBER', 'REACTION'],
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_INTEGRATIONS],
    fetchAllMembers: true
});
const player = new Player(client);

player.on("trackStart", (queue, track) => {
    const duration = queue.connection.audioResource?.playbackDuration;
    if (duration !== 0) return;

    const propName = `interaction${track.id}`
    const interaction = queue.metadata[propName] ? queue.metadata[propName]:queue.metadata.interaction;

    if (interaction) interaction.editReply({ content: `🎶 | Now playing **${track.title}**!`, ephemeral: true });
    else queue.metadata.channel.send(`🎶 | Now playing **${track.title}**!`);
})
player.on("trackEnd", (queue, track) => {
    const propName = `interaction${track.id}`
    const interaction = queue.metadata[propName] ? queue.metadata[propName]:queue.metadata.interaction;

    if (!interaction) return;
    interaction.editReply({ content: `⭕ | Track **${track.title}** has ended!`, ephemeral: true })
    queue.metadata.lastInteraction = interaction;
})
player.on("trackAdd", async (queue, track) => {
    let interaction;
    const isTrackFirst = track.id === queue.tracks[0].id;

    // console.log(queue.tracks[0].id === track.id)
    if (track === queue.current) queue.play();
    // console.log(queue.tracks, 'tracks')
    // console.log(track)
    if (isTrackFirst && track === queue.current) {
        interaction = queue.metadata.interaction;
        // console.log('first track')
    } else {
        // console.log('not first track')
        // const positionInTracks = queue.tracks.findIndex(trck => trck === track);
        // console.log(positionInTracks)
        const keyNameForInteractionValue = `interaction${track.id}`;
        // console.log(propName)
        interaction = queue.metadata[keyNameForInteractionValue];
        // console.log(interaction);
    }
    
    // console.log(interaction)
    if (interaction) interaction.editReply({ content: `✅ | Track **${track.title}** added to queue!`, ephemeral: true })
    else queue.metadata.channel.send(`✅ | Track **${track.title}** added to queue!`)
})
player.on("tracksAdd", (queue, tracks) => {
    let interaction;
    const isTrackFirst = tracks[0].id === queue.tracks[0].id;
    const isTrackInCurrentlyPlaying = tracks[0] === queue.current;

    if (isTrackInCurrentlyPlaying) queue.play();
    if (isTrackFirst && isTrackInCurrentlyPlaying) {
        interaction = queue.metadata.interaction;
    } else {
        const keyNameForInteractionValue = `interaction${tracks[0].id}`;
        interaction = queue.metadata[keyNameForInteractionValue];
    }
    
    if (interaction) interaction.editReply({ content: `✅ | Added ${tracks.length} tracks to queue!\nFirst track in playlist : **${tracks[0].title}**`, ephemeral: true })
    else queue.metadata.channel.send(`✅ | Added ${tracks.length} tracks to queue!\nFirst track in playlist : **${tracks[0].title}**`)
})

player.on("queueEnd", queue => {
    // const propName = `interaction${track.id}`
    // const interaction = queue.metadata[propName] ? queue.metadata[propName]:queue.metadata.interaction;
    const interaction = queue.metadata.lastInteraction;

    // console.log(`Queue id:${queue.id} --> has ended`)
    // const message = new Message(client, {channel_id: "886996891865333811", guild_id: "755758989974831135", content: 'test New'})
    if (interaction) interaction.followUp({content: 'Queue has ended!', ephemeral: true});
    else queue.metadata.channel.send('Queue has ended!');

    // console.log(queue.destroyed)
    if (!queue.destroyed) queue.destroy(false)
    // console.log(queue.destroyed)
})

player.on("debug", (queue, debug) => {
    //console.debug(debug);
})

player.on("botDisconnect", (queue, debug) => {
    //console.debug('bot dc wtf', queue.destroyed);
    if (!queue.destroyed) {
        queue.destroy();
        console.debug('bot dc and queue gone');
    }
})

player.on("connectionError", (queue, error) => {
    console.error('Error', queue.destroyed);
    console.debug('Connection error', error);
})


player.on("error", (queue, error) => {
    console.error('Error', queue.destroyed, error);
    if (!queue.destroyed)
        queue.destroy(true);
})


client.on('ready', async () => {
    console.log(`Bot has logged in as ${client.user.tag}`)
    await startup(client, prisma)
    
    //Set Activity Status
    client.user.setActivity('Porn', { type: 'STREAMING', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    
    //Send Message To Channel
    // client.channels.cache.get("780070616081629194").send('Thailand Currently Experiencing Major Internet Outage!\nI won\'t be operating normally until fixed');
    
    console.log('All Bot Commands are ready to be used')
})

client.on('messageCreate', (message) => {
    //Test Send Message
    // if (message.content.toLowerCase() === 'shinchan') { message.channel.send("GAY!") }
    //Check messages for commands
    msgCheck(message, prisma, client, player)
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || !interaction.guildId) return;
    runSlash(interaction, Commands, client, player, GuildMember);
})

process.on('uncaughtException', err => {
    //console.log(err);
    if (err.message === 'Cannot destroy VoiceConnection - it has already been destroyed')
        console.log('VoiceConnection Error, Ignoring this fucking error');
    else {
        console.error(err);
        throw err
    }
})
client.login(process.env.DISCORD_BOT_TOKEN);
return //CHANGE HERE --------------------------------------------------------

client.on('guildMemberUpdate', (oldUser, newUser) => {
    //Update type is not nickname change?
    if (oldUser.nickname === newUser.nickname) return;
    const db = JSON.parse(fs.readFileSync('./data/member-nicknames.json'))
    //Does User currently have a nickname status
    if (db[newUser.guild.id].guildMembers[oldUser.user.id].useStatus) return;

    //Update db with new User Nickname
    db[newUser.guild.id].guildMembers[oldUser.user.id] = {
        ...db[newUser.guild.id].guildMembers[oldUser.user.id],
        nickname: newUser.nickname
    }

    fs.writeFile('./data/member-nicknames.json', JSON.stringify(db, null, 2), () => (
        console.log(`Updated ${newUser.user.username}'s Nickname to ${newUser.nickname} in db for server ${newUser.guild.name}`)
    ))
})

client.on('error', console.warn("client error"));
client.login(process.env.DISCORD_BOT_TOKEN);