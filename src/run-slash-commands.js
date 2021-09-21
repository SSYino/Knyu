const { joinVoiceChannel, entersState, VoiceConnectionStatus, AudioPlayerStatus } = require("@discordjs/voice");
// const MusicSubscription = require("./music-subscription");
// const Track = require("./music-track.js");
// const playYt = require("./commands/play-yt.js");
const subscriptions = new Map();

module.exports = async (interaction, Commands, client, player, guildMember) => {
    switch (interaction.commandName) {
        case 'play':
            await Commands.playYt({ interaction, client, player })
            break;
    }
    return

    const channel = interaction.member.voice.channel;
    let subscription = subscriptions.get(interaction.guildId);

    switch (interaction.commandName) {
        case 'play':
            const url = await interaction.options.get('song').value;
            await interaction.deferReply();

            if (!subscription) {
                if (interaction.member instanceof guildMember && channel) {
                    subscription = new MusicSubscription(joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                    }));
                    subscription.voiceConnection.on('error', console.warn);
                    subscriptions.set(interaction.guildId, subscription);
                }
            }
            if (!subscription) {
                await interaction.editReply('Join a voice channel and then try that again!');
                return;
            }

            try {
                await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
            }
            catch (error) {
                console.warn(error);
                await interaction.editReply('Failed to join voice channel within 20 seconds, please try again later!');
                return;
            }
            try {
                // Attempt to create a Track from the user's video URL
                const track = await Track.from(url, {
                    onStart() {
                        interaction.editReply({ content: 'Now playing!', ephemeral: true }).catch(console.warn);
                    },
                    onFinish() {
                        interaction.editReply({ content: 'Now finished!', ephemeral: true }).catch(console.warn);
                    },
                    onError(error) {
                        console.warn(error);
                        interaction.editReply({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn);
                    },
                });
                // Enqueue the track and reply a success message to the user
                subscription.enqueue(track);
                await interaction.editReply(`Enqueued **${track.title}**`);
            }
            catch (error) {
                interaction.editReply('Failed to play track, please try again later!');
                console.warn(error);
            }
            break;
        case 'skip':
            if (subscription) {
                // Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
                // listener defined in music-subscription.js, transitions into the Idle state mean the next track from the queue
                // will be loaded and played.
                subscription.audioPlayer.stop();
                await interaction.reply('Skipped song!');
            }
            else {
                await interaction.reply('Not playing in this server!');
            }
            break;
        case 'queue':
            if (subscription) {
                const current = subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
                    ? `Nothing is currently playing!`
                    : `Playing **${subscription.audioPlayer.state.resource.metadata.title}**`;
                const queue = subscription.queue
                    .slice(0, 5)
                    .map((track, index) => `${index + 1}) ${track.title}`)
                    .join('\n');
                await interaction.reply(`${current}\n\n${queue}`);
            }
            else {
                await interaction.reply('Not playing in this server!');
            }
            break;
        case 'pause':
            if (subscription) {
                subscription.audioPlayer.pause();
                await interaction.reply({ content: `Paused!`, ephemeral: true });
            }
            else {
                await interaction.reply('Not playing in this server!');
            }
            break;
        case 'resume':
            if (subscription) {
                subscription.audioPlayer.unpause();
                await interaction.reply({ content: `Unpaused!`, ephemeral: true });
            }
            else {
                await interaction.reply('Not playing in this server!');
            }
            break;
        case 'leave':
            if (subscription) {
                subscription.voiceConnection.destroy();
                subscriptions.delete(interaction.guildId);
                await interaction.reply({ content: `Left channel!`, ephemeral: true });
            }
            else {
                await interaction.reply('Not playing in this server!');
            }
            break;
        case 'join':
            await interaction.defer();
            if (!subscription) {
                if (interaction.member instanceof guildMember && channel) {
                    subscription = new MusicSubscription(joinVoiceChannel({
                        channelId: channel.id,
                        guildId: channel.guild.id,
                        adapterCreator: channel.guild.voiceAdapterCreator,
                    }));
                    await interaction.reply({ content: `Joined channel!`, ephemeral: true })
                    subscription.voiceConnection.on('error', console.warn);
                    subscriptions.set(interaction.guildId, subscription);
                }
            }
            if (!subscription) {
                await interaction.reply('Join a voice channel and then try that again!');
                return;
            }
            break;
        default:
            console.error('no such slash command');
    }
}