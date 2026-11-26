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

const track = (kind, id) => ({ kind, id, enabled: true });
const stream = (id, tracks) => ({
    id,
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
});

describe('screen share audio volume (separate track)', () => {
    describe('sender', () => {
        let context;
        let micSender;
        let pc;

        beforeEach(() => {
            const mic = track('audio', 'mic');
            micSender = { track: mic, replaceTrack: sinon.stub().resolves() };
            pc = {
                senders: [micSender],
                getSenders() {
                    return this.senders;
                },
                addTrack: sinon.spy(function (t) {
                    const sender = { track: t, replaceTrack: sinon.stub().resolves() };
                    this.senders.push(sender);
                    return sender;
                }),
                removeTrack: sinon.spy((sender) => {
                    sender.track = null;
                }),
            };
            context = vm.createContext({
                console: { log() {}, info() {}, warn() {}, error() {} },
                thereArePeerConnections: () => true,
                handleRtcOffer: sinon.stub().resolves(),
                getAudioTrack: (s) => s?.getAudioTracks()[0] || null,
                getVideoTrack: (s) => s?.getVideoTracks()[0] || null,
                hasAudioTrack: (s) => !!s?.getAudioTracks().length,
                useAudio: true,
                myAudioStatus: true,
                localAudioMediaStream: stream('micStream', [mic]),
                localVideoMediaStream: null,
                localScreenMediaStream: null,
                isScreenStreaming: false,
                peerConnections: { peer: pc },
                allPeers: { peer: { peer_name: 'Peer' } },
            });
            vm.runInContext(extractFunction('refreshMyStreamToPeers'), context);
        });

        it('sends the screen audio on its own sender and keeps the mic on the mic sender', async () => {
            const screenAudio = track('audio', 'tab');
            context.localScreenMediaStream = stream('screenStream', [track('video', 'screen'), screenAudio]);
            context.isScreenStreaming = true;

            await context.refreshMyStreamToPeers(context.localAudioMediaStream, true);

            sinon.assert.calledWith(pc.addTrack, screenAudio, context.localScreenMediaStream);
            assert.equal(pc._screenAudioSender.track, screenAudio);
            sinon.assert.neverCalledWith(micSender.replaceTrack, screenAudio);
            sinon.assert.calledWith(micSender.replaceTrack, context.localAudioMediaStream.getAudioTracks()[0]);

            // Stop sharing: only the screen audio sender goes away
            const screenAudioSender = pc._screenAudioSender;
            context.isScreenStreaming = false;
            context.localScreenMediaStream = null;
            await context.refreshMyStreamToPeers();

            sinon.assert.calledWith(pc.removeTrack, screenAudioSender);
            sinon.assert.neverCalledWith(pc.removeTrack, micSender);
            assert.equal(pc._screenAudioSender, null);
        });
    });

    describe('receiver', () => {
        let dom;
        let document;
        let context;

        beforeEach(() => {
            dom = new JSDOM(
                '<!doctype html><html><body><div id="audioMediaContainer"></div><div id="tile"></div></body></html>'
            );
            document = dom.window.document;
            context = vm.createContext({
                window: dom.window,
                document,
                console: { log() {}, info() {}, warn() {}, error() {} },
                MediaStream: function (tracks) {
                    return stream('copy', tracks);
                },
            });
            vm.runInContext(
                `const getId = (id) => document.getElementById(id);
                const audioMediaContainer = getId('audioMediaContainer');
                const blockedAudioElements = new Set();
                const sinkId = false;
                const audioOutputSelect = null;
                let masterOutputVolume = 1;
                function attachMediaStream(el, s) { el.srcObject = s; }
                function playRemoteAudio() {}
                function updateAudioUnlockPrompt() {}
                function syncRecordingAudio() {}
                function applyOutputVolume(el) { el.volume = Number(el.dataset.peerVolume) * masterOutputVolume; }
                ${[
                    'isRemoteScreenAudio',
                    'loadRemoteScreenAudio',
                    'removeRemoteScreenAudio',
                    'handleRemoteScreenAudioVolume',
                    'syncRemoteScreenAudioVolume',
                ]
                    .map(extractFunction)
                    .join('\n')}
                globalThis.api = { isRemoteScreenAudio, loadRemoteScreenAudio, removeRemoteScreenAudio, handleRemoteScreenAudioVolume };`,
                context
            );
        });

        afterEach(() => dom.window.close());

        function addScreenSlider() {
            const tile = document.getElementById('tile');
            const volume = document.createElement('input');
            volume.id = 'bob_screenAudioVolume';
            volume.type = 'range';
            volume.value = 100;
            volume._barItem = document.createElement('span');
            volume._barItem.appendChild(volume);
            volume._dropdownItem = document.createElement('div');
            tile.append(volume._barItem, volume._dropdownItem);
            context.api.handleRemoteScreenAudioVolume('bob');
            return volume;
        }

        it('recognizes the screen audio by the announced screen stream id, not the mic', () => {
            const extras = { screen_stream_id: 'screenStream' };
            const screenAudio = stream('screenStream', [track('audio', 'tab')]);
            const micAudio = stream('micStream', [track('audio', 'mic')]);

            assert.equal(context.api.isRemoteScreenAudio('bob', { extras }, screenAudio), true);
            assert.equal(context.api.isRemoteScreenAudio('bob', { extras }, micAudio), false);
        });

        it('shows the slider only while the screen audio plays and applies its own level', async () => {
            const volume = addScreenSlider();
            assert.equal(volume._barItem.style.display, 'none');
            assert.equal(volume._dropdownItem.style.getPropertyPriority('display'), 'important');

            volume.value = 40;
            await context.api.loadRemoteScreenAudio(stream('screenStream', [track('audio', 'tab')]), 'bob', 'Bob');
            const audio = document.getElementById('bob___screenAudio');

            assert.equal(volume._barItem.style.display, '');
            assert.equal(volume._dropdownItem.style.display, '');
            assert.equal(audio.volume, 0.4, 'level chosen before the audio arrived is applied');

            volume.value = 70;
            volume.dispatchEvent(new dom.window.Event('input'));
            assert.equal(audio.volume, 0.7);

            context.api.removeRemoteScreenAudio('bob');
            assert.equal(document.getElementById('bob___screenAudio'), null);
            assert.equal(volume._barItem.style.display, 'none');
        });
    });
});
