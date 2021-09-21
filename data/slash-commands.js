module.exports = async (msg,client) => {
    const clientApp = await client.application.fetch(client.application.id);

    if (msg.author.id !== clientApp.owner.id) return;

    await client.guilds.cache.get(msg.guild.id)?.commands.set([
        {
            name: 'play',
            description: 'Plays a song',
            options: [
                {
                    name: 'song',
                    type: 'STRING',
                    description: 'The URL of the song to play or the keyword to search the song',
                    required: true,
                },
            ],
        },
        {
            name: 'skip',
            description: 'Skip to the next song in the queue',
        },
        {
            name: 'queue',
            description: 'See the music queue',
        },
        {
            name: 'pause',
            description: 'Pauses the song that is currently playing',
        },
        {
            name: 'resume',
            description: 'Resume playback of the current song',
        },
        {
            name: 'leave',
            description: 'Leave the voice channel',
        },
        {
            name: 'join',
            description: 'Join the voice channel',
        },
    ]);
    await msg.reply('Deployed!');
}