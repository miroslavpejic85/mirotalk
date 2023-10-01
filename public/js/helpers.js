'use strict';

class MixedAudioRecorder {
    constructor(useGainNode = true) {
        this.useGainNode = useGainNode;
        this.gainNode = null;
        this.audioSources = [];
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
        this.audioSources = [];

        if (this.useGainNode) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0;
        }

        audioStreams.forEach((stream) => {
            if (!stream || !stream.getTracks().filter((t) => t.kind === 'audio').length) {
                return;
            }

            console.log('Mixed audio tracks to add on MediaStreamAudioDestinationNode --->', stream.getTracks());

            let audioSource = this.audioContext.createMediaStreamSource(stream);

            if (this.useGainNode) {
                audioSource.connect(this.gainNode);
            }
            this.audioSources.push(audioSource);
        });

        this.audioDestination = this.audioContext.createMediaStreamDestination();
        this.audioSources.forEach((audioSource) => {
            audioSource.connect(this.audioDestination);
        });

        return this.audioDestination.stream;
    }

    stopMixedAudioStream() {
        if (this.useGainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        if (this.audioSources.length) {
            this.audioSources.forEach((source) => {
                source.disconnect();
            });
            this.audioSources = [];
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
