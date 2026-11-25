'use strict';

// npx mocha tests/test-speakingTile.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const clientSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'client.js'), 'utf8');

function extractFunction(src, name) {
    const match = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`));
    assert.ok(match, `${name} not found`);
    return match[0];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(highlight = true) {
    const dom = new JSDOM(
        `<div id="videoMediaContainer">
            <div class="Camera" id="myVideoWrap"><div id="myPitchBar"></div></div>
            <div class="Screen" id="bob_screenWrap">
                <div class="screen-cam-overlay" id="bob_videoWrap"><div id="bob_pitch_bar"></div></div>
            </div>
        </div>
        <div class="msger-chat-item" id="bob_pMsgBtn"><img class="msger-chat-avatar" /></div>`,
        { runScripts: 'outside-only' }
    );
    dom.window.eval(`
        var getId = (id) => document.getElementById(id);
        var isAudioPitchBar = true;
        var isSpeakingHighlight = ${highlight};
        var speakingTileTimers = new Map();
        var speakingParticipantTimers = new Map();
        var peerVolumeTimers = {};
        var myVolumeTimer = null;
        var myPitchBar = getId('myPitchBar');
        var getVolumeColor = () => 'lime';
        ${extractFunction(clientSource, 'handlePeerVolume')}
        ${extractFunction(clientSource, 'handleMyVolume')}
        ${extractFunction(clientSource, 'handleSpeakingTile')}
        ${extractFunction(clientSource, 'clearSpeakingTiles')}
        ${extractFunction(clientSource, 'handleSpeakingParticipant')}
        window.api = { handlePeerVolume, handleMyVolume, handleSpeakingTile, clearSpeakingTiles, handleSpeakingParticipant };
    `);
    const speaking = () => [...dom.window.document.querySelectorAll('.speaking')].map((el) => el.id);
    return { dom, api: dom.window.api, speaking };
}

describe('Speaking tile border (P2P)', () => {
    it('marks the local and remote camera tiles (also as screen-share overlay) but never the screen tile', () => {
        const { dom, api, speaking } = setup();
        api.handleMyVolume({ volume: 40 });
        api.handlePeerVolume({ peer_id: 'bob', volume: 40 });
        assert.deepEqual(speaking(), ['myVideoWrap', 'bob_videoWrap', 'bob_pMsgBtn']);
        dom.window.close();
    });

    it('skips the tiles when the setting is off and does nothing when the volume is zero', () => {
        const { dom, api, speaking } = setup(false);
        api.handleMyVolume({ volume: 40 });
        api.handlePeerVolume({ peer_id: 'bob', volume: 40 });
        assert.deepEqual(speaking(), ['bob_pMsgBtn'], 'the participants list indicator is independent of the setting');
        dom.window.close();

        const on = setup();
        on.api.handlePeerVolume({ peer_id: 'bob', volume: 0 });
        assert.deepEqual(on.speaking(), []);
        on.dom.window.close();
    });

    it('keeps the border during short pauses, clears it after the hold time and all at once when turned off', async () => {
        const { dom, api, speaking } = setup();
        api.handleSpeakingTile('bob_videoWrap', 60);
        await sleep(40);
        api.handleSpeakingTile('bob_videoWrap', 60);
        await sleep(40);
        assert.deepEqual(speaking(), ['bob_videoWrap']);
        await sleep(40);
        assert.deepEqual(speaking(), []);

        api.handleSpeakingTile('myVideoWrap', 60);
        api.handleSpeakingTile('bob_videoWrap', 60);
        api.clearSpeakingTiles();
        assert.deepEqual(speaking(), []);
        dom.window.close();
    });

    it('keeps the participants list indicator during short pauses and clears it after the hold time', async () => {
        const { dom, api, speaking } = setup();
        api.handleSpeakingParticipant('bob', 60);
        await sleep(40);
        api.handleSpeakingParticipant('bob', 60);
        await sleep(40);
        assert.deepEqual(speaking(), ['bob_pMsgBtn']);
        await sleep(40);
        assert.deepEqual(speaking(), []);
        dom.window.close();
    });
});
