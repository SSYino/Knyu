module.exports = async (oldMember, newMember, prisma) => {
    const userInDb = await prisma.guildUser.findFirst({
        where: {
            guild_id: newMember.guild.id,
            user_id: newMember.id
        },
        select: {
            nickname: true,
            nickname_status: true
        }
    })
    if (!userInDb) return;

    const deleteEntry = async () => {
        await prisma.guildUser.delete({
            where: {
                guild_id_user_id: {
                    guild_id: newMember.guild.id,
                    user_id: newMember.id
                }
            }
        })

        const guildUserDataArr = await prisma.guildUser.findMany({
            where: {
                user_id: newMember.id
            }
        })
        const hasNickStatusOtherGuilds = Boolean(guildUserDataArr.length);

        if (hasNickStatusOtherGuilds) return
        else {
            await prisma.user.delete({
                where: {
                    id: newMember.id
                }
            })
        }
    }

    if (newMember.nickname === null) { deleteEntry(); return }

    const searchStr = " [";
    const indexOfFirstFind = newMember.nickname.lastIndexOf(searchStr)
    const nicknameDb = userInDb.nickname;
    const nickStatusDb = userInDb.nickname_status;
    const nicknameNew = newMember.nickname.slice(0, indexOfFirstFind).trim();
    const nickStatusNew = newMember.nickname
        .slice(indexOfFirstFind)
        .trim()
        .toUpperCase()
        .slice(1, -1);

    if ((nicknameNew === nicknameDb || nicknameDb === null) && nickStatusNew === nickStatusDb) return;

    const regex = /\s\[.*\]$/
    const hasStatusFormat = regex.test(newMember.nickname)

    if (!hasStatusFormat) {
        deleteEntry();
        return;
    }

    console.log(`${newMember.user.username} changed their nickname manually\nFrom "${oldMember.nickname}" to "${newMember.nickname}"`)
    if (nicknameNew !== nicknameDb) {
        //change nickname in db
        await prisma.guildUser.update({
            where: {
                guild_id_user_id: {
                    guild_id: newMember.guild.id,
                    user_id: newMember.id
                }
            },
            data: {
                nickname: nicknameNew
            }
        })

        if (nickStatusNew !== nickStatusDb) {
            //change nickstatus in db
            await prisma.guildUser.update({
                where: {
                    guild_id_user_id: {
                        guild_id: newMember.guild.id,
                        user_id: newMember.id
                    }
                },
                data: {
                    nickname_status: nickStatusNew
                }
            })
        }
    }
    else {
        if (nickStatusNew !== nickStatusDb) {
            //change nickstatus in db
            await prisma.guildUser.update({
                where: {
                    guild_id_user_id: {
                        guild_id: newMember.guild.id,
                        user_id: newMember.id
                    }
                },
                data: {
                    nickname_status: nickStatusNew
                }
            })
        }
        else {
            console.log('then wtf changed!')
        }
    }
}