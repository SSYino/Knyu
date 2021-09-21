module.exports = async (msg, args, Interactions, prisma, userId) => {
    const oldNick = msg.member.nickname;
    const newNick = args.join(' ')
    if (newNick.length > 32) { Interactions.send("The Nickname Provided Was Too Long. ( Max: 32 characters )"); return }
    if (!msg.member.manageable) {
        Interactions.reply('Sorry Boss, I can\'t do that.');
        console.error(`Missing Permissions to change nickname for member ${msg.member.user.tag} in guild:\
        \n${msg.guild.name} (${msg.guild.id})`)
        return 
    }


    //Check to see if user has a nickname status
    if (/\[.*\]$/.test(oldNick)) {
        const isUseNicknameStatus = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })
        if (isUseNicknameStatus) {
            Interactions.reply('Please clear your nickname status using ;rs first.');
            return;
        } else console.log('False Alarm: User does not have a nickname status.')
    }

    //Changing Nicknames
    if (!args.length && !oldNick) { Interactions.send('Please provide a nickname to change to.'); return }
    else if (!args.length && oldNick) {
        msg.member.setNickname(null);
        Interactions.send(`${msg.author.username} cleared their nickname from "${oldNick}"`);
        console.log(`${"-".repeat(30)}\n${msg.author.username} cleared their nickname\nPrevious Nickname = ${oldNick}\n${"-".repeat(30)}`);
    }
    else if (!oldNick) {
        msg.member.setNickname(newNick);
        console.log(`${msg.author.username} set their nickname to "${newNick}"`)
    }
    else {
        msg.member.setNickname(newNick);
        Interactions.send(`${newNick}'s nickname was changed from "${oldNick}"`);
        console.log(`${msg.author.username} changed their nickname from "${oldNick}" to ${newNick}`)
    }

    msg.delete().then(() => { }).catch(console.error);
}