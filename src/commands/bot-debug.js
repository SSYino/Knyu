module.exports = async (msg, prisma) => {
    const guildId = msg.guild.id;
    const knyu = msg.guild.members.cache.get("877415959516815380");
    const result = await prisma.guild.findFirst({
        where: {
            id: guildId
        },
        select: {
            isBotInDebugMode: true
        }
    })
    const isBotInDebugMode = result.isBotInDebugMode;
    if (isBotInDebugMode) {
        const result = await prisma.guild.findFirst({
            where: {
                id: guildId
            }
        })
        const rolesArr = result.clientRolesId;
        //update database true or false
        const successfullyUpdated = await knyu.roles.set(rolesArr.slice(0, -1)); //Don't set last role (@everyone)
        if (successfullyUpdated) {
            await prisma.guild.update({
                where: {
                    id: guildId
                },
                data: {
                    isBotInDebugMode: false
                }
            })
            console.log('Successfully updated db isBotInDebugMode(false)')
            msg.reply('📊 | Knyu in production mode')
        }
        else {
            console.log(successfullyUpdated)
        }
    }
    else {
        await knyu.roles.set([])
        await prisma.guild.update({
            where: {
                id: guildId
            },
            data: {
                isBotInDebugMode: true
            }
        })
        console.log('Successfully updated db isBotInDebugMode(true)')
        msg.reply('🔧 | Knyu in debug mode')
    }
}