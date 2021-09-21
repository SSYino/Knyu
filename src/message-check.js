require("dotenv").config()
const slashCommands = require("../data/slash-commands.js");
const setNickname = require("./commands/nickname.js");
const setNickStatus = require("./commands/nick-status.js");
const afk = require("./commands/afk.js");
const playYt = require("./commands/play-yt.js");
const connection = require("./commands/voice-connection.js");
const bulkDelete = require("./commands/bulk-delete.js");
const playFromFile = require("./commands/play-from-file.js")
const botDebug = require("./commands/bot-debug.js")

const Commands = {
    setNickname,
    setNickStatus,
    afk,
    playYt,
    connection,
    bulkDelete,
    playFromFile,
    botDebug
}
const AFKKeywords = ['afk', 'fak', 'akf', 'afl', 'sfk', 'adk', 'agk'];
const VoiceCommands = ['play', 'p', 'stop', 'skip', 'fs', 'clear', 'join', 'leave', 'queue', 'q', 'nowplaying', 'np', 'destroy', 'remove', 'rem', 'seek', 'pause', 'shuffle', 'repeat'];

module.exports = {
    async msgCheck(msg, prisma, client, player) {
        if (!msg.content.startsWith(process.env.PREFIX) || msg.author.bot) return;
        if (msg.content === ';') { msg.reply('You did not type a command!'); return };

        const userId = msg.member.user.id;
        const Interactions = {
            send(_msg) { msg.channel.send(_msg) },
            reply(_msg) { msg.reply(_msg) }
        }
        const textArr = msg.content.split(/\s+/);
        const command = textArr.shift().substr(1).toLowerCase();
        const args = textArr;

        if (AFKKeywords.includes(command)) {
            Commands.afk(msg, Commands.setNickStatus, Interactions, userId, prisma, client);
            return;
        }
        if (VoiceCommands.includes(command)) {
            Commands.playYt({ command, msg, args, client, player });
            return;
        }
        switch (command) {
            case 'id':
                if (!args.length) { Interactions.send(`<@${msg.author.id}> Your ClientID is: ${msg.author.id}`); return }
                else if (!msg.mentions.users.size) { Interactions.reply("You must mention a user.\nType \"@\" followed by the name of the user"); return }
                else if (msg.mentions.users.size > 1) { Interactions.reply("You must mention 1 user at a time."); return }
                else Interactions.send(`<@${msg.mentions.users.first().id}>'s ClientID is: ${msg.mentions.users.first().id}`);
                break;
            case 'im':
            case 'removeStatus'.toLowerCase():
            case 'remStatus'.toLowerCase():
            case 'rs':
                Commands.setNickStatus(command, msg, args, Interactions, client, prisma);
                break;
            case 'nick':
                Commands.setNickname(msg, args, Interactions, prisma, userId);
                break;
            case 'delete':
            case 'del':
                Commands.bulkDelete(msg, args, client);
                break;
            // case 'play':
            // case 'p':
            // case 'stop':
            // case 'skip':
            // case 'fs':
            //     await Commands.playYt({ command, msg, args, client, player });
            //     break;
            // case 'join':
            // case 'leave':
            //     Commands.connection(msg, command); //FIX THIS---------------------------------
            //     break;
            case 'pff':
                Commands.playFromFile(msg, args, client);
                break;
            case 'deploy':
                slashCommands(msg, client);
                break;
            case 'manage':
                botDebug(msg, prisma);
                break;
            default:
                Interactions.send('That Command does not exist.')
        }
    },
    Commands
}