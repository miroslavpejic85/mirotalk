'use strict';

// npx mocha tests/test-roomGifReaction.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'client.js'), 'utf8');

function extractFunction(name) {
    const start = client.search(new RegExp(`^function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

const GIF_URL = 'https://static.klipy.com/ii/abc/md.webp';

describe('Room GIF reactions (P2P)', () => {
    let dom;
    let document;
    let context;

    beforeEach(() => {
        dom = new JSDOM(
            `<div id="userEmoji"></div>
            <div class="Camera" id="myVideoWrap"></div>
            <div class="Camera" id="alice_videoWrap"></div>
            <div class="Camera" id="bob_videoWrap" style="display: none"></div>
            <div class="Screen" id="bob_screenWrap"></div>
            <div class="Camera" id="carol_videoWrap" style="display: none"></div>`
        );
        document = dom.window.document;
        context = vm.createContext({
            document,
            URL,
            setTimeout,
            myPeerId: 'me',
            userEmoji: document.getElementById('userEmoji'),
            getId: (id) => document.getElementById(id),
            getRoomEmojiPlacement: () => ({ left: 10, top: 20, drift: '0px', rise: '-100px', rotation: '0deg' }),
        });
        vm.runInContext(
            ['isValidRoomGifUrl', 'getRoomGifTile', 'handleRoomGif'].map(extractFunction).join('\n'),
            context
        );
    });

    afterEach(() => dom.window.close());

    const overlays = () => [...document.querySelectorAll('.room-gif-reaction')];

    it('overlays the GIF on the sender camera tile and replaces a previous one', () => {
        context.handleRoomGif({ peer_id: 'alice', peer_name: 'Alice', gif: GIF_URL });
        context.handleRoomGif({ peer_id: 'alice', peer_name: 'Alice', gif: 'https://static.klipy.com/ii/new/md.webp' });

        assert.equal(overlays().length, 1);
        assert.equal(overlays()[0].parentElement.id, 'alice_videoWrap');
        assert.equal(overlays()[0].querySelector('img').getAttribute('src'), 'https://static.klipy.com/ii/new/md.webp');
    });

    it('uses my own tile for my reactions and removes the overlay after the duration', async () => {
        context.handleRoomGif({ peer_id: 'me', peer_name: 'Me', gif: GIF_URL }, 10);

        assert.equal(overlays()[0].parentElement.id, 'myVideoWrap');
        await new Promise((resolve) => setTimeout(resolve, 30));
        assert.equal(overlays().length, 0);
    });

    it('falls back to the screen share tile when the camera tile is hidden', () => {
        context.handleRoomGif({ peer_id: 'bob', peer_name: 'Bob', gif: GIF_URL });

        assert.equal(overlays()[0].parentElement.id, 'bob_screenWrap');
    });

    it('floats the GIF with the sender name as text when no tile is visible', () => {
        context.handleRoomGif({ peer_id: 'carol', peer_name: '<b>Carol</b>', gif: GIF_URL });

        const overlay = document.querySelector('#userEmoji .room-gif-reaction--floating');
        assert.ok(overlay);
        assert.equal(overlay.querySelector('.room-gif-reaction__name').textContent, '<b>Carol</b>');
        assert.equal(overlay.querySelector('b'), null);
    });

    it('ignores unsafe GIF URLs', () => {
        for (const gif of ['http://x.test/a.gif', 'javascript:alert(1)', 'https://x.test/a.gif" onerror="x', '', 42]) {
            context.handleRoomGif({ peer_id: 'alice', peer_name: 'Alice', gif });
        }
        assert.equal(overlays().length, 0);
    });
});
