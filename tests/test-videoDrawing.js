'use strict';

// npx mocha tests/test-videoDrawing.js

const should = require('should');

const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3099;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');
const ROOM = 'video-drawing-room';

let serverProcess;
const sockets = [];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            await fetch(`${BASE}/`, { redirect: 'manual' });
            return;
        } catch (err) {
            await sleep(200);
        }
    }
    throw new Error('Server did not become ready in time');
}

function connectSocket() {
    return new Promise((resolve, reject) => {
        const socket = io(BASE, { transports: ['websocket'], reconnection: false, forceNew: true });
        sockets.push(socket);
        const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
        socket.on('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });
        socket.on('connect_error', (error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}

function joinCfg(name, screen = false) {
    return {
        channel: ROOM,
        channel_password: '',
        peer_uuid: `uuid-${name}-${Math.random().toString(36).slice(2)}`,
        peer_name: name,
        peer_avatar: '',
        peer_video: false,
        peer_audio: false,
        peer_video_status: false,
        peer_audio_status: false,
        peer_screen_status: screen,
        peer_hand_status: false,
        peer_rec_status: false,
        peer_privacy_status: false,
        peer_info: {},
    };
}

function join(socket, config) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('join timeout')), 6000);
        socket.once('serverInfo', (data) => {
            clearTimeout(timer);
            resolve(data);
        });
        socket.emit('join', config);
    });
}

function receiveOnce(socket, event, emit, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${event} was not received`)), timeoutMs);
        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
        emit();
    });
}

describe('persistent screen annotations', function () {
    this.timeout(40000);

    let owner;
    let drawer;

    before(async () => {
        serverProcess = spawn(process.execPath, [SERVER], {
            env: {
                ...process.env,
                PORT: String(PORT),
                HOST_PROTECTED: 'false',
                HOST_USER_AUTH: 'false',
                NGROK_ENABLED: 'false',
                SENTRY_ENABLED: 'false',
                IP_LOOKUP_ENABLED: 'false',
                OIDC_ENABLED: 'false',
            },
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        await waitForServer(20000);
        owner = await connectSocket();
        await join(owner, joinCfg('screen-owner', true));
        drawer = await connectSocket();
        await join(drawer, joinCfg('drawer'));
    });

    after(() => {
        sockets.forEach((socket) => socket.close());
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('broadcasts, moves, replays, restores, deletes, and clears permanent annotations', async () => {
        const annotation = {
            room_id: ROOM,
            type: 'annotation',
            action: 'create',
            screenOwnerId: owner.id,
            annotationId: 'stroke-1',
            tool: 'circle',
            color: '#ff0000',
            width: 0.004,
            points: [
                { x: 0.1, y: 0.2 },
                { x: 0.3, y: 0.4 },
            ],
        };

        const broadcast = await receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', annotation));
        broadcast.should.containEql({
            type: 'annotation',
            action: 'create',
            annotationId: 'stroke-1',
            drawerId: drawer.id,
        });

        const movedPoints = [
            { x: 0.4, y: 0.5 },
            { x: 0.6, y: 0.7 },
        ];
        const moved = await receiveOnce(owner, 'videoDrawing', () => {
            drawer.emit('videoDrawing', {
                room_id: ROOM,
                type: 'annotation',
                action: 'move',
                screenOwnerId: owner.id,
                annotationId: 'stroke-1',
                points: movedPoints,
            });
        });
        moved.should.containEql({ type: 'annotation', action: 'move', points: movedPoints });

        const lateJoiner = await connectSocket();
        const replayPromise = receiveOnce(lateJoiner, 'videoDrawing', () => join(lateJoiner, joinCfg('late-joiner')));
        const replay = await replayPromise;
        replay.annotationId.should.equal('stroke-1');
        replay.points.should.deepEqual(movedPoints);

        const deleted = await receiveOnce(drawer, 'videoDrawing', () => {
            owner.emit('videoDrawing', {
                room_id: ROOM,
                type: 'annotation',
                action: 'delete',
                screenOwnerId: owner.id,
                annotationId: 'stroke-1',
            });
        });
        deleted.should.containEql({ type: 'annotation', action: 'delete', annotationId: 'stroke-1' });

        await receiveOnce(owner, 'videoDrawing', () =>
            drawer.emit('videoDrawing', { ...annotation, annotationId: 'stroke-2', tool: 'pencil' })
        );

        const cleared = await receiveOnce(drawer, 'videoDrawing', () => {
            owner.emit('videoDrawing', {
                room_id: ROOM,
                type: 'annotation',
                action: 'clear',
                screenOwnerId: owner.id,
            });
        });
        cleared.should.containEql({ type: 'annotation', action: 'clear', clearAll: true });

        const restored = await receiveOnce(drawer, 'videoDrawing', () => {
            owner.emit('videoDrawing', {
                ...annotation,
                action: 'restore',
                annotationId: 'rectangle-1',
                drawerId: drawer.id,
                tool: 'rectangle',
            });
        });
        restored.should.containEql({
            type: 'annotation',
            action: 'create',
            annotationId: 'rectangle-1',
            drawerId: drawer.id,
            tool: 'rectangle',
        });

        const arrow = await receiveOnce(owner, 'videoDrawing', () => {
            drawer.emit('videoDrawing', { ...annotation, annotationId: 'arrow-1', tool: 'arrow' });
        });
        arrow.should.containEql({
            type: 'annotation',
            action: 'create',
            annotationId: 'arrow-1',
            drawerId: drawer.id,
            tool: 'arrow',
        });

        await receiveOnce(drawer, 'videoDrawing', () => {
            owner.emit('videoDrawing', {
                room_id: ROOM,
                type: 'annotation',
                action: 'clear',
                screenOwnerId: owner.id,
            });
        });

        const afterClear = await connectSocket();
        let replayed = false;
        afterClear.once('videoDrawing', (data) => {
            if (data.type === 'annotation') replayed = true;
        });
        await join(afterClear, joinCfg('after-clear'));
        await sleep(250);
        replayed.should.be.false();
    });

    it('broadcasts, edits, replays, moves, and deletes text annotations', async () => {
        const annotation = {
            room_id: ROOM,
            type: 'text',
            action: 'create',
            screenOwnerId: owner.id,
            annotationId: 'text-1',
            text: 'Original\nmultiline text',
            x: 0.2,
            y: 0.3,
            color: '#ffffff',
            fontSize: 16,
            bold: false,
            italic: false,
            boxWidth: 0.35,
            underline: false,
            strikethrough: false,
            textAlign: 'left',
            backgroundColor: 'transparent',
            rotation: 0,
        };

        const created = await receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', annotation));
        created.should.containEql({
            type: 'text',
            action: 'create',
            annotationId: 'text-1',
            drawerId: drawer.id,
            text: 'Original\nmultiline text',
            fontSize: 16,
            boxWidth: 0.35,
        });

        const updated = await receiveOnce(owner, 'videoDrawing', () => {
            drawer.emit('videoDrawing', {
                ...annotation,
                action: 'update',
                text: 'Corrected\nformatted text',
                color: '#ffeb3b',
                fontSize: 24,
                bold: true,
                italic: true,
                boxWidth: 0.5,
                underline: true,
                strikethrough: true,
                textAlign: 'center',
                backgroundColor: '#1a237e',
                rotation: 15,
            });
        });
        updated.should.containEql({
            type: 'text',
            action: 'update',
            text: 'Corrected\nformatted text',
            color: '#ffeb3b',
            fontSize: 24,
            bold: true,
            italic: true,
            boxWidth: 0.5,
            underline: true,
            strikethrough: true,
            textAlign: 'center',
            backgroundColor: '#1a237e',
            rotation: 15,
        });

        const lateJoiner = await connectSocket();
        const replayPromise = receiveOnce(lateJoiner, 'videoDrawing', () => join(lateJoiner, joinCfg('text-reader')));
        const replay = await replayPromise;
        replay.should.containEql({
            annotationId: 'text-1',
            text: 'Corrected\nformatted text',
            color: '#ffeb3b',
            fontSize: 24,
            bold: true,
            italic: true,
            boxWidth: 0.5,
            underline: true,
            strikethrough: true,
            textAlign: 'center',
            backgroundColor: '#1a237e',
            rotation: 15,
        });

        const moved = await receiveOnce(owner, 'videoDrawing', () => {
            drawer.emit('videoDrawing', { ...annotation, action: 'move', x: 0.4, y: 0.5 });
        });
        moved.should.containEql({ type: 'text', action: 'move', x: 0.4, y: 0.5 });

        const deleted = await receiveOnce(owner, 'videoDrawing', () => {
            drawer.emit('videoDrawing', { ...annotation, action: 'delete' });
        });
        deleted.should.containEql({ type: 'text', action: 'delete', annotationId: 'text-1' });

        const restored = await receiveOnce(drawer, 'videoDrawing', () => {
            owner.emit('videoDrawing', {
                ...annotation,
                action: 'restore',
                drawerId: drawer.id,
                text: 'Corrected\nformatted text',
                color: '#ffeb3b',
                fontSize: 24,
                bold: true,
                italic: true,
                boxWidth: 0.5,
                underline: true,
                strikethrough: true,
                textAlign: 'center',
                backgroundColor: '#1a237e',
                rotation: 15,
                x: 0.4,
                y: 0.5,
            });
        });
        restored.should.containEql({
            type: 'text',
            action: 'create',
            annotationId: 'text-1',
            drawerId: drawer.id,
            text: 'Corrected\nformatted text',
            color: '#ffeb3b',
            fontSize: 24,
            bold: true,
            italic: true,
            boxWidth: 0.5,
            underline: true,
            strikethrough: true,
            textAlign: 'center',
            backgroundColor: '#1a237e',
            rotation: 15,
        });

        const cleared = await receiveOnce(drawer, 'videoDrawing', () => {
            owner.emit('videoDrawing', { ...annotation, action: 'clear' });
        });
        cleared.should.containEql({ type: 'text', action: 'clear', screenOwnerId: owner.id });
    });
});

describe('screen annotation text toolbar', () => {
    let dom;
    let overlay;
    let editor;
    let input;

    beforeEach(() => {
        dom = new JSDOM('<div id="screen"><canvas></canvas></div>', {
            runScripts: 'outside-only',
            url: BASE,
        });
        dom.window.setTippy = (element, content, placement) => {
            element._tippy = {
                __i18nSrc: content,
                placement,
                destroy() {
                    delete element._tippy;
                },
            };
        };
        dom.window.i18n = {
            t: (label, namespace) => `${namespace}:${label}`,
        };
        const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'videoDrawing.js'), 'utf8');
        dom.window.eval(`${source}\nwindow.Overlay = VideoDrawingOverlay;`);
        overlay = Object.create(dom.window.Overlay.prototype);
        overlay.canvas = dom.window.document.querySelector('canvas');
        for (const [property, value] of Object.entries({ clientWidth: 800, clientHeight: 600 })) {
            Object.defineProperty(overlay.canvas, property, { value });
        }
        overlay.screenWrap = dom.window.document.querySelector('#screen');
        overlay.textStyle = {};
        overlay.getPoint = () => ({ x: 0.1, y: 0.1 });
        overlay.recordHistory = () => {};
        overlay.addTextAnnotation = (annotation) => {
            overlay.savedAnnotation = annotation;
        };
        overlay.beginTextInput({});
        editor = overlay.textInput;
        input = editor.querySelector('textarea');
    });

    afterEach(() => dom.window.close());

    it('groups primary formatting separately from fixed actions and hidden occasional settings', () => {
        editor.getAttribute('aria-label').should.equal('labels:Edit screen text annotation');
        editor
            .querySelector('.video-drawing-text-formatting')
            .getAttribute('aria-label')
            .should.equal('labels:Text formatting');
        editor.querySelectorAll('.video-drawing-text-formatting button').length.should.equal(5);
        editor.querySelectorAll('.video-drawing-text-actions button').length.should.equal(2);
        const panel = editor.querySelector('.video-drawing-text-more-panel');
        panel.hidden.should.be.true();
        panel.getAttribute('aria-label').should.equal('labels:More text options');
        panel.querySelector('.video-drawing-text-background-color').disabled.should.be.true();
        should(panel.querySelector('.video-drawing-text-rotation')).be.ok();
        for (const control of editor.querySelectorAll('button, input, select')) {
            control.getAttribute('aria-label').should.not.be.empty();
            control.getAttribute('aria-label').should.startWith('tooltips:');
            should(control._tippy).be.ok();
            control._tippy.placement.should.equal('bottom');
            control.hasAttribute('title').should.be.false();
        }
    });

    it('cycles alignment and saves primary formatting, background, and rotation', () => {
        input.value = 'Formatted annotation';
        const alignment = editor.querySelector('.video-drawing-text-alignment');
        for (const value of ['center', 'right', 'left']) {
            alignment.click();
            input.style.textAlign.should.equal(value);
            alignment.dataset.alignment.should.equal(value);
            alignment.getAttribute('aria-label').should.containEql(value);
            alignment._tippy.__i18nSrc.should.containEql(value);
        }
        input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'e', ctrlKey: true, shiftKey: true }));
        const bold = editor.querySelector('.fa-bold');
        bold.click();
        bold.getAttribute('aria-pressed').should.equal('true');
        const size = editor.querySelector('.video-drawing-text-size');
        size.value = '24';
        size.dispatchEvent(new dom.window.Event('change'));
        input.style.fontSize.should.equal('24px');
        editor.querySelector('[aria-expanded]').click();
        const panel = editor.querySelector('.video-drawing-text-more-panel');
        panel.querySelector('button').click();
        const background = panel.querySelector('input');
        background.disabled.should.be.false();
        background.value = '#ff0000';
        background.dispatchEvent(new dom.window.Event('input'));
        panel.querySelector('select').value = '30';
        editor.querySelector('.video-drawing-text-save').click();
        should(overlay.savedAnnotation).containEql({
            text: 'Formatted annotation',
            bold: true,
            fontSize: 24,
            textAlign: 'center',
            backgroundColor: '#ff0000',
            rotation: 30,
        });
        editor.isConnected.should.be.false();
    });

    it('dismisses More without cancelling, then supports Escape and Cancel from toolbar controls', () => {
        const more = editor.querySelector('[aria-expanded]');
        const panel = editor.querySelector('.video-drawing-text-more-panel');
        more.click();
        panel.hidden.should.be.false();
        input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        panel.hidden.should.be.true();
        more.getAttribute('aria-expanded').should.equal('false');
        editor.isConnected.should.be.true();
        more.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        editor.isConnected.should.be.false();
        overlay.beginTextInput({});
        const cancelledEditor = overlay.textInput;
        const cancelledControls = [...cancelledEditor.querySelectorAll('button, input, select')];
        cancelledEditor.querySelector('.video-drawing-text-cancel').click();
        should(overlay.textInput).equal(null);
        should(overlay.savedAnnotation).equal(undefined);
        cancelledControls.some((control) => control._tippy).should.be.false();
    });
});
