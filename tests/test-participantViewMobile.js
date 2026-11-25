'use strict';

// npx mocha tests/test-participantViewMobile.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const clientSource = fs.readFileSync(path.join(root, 'public/js/client.js'), 'utf8');
const gridSource = fs.readFileSync(path.join(root, 'public/js/videoGrid.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/views/client.html'), 'utf8');

function extractFunction(src, name) {
    const match = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`));
    assert.ok(match, `${name} not found`);
    return match[0];
}

function extractConst(src, name) {
    const match = src.match(new RegExp(`const ${name} = [^;]*;`));
    assert.ok(match, `${name} not found`);
    return match[0];
}

function setup(isMobile) {
    const select = html.match(/<select id="participantViewMode"[\s\S]*?<\/select>/)[0];
    const dom = new JSDOM(
        `${select}<select id="pinVideoPositionSelect"><option value="speaker-left"></option>
        <option value="speaker-top"></option><option value="speaker-bottom"></option><option value="speaker-1:1"></option></select>
        <div id="videoMediaContainer"></div><div id="videoPinMediaContainer"></div>`,
        { runScripts: 'outside-only' }
    );
    const { window } = dom;
    window.eval(`
        var isMobileDevice = ${isMobile};
        var isChatPinned = false;
        var isCaptionPinned = false;
        var isVideoPinned = false;
        var pinnedVideoPinButtonId = null;
        var isApplyingParticipantViewMode = false;
        var lsSettings = {};
        var lS = { setSettings() {} };
        var pins = [];
        var isPresenter = false;
        var myVideoPinBtn = null;
        var allPeers = {};
        var participantViewMode = document.getElementById('participantViewMode');
        var pinVideoPositionSelect = document.getElementById('pinVideoPositionSelect');
        var videoMediaContainer = document.getElementById('videoMediaContainer');
        var videoPinMediaContainer = document.getElementById('videoPinMediaContainer');
        var getId = (id) => document.getElementById(id);
        var elemDisplay = (el, show, mode = 'flex') => { if (el) el.style.display = show ? mode : 'none'; };
        var resizeVideoMedia = () => {};
        var userLog = () => {};
        var autoPinVideoForLayout = () => { isVideoPinned = true; return true; };
        ${extractConst(clientSource, 'MOBILE_PARTICIPANT_VIEW_MODES')}
        ${extractFunction(clientSource, 'removeUnsupportedMobileParticipantViews')}
        ${extractFunction(clientSource, 'appendPinButton')}
        ${extractFunction(clientSource, 'toggleVideoPin')}
        ${extractFunction(clientSource, 'setParticipantViewMode')}
        window.api = {
            setParticipantViewMode,
            removeUnsupportedMobileParticipantViews,
            appendPinButton,
            toggleVideoPin,
            setPinned: (v) => (isVideoPinned = v),
            getPinned: () => isVideoPinned,
        };
    `);
    return {
        window,
        api: window.api,
        select: window.document.getElementById('participantViewMode'),
        pin: window.document.getElementById('videoPinMediaContainer'),
        grid: window.document.getElementById('videoMediaContainer'),
    };
}

describe('Participant view on mobile (P2P)', () => {
    it('offers only grid, speaker top/bottom and 1:1 on mobile', () => {
        const { api, select } = setup(true);
        api.removeUnsupportedMobileParticipantViews();
        assert.deepEqual(
            [...select.options].map((o) => o.value),
            ['grid', 'speaker-top', 'speaker-bottom', 'speaker-1:1']
        );
    });

    it('pins the speaker for supported modes and falls back to grid for side views', () => {
        const { api, select } = setup(true);
        api.removeUnsupportedMobileParticipantViews();

        api.setParticipantViewMode('speaker-top', false, false);
        assert.equal(select.value, 'speaker-top');
        assert.equal(api.getPinned(), true);

        api.setPinned(false);
        api.setParticipantViewMode('speaker-left', false, false);
        assert.equal(select.value, 'grid');
        assert.equal(api.getPinned(), false);
    });

    it('keeps every view available on desktop', () => {
        const { api, select } = setup(false);
        api.setParticipantViewMode('speaker-left', false, false);
        assert.equal(select.value, 'speaker-left');
        assert.equal(select.options.length, 6);
    });

    it('keeps a hidden pin button in the nav bar on mobile so layouts can pin tiles', () => {
        const { window, api } = setup(true);
        const navBar = window.document.createElement('div');
        const pinBtn = window.document.createElement('button');
        api.appendPinButton(navBar, pinBtn);
        assert.equal(pinBtn.parentElement, navBar);
        assert.equal(pinBtn.style.display, 'none');

        const desktop = setup(false);
        const dNav = desktop.window.document.createElement('div');
        const dPin = desktop.window.document.createElement('button');
        desktop.api.appendPinButton(dNav, dPin);
        assert.notEqual(dPin.style.display, 'none');
    });

    it('uses a fixed-size thumbnail strip on every device and maps side positions to speaker top on mobile', () => {
        const stripSize = 'var(--pinned-strip-size, 20vh)';
        const stripWithBar = `calc(${stripSize} + var(--buttons-bar-reserve, 0px))`;

        const { api, pin, grid } = setup(true);
        api.setPinned(true);
        api.toggleVideoPin('speaker-top');
        assert.equal(pin.style.height, `calc(100% - ${stripWithBar})`);
        assert.equal(grid.style.top, `calc(100% - ${stripWithBar})`);
        assert.equal(grid.style.height, stripWithBar);

        api.toggleVideoPin('speaker-left');
        assert.equal(pin.style.width, '100%');
        assert.equal(grid.style.top, `calc(100% - ${stripWithBar})`, 'side maps to speaker-top');

        const desktop = setup(false);
        desktop.api.setPinned(true);
        desktop.api.toggleVideoPin('speaker-top');
        assert.equal(desktop.grid.style.height, stripWithBar, 'desktop strip has the same fixed size');

        // Strip on top: the buttons bar reserve belongs to the speaker below it
        desktop.api.toggleVideoPin('speaker-bottom');
        assert.equal(desktop.grid.style.height, stripSize);
        assert.equal(desktop.pin.style.top, stripSize);
        assert.equal(desktop.pin.style.height, `calc(100% - ${stripSize})`);

        // Desktop side views keep the packed column
        desktop.api.toggleVideoPin('speaker-left');
        assert.equal(desktop.pin.style.width, '75%');
        assert.equal(desktop.grid.style.width, '25%');
    });

    it('lays out the tiles next to the pinned speaker as one scrollable row', () => {
        const dom = new JSDOM(
            `<div id="grid" class="screen-stage">${[0, 1, 2, 3, 4]
                .map((i) => `<div class="Camera" data-screen-stage="${i ? '' : 'main'}"></div>`)
                .join('')}</div>`,
            { runScripts: 'outside-only' }
        );
        const { window } = dom;
        window.eval(`
            var isMobileDevice = true;
            var isVideoPinned = true;
            var customRatio = false;
            var ratio = 1;
            var setSP = () => {};
            var grid = document.getElementById('grid');
            Object.defineProperty(grid, 'offsetWidth', { value: 410, configurable: true });
            Object.defineProperty(grid, 'offsetHeight', { value: 210, configurable: true });
            ${extractFunction(gridSource, 'layoutPinnedStrip')}
            window.layoutPinnedStrip = layoutPinnedStrip;
        `);
        const grid = window.document.getElementById('grid');
        const cameras = [...grid.children];

        assert.equal(window.layoutPinnedStrip(grid, 5), true);
        assert.ok(grid.classList.contains('pinned-strip'));
        assert.ok(grid.classList.contains('pinned-strip-overflow'), '5 tiles do not fit, so the row scrolls');
        assert.ok(!grid.classList.contains('screen-stage'));
        assert.ok(
            cameras.every((c) => c.style.width === '156px' && c.style.height === '117px'),
            'fixed 4:3 tiles'
        );
        assert.ok(cameras.every((c) => !c.hasAttribute('data-screen-stage')));

        window.eval('isMobileDevice = false;');
        assert.equal(window.layoutPinnedStrip(grid, 5), true, 'desktop strips are supported too');
        assert.ok(!grid.classList.contains('pinned-strip-vertical'));

        window.eval(`
            Object.defineProperty(grid, 'offsetWidth', { value: 300, configurable: true });
            Object.defineProperty(grid, 'offsetHeight', { value: 800, configurable: true });
        `);
        assert.equal(window.layoutPinnedStrip(grid, 5), true, 'speaker left/right column');
        assert.ok(grid.classList.contains('pinned-strip-vertical'));
        assert.ok(grid.classList.contains('pinned-strip-overflow'), '5 column tiles do not fit, so it scrolls');
        assert.ok(
            cameras.every((c) => c.style.width === '280px' && c.style.height === '210px'),
            'full column width'
        );

        window.eval(`
            Object.defineProperty(grid, 'offsetWidth', { value: 410, configurable: true });
            Object.defineProperty(grid, 'offsetHeight', { value: 210, configurable: true });
            isVideoPinned = false;
        `);
        assert.equal(window.layoutPinnedStrip(grid, 5), false);
        assert.ok(!grid.classList.contains('pinned-strip'));
    });
});
