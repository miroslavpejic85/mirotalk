'use strict';

// npx mocha tests/test-screenTouchZoom.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const zoomSource = fs.readFileSync(path.join(root, 'public/js/screenTouchZoom.js'), 'utf8');
const gridSource = fs.readFileSync(path.join(root, 'public/js/videoGrid.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(root, 'public/js/client.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/views/client.html'), 'utf8');

function extractFunction(src, name) {
    const match = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`));
    assert.ok(match, `${name} not found`);
    return match[0];
}

function setup({ mobile = true } = {}) {
    const dom = new JSDOM(
        `<div id="videoMediaContainer">
            <div id="cam__video" class="Camera"><video></video></div>
            <div id="screen__video" class="Screen"><video></video></div>
            <div id="other__video" class="Camera"><video></video></div>
        </div>`,
        { runScripts: 'outside-only', pretendToBeVisual: true }
    );
    const { window } = dom;
    window.isMobileDevice = mobile;
    window.setSP = () => {};
    window.eval(zoomSource.replace('const ScreenTouchZoom', 'window.ScreenTouchZoom'));
    window.eval(`${extractFunction(gridSource, 'layoutScreenStage')}\nwindow.layoutScreenStage = layoutScreenStage;`);
    return window;
}

function layout(window, width, height) {
    const container = window.document.getElementById('videoMediaContainer');
    Object.defineProperty(container, 'offsetWidth', { value: width + 10, configurable: true });
    Object.defineProperty(container, 'offsetHeight', { value: height + 10, configurable: true });
    const tiles = [...container.children];
    const applied = window.layoutScreenStage(container, 5);
    return { container, tiles, applied };
}

describe('screen share on mobile', () => {
    describe('stage layout', () => {
        it('gives the screen share the stage and the others a strip below it (portrait)', () => {
            const window = setup();
            const { container, applied } = layout(window, 380, 700);
            const screen = window.document.getElementById('screen__video');
            const cam = window.document.getElementById('cam__video');
            assert.equal(applied, true);
            assert.ok(container.classList.contains('screen-stage'));
            assert.ok(!container.classList.contains('screen-stage-landscape'));
            assert.equal(screen.dataset.screenStage, 'main');
            assert.equal(screen.style.width, '380px');
            const stripHeight = parseInt(cam.style.height, 10) + 10;
            assert.equal(parseInt(screen.style.height, 10), 700 - stripHeight);
            assert.ok(parseInt(cam.style.width, 10) <= 120);
            assert.equal(cam.dataset.screenStage, undefined);
        });

        it('hides the strip in landscape and gives the whole height to the screen share', () => {
            const window = setup();
            const { container } = layout(window, 700, 320);
            const screen = window.document.getElementById('screen__video');
            assert.ok(container.classList.contains('screen-stage-landscape'));
            assert.equal(screen.style.height, '320px');
        });

        it('does nothing on desktop', () => {
            const window = setup({ mobile: false });
            const { container, applied } = layout(window, 380, 700);
            assert.equal(applied, false);
            assert.ok(!container.classList.contains('screen-stage'));
        });

        it('restores the normal grid once the screen share is gone', () => {
            const window = setup();
            layout(window, 380, 700);
            window.document.getElementById('screen__video').remove();
            const { container, tiles, applied } = layout(window, 380, 700);
            assert.equal(applied, false);
            assert.ok(!container.classList.contains('screen-stage'));
            assert.ok(tiles.every((c) => !('screenStage' in c.dataset)));
        });
    });

    describe('touch zoom', () => {
        it('keeps the zoomed content covering the tile', () => {
            const window = setup();
            const ScreenTouchZoom = window.ScreenTouchZoom;
            const plain = (v) => JSON.parse(JSON.stringify(v));
            const zoomed = ScreenTouchZoom.zoomAt({ scale: 1, x: 0, y: 0 }, 100, 50, 2, 400, 200);
            assert.deepEqual(plain(zoomed), { scale: 2, x: -100, y: -50 });
            assert.deepEqual(plain(ScreenTouchZoom.clampState({ scale: 2, x: 50, y: -999 }, 400, 200)), {
                scale: 2,
                x: 0,
                y: -200,
            });
            assert.equal(
                ScreenTouchZoom.clampState({ scale: 99, x: 0, y: 0 }, 400, 200).scale,
                ScreenTouchZoom.MAX_SCALE
            );
            assert.deepEqual(plain(ScreenTouchZoom.clampState({ scale: 0.5, x: 10, y: 10 }, 400, 200)), {
                scale: 1,
                x: 0,
                y: 0,
            });
        });

        it('zooms in on double tap, out on the next one, and ignores a mouse', () => {
            const window = setup();
            const wrap = window.document.getElementById('screen__video');
            const video = wrap.querySelector('video');
            Object.defineProperty(wrap, 'clientWidth', { value: 400 });
            Object.defineProperty(wrap, 'clientHeight', { value: 200 });
            window.ScreenTouchZoom.attach(wrap);

            const fire = (type, init) => {
                const e = new window.Event(type, { bubbles: true });
                Object.assign(e, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 50 }, init);
                wrap.dispatchEvent(e);
            };
            const tap = (init) => {
                fire('pointerdown', init);
                fire('pointerup', init);
            };

            tap({ pointerType: 'mouse' });
            tap({ pointerType: 'mouse' });
            assert.equal(video.style.transform, '');

            tap();
            tap();
            assert.match(video.style.transform, /scale\(2\.5\)/);
            assert.ok(video.dataset.touchZoomed);

            // The click following a double tap must not toggle the video menu bar
            let clicks = 0;
            wrap.parentElement.addEventListener('click', () => clicks++);
            wrap.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
            assert.equal(clicks, 0);

            window.Date.now = () => Date.now() + 1000;
            tap();
            tap();
            assert.equal(video.style.transform, '');
            assert.equal(video.dataset.touchZoomed, undefined);
        });
    });

    it('keeps a focused tile visible in landscape stage', () => {
        const css = fs.readFileSync(path.join(root, 'public/css/videoGrid.css'), 'utf8');
        assert.match(css, /:not\(\[data-screen-stage='main'\], :has\(> \[focus-mode\]\)\)/);
        assert.match(css, /#videoMediaContainer\.screen-stage > :has\(> \[focus-mode\]\) \{\s+margin: 0 !important;/);
    });

    it('is wired into the room', () => {
        assert.match(html, /<script defer src="\.\.\/js\/screenTouchZoom\.js"><\/script>/);
        assert.match(clientSource, /isMobileDevice && ScreenTouchZoom\.attach\(remoteScreenWrap\);/);
        assert.match(gridSource, /if \(video\.dataset\.touchZoomed\) return;/);
        assert.match(gridSource, /layoutScreenStage\(videoMediaContainer, Margin\)/);
    });
});
