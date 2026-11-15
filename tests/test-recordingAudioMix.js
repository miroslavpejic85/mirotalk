'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const helpersSource = fs.readFileSync(path.join(__dirname, '../public/js/helpers.js'), 'utf8');

function fakeNode() {
    return {
        connected: [],
        connect(node) {
            this.connected.push(node);
        },
        disconnect() {
            this.disconnected = true;
        },
    };
}

function track(id, readyState = 'live') {
    return { id, kind: 'audio', readyState };
}

describe('MixedAudioRecorder keeps the recording mix updated', () => {
    let recorder;
    let destination;

    beforeEach(() => {
        destination = { ...fakeNode(), stream: { id: 'mix' } };
        const context = vm.createContext({
            console: { log() {} },
            window: {
                AudioContext: function () {},
            },
            MediaStream: function (tracks) {
                this.tracks = tracks;
                this.getAudioTracks = () => tracks;
            },
            AudioContext: function () {
                this.destination = fakeNode();
                this.createGain = () => ({ ...fakeNode(), gain: { value: 1 } });
                this.createMediaStreamDestination = () => destination;
                this.createMediaStreamSource = (stream) => ({ ...fakeNode(), stream });
                this.close = () => {};
            },
        });
        vm.runInContext(`${helpersSource}\nglobalThis.MixedAudioRecorder = MixedAudioRecorder;`, context);
        recorder = new context.MixedAudioRecorder();
    });

    it('adds late tracks and drops stale ones without changing the output stream', () => {
        const a = track('a');
        const output = recorder.getMixedAudioStream([{ getAudioTracks: () => [a] }]);
        assert.equal(output, destination.stream);
        assert.deepEqual([...recorder.audioSources.keys()], ['a']);

        const b = track('b');
        recorder.syncTracks([a, b]);
        assert.deepEqual([...recorder.audioSources.keys()], ['a', 'b']);
        assert.equal(recorder.audioDestination.stream, output);

        const sourceA = recorder.audioSources.get('a').source;
        recorder.syncTracks([b, track('ended', 'ended')]);
        assert.equal(sourceA.disconnected, true);
        assert.deepEqual([...recorder.audioSources.keys()], ['b']);
    });

    it('does not mix the same track twice', () => {
        const a = track('a');
        recorder.getMixedAudioStream([{ getAudioTracks: () => [a, a] }]);
        recorder.syncTracks([a]);
        assert.equal(recorder.audioSources.size, 1);
    });

    it('ignores sync after the mixer has been stopped', () => {
        recorder.getMixedAudioStream([]);
        recorder.stopMixedAudioStream();
        recorder.syncTracks([track('a')]);
        assert.equal(recorder.audioSources.size, 0);
    });
});
