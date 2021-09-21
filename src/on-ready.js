module.exports = async function (client, prisma) {
    const clientGuilds = client.guilds.cache;
    const guildsDb = await prisma.guild.findMany();
    let guildsInDiscordCache = [];
    let guildIdsInDatabase = [];
    let guildData = [];

    if (!guildsDb.length) {
        clientGuilds.forEach(guild => {
            guildData.push({
                id: guild.id,
                name: guild.name,
                clientRolesId: guild.members.cache.get(process.env.KNYU_UUID).roles.cache.map(role => role.id),
                clientRolesName: guild.members.cache.get(process.env.KNYU_UUID).roles.cache.map(role => role.name)
            })
        })
        
        await prisma.guild.createMany({
            data: guildData
        })
    }
    else {
        clientGuilds.forEach(guild => {
            guildsInDiscordCache.push(guild.id)
        })
        for (let guild of guildsDb) {
            guildIdsInDatabase.push(guild.id)
        }

        for (const cachedGuildId of guildsInDiscordCache) {
            if (!guildIdsInDatabase.includes(cachedGuildId)) {
                await prisma.guild.create({
                    id: cachedGuildId,
                    name: clientGuilds.get(cachedGuildId).name
                })
            }
        }
    }
}