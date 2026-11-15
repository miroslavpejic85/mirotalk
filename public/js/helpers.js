'use strict';

class MixedAudioRecorder {
    constructor(useGainNode = true) {
        this.useGainNode = useGainNode;
        this.gainNode = null;
        this.audioSources = new Map(); // track.id -> { track, source }
        this.audioDestination = null;
        this.audioContext = this.createAudioContext();
    }

    createAudioContext() {
        if (window.AudioContext) {
            return new AudioContext();
        } else if (window.webkitAudioContext) {
            return new webkitAudioContext();
        } else if (window.mozAudioContext) {
            return new mozAudioContext();
        } else {
            throw new Error('Web Audio API is not supported in this browser');
        }
    }

    getMixedAudioStream(audioStreams) {
        this.audioSources.forEach(({ source }) => source.disconnect());
        this.audioSources.clear();

        if (this.useGainNode) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0;
        }

        // Created once: the output track stays the same while sources are added/removed during recording
        this.audioDestination = this.audioContext.createMediaStreamDestination();

        audioStreams.forEach((stream) => {
            if (!stream) return;
            stream.getAudioTracks().forEach((track) => this.addTrack(track));
        });

        return this.audioDestination.stream;
    }

    addTrack(track) {
        if (!this.audioContext || !this.audioDestination) return false;
        if (!track || track.kind !== 'audio' || track.readyState !== 'live') return false;
        if (this.audioSources.has(track.id)) return false;

        console.log('Mixed audio track to add on MediaStreamAudioDestinationNode --->', track);

        const source = this.audioContext.createMediaStreamSource(new MediaStream([track]));
        if (this.gainNode) source.connect(this.gainNode);
        source.connect(this.audioDestination);
        this.audioSources.set(track.id, { track, source });
        return true;
    }

    removeTrack(trackId) {
        const entry = this.audioSources.get(trackId);
        if (!entry) return false;
        entry.source.disconnect();
        this.audioSources.delete(trackId);
        return true;
    }

    // Mix exactly the given live tracks: add new ones (late joiners, new mic) and drop stale ones
    syncTracks(tracks) {
        if (!this.audioContext || !this.audioDestination) return;
        const liveIds = new Set();
        (tracks || []).forEach((track) => {
            if (track && track.kind === 'audio' && track.readyState === 'live') {
                liveIds.add(track.id);
                this.addTrack(track);
            }
        });
        [...this.audioSources.entries()].forEach(([trackId, { track }]) => {
            if (!liveIds.has(trackId) || track.readyState !== 'live') this.removeTrack(trackId);
        });
    }

    stopMixedAudioStream() {
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        if (this.audioSources.size) {
            this.audioSources.forEach(({ source }) => {
                source.disconnect();
            });
            this.audioSources.clear();
        }
        if (this.audioDestination) {
            this.audioDestination.disconnect();
            this.audioDestination = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        console.log('Stop Mixed Audio Stream');
    }
}

// Usage:
// const audioRecorder = new MixedAudioRecorder();
// To start recording, call audioRecorder.getMixedAudioStream(audioStreams);
// To stop recording, call audioRecorder.stopMixedAudioStream();

// Credits:
// - https://github.com/muaz-khan/MultiStreamsMixer
// - https://stackoverflow.com/questions/46074239/record-multi-audio-tracks-available-in-a-stream-with-mediarecorder
