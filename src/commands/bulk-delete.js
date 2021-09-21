const wait = require('util').promisify(setTimeout);
const dayjs = require('dayjs');
const fs = require('fs')

const allowedRoles = ['manager', 'supervisor', 'circle of trust']
let deleteLock = false;

module.exports = async (msg, args, client) => {
    const clientApp = await client.application.fetch(client.application.id)
    const memberRoles = msg.member.roles.cache
    const grantedAccess = memberRoles
        .map(role => allowedRoles.includes(role.name.toLowerCase()))
        .some(bool => bool);

    if (msg.author.id !== clientApp.owner.id && !grantedAccess) { msg.reply('You do not have that permission.'); return };
    
    if (deleteLock) { msg.reply("Please try again."); return };
    if (args.length > 1) {
        msg.reply(`Please input only numbers of messages to delete.\n;delete (num) OR ;del (num)`);
        return;
    }
    if (+args[0] > 30) { msg.reply("Message delete limit is currently locked at \"30\"."); return };
    if (+args[0] !== parseInt(args[0]) || +args[0] < 1 || args[0] === '') { msg.reply("Please input a positive integer.\n;delete (num) OR ;del (num)"); return };

    deleteLock = true;
    const deletedMessages = await msg.channel.bulkDelete(+args[0] + 1);
    const dateTimeNow = dayjs().format("DD-MM-YYYY_HH:mm:ss");
    try {
        let message = await msg.channel.send(`Deleted ${(args[0] == 1) ? '1 message.' : `${args[0]} messages.`}`);
        const currentObj = JSON.parse(fs.readFileSync("./data/deleted-messages.json"));
        let msgObj = {};
        deletedMessages.forEach(msg => {
            msgObj[msg.id] = {
                channelId: msg.channelId,
                guildId: msg.guildId,
                id: msg.id,
                type: msg.type,
                system: msg.system,
                content: msg.content,
                author: msg.author,
                pinned: msg.pinned,
                tts: msg.tts,
                embeds: msg.embeds,
                components: msg.components,
                attachments: msg.attachments,
                stickers: msg.stickers,
                createdTimestamp: msg.createdTimestamp,
                editedTimestamp: msg.editedTimestamp,
                reactions: msg.reactions,
                mentions: msg.mentions,
                webhookId: msg.webhookId,
                applicationId: msg.applicationId,
                activity: msg.activity,
                flags: msg.flags,
                reference: msg.reference,
                interaction: msg.interaction
        }                
        })
    const timeBefore = dayjs().valueOf();
    const finalObj = {
        ...currentObj,
        [dateTimeNow]: msgObj
    }
    fs.writeFileSync('./data/deleted-messages.json', JSON.stringify(finalObj, null, 8), () => { })
    const timeElapsed = (dayjs().valueOf() - timeBefore);

    console.log(`${'-'.repeat(40)}\nDeleted ${(args[0] == 1) ? '1 message' : `${args[0]} messages`} in guild ` +
        `"${client.guilds.cache.get(msg.guildId).name}"\nInitiated by User "${msg.member.user.tag}"` +
        `\n${dayjs().format("DD-MM-YYYY HH:mm:ss")} (DD-MM-YYYY 24 Hour Time)`);
    console.log("Prepared messages object for updating \"deleted-messages.json\"");
    console.log('Time Ellapsed (ms):', timeElapsed, `\n${'-'.repeat(40)}`);

    await wait((5000 - timeElapsed) < 0 ? 0 : 5000 - timeElapsed);
    await message.delete();
} catch (err) { console.error(err) } finally { deleteLock = false }
}