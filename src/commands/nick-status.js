const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const AFKKeywords = ['afk', 'fak', 'akf', 'afl', 'sfk', 'adk', 'agk'];

module.exports = async (command, msg, args, Interactions, client, prismaOld) => {
    const userId = msg.member.id;
    let memberNotInGuildsId = []
    let skippedGuildsName = [];
    let skippedGuildsId = [];
    let updateExceptions = [];

    //User wants to set nickname.
    if (command === 'im') {
        if (!args.length) { Interactions.reply('You did not provide a status.'); return };

        const nickStatus = args.join(' ').toUpperCase();
        let wasAfk = false;
        let canChangeNicknameStatus = true;
        let nicknames = await prisma.guildUser.findMany({
            where: {
                user_id: userId
            },
            select: {
                guild_id: true,
                nickname: true
            }
        });

        const guildsInCache = client.guilds.cache;
        const guildsInCacheArr = guildsInCache.map(guild => guild);
        const memberInGuildsArr = guildsInCache.map(guild => guild.members.cache.get(userId))
        for (const member of memberInGuildsArr) {
            if (!member) continue;
            let userNickname;
            for (const obj of nicknames) {
                if (obj.guild_id === member.guild.id) {
                    userNickname = obj.nickname;
                }
            }
            userNickname = userNickname ?? member.user.username
            if (`${userNickname} [${nickStatus}]`.length > 32) {
                canChangeNicknameStatus = false;
                break;
            }
        }
        //Bot cannot update Nickname Status (Displayname is too long)
        if (!canChangeNicknameStatus) {
            Interactions.reply("Display Name Length Cannot Exceed 32 Characters.");
            return;
        }

        const isUserInDatabase = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })
        const isUserUsingNickStatus = await prisma.guildUser.findFirst({
            where: {
                guild_id: msg.guild.id,
                user_id: userId
            }
        })

        //User is not in Database
        if (!isUserInDatabase) {
            if (isUserUsingNickStatus) { console.error("Error: User is in \"_UserOnGuild\" Table but is not in \"User\" Table"); return }

            const log = `Given ${msg.member.user.username} a Status of "${nickStatus}"`;

            for (const guild of guildsInCacheArr) {
                const member = guild.members.cache.get(userId)
                //User is NOT in Guild
                if (!member) {
                    memberNotInGuildsId.push(guild.id);
                    continue
                }
                //User IS in Guild, but is NOT manageable
                if (!member.manageable) {
                    skippedGuildsName.push(member.guild.name)
                    skippedGuildsId.push(member.guild.id)
                    continue
                }
            }

            if (skippedGuildsId.length + memberNotInGuildsId.length === memberInGuildsArr.length) {
                Interactions.reply("Sorry Boss, I can't do that.")
                console.error(`Missing Permissions to change nickname status for member ${msg.member.user.tag} in guild(s):\
                \n${JSON.stringify(skippedGuildsName)}\n(${skippedGuildsId.join(', ')})`)
                return
            }

            for (const i in skippedGuildsId) {
                updateExceptions.push({
                    guild_id: skippedGuildsId[i]
                })
            }

            await prisma.user.create({
                data: {
                    id: userId,
                    tag: msg.member.user.tag,
                    username: msg.author.username
                }
            })

            const serverIdsArr = Object.keys(Object.fromEntries(client.guilds.cache));
            for (const serverId of serverIdsArr) {

                if (skippedGuildsId.includes(serverId)) continue;
                if (memberNotInGuildsId.includes(serverId)) continue;

                const member = client.guilds.cache.get(serverId).members.cache.get(userId);
                await prisma.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        guilds: {
                            create: {
                                guild_id: serverId,
                                username: msg.author.username,
                                nickname: member.nickname,
                                nickname_status: args.join(' ').toUpperCase()
                            }
                        }
                    }
                })
                let userNickname = member.nickname;
                userNickname = userNickname ? userNickname : member.user.username
                member.setNickname(`${userNickname} [${nickStatus}]`);
            }
            console.log(`Added User "${msg.author.username}" to \"User\" Table`)

            //Argument passed as nickname status IS "AFK"
            if (args.length === 1 && AFKKeywords.includes(args[0])) {
                console.log(`${msg.member.user.username} went AFK.`);
                wasAfk = true;
            }
            else if (!skippedGuildsId.length) {
                Interactions.send(log)
                console.log(log)
            }
            else {
                Interactions.send(`${log} for some Servers.\nSkipped Servers: ${JSON.stringify(skippedGuildsName)}`)
                console.log(`${log} for some Servers.\nSkipped Servers: ${JSON.stringify(skippedGuildsName)}`)
            }
        }
        //User is already in Database and wants to update their nickname status
        else {
            if (!isUserUsingNickStatus) console.error("Error: User is in \"User\" Table but is not in \"_UserOnGuild\" Table");

            const nickStatus = args.join(' ').toUpperCase();
            const log = `Updated ${msg.member.user.username}'s Status to "${nickStatus}"`;

            for (const member of memberInGuildsArr) {
                if (!member) continue;
                if (!member.manageable) {
                    skippedGuildsName.push(member.guild.name)
                    skippedGuildsId.push(member.guild.id)
                    continue
                }
                let userNicknameObj = await prisma.guildUser.findFirst({
                    where: {
                        guild_id: member.guild.id,
                        user_id: member.user.id
                    },
                    select: {
                        nickname: true,
                    }
                })
                if (!userNicknameObj) {
                    const newUserNicknameObj = await prisma.guildUser.create({
                        data: {
                            guild: {
                                connect: {id: member.guild.id}
                            },
                            user: {
                                connect: {id: member.id}
                            },
                            username: member.user.username,
                            nickname: member.nickname,
                            nickname_status: nickStatus
                        },
                    })

                    userNicknameObj = newUserNicknameObj;
                }
                if (!userNicknameObj.nickname) member.setNickname(`${msg.member.user.username} [${nickStatus}]`)
                else member.setNickname(`${userNicknameObj.nickname} [${nickStatus}]`);
            }
            //Argument passed as nickname status IS "AFK"
            if (args.length === 1 && AFKKeywords.includes(args[0])) {
                console.log(`${msg.member.user.username} went AFK.`);
                wasAfk = true;
            }
            //Argument(s) passed as nickname status is NOT "AFK"
            //Was some guilds skipped for status changing?
            else if (!skippedGuildsName.length) {
                Interactions.send(log)
                console.log(log)
            }
            else {
                Interactions.send(`${log} for some Servers.\nSkipped Servers: ${JSON.stringify(skippedGuildsName)}`)
                console.log(`${log} for some Servers.\nSkipped Servers: ${JSON.stringify(skippedGuildsName)}`)
                for (const i in skippedGuildsId) {
                    updateExceptions.push({
                        guild_id: skippedGuildsId[i]
                    })
                }
                console.log(updateExceptions)
            }

            await prisma.guildUser.updateMany({
                where: {
                    user_id: userId,
                    NOT: updateExceptions
                },
                data: {
                    nickname_status: args.join(' ').toUpperCase()
                }
            })

        }

        //No Guild Skipped
        if (!skippedGuildsName.length) {
            //Argument passed as nickname status IS "AFK"
            if (args.length === 1 && AFKKeywords.includes(args[0])) {
                await prisma.guildUser.updateMany({
                    where: {
                        user_id: userId
                    },
                    data: {
                        nickname_status: 'AFK',
                        isAFK: true
                    }
                })
            }
            //Argument(s) passed as nickname status is NOT "AFK"
            else {
                await prisma.guildUser.updateMany({
                    where: {
                        user_id: userId
                    },
                    data: {
                        isAFK: false
                    }
                })
                if (wasAfk) {
                    console.log(`${msg.member.user.username} is no longer AFK.`)
                }
            }
        }
        //Some Guild Skipped
        else {
            //Argument passed as nickname status IS "AFK"
            if (args.length === 1 && AFKKeywords.includes(args[0])) {
                await prisma.guildUser.updateMany({
                    where: {
                        user_id: userId,
                        NOT: updateExceptions
                    },
                    data: {
                        nickname_status: 'AFK',
                        isAFK: true
                    }
                })
            }
            //Argument(s) passed as nickname status is NOT "AFK"
            else {
                await prisma.guildUser.updateMany({
                    where: {
                        user_id: userId,
                        NOT: updateExceptions
                    },
                    data: {
                        isAFK: false
                    }
                })
                if (wasAfk) {
                    console.log(`${msg.member.user.username} is no longer AFK.`)
                }
            }
        }

        msg.delete().then(() => { }).catch(console.error);
    }
    //User wants to remove nickname status
    else {
        const isUserInDatabase = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })
        const isUserUsingNickStatus = await prisma.guildUser.findFirst({
            where: {
                guild_id: msg.guild.id,
                user_id: userId
            }
        })

        if (isUserInDatabase) {
            try {
                if (!isUserUsingNickStatus) throw "Error: User is in \"User\" Table but is not in \"_UserOnGuild\" Table"
            } catch (err) { console.error(err) }

            const guildUserTable = await prisma.guildUser.findMany({
                where: {
                    user_id: userId
                },
                select: {
                    guild_id: true,
                    username: true,
                    nickname: true,
                    nickname_status: true
                }
            })
            for (const entry of guildUserTable) {
                const member = client.guilds.cache.get(entry.guild_id).members.cache.get(userId)
                if (!entry.nickname) {
                    member.setNickname(null)
                } else member.setNickname(`${entry.nickname}`)
            }
            if (guildUserTable[0].nickname_status !== 'AFK') {
                Interactions.send(`Removed ${msg.author.username}'s nickname status.`)
                console.log(`Removed ${msg.author.username}'s nickname status.`)
            }

            await prisma.guildUser.deleteMany({
                where: {
                    user_id: userId
                }
            })
            await prisma.user.deleteMany({
                where: {
                    id: userId
                }
            })

            if (guildUserTable[0].nickname_status === 'AFK') {
                console.log(`${msg.member.user.username} is no longer AFK.`)
            }
        } else {
            if (isUserUsingNickStatus) console.error("Error: User is in \"_UserOnGuild\" Table but is not in \"User\" Table")
            Interactions.send('You do not currently have a nickname status.');
            return;
        }
        msg.delete().then(() => { }).catch(console.error);
    }
}