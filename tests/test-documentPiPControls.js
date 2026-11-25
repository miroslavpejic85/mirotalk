'use strict';

// npx mocha tests/test-documentPiPControls.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const clientSource = fs.readFileSync(path.join(__dirname, '..', 'public/js/client.js'), 'utf8');

function extractFunction(src, name) {
    const match = src.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`));
    assert.ok(match, `${name} not found`);
    return match[0];
}

const mainHtml = `
<div id="bottomButtons">
    <div id="audioSplit" class="split-btn"><button id="audioBtn" class="fas fa-microphone-slash"></button></div>
    <div id="videoSplit" class="split-btn"><button id="videoBtn" class="fas fa-video"></button></div>
    <div id="myHandSplit" class="split-btn"><button id="myHandBtn" class="fas fa-hand-paper"></button></div>
    <div id="exitDropdown"><button id="leaveRoomBtn" class="fa-solid fa-phone-slash"></button></div>
</div>`;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('document PiP controls', () => {
    let dom;
    let pipDom;
    let window;
    let pipWindow;
    let controls;

    beforeEach(() => {
        dom = new JSDOM(mainHtml, { runScripts: 'outside-only' });
        pipDom = new JSDOM('');
        window = dom.window;
        pipWindow = pipDom.window;
        pipWindow.close = () => window.calls.pipClosed++;
        window.focus = () => {};
        window.eval(`
            var calls = { leave: 0, ptt: [], pipClosed: 0 };
            var myAudioStatus = false;
            var myVideoStatus = true;
            var myHandStatus = false;
            var isPushToTalkActive = false;
            var setPushToTalkPressed = (pressed) => calls.ptt.push(pressed);
            var leaveRoom = () => calls.leave++;
            var bottomButtons = document.getElementById('bottomButtons');
            var audioBtn = document.getElementById('audioBtn');
            var videoBtn = document.getElementById('videoBtn');
            var myHandBtn = document.getElementById('myHandBtn');
            var leaveRoomBtn = document.getElementById('leaveRoomBtn');
            ${extractFunction(clientSource, 'createDocumentPipControls')}
        `);
        controls = window.createDocumentPipControls(pipWindow);
        pipWindow.document.body.append(controls.element);
    });

    afterEach(() => {
        controls.destroy();
        dom.window.close();
        pipDom.window.close();
    });

    const main = (id) => window.document.getElementById(id);
    const pip = (id) => pipWindow.document.getElementById(id);

    it('mirrors the bottom buttons state, icons and visibility', async () => {
        assert.ok(pip('pipAudioBtn').classList.contains('muted'));
        assert.equal(pip('pipAudioBtn').firstChild.className, 'fas fa-microphone-slash');
        assert.equal(pip('pipAudioBtn').title, 'Start the audio');
        assert.ok(!pip('pipVideoBtn').classList.contains('muted'));
        assert.ok(!pip('pipHandBtn').classList.contains('raised'));

        window.eval('myAudioStatus = true; myHandStatus = true;');
        main('audioBtn').className = 'fas fa-microphone';
        main('myHandBtn').style.color = '#FFD700';
        main('videoBtn').disabled = true;
        await flush();

        assert.ok(!pip('pipAudioBtn').classList.contains('muted'));
        assert.equal(pip('pipAudioBtn').firstChild.className, 'fas fa-microphone');
        assert.equal(pip('pipAudioBtn').title, 'Stop the audio');
        assert.ok(pip('pipHandBtn').classList.contains('raised'));
        assert.ok(pip('pipVideoBtn').disabled);

        main('myHandBtn').style.display = 'none';
        await flush();

        assert.ok(pip('pipHandBtn').hidden);
    });

    it('proxies clicks to the bottom buttons', () => {
        const clicked = [];
        ['audioBtn', 'videoBtn', 'myHandBtn'].forEach((id) =>
            main(id).addEventListener('click', () => clicked.push(id))
        );

        pip('pipAudioBtn').click();
        pip('pipHandBtn').click();
        main('videoBtn').disabled = true;
        pip('pipVideoBtn').click();

        assert.deepEqual(clicked, ['audioBtn', 'myHandBtn']);
    });

    it('drives push-to-talk from the PiP mic button', () => {
        window.eval('isPushToTalkActive = true;');
        const button = pip('pipAudioBtn');
        button.setPointerCapture = () => {};

        button.dispatchEvent(new pipWindow.Event('pointerdown'));
        button.dispatchEvent(new pipWindow.Event('pointerup'));

        assert.deepEqual([...window.calls.ptt], [true, false]);
    });

    it('closes the PiP window and leaves the room', () => {
        pip('pipLeaveBtn').click();

        assert.equal(window.calls.pipClosed, 1);
        assert.equal(window.calls.leave, 1);
        assert.ok(pip('pipLeaveBtn').classList.contains('leave'));
    });
});
