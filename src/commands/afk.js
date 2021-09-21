const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = async (msg, setNickStatus, Interactions, userId, prismaOld, client) => {
    const guildUser = await prisma.guildUser.findFirst({
        where: {
            user_id: userId
        },
        select: {
            isAFK: true
        }
    })

    if (guildUser?.isAFK) {
        setNickStatus('rs', msg, [], Interactions, client, prisma);
    }
    else {
        setNickStatus('im', msg, ['afk'], Interactions, client, prisma);
    }
}