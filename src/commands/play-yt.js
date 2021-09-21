const { OpusEncoder } = require('@discordjs/opus');
const ffmpeg = require('ffmpeg-static');
const ytdl = require('ytdl-core-discord');
const sodium = require('libsodium-wrappers')
const { join } = require("path")
const { NoSubscriberBehavior, createAudioPlayer, createAudioResource } = require("@discordjs/voice");
const { Player } = require("discord-player");

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
            if (!args.length) {
                if (queue?.setPaused()) {
                    queue.setPaused(false)
                    return msg.reply("Resumed Playing")
                }
                else return await msg.reply(`❌ | Please provide a track to play.`);
            }

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
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 5000,
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
                        console.log('too long of a playlist')
                        // isTrackAcceptable = false; //REMOVE COMMENT -------------------------------------
                        // return; //REMOVE COMMENT -------------------------------------
                    }
                    isPlaylist = true;
                    return res.playlist.tracks;
                } else return res.tracks[0]
            })
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
    else if (command === 'stop') {
        if (!queue) return msg.reply("I am not playing any music.")
        if (!msg.member.voice.channelId) return msg.reply("You are not in my voice channel!");
        if (msg.member.guild.me.voice.channelId && msg.member.voice.channelId !== msg.member.guild.me.voice.channelId) return await msg.reply("We are not in the same voice channel!");

        queue.metadata.stopped = true;
        queue.stop();
        msg.reply("Left the voice channel and cleared the queue")

        if (!queue.destroyed) queue.destroy(false);
        return
    }
    else if (command === 'q' || command === 'queue') {
        if (!queue) return msg.reply("No queue exists yet\nAdd songs with `;play` `;p` or try private slash commands `/play`")

        if (queue.current) {
            let returnStr = `**Now Playing: ${queue.current.title}**\n`
            if (!queue.toJSON().tracks.length) returnStr += `\n**No Upcoming Songs**`
            else returnStr += `\n${queue.toString()}\n\n🎧`

            msg.reply(returnStr);
            return;
        }
        else {
            msg.reply(queue.toString());
            return;
        }
    }
    else if (command === 'skip' || command === 'fs') {
        if (!queue?.current) return msg.reply("No Song Currently Playing")
        if (!msg.member.voice.channelId) return msg.reply("You are not in my voice channel!");
        if (msg.member.guild.me.voice.channelId && msg.member.voice.channelId !== msg.member.guild.me.voice.channelId) return await msg.reply("We are not in the same voice channel!");

        try {
            const currentlyPlaying = await queue.current;
            const hasSkippedTrack = await queue.skip();
            if (hasSkippedTrack) {
                return msg.reply(`Skipped Track **${currentlyPlaying.title}**`)
            }
            else return msg.reply(`Unable to skip track **${currentlyPlaying.title}**`)
        } catch (err) { console.error(err); return msg.reply("Error: Unable to skip track") }
    }
    else if (command === 'clear') {
        if (!queue?.tracks.length) return msg.reply("Queue is already empty")

        try {
            const queueLength = queue.tracks.length;
            queue.clear();
            return msg.reply(`Cleared Queue\nRemoved **${queueLength}** Songs`)
        } catch (err) { return console.error(err) }
    }
    else if (command === 'np' || command === 'nowplaying') {
        if (!queue?.current) return msg.reply("No Song Currently Playing")

        let returnStr = `Now Playing: ${queue.nowPlaying().title}\n`
        returnStr += `\`${queue.createProgressBar({
            timecodes: true,
            queue: false
        })}\``
        return msg.reply(returnStr)
    }
    else if (command === 'rem' || command === 'remove') {
        if (!queue) return msg.reply("No queue exists yet")
        if (!args.length) return msg.reply("Please specify the track number to remove from queue `;remove <Track Number>`\nType `;queue` or `;q` to see track number\n\nWould you like to clear the queue instead?\nTry `;clear`")
        if (args.length > 1) return msg.reply("Please provide only \"one\" track number")
        if (+args[0] !== parseInt(args[0]) || +args[0] < 1 || args[0] === '')
            return msg.reply("Please input a valid track number\n`;remove <Track Number>' OR `;rem <Track Number>`");
        if (!queue.tracks[+args[0] - 1]) return msg.reply("That track does not exist")

        try {
            const trackId = queue.tracks[+args[0] - 1].id;
            const removedTrack = queue.remove(trackId);
            return msg.reply(`Removed Track **${removedTrack.title}**`)
        } catch (err) { return console.error(err) }

    }
    else if (command === 'pause') {
        if (!queue?.current) return msg.reply("No Song Currently Playing")

        const isPaused = queue.setPaused();
        if (isPaused) {
            console.log(isPaused, 'inif')
            return msg.reply("Resumed Playing (For now)")
        }
        else {
            console.log(isPaused, 'inelse')
            queue.setPaused(true);
            return msg.reply("Paused the player")
        }
    }
    else if (command === 'seek') { //Seek command fucking sucks
        return msg.reply("**🚧 | Seek Command Under Heavy Construction!**")
        // if (!queue?.current) return msg.reply("No Song Currently Playing")

        // try {
        //     const didSeek = await queue.seek(args.join(' '));
        //     console.log(didSeek);
        // } catch (err) {
        //     msg.reply("Could not seek to provided position")
        //     return console.error(err)
        // }
    }
    else if (command === 'shuffle') {
        if (!queue) return msg.reply("No Queue Exists")
        if (queue.tracks.length === 0) return msg.reply("No songs in queue\nAdd more songs with `;play` `;p` or try private slash commands `/play`")
        if (queue.tracks.length === 1) return msg.reply("Only 1 song exists in the queue\nShuffle command has no effect\nShuffle command requires at least 3 songs in queue")
        if (queue.tracks.length < 3) return msg.reply("Not enough songs in queue\nShuffle command requires at least 3 songs in queue")

        const shuffled = queue.shuffle()
        if (shuffled) {
            const shuffleMsg = "Shuffled Queue" + `\nFirst song in queue (LOCKED): **${queue.tracks[0].title}**` +
                `\nSecond song in queue: **${queue.tracks[1].title}**`

            return msg.reply(shuffleMsg)
        }
        else return msg.reply("Failed To Shuffle Queue")
    }
    else if (command === 'destroy') {
        if (!queue) return msg.reply("No Queue Available To Destroy");

        const destroy = (bool) => {
            if (!queue.destroyed) {
                queue.metadata.stopped = true;
                queue.destroy(bool);
                return msg.reply("Destroyed Queue");
            }
            else return msg.reply("Queue was already destroyed")
        }

        if (!queue.connection) {
            destroy(false)
        }
        else {
            if (!msg.member.voice.channelId) return msg.reply("You are not in my voice channel!");
            if (msg.member.guild.me.voice.channelId && msg.member.voice.channelId !== msg.member.guild.me.voice.channelId) return await msg.reply("We are not in the same voice channel!");

            destroy(true)
        }
    }
    else if (command === 'repeat' || command === 'rep') {
        if (!queue) return msg.reply("No Queue Exists")
        if (!args.length) {
            if (queue.repeatMode === 0) {
                const repeatModeMsg = "Please specify the repeat mode" + "\n`;repeat this` to only repeat the current song **or**" +
                "\n`;repeat all` to repeat the whole queue **or**" + "\n`;repeat off` to disable Repeat Mode" + "\n\nYou could also do `;repeat mode` to check current Repeat Mode"

                return msg.reply(repeatModeMsg);
            }
            else {
                const setMode = queue.setRepeatMode(0);

                if (setMode) return msg.reply("Repeat Mode Disabled")
                else return msg.reply("Failed to disable Repeat mode")
            }
        }
        if (args.length > 1) return msg.reply("Please specify only the repeat mode" + "\n`;repeat this` to only repeat the current song **or**" +
        "\n`;repeat all` to repeat the whole queue **or**" + "\n`;repeat off` to disable Repeat Mode" + "\n\nYou could also do `;repeat mode` to check current Repeat Mode");

        //RepeatModes ['OFF', 'TRACK', 'QUEUE', (DEPRECATED) 'AUTOPLAY'];
        const RepeatModes = {
            'OFF': 0,
            'THIS': 1,
            'ALL': 2,
            'MODE': 99
        }
        const RepeatModes2 = {
            '0': 'OFF',
            '1': 'THIS',
            '2': 'ALL'
        }

        if (!Object.keys(RepeatModes).includes(args[0].toUpperCase())) return msg.reply(`**${args[0]}** is not a valid Repeat Mode\nRepeat Modes: **this**, **all**, **off**, **mode**`)
        if (args[0].toUpperCase() === 'THIS') {
            if (queue.repeatMode === 1) return msg.reply("Repeat Mode was already enabled for this song")
            const repeated = queue.setRepeatMode(1);

            if (repeated) return msg.reply("Now Repeating Current Song")
            else return msg.reply("Failed to repeat current song")
        }
        else if (args[0].toUpperCase() === 'ALL') {
            if (queue.repeatMode === 2) return msg.reply("Repeat Mode was already enabled for the queue")
            const repeated = queue.setRepeatMode(2);

            if (repeated) return msg.reply("Now Repeating the whole queue")
            else return msg.reply("Failed to repeat the whole queue")
        }
        else if (args[0].toUpperCase() === 'OFF') {
            if (queue.repeatMode === 0) return msg.reply("Repeat Mode was already disabled")
            const repeated = queue.setRepeatMode(0);

            if (repeated) return msg.reply("Repeat Mode is now disabled")
            else return msg.reply("Failed to repeat current song")
        }
        else if (args[0].toUpperCase() === 'MODE') {
            return msg.reply(`Current Repeat Mode is: **${RepeatModes2[queue.repeatMode]}**`)
        }
        else return msg.reply(`Unknown Repeat Mode **${args[0]}**`)
    }
    else {
        msg.reply("Unknown Command")
        return console.error("Error: Unknown Command passed to play-yt.js")
    }
}