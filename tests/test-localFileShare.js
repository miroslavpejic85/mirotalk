'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

function extractFunction(name) {
    const start = client.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

const track = (kind, id) => ({ kind, id, readyState: 'live', stop: sinon.spy(), contentHint: '' });

class FakeStream {
    constructor(id, tracks) {
        this.id = id;
        this.tracks = [...tracks];
    }
    getTracks() {
        return this.tracks;
    }
    addTrack(t) {
        this.tracks.push(t);
    }
    removeTrack(t) {
        this.tracks = this.tracks.filter((x) => x !== t);
    }
}

const sender = (t) => ({ track: t, replaceTrack: sinon.stub().resolves() });

describe('share a video/audio file from the device', () => {
    let context;
    let dom;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><html><body></body></html>');
        context = vm.createContext({
            document: dom.window.document,
            URL: { revokeObjectURL: sinon.spy() },
            clearInterval,
            handleRtcOffer: sinon.spy(),
            console: { warn() {} },
            localFileShare: null,
            localScreenMediaStream: null,
            peerConnections: {},
        });
        vm.runInContext(
            ['replaceLocalFileShareTrack', 'removeLocalFileShareControls', 'cleanupLocalFileShare']
                .map(extractFunction)
                .join('\n'),
            context
        );
    });

    afterEach(() => dom.window.close());

    it('swaps the finished file tracks in the same screen stream and only in their senders', () => {
        const oldVideo = track('video', 'v1');
        const oldAudio = track('audio', 'a1');
        const screenStream = new FakeStream('screen-stream', [oldVideo, oldAudio]);
        const mic = sender(track('audio', 'mic'));
        const screenSender = sender(oldVideo);
        const screenAudioSender = sender(oldAudio);
        const pc = { getSenders: () => [mic, screenSender, screenAudioSender], _screenAudioSender: screenAudioSender };
        Object.assign(context, {
            localFileShare: { canvasTrack: null },
            localScreenMediaStream: screenStream,
            peerConnections: { bob: pc },
        });

        const newVideo = track('video', 'v2');
        const newAudio = track('audio', 'a2');
        context.replaceLocalFileShareTrack(newVideo);
        context.replaceLocalFileShareTrack(newAudio);

        assert.deepEqual(screenStream.getTracks(), [newVideo, newAudio], 'same stream id keeps peers routing it');
        assert.equal(screenSender.replaceTrack.firstCall.args[0], newVideo);
        assert.equal(screenAudioSender.replaceTrack.firstCall.args[0], newAudio);
        assert.equal(mic.replaceTrack.called, false);
        assert.equal(newVideo.contentHint, 'motion');
        assert.equal(context.handleRtcOffer.called, false, 'no renegotiation');
    });

    it('adds the file audio sender when missing and keeps the waveform for audio-only files', () => {
        const canvas = track('video', 'canvas');
        const screenStream = new FakeStream('screen-stream', [canvas]);
        const screenSender = sender(canvas);
        const pc = {
            getSenders: () => [screenSender],
            addTrack: sinon.spy((t) => sender(t)),
        };
        Object.assign(context, {
            localFileShare: { canvasTrack: canvas },
            localScreenMediaStream: screenStream,
            peerConnections: { bob: pc },
        });

        context.replaceLocalFileShareTrack(track('video', 'captured'));
        assert.deepEqual(screenStream.getTracks(), [canvas]);
        assert.equal(screenSender.replaceTrack.called, false);

        const audio = track('audio', 'a1');
        context.replaceLocalFileShareTrack(audio);
        assert.deepEqual(pc.addTrack.firstCall.args, [audio, screenStream]);
        assert.ok(pc._screenAudioSender);
        assert.ok(context.handleRtcOffer.calledWith('bob'));
    });

    it('releases the file: playback, tracks, object URL and the controls tooltips', () => {
        const bar = dom.window.document.createElement('div');
        const btn = dom.window.document.createElement('button');
        btn._tippy = { destroy: sinon.spy() };
        bar.appendChild(btn);
        dom.window.document.body.appendChild(bar);
        const captured = track('video', 'v1');
        const source = { pause: sinon.spy(), removeAttribute: sinon.spy(), load: sinon.spy() };
        context.localFileShare = {
            url: 'blob:file',
            source,
            captured: new FakeStream('c', [captured]),
            canvasTrack: null,
            ui: { bar },
        };

        context.cleanupLocalFileShare();

        assert.equal(context.localFileShare, null);
        assert.ok(source.pause.calledOnce);
        assert.ok(source.removeAttribute.calledWith('src'));
        assert.ok(captured.stop.calledOnce);
        assert.ok(context.URL.revokeObjectURL.calledWith('blob:file'));
        assert.ok(btn._tippy.destroy.calledOnce);
        assert.equal(bar.isConnected, false);
    });
});
