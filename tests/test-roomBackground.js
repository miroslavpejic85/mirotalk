'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { RoomBackground, ROOM_BG_PRESETS } = require('../public/js/roomBackground.js');

const root = path.join(__dirname, '..');
const PRESET_A = '../images/room-background/forest.webp';
const PRESET_B = '../images/room-background/beach.webp';

function createStorage(initial = {}) {
    const data = { ...initial };
    return {
        data,
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => {
            data[key] = String(value);
        },
    };
}

function createDb(initial = {}) {
    const images = new Map(Object.entries(initial));
    return {
        images,
        get: async (id) => images.get(id),
        put: async (id, blob) => images.set(id, blob),
        remove: async (id) => images.delete(id),
        keys: async () => [...images.keys()],
    };
}

function settingsMarkup() {
    const html = fs.readFileSync(path.join(root, 'public/views/client.html'), 'utf8');
    const start = html.indexOf('<div id="roomBackgroundSection"');
    const end = html.indexOf('<div id="tabLayout"');
    assert.ok(start > 0 && end > start, 'room background section exists in client.html');
    return html.slice(start, end);
}

describe('Room background (browser-only)', () => {
    let dom;
    let doc;
    let storage;
    let db;
    let logs;

    function create(roomId = 'room-1', presets) {
        return new RoomBackground({
            roomId,
            ...(presets && { getPresets: () => presets }),
            storage,
            db,
            doc,
            userLog: (type, message) => logs.push({ type, message }),
        });
    }

    function saved() {
        return JSON.parse(storage.data.ROOM_BACKGROUND);
    }

    beforeEach(() => {
        dom = new JSDOM(`<!doctype html><body><div id="videoMediaContainer"></div>${settingsMarkup()}</body>`);
        doc = dom.window.document;
        storage = createStorage();
        db = createDb();
        logs = [];
    });

    it('shows nothing by default and creates the background layer behind the grid', async () => {
        const rb = create();
        await rb.init();

        const layer = doc.getElementById('roomBackgroundLayer');
        assert.ok(layer);
        assert.equal(doc.body.firstElementChild, layer);
        assert.equal(doc.body.classList.contains('room-bg-active'), false);
        assert.equal(layer.style.backgroundImage, '');
        assert.ok(doc.getElementById('roomBackgroundNone').classList.contains('active'));
        assert.ok(doc.getElementById('roomBackgroundCustom').classList.contains('hidden'));
        assert.equal(doc.getElementById('roomBackgroundAllRooms').checked, false);
    });

    it('applies one background to every room when "Use in all my rooms" is enabled', async () => {
        const rb = create('room-1');
        await rb.select({ type: 'custom', value: 'custom-a' });
        rb.setAllRooms(true);

        assert.deepEqual(saved().rooms, {});
        assert.equal(saved().global.value, 'custom-a');
        assert.equal(create('room-2').getSelection().value, 'custom-a');
        assert.equal(create('room-2').isAllRooms(), true);

        // Choosing "None" while in all-rooms mode keeps the scope instead of silently flipping it off
        await rb.select({ type: 'none' });
        assert.equal(rb.isAllRooms(), true);
        assert.equal(create('room-3').getSelection().type, 'none');
    });

    it('keeps the current look when switching back to a per-room background', () => {
        const rb = create('room-1');
        rb.setSelection({ type: 'custom', value: 'custom-a' }, true);
        rb.setAllRooms(false);

        assert.equal(saved().global, null);
        assert.equal(saved().rooms['room-1'].value, 'custom-a');
        assert.equal(create('room-2').getSelection().type, 'none');
    });

    it('keeps at most 50 per-room selections, dropping the oldest', () => {
        const rooms = {};
        for (let i = 0; i < 55; i++) rooms[`room-${i}`] = { type: 'none', ts: i + 1 };
        storage.setItem('ROOM_BACKGROUND', JSON.stringify({ rooms }));

        create('room-new').setSelection({ type: 'none' });
        const keys = Object.keys(saved().rooms);
        assert.equal(keys.length, 50);
        assert.ok(keys.includes('room-new'));
        assert.ok(!keys.includes('room-0'));
    });

    it('persists and clamps the dim level', async () => {
        const rb = create();
        await rb.init();
        rb.setDim(200);
        assert.equal(saved().dim, 80);
        assert.equal(doc.documentElement.style.getPropertyValue('--room-bg-dim'), '0.8');
        assert.equal(doc.getElementById('roomBackgroundDimValue').textContent, '80%');
        rb.setDim(-5);
        assert.equal(saved().dim, 0);
    });

    it('ignores tampered or foreign values from localStorage', () => {
        storage.setItem(
            'ROOM_BACKGROUND',
            JSON.stringify({
                dim: 'abc',
                global: { type: 'preset', value: 'https://evil.example/track.png' },
                rooms: {
                    'room-1': { type: 'preset', value: '../images/x.jpg") ; background: red; ("' },
                    'room-2': { type: 'custom', value: 'javascript:alert(1)' },
                    'room-3': { type: 'custom', value: 'custom-ok' },
                    'room-4': { type: 'preset', value: '../images/room-background/../../views/client.html' },
                    'room-5': { type: 'preset', value: PRESET_A },
                },
            })
        );
        const rb = create('room-1');
        assert.equal(rb.state.dim, 35);
        assert.equal(rb.state.global, null);
        assert.deepEqual(Object.keys(rb.state.rooms), ['room-3', 'room-5']);
        assert.equal(rb.getSelection().type, 'none');
    });

    it('ships bundled presets that exist on disk and renders them as cards', async () => {
        assert.ok(ROOM_BG_PRESETS.length >= 1);
        for (const url of ROOM_BG_PRESETS) {
            const file = path.join(root, 'public/images', url.replace('../images/', ''));
            assert.ok(fs.existsSync(file), `${url} exists`);
            assert.ok(fs.statSync(file).size < 300 * 1024, `${url} stays small`);
        }

        const rb = create();
        await rb.init();
        const cards = [...doc.querySelectorAll('.room-bg-card[data-bg-type="preset"]')];
        assert.deepEqual(
            cards.map((card) => card.dataset.bgValue),
            ROOM_BG_PRESETS
        );
        assert.equal(cards[0].querySelector('img').getAttribute('loading'), 'lazy');
    });

    it('applies the selected preset for this room only', async () => {
        const rb = create();
        await rb.init();
        const cards = doc.querySelectorAll('.room-bg-card[data-bg-type="preset"]');

        cards[1].click();
        await new Promise((resolve) => setImmediate(resolve));

        assert.ok(doc.body.classList.contains('room-bg-active'));
        assert.ok(doc.getElementById('roomBackgroundLayer').style.backgroundImage.includes('beach.webp'));
        assert.ok(cards[1].classList.contains('active'));
        assert.equal(cards[0].classList.contains('active'), false);
        assert.equal(rb.objectUrl, null);
        assert.equal(saved().rooms['room-1'].value, PRESET_B);
        assert.equal(saved().global, null);
        assert.equal(create('room-2').getSelection().type, 'none');
    });

    it('does not render invalid preset paths provided at runtime', async () => {
        const rb = create('room-1', [PRESET_A, 'https://evil.example/a.png', '../images/avatars/a.png', PRESET_A]);
        await rb.init();
        const presets = [...doc.querySelectorAll('.room-bg-card[data-bg-type="preset"]')];
        assert.deepEqual(
            presets.map((card) => card.dataset.bgValue),
            [PRESET_A]
        );
    });

    it('recovers from corrupted localStorage JSON', () => {
        storage.setItem('ROOM_BACKGROUND', '{not json');
        const originalWarn = console.warn;
        console.warn = () => {};
        let rb;
        try {
            rb = create();
        } finally {
            console.warn = originalWarn;
        }
        assert.deepEqual(rb.state, { dim: 35, global: null, rooms: {} });
    });

    it('loads uploaded images from IndexedDB as object URLs and prunes unused ones', async () => {
        const blob = new Blob(['img'], { type: 'image/webp' });
        db = createDb({ 'custom-1': blob, 'custom-orphan': blob });
        storage.setItem(
            'ROOM_BACKGROUND',
            JSON.stringify({ rooms: { 'room-1': { type: 'custom', value: 'custom-1' } } })
        );

        const rb = create();
        await rb.init();

        const layer = doc.getElementById('roomBackgroundLayer');
        assert.match(layer.style.backgroundImage, /^url\("?blob:/);
        assert.ok(doc.body.classList.contains('room-bg-active'));
        const customCard = doc.getElementById('roomBackgroundCustom');
        assert.equal(customCard.classList.contains('hidden'), false);
        assert.ok(customCard.classList.contains('active'));

        await rb.pruneCustomImages();
        assert.deepEqual([...db.images.keys()], ['custom-1']);

        doc.getElementById('roomBackgroundNone').click();
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual([...db.images.keys()], []);
        assert.equal(rb.objectUrl, null);
        assert.equal(doc.body.classList.contains('room-bg-active'), false);
        assert.ok(customCard.classList.contains('hidden'));
    });

    it('falls back to no background when the stored image is missing or not an image', async () => {
        db = createDb({ 'custom-bad': new Blob(['<svg/>'], { type: 'text/html' }) });
        storage.setItem(
            'ROOM_BACKGROUND',
            JSON.stringify({ global: { type: 'custom', value: 'custom-bad' }, rooms: {} })
        );
        const rb = create();
        await rb.init();
        assert.equal(doc.body.classList.contains('room-bg-active'), false);
        assert.equal(doc.getElementById('roomBackgroundLayer').style.backgroundImage, '');
    });

    it('rejects non-image and oversized uploads without storing anything', async () => {
        const rb = create();
        assert.equal(await rb.upload({ type: 'text/html', size: 10 }), false);
        assert.equal(await rb.upload({ type: 'image/png', size: 26 * 1024 * 1024 }), false);
        assert.deepEqual(
            logs.map((log) => log.message),
            ['Please choose an image file', 'The image is too large (max 25 MB)']
        );
        assert.equal(db.images.size, 0);
        assert.equal(storage.data.ROOM_BACKGROUND, undefined);
    });

    it('stores a downscaled upload, selects it and replaces the previous one', async () => {
        const rb = create();
        await rb.init();
        const encoded = new Blob(['x'], { type: 'image/webp' });
        rb.downscale = async () => encoded;

        assert.equal(await rb.upload({ type: 'image/png', size: 1000 }), true);
        const first = saved().rooms['room-1'];
        assert.equal(first.type, 'custom');
        assert.match(first.value, /^custom-[A-Za-z0-9-]+$/);
        assert.equal(db.images.get(first.value), encoded);
        assert.ok(doc.body.classList.contains('room-bg-active'));

        assert.equal(await rb.upload({ type: 'image/jpeg', size: 1000 }), true);
        const second = saved().rooms['room-1'];
        assert.notEqual(second.value, first.value);
        assert.deepEqual([...db.images.keys()], [second.value]);
    });

    it('reports a failed upload without changing the current selection', async () => {
        const rb = create();
        await rb.init();
        rb.downscale = async () => {
            throw new Error('decode failed');
        };
        const originalError = console.error;
        console.error = () => {};
        try {
            assert.equal(await rb.upload({ type: 'image/png', size: 1000 }), false);
        } finally {
            console.error = originalError;
        }
        assert.deepEqual(logs, [{ type: 'error', message: 'Unable to use this image as room background' }]);
        assert.equal(rb.getSelection().type, 'none');
        assert.equal(db.images.size, 0);
    });

    it('is wired into the room settings and can be disabled from config', () => {
        const html = fs.readFileSync(path.join(root, 'public/views/client.html'), 'utf8');
        const clientJs = fs.readFileSync(path.join(root, 'public/js/client.js'), 'utf8');
        const buttonsJs = fs.readFileSync(path.join(root, 'public/js/buttons.js'), 'utf8');
        const template = fs.readFileSync(path.join(root, 'app/src/config.template.js'), 'utf8');

        assert.ok(html.indexOf('../js/roomBackground.js') < html.indexOf('../js/client.js"'));
        assert.match(clientJs, /buttons\.settings\.showRoomBackground === false/);
        assert.match(buttonsJs, /showRoomBackground: true/);
        assert.match(template, /showRoomBackground: getEnvBoolean\(process\.env\.SHOW_ROOM_BACKGROUND, true\)/);
    });
});
