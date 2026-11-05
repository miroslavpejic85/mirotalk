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

const source = extractFunction('handleRemovePeer');

describe('handleRemovePeer', () => {
    const peerId = 'peer1';
    let dom;
    let document;
    let context;
    let peerConnection;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><html><body><div id="videoMediaContainer"></div></body></html>');
        document = dom.window.document;
        peerConnection = { close: sinon.spy() };
        context = vm.createContext({
            window: dom.window,
            document,
            console: { log() {}, info() {}, warn() {}, error() {} },
            peerConnection,
        });
        vm.runInContext(
            `let peerConnections = { ${peerId}: peerConnection };
            let chatDataChannels = { ${peerId}: {} };
            let fileDataChannels = { ${peerId}: {} };
            let pendingIceCandidates = { ${peerId}: [] };
            let peerVideoMediaElements = {};
            let peerScreenMediaElements = {};
            let peerAudioMediaElements = {};
            let allPeers = { ${peerId}: { peer_name: 'Bob' } };
            let roomEditor = null;
            const getId = (id) => document.getElementById(id);
            const VideoDrawingOverlay = { destroyById() {} };
            const screenReaderAccessibility = { announceMessage() {} };
            function adaptAspectRatio() {}
            function updateAudioUnlockPrompt() {}
            function msgerRemovePeer() {}
            function removeVideoPinMediaContainer() {}
            function playSound() {}
            ${source}
            globalThis.api = {
                handleRemovePeer,
                peerConnections: () => peerConnections,
                allPeers: () => allPeers,
                elements: () => ({ peerVideoMediaElements, peerScreenMediaElements, peerAudioMediaElements }),
            };`,
            context
        );
    });

    afterEach(() => dom.window.close());

    // The tiles as loadRemoteMediaStream registers them: keyed by element id.
    function addTiles() {
        const container = document.getElementById('videoMediaContainer');
        const { peerVideoMediaElements, peerScreenMediaElements, peerAudioMediaElements } = context.api.elements();
        const tiles = {};
        for (const [kind, map] of [
            ['video', peerVideoMediaElements],
            ['screen', peerScreenMediaElements],
            ['audio', peerAudioMediaElements],
        ]) {
            const wrap = document.createElement('div');
            const id = `${peerId}___${kind}`;
            container.appendChild(wrap);
            map[id] = wrap;
            tiles[kind] = wrap;
        }
        return tiles;
    }

    function assertForgotten() {
        const { api } = context;
        assert.equal(peerConnection.close.callCount, 1);
        assert.equal(peerId in api.peerConnections(), false);
        assert.equal(peerId in api.allPeers(), false);
        for (const map of Object.values(api.elements())) {
            assert.deepEqual(Object.keys(map), []);
        }
    }

    it('removes the tiles of a peer that leaves and forgets the peer', () => {
        const tiles = addTiles();

        context.api.handleRemovePeer({ peer_id: peerId });

        for (const tile of Object.values(tiles)) assert.equal(tile.parentNode, null);
        assertForgotten();
    });

    it('forgets a peer that left after its screen tile was already removed by screenStop', () => {
        const tiles = addTiles();
        tiles.screen.remove(); // what handleScreenStop does

        context.api.handleRemovePeer({ peer_id: peerId });

        assertForgotten();
    });

    it('forgets a peer whose tiles are all already gone from the page', () => {
        for (const tile of Object.values(addTiles())) tile.remove();

        context.api.handleRemovePeer({ peer_id: peerId });

        assertForgotten();
    });
});
