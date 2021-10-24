module.exports = async function (client, prisma) {
    const clientGuilds = client.guilds.cache;
    const guildsDb = await prisma.guild.findMany();
    let guildsInDiscordCache = [];
    let guildIdsInDatabase = [];
    let guildData = [];

    if (!guildsDb.length) {

        for (const guild of clientGuilds) {
            guildData.push({
                id: guild[1].id,
                name: guild[1].name
            })
        }

        await prisma.guild.createMany({
            data: guildData
        })
    }
    else {

        for (const guild of clientGuilds) {
            guildsInDiscordCache.push(guild[1].id)
        }

        for (const guild of guildsDb) {
            guildIdsInDatabase.push(guild.id)
        }

        for (const cachedGuildId of guildsInDiscordCache) {
            if (!guildIdsInDatabase.includes(cachedGuildId)) {
                await prisma.guild.create({
                    data: {
                        id: cachedGuildId,
                        name: clientGuilds.get(cachedGuildId).name
                    }
                })
            }
        }
    }
}
