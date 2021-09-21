module.exports = async (msg, args, Interactions, prisma, userId) => {
    const oldNick = msg.member.nickname;
    const newNick = args.join(' ')
    const updateDb = async (guildId, userId, userNickname) => {
        const results = await prisma.guildUser.update({
            where: {
                guild_id_user_id: {
                    guild_id: guildId,
                    user_id: userId
                }
            },
            data: {
                nickname: userNickname
            }
        })

        return results;
    }

    if (newNick.length > 32) { Interactions.send("The Nickname Provided Was Too Long. ( Max: 32 characters )"); return }
    if (!msg.member.manageable) {
        Interactions.reply('Sorry Boss, I can\'t do that.');
        console.error(`Missing Permissions to change nickname for member ${msg.member.user.tag} in guild:\
        \n${msg.guild.name} (${msg.guild.id})`)
        return
    }

    let hasNickStatus = false;
    let userDb;

    //Check to see if user has a nickname status
    if (/\[.*\]$/.test(oldNick)) {
        userDb = await prisma.guildUser.findFirst({
            where: {
                guild_id: msg.guild.id,
                user_id: userId
            },
            select: {
                nickname: true,
                nickname_status: true
            }
        })

        if (userDb) hasNickStatus = true;
        else console.log('False Alarm: User does not have a nickname status.')
    }

    //Changing Nicknames
    if (!args.length && (!oldNick || (hasNickStatus && !userDb.nickname))) { Interactions.send('Please provide a nickname to set.'); return }
    else if (!args.length && oldNick) {
        if (hasNickStatus) {
            const nickname = userDb.nickname;
            const status = `[${userDb.nickname_status}]`
            
            if (`${msg.author.username} ${status}`.length > 32) {
                Interactions.reply("Unable to remove nickname, username too long ( Display Max: 32 characters )\nTry removing nickname status with \`;rs\` for more space");
                return
            }

            msg.member.setNickname(`${msg.author.username} ${status}`);
            Interactions.send(`${msg.author.username} cleared their nickname from "${nickname}"`);
            console.log(`${"-".repeat(30)}\n${msg.author.username} cleared their nickname\nPrevious Nickname = ${nickname}\n${"-".repeat(30)}`);
        }
        else {
            msg.member.setNickname(null);
            Interactions.send(`${msg.author.username} cleared their nickname from "${oldNick}"`);
            console.log(`${"-".repeat(30)}\n${msg.author.username} cleared their nickname\nPrevious Nickname = ${oldNick}\n${"-".repeat(30)}`);
        }

        if (hasNickStatus) updateDb(msg.guild.id, userId, null);
    }
    else {
        if (hasNickStatus) {
            const status = `[${userDb.nickname_status}]`
            
            if (`${newNick} ${status}`.length > 32) {
                Interactions.reply("The Nickname Provided Was Too Long. ( Max: 32 characters )\nTry removing nickname status with \`;rs\` for more space");
                return
            }
            
            msg.member.setNickname(`${newNick} ${status}`)
        }
        else msg.member.setNickname(newNick);
        
        if (!oldNick || (hasNickStatus && !userDb.nickname)) {
            console.log(`${msg.author.username} set their nickname to "${newNick}"`)
            if (hasNickStatus) updateDb(msg.guild.id, userId, newNick);
        }
        else {
            if (hasNickStatus) {
                const nickname = userDb.nickname;

                Interactions.send(`${newNick}'s nickname was changed from "${nickname}"`);
                console.log(`${msg.author.username} changed their nickname from "${nickname}" to ${newNick}`)

                updateDb(msg.guild.id, userId, newNick);
            }
            else {
                Interactions.send(`${newNick}'s nickname was changed from "${oldNick}"`);
                console.log(`${msg.author.username} changed their nickname from "${oldNick}" to ${newNick}`)
            }
        }
    }

    msg.delete().then(() => { }).catch(console.error);
}