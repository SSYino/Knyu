const {
    joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, AudioPlayerStatus,
    NoSubscriberBehavior, entersState, createAudioPlayer, createAudioResource
} = require('@discordjs/voice');

module.exports = async (msg, command) => {
    // if (command === 'join') {
    //     joinVoiceChannel({
    //         channelId: msg.member.voice.channelId,
    //         guildId: msg.guildId,
    //         adapterCreator: msg.guild.voiceAdapterCreator,
    //     })
    // } else if (command === 'leave') {
    //     getVoiceConnection(msg.guildId).destroy();
    // }
}