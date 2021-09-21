const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require("@discordjs/voice");
const { join } = require("path")

module.exports = async (msg, args, client) => {
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
        }
    })
    const resource = await createAudioResource(join(__dirname, "../../data/audio/Do_it_Pikachu.mp3"), {
        metadata: {
            title: 'play from file',
        }
    });
    
    const connection = joinVoiceChannel({
        channelId: msg.member.voice.channelId,
        guildId: msg.guildId,
        adapterCreator: msg.guild.voiceAdapterCreator,
    })

    connection.subscribe(player);
    player.play(resource);
}