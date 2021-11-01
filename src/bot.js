require("dotenv").config();
const { msgCheck, Commands } = require('./message-check.js');
const startup = require('./on-ready.js');
const runSlash = require('./run-slash-commands.js');
const onNickChange = require('./handle-nickname-change.js');
const playerListener = require('./player-eventListeners.js');
const { PrismaClient } = require('@prisma/client')
const { Client, Intents, GuildMember } = require('discord.js');
const { Player } = require("discord-player");
const { Attachment } = require("@discord-player/extractor");
const prisma = new PrismaClient()
const client = new Client({
    partials: ['MESSAGE', 'USER', 'GUILD_MEMBER', 'REACTION'],
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_INTEGRATIONS],
    fetchAllMembers: true
});
const player = new Player(client);

client.on('ready', async () => {
    console.log(`Bot has logged in as ${client.user.tag}`)
    await startup(client, prisma)
    
    //Set Activity Status
    client.user.setActivity('Porn', { type: 'STREAMING', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    
    //Send Message To Channel
    // client.channels.cache.get("886996891865333811").send('Yeah fuck you Knyu');
    
    //Set Event Listeners
    playerListener(player);

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

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    //Update type is not nickname change
    if (oldMember.nickname === newMember.nickname) return;
    onNickChange(oldMember, newMember, prisma);
})

client.on('error', () => console.warn("client error"));
process.on('uncaughtException', err => {
    if (err.message === 'Cannot destroy VoiceConnection - it has already been destroyed')
        console.log('VoiceConnection Error, Ignoring this fucking error');
    else throw err
})

client.login(process.env.DISCORD_BOT_TOKEN);