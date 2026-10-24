'use strict';

// npx mocha tests/test-screenCameraLayout.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../public/js/screenCameraLayout.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/views/client.html'), 'utf8');

function setup() {
    const dom = new JSDOM(
        `<div id="videoMediaContainer">
            <div id="myVideoWrap" class="Camera" style="width: 300px; height: 200px; margin: 5px"><video id="myVideo"></video></div>
            <div id="myScreenWrap" class="Screen"><video id="myScreen"></video></div>
        </div>
        <div id="videoPinMediaContainer"></div>`,
        { runScripts: 'outside-only' }
    );
    const { window } = dom;
    window.eval(`${source}\nwindow.ScreenCameraLayout = ScreenCameraLayout;`);
    const doc = window.document;
    const grid = doc.getElementById('videoMediaContainer');
    const pin = doc.getElementById('videoPinMediaContainer');
    const camera = doc.getElementById('myVideoWrap');
    const screen = doc.getElementById('myScreenWrap');
    const layout = window.ScreenCameraLayout;
    const pairs = () => [{ cameraWrap: camera, screenWrap: doc.getElementById('myScreenWrap') }];
    return { window, doc, grid, pin, camera, screen, layout, pairs };
}

function pointer(window, type, props) {
    const event = new window.PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...props });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    return event;
}

describe('screen share camera layout', () => {
    it('normalizes and cycles modes', () => {
        const { layout } = setup();
        assert.equal(layout.getMode(), 'separate');
        assert.equal(layout.setMode('bogus'), 'separate');
        assert.equal(layout.setMode('pip'), 'pip');
        assert.equal(layout.nextMode('separate'), 'pip');
        assert.equal(layout.nextMode('pip'), 'split');
        assert.equal(layout.nextMode('split'), 'separate');
    });

    it('keeps the camera in the grid in separate mode', () => {
        const { grid, camera, layout, pairs } = setup();
        assert.equal(layout.sync(pairs(), grid), false);
        assert.equal(camera.parentElement, grid);
        assert.equal(camera.className, 'Camera');
    });

    it('moves the camera inside the screen tile for pip and split', () => {
        const { grid, camera, screen, layout, pairs } = setup();
        layout.setMode('pip');
        assert.equal(layout.sync(pairs(), grid), true);
        assert.equal(camera.parentElement, screen);
        assert.ok(layout.isOverlaid(camera));
        assert.ok(!camera.classList.contains('Camera'), 'overlay must not be sized as a grid tile');
        assert.equal(screen.dataset.camLayout, 'pip');
        assert.equal(grid.getElementsByClassName('Camera').length, 0);

        layout.setMode('split');
        assert.equal(layout.sync(pairs(), grid), true, 'pip -> split changes the screen tile layout');
        assert.equal(camera.parentElement, screen);
        assert.equal(screen.dataset.camLayout, 'split');
        assert.equal(layout.sync(pairs(), grid), false, 'sync is idempotent');
    });

    it('restores the camera to the grid when switching back to separate', () => {
        const { grid, camera, screen, layout, pairs } = setup();
        layout.setMode('pip');
        layout.sync(pairs(), grid);
        camera.style.left = '40%';
        camera.style.top = '10%';

        layout.setMode('separate');
        assert.equal(layout.sync(pairs(), grid), true);
        assert.equal(camera.parentElement, grid);
        assert.equal(camera.className, 'Camera');
        assert.equal(camera.style.left, '');
        assert.equal(camera.style.top, '');
        assert.equal(screen.dataset.camLayout, undefined);
    });

    it('does nothing without a screen tile', () => {
        const { grid, camera, screen, layout, pairs } = setup();
        screen.remove();
        layout.setMode('pip');
        assert.equal(layout.sync(pairs(), grid), false);
        assert.equal(camera.parentElement, grid);
        assert.equal(camera.className, 'Camera');
    });

    it('releases the camera before the screen tile is removed', () => {
        const { grid, camera, screen, layout, pairs } = setup();
        layout.setMode('pip');
        layout.sync(pairs(), grid);
        assert.equal(layout.release(screen, grid), true);
        screen.remove();
        assert.equal(camera.parentElement, grid);
        assert.ok(camera.isConnected);
        assert.equal(camera.className, 'Camera');
    });

    it('does not resurrect a camera removed together with its screen tile', () => {
        const { grid, camera, screen, layout, pairs } = setup();
        layout.setMode('pip');
        layout.sync(pairs(), grid);
        screen.remove(); // e.g. peer disconnected
        camera.remove();
        layout.sync([{ cameraWrap: camera, screenWrap: screen }], grid);
        assert.equal(camera.isConnected, false);
        assert.equal(grid.contains(camera), false);
    });

    it('leaves a pinned camera where it is', () => {
        const { grid, pin, camera, screen, layout, pairs } = setup();
        camera.className = '';
        pin.appendChild(camera);
        layout.setMode('pip');
        assert.equal(layout.sync(pairs(), grid), false);
        assert.equal(camera.parentElement, pin);
        assert.equal(screen.dataset.camLayout, undefined);
    });

    it('keeps the overlay when the screen tile itself is pinned', () => {
        const { grid, pin, camera, screen, layout, pairs } = setup();
        layout.setMode('split');
        layout.sync(pairs(), grid);
        screen.className = '';
        pin.appendChild(screen);
        assert.equal(layout.sync(pairs(), grid), false);
        assert.equal(camera.parentElement, screen);
        assert.equal(screen.dataset.camLayout, 'split');
    });

    it('clears the screen layout when an overlaid camera gets pinned on its own', () => {
        const { grid, pin, camera, screen, layout, pairs } = setup();
        layout.setMode('split');
        layout.sync(pairs(), grid);
        camera.className = '';
        pin.appendChild(camera);
        assert.equal(layout.sync(pairs(), grid), true);
        assert.equal(camera.parentElement, pin);
        assert.equal(screen.dataset.camLayout, undefined);
    });

    it('returns a hidden (hide self view) camera to the grid', () => {
        const { grid, camera, screen, layout, pairs } = setup();
        layout.setMode('pip');
        layout.sync(pairs(), grid);
        camera.style.display = 'none';
        assert.equal(layout.sync(pairs(), grid), true);
        assert.equal(camera.parentElement, grid);
        assert.equal(screen.dataset.camLayout, undefined);

        camera.style.display = 'inline-block';
        assert.equal(layout.sync(pairs(), grid), true);
        assert.equal(camera.parentElement, screen);
    });

    it('drags the pip overlay within the screen tile and swallows the following click', () => {
        const { window, grid, camera, screen, layout, pairs } = setup();
        layout.setMode('pip');
        layout.sync(pairs(), grid);
        Object.defineProperty(screen, 'clientWidth', { value: 1000 });
        Object.defineProperty(screen, 'clientHeight', { value: 500 });
        Object.defineProperty(camera, 'offsetWidth', { value: 200 });
        Object.defineProperty(camera, 'offsetHeight', { value: 100 });
        Object.defineProperty(camera, 'offsetLeft', { value: 12 });
        Object.defineProperty(camera, 'offsetTop', { value: 388 });

        let videoClicks = 0;
        camera.querySelector('video').addEventListener('click', () => videoClicks++);

        camera.dispatchEvent(pointer(window, 'pointerdown', { clientX: 100, clientY: 450 }));
        camera.dispatchEvent(pointer(window, 'pointermove', { clientX: 400, clientY: 200 }));
        assert.equal(camera.style.left, '31.2%');
        assert.equal(camera.style.top, '27.6%');
        assert.equal(camera.style.bottom, 'auto');

        // Clamped to the screen tile bounds
        camera.dispatchEvent(pointer(window, 'pointermove', { clientX: 5000, clientY: -5000 }));
        assert.equal(camera.style.left, '80%');
        assert.equal(camera.style.top, '0%');

        camera.dispatchEvent(pointer(window, 'pointerup', { clientX: 5000, clientY: -5000 }));
        camera.querySelector('video').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        assert.equal(videoClicks, 0, 'click after a drag must not open full screen');

        camera.querySelector('video').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        assert.equal(videoClicks, 1, 'a later plain click still works');
    });

    it('does not drag in split mode', () => {
        const { window, grid, camera, layout, pairs } = setup();
        layout.setMode('split');
        layout.sync(pairs(), grid);
        camera.dispatchEvent(pointer(window, 'pointerdown', { clientX: 100, clientY: 100 }));
        camera.dispatchEvent(pointer(window, 'pointermove', { clientX: 300, clientY: 300 }));
        assert.equal(camera.style.left, '');
        assert.equal(camera.style.top, '');
    });

    it('is wired into the room client', () => {
        assert.match(html, /<script defer src="\.\.\/js\/screenCameraLayout\.js"><\/script>[\s\S]*client\.js/);
        assert.match(html, /<select id="screenCamLayoutSelect">/);
        for (const mode of ['separate', 'pip', 'split']) {
            assert.match(html, new RegExp(`id="participantViewMenu"[\\s\\S]*data-screen-cam-layout="${mode}"`));
        }
        assert.match(client, /function setScreenCameraLayout[\s\S]*?updateScreenCameraLayoutUI\(mode\);/);
        assert.match(
            client,
            /updateScreenCameraLayoutUI\(ScreenCameraLayout\.setMode\(lsSettings\.screen_cam_layout\)\);/
        );
        assert.match(client, /setScreenCameraLayout\(camLayoutButton\.dataset\.screenCamLayout\);/);
        assert.match(client, /function adaptAspectRatio\(\) \{\n\s+syncScreenCameraLayout\(\);/);
        assert.match(
            client,
            /ScreenCameraLayout\.release\(myScreenWrap, videoMediaContainer\);\n\s+myScreenWrap\.remove\(\);/
        );
        assert.match(
            client,
            /ScreenCameraLayout\.release\(remoteScreenWrap, videoMediaContainer\);\n\s+remoteScreenWrap\.remove\(\);/
        );
    });
});
