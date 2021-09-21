const { OpusEncoder } = require('@discordjs/opus');
const ffmpeg = require('ffmpeg-static');
const ytdl = require('ytdl-core-discord');
const sodium = require('libsodium-wrappers')
const { join } = require("path")
const { NoSubscriberBehavior, createAudioPlayer, createAudioResource } = require("@discordjs/voice");
const { Player } = require("discord-player")

module.exports = async function (arguments) {
    let command = '';
    let msg;
    let args = [];
    const interaction = arguments.interaction;
    if (interaction) {
        command = interaction.commandName;
        msg = interaction;
        args = interaction.options.get('song').value.split(' ');
    }
    else {
        command = arguments.command;
        msg = arguments.msg;
        args = arguments.args;
    }

    const player = arguments.player
    let queue = player.getQueue(msg.member.guild.id);

    if (command === 'play' || command === 'p') {
        try {
            if (!msg.member.voice.channelId) return await msg.reply("You are not in a voice channel!");
            if (msg.member.guild.me.voice.channelId && msg.member.voice.channelId !== msg.member.guild.me.voice.channelId) return await msg.reply("We are not in the same voice channel!");
            if (!args.length) return await msg.reply(`❌ | Please provide a track to play.`);

            let query = args.join(' ');
            let isPlaylist = false;
            let isTrackAcceptable = true;

            let regex = /(?:(?:https?):\/\/|www\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|\-$])/igm
            const hasURL = query.match(regex);
            if (hasURL && hasURL.length > 1) {
                if (interaction) return msg.reply({ content: "🛑 | Please provide one URL at a time.", ephemeral: true })
                else return msg.reply("🛑 | Please provide one URL at a time.")
            }

            if (!queue) {
                queue = player.createQueue(msg.member.guild, {
                    metadata: {
                        interaction: interaction,
                        channel: msg.channel
                    },
                    leaveOnEnd: false,
                    leaveOnEmpty: false,
                    ytdlOptions: {
                        filter: 'audioonly',
                        // liveBuffer: 20000,
                        quality: 'highestaudio',
                        highWaterMark: 15625 << 13 //128MB
                    },
                    // bufferingTimeout: 0
                });
            }

            // verify vc connection - ~750 ms
            try {
                if (!queue.connection) await queue.connect(msg.member.voice.channel);
            } catch {
                await msg.reply("Could not join your voice channel!");
                try {
                    if (!queue.destroyed) queue.destroy();
                    return;
                } catch { return console.log("Could not destroy queue!") }
            }

            if (interaction) await msg.deferReply({ ephemeral: true });

            query = hasURL === null ? query : hasURL[0];

            const track = await player.search(query, {
                requestedBy: msg.member.user
            }).then(res => {
                if (res.playlist) {
                    if (res.playlist.tracks.length > 50) {
                        isTrackAcceptable = false;
                        return;
                    }
                    isPlaylist = true;
                    return res.playlist.tracks;
                } else return res.tracks[0]
            })
            // console.log(msg.user, 'undef')
            // console.log(msg.member.user, 'user')
            // console.log(track, 'teracj')
            if (!isTrackAcceptable) {
                msg.reply("Cannot add playlists longer than 50 tracks (for now)");
                return;
            }
            if (!track) {
                if (isPlaylist) {
                    if (interaction) return await msg.editReply(`❌ | Playlist **${query}** not found!`);
                    return msg.reply(`❌ | Playlist **${query}** not found!`);
                } else {
                    if (interaction) return await msg.editReply(`❌ | Track **${query}** not found!`);
                    return msg.reply(`❌ | Track **${query}** not found!`);
                }
            }

            if (queue.tracks.length !== 0 || queue.current) {
                if (isPlaylist) {
                    const newPropName = `interaction${track[0].id}`
                    queue.metadata[newPropName] = interaction;
                } else {
                    const newPropName = `interaction${track.id}`
                    queue.metadata[newPropName] = interaction;
                }
            }

            if (isPlaylist) queue.addTracks(track)
            else queue.addTrack(track);

        } catch (err) {
            if (interaction) msg.followUp("Error: Failed to play song.")
            else msg.channel.send("Error: Failed to play song.")
            console.error(err);
        }


    }

}