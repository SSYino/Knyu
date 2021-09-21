module.exports = (player) => {
    player.on("trackStart", (queue, track) => {
        const duration = queue.connection.audioResource?.playbackDuration;
        if (duration !== 0) return;
    
        const propName = `interaction${track.id}`
        const interaction = queue.metadata[propName] ? queue.metadata[propName] : queue.metadata.interaction;
    
        if (interaction) interaction.editReply({ content: `🎶 | Now playing **${track.title}**!`, ephemeral: true });
        else queue.metadata.channel.send(`🎶 | Now playing **${track.title}**!`);
    })
    player.on("trackEnd", (queue, track) => {
        const propName = `interaction${track.id}`
        const interaction = queue.metadata[propName] ? queue.metadata[propName] : queue.metadata.interaction;
    
        if (!interaction) return;
        interaction.editReply({ content: `⭕ | Track **${track.title}** has ended!`, ephemeral: true })
        queue.metadata.lastInteraction = interaction;
    })
    player.on("trackAdd", async (queue, track) => {
        let interaction;
        const isTrackFirst = track.id === queue.tracks[0].id;
    
        // console.log(queue.tracks[0].id === track.id)
        if (track === queue.current) await queue.play();
        // console.log(queue.tracks, 'tracks')
        // console.log(track)
        if (isTrackFirst && track === queue.current) {
            interaction = queue.metadata.interaction;
            // console.log('first track')
        } else {
            // console.log('not first track')
            // const positionInTracks = queue.tracks.findIndex(trck => trck === track);
            // console.log(positionInTracks)
            const keyNameForInteractionValue = `interaction${track.id}`;
            // console.log(propName)
            interaction = queue.metadata[keyNameForInteractionValue];
            // console.log(interaction);
        }
    
        // console.log(interaction)
        if (interaction) interaction.editReply({ content: `✅ | Track **${track.title}** added to queue!`, ephemeral: true })
        else queue.metadata.channel.send(`✅ | Track **${track.title}** added to queue!`)
    })
    player.on("tracksAdd", async (queue, tracks) => {
        let interaction;
        const isTrackFirst = tracks[0].id === queue.tracks[0].id;
        const isTrackInCurrentlyPlaying = tracks[0] === queue.current;
    
        if (isTrackInCurrentlyPlaying) await queue.play();
        if (isTrackFirst && isTrackInCurrentlyPlaying) {
            interaction = queue.metadata.interaction;
        } else {
            const keyNameForInteractionValue = `interaction${tracks[0].id}`;
            interaction = queue.metadata[keyNameForInteractionValue];
        }
    
        if (interaction) interaction.editReply({ content: `✅ | Added ${tracks.length} tracks to queue!\nFirst track in playlist : **${tracks[0].title}**`, ephemeral: true })
        else queue.metadata.channel.send(`✅ | Added ${tracks.length} tracks to queue!\nFirst track in playlist : **${tracks[0].title}**`)
    })
    
    player.on("queueEnd", queue => {
        // const propName = `interaction${track.id}`
        // const interaction = queue.metadata[propName] ? queue.metadata[propName]:queue.metadata.interaction;
        if (queue.metadata.stopped) return;
        const interaction = queue.metadata.lastInteraction;
    
        // console.log(`Queue id:${queue.id} --> has ended`)
        // const message = new Message(client, {channel_id: "886996891865333811", guild_id: "755758989974831135", content: 'test New'})
        if (interaction) interaction.followUp({ content: 'Queue has ended!', ephemeral: true });
        else queue.metadata.channel.send('Queue has ended!');
    
        // console.log(queue.destroyed)
        if (!queue.destroyed) queue.destroy(false)
        // console.log(queue.destroyed)
    })
    
    player.on("debug", (queue, debug) => {
        //console.debug(debug);
    })
    
    player.on("botDisconnect", (queue, debug) => {
        //console.debug('bot dc wtf', queue.destroyed);
        if (!queue.destroyed) {
            queue.destroy();
            console.debug('bot dc and queue gone');
        }
    })
    
    player.on("connectionError", (queue, error) => {
        console.error('Error', queue.destroyed);
        console.debug('Connection error', error);
    })
    
    
    player.on("error", (queue, error) => {
        console.error('Error', queue.destroyed, error);
        if (!queue.destroyed)
            queue.destroy(true);
    })
}