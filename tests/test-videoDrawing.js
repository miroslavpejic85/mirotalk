'use strict';

// npx mocha tests/test-videoDrawing.js

const should = require('should');

const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const sinon = require('sinon');

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
                JWT_KEY: 'test-jwt-key-0123456789-abcdefghijklmnop',
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

    it('enforces screen-owner permissions across annotation types and replays them to late joiners', async () => {
        const permission = { room_id: ROOM, type: 'permissions', screenOwnerId: owner.id, allowed: false };
        await should(
            receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', permission), 200)
        ).be.rejectedWith('videoDrawing was not received');
        const locked = await receiveOnce(drawer, 'videoDrawing', () => owner.emit('videoDrawing', permission));
        locked.should.containEql({ type: 'permissions', screenOwnerId: owner.id, allowed: false });
        const lateJoiner = await connectSocket();
        const replay = await receiveOnce(lateJoiner, 'videoDrawing', () =>
            join(lateJoiner, joinCfg('locked-late-joiner'))
        );
        replay.should.containEql({ type: 'permissions', screenOwnerId: owner.id, allowed: false });
        for (const type of ['annotation', 'text', 'pen', 'laser']) {
            const update = {
                room_id: ROOM,
                type,
                action: 'create',
                screenOwnerId: owner.id,
                annotationId: `locked-${type}`,
                tool: 'pencil',
                color: '#ff0000',
                width: 0.004,
                text: 'Blocked',
                x: 0.2,
                y: 0.2,
                points:
                    type === 'laser'
                        ? [{ x: 0.2, y: 0.2 }]
                        : [
                              { x: 0.2, y: 0.2 },
                              { x: 0.4, y: 0.4 },
                          ],
            };
            await should(
                receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', update), 200)
            ).be.rejectedWith('videoDrawing was not received');
        }
        const ownerPen = { room_id: ROOM, type: 'pen', screenOwnerId: owner.id, points: [{ x: 0.1, y: 0.1 }] };
        const broadcast = await receiveOnce(drawer, 'videoDrawing', () => owner.emit('videoDrawing', ownerPen));
        broadcast.drawerId.should.equal(owner.id);
        await receiveOnce(drawer, 'videoDrawing', () => owner.emit('videoDrawing', { ...permission, allowed: true }));
        const unlocked = await receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', ownerPen));
        unlocked.drawerId.should.equal(drawer.id);
        await receiveOnce(drawer, 'videoDrawing', () => owner.emit('videoDrawing', permission));
        const screenStatus = {
            room_id: ROOM,
            peer_name: 'screen-owner',
            peer_id: owner.id,
            element: 'screen',
            status: false,
        };
        await receiveOnce(drawer, 'peerStatus', () => owner.emit('peerStatus', screenStatus));
        await should(
            receiveOnce(drawer, 'videoDrawing', () => owner.emit('videoDrawing', permission), 200)
        ).be.rejectedWith('videoDrawing was not received');
        await receiveOnce(drawer, 'peerStatus', () => owner.emit('peerStatus', { ...screenStatus, status: true }));
        const restarted = await receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', ownerPen));
        restarted.drawerId.should.equal(drawer.id);
    });

    it('broadcasts temporary laser positions with the authenticated drawer identity and no late-join replay', async () => {
        const laser = {
            room_id: ROOM,
            type: 'laser',
            screenOwnerId: owner.id,
            drawerId: 'spoofed',
            points: [{ x: 0.25, y: 0.75 }],
            end: false,
        };
        const broadcast = await receiveOnce(owner, 'videoDrawing', () => drawer.emit('videoDrawing', laser));
        broadcast.should.containEql({
            type: 'laser',
            drawerId: drawer.id,
            points: laser.points,
            end: false,
        });
        const lateJoiner = await connectSocket();
        const replayed = [];
        lateJoiner.on('videoDrawing', (data) => replayed.push(data));
        await join(lateJoiner, joinCfg('laser-late-joiner'));
        await receiveOnce(lateJoiner, 'videoDrawing', () => drawer.emit('videoDrawing', { ...laser, end: true }));
        replayed.length.should.equal(1);
        replayed[0].end.should.be.true();
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

        const diamond = await receiveOnce(owner, 'videoDrawing', () => {
            drawer.emit('videoDrawing', { ...annotation, annotationId: 'diamond-1', tool: 'diamond' });
        });
        diamond.should.containEql({
            type: 'annotation',
            action: 'create',
            annotationId: 'diamond-1',
            drawerId: drawer.id,
            tool: 'diamond',
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

describe('screen annotation laser pointer and color swatches', () => {
    let dom;
    let overlay;
    let clock;
    let emitted;
    let arcs;

    beforeEach(() => {
        dom = new JSDOM('<div id="screen"><video></video><button id="draw"></button></div>', {
            runScripts: 'outside-only',
        });
        clock = sinon.useFakeTimers({ global: dom.window });
        dom.window.ResizeObserver = class {
            observe() {}
            disconnect() {}
        };
        arcs = [];
        dom.window.HTMLCanvasElement.prototype.getContext = () => ({
            clearRect() {},
            moveTo() {},
            lineTo() {},
            save() {},
            restore() {},
            beginPath() {},
            fill() {},
            stroke() {},
            fillRect() {},
            fillText() {},
            measureText: () => ({ width: 50 }),
            arc: (...args) => arcs.push(args),
        });
        const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'videoDrawing.js'), 'utf8');
        dom.window.eval(`${source}\nwindow.Overlay = VideoDrawingOverlay;`);
        emitted = [];
        dom.window.Overlay.getLocalDrawerId = () => 'local';
        dom.window.Overlay.onEmitDrawing = (data) => emitted.push(data);
        overlay = new dom.window.Overlay(
            'owner',
            dom.window.document.querySelector('#screen'),
            dom.window.document.querySelector('video')
        );
        overlay.bindControls(dom.window.document.querySelector('#draw'));
        overlay.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 450 });
        overlay.canvas.setPointerCapture = () => {};
        Object.defineProperty(overlay.canvas, 'clientWidth', { value: 800 });
        Object.defineProperty(overlay.canvas, 'clientHeight', { value: 450 });
    });

    afterEach(() => {
        overlay.destroy();
        clock.restore();
        dom.window.close();
    });

    function move(clientX = 400, clientY = 225) {
        overlay.canvas.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX, clientY }));
    }

    it('reopens a collapsed toolbar without disabling the selected drawing tool', () => {
        overlay.toolButtons.highlighter.click();
        overlay.toolbar.querySelector('.video-drawing-close').click();
        overlay.isToolbarCollapsed.should.be.true();
        overlay.drawingButton.click();
        overlay.isToolbarCollapsed.should.be.false();
        overlay.isActive.should.be.true();
        overlay.tool.should.equal('highlighter');
        overlay.drawingButton.click();
        overlay.isActive.should.be.false();
    });

    it('opens only one secondary panel and restores focus when Escape dismisses it', () => {
        overlay.drawingButton.click();
        const tools = overlay.toolbarPanels.get('tools');
        const appearance = overlay.toolbarPanels.get('appearance');
        tools.panel.hidden.should.be.true();
        tools.button.click();
        tools.panel.hidden.should.be.false();
        tools.button.getAttribute('aria-expanded').should.equal('true');
        tools.button.getAttribute('aria-controls').should.equal(tools.panel.id);
        appearance.button.click();
        tools.panel.hidden.should.be.true();
        appearance.panel.hidden.should.be.false();
        overlay.colorInput.focus();
        overlay.colorInput.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        appearance.panel.hidden.should.be.true();
        should(dom.window.document.activeElement).equal(appearance.button);
        overlay.isActive.should.be.true();
        appearance.button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        overlay.isToolbarCollapsed.should.be.true();
        overlay.drawingButton.getAttribute('aria-label').should.equal('Show annotation toolbar');
    });

    it('dismisses secondary tools after selection and when clicking outside', () => {
        overlay.drawingButton.click();
        const tools = overlay.toolbarPanels.get('tools');
        tools.button.click();
        overlay.toolButtons.arrow.click();
        overlay.tool.should.equal('arrow');
        tools.panel.hidden.should.be.true();
        tools.button.classList.contains('video-drawing-tool-active').should.be.true();
        tools.button.classList.contains('fa-arrow-right-long').should.be.true();
        should(dom.window.document.activeElement).equal(tools.button);
        tools.button.click();
        overlay.canvas.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
        tools.panel.hidden.should.be.true();
    });

    it('previews the current color and width and offers an explicit exit action', () => {
        overlay.drawingButton.click();
        overlay.setColor('#ff1744');
        overlay.appearanceButton.firstChild.style.backgroundColor.should.equal('rgb(255, 23, 68)');
        overlay.widthInput.value = '0.008';
        overlay.widthInput.dispatchEvent(new dom.window.Event('input'));
        overlay.width.should.equal(0.008);
        overlay.widthPreview.style.height.should.equal('8px');
        overlay.toolbarPanels.get('more').button.click();
        overlay.toolbar.querySelector('[aria-label="Disable screen drawing"]').click();
        overlay.isActive.should.be.false();
        overlay.toolbarPanels.get('more').panel.hidden.should.be.true();
        should(dom.window.document.activeElement).equal(overlay.drawingButton);
    });

    it('follows hover without drawing and throttles updates to the latest position', () => {
        overlay.toolButtons.laser.click();
        move();
        move(600, 300);
        overlay.laserPointers.size.should.equal(1);
        overlay.strokes.length.should.equal(0);
        overlay.annotations.size.should.equal(0);
        overlay.undoStack.length.should.equal(0);
        clock.tick(50);
        emitted.length.should.equal(1);
        emitted[0].type.should.equal('laser');
        should(emitted[0].points[0]).containEql({ x: 0.75, y: 0.6667 });
        arcs.at(-1).slice(0, 3).should.deepEqual([600, 300, 5]);
    });

    it('clears on leave, tool change, cancellation, and touch release without delayed updates', () => {
        for (const reason of ['pointerleave', 'tool', 'pointercancel', 'pointerup']) {
            overlay.setTool('laser');
            move();
            if (reason === 'tool') {
                overlay.setTool('pencil');
            } else {
                const event = new dom.window.Event(reason);
                Object.defineProperty(event, 'pointerType', { value: 'touch' });
                overlay.canvas.dispatchEvent(event);
            }
            overlay.laserPointers.size.should.equal(0);
            emitted.at(-1).end.should.be.true();
        }
        clock.tick(50);
        emitted.length.should.equal(4);
    });

    it('replaces remote positions, excludes them from snapshots, and expires stale pointers', () => {
        const receive = (points, end = false) =>
            dom.window.Overlay.receive({ type: 'laser', screenOwnerId: 'owner', drawerId: 'remote', points, end });
        receive([{ x: 0.1, y: 0.2 }]);
        receive([{ x: 0.3, y: 0.4 }]);
        overlay.laserPointers.size.should.equal(1);
        overlay.strokes.length.should.equal(0);
        const count = arcs.length;
        overlay.render(false);
        arcs.length.should.equal(count);
        clock.tick(1000);
        overlay.laserPointers.size.should.equal(0);
        overlay.laserTimers.size.should.equal(0);
        receive([{ x: 0.5, y: 0.5 }]);
        receive([], true);
        overlay.laserPointers.size.should.equal(0);
    });

    it('erases only local shapes and text along a sweep and undoes the sweep as one action', () => {
        for (const [annotationId, drawerId, center] of [
            ['mine-first', 'local', 0.25],
            ['mine-second', 'local', 0.75],
            ['other', 'remote', 0.25],
        ]) {
            overlay.receiveAnnotation({
                action: 'create',
                annotationId,
                drawerId,
                tool: 'circle',
                color: '#ff0000',
                width: 0.004,
                points: [
                    { x: center, y: 0.5 },
                    { x: center + 0.05, y: 0.5 },
                ],
            });
        }
        for (const [annotationId, drawerId] of [
            ['my-text', 'local'],
            ['other-text', 'remote'],
        ]) {
            overlay.addTextAnnotation({ annotationId, drawerId, text: 'Label', x: 0.5, y: 0.5 });
            overlay.textAnnotations.get(annotationId).element.getBoundingClientRect = () => ({
                left: 390,
                top: 210,
                right: 450,
                bottom: 245,
            });
        }
        overlay.toolButtons.eraser.click();
        overlay.canvas.dispatchEvent(new dom.window.MouseEvent('pointerdown', { clientX: 80, clientY: 225 }));
        move(720, 225);
        overlay.canvas.dispatchEvent(new dom.window.MouseEvent('pointerup', { clientX: 720, clientY: 225 }));
        Array.from(overlay.annotations.keys()).should.deepEqual(['other']);
        Array.from(overlay.textAnnotations.keys()).should.deepEqual(['other-text']);
        overlay.undoStack.length.should.equal(1);
        emitted.filter((data) => data.action === 'delete').length.should.equal(3);
        overlay.undo();
        overlay.annotations.size.should.equal(3);
        overlay.textAnnotations.size.should.equal(2);
        overlay.redo();
        overlay.annotations.size.should.equal(1);
        overlay.textAnnotations.size.should.equal(1);
    });

    it('hides overlays locally without losing incoming annotations and restores their visibility', () => {
        overlay.addTextAnnotation({ annotationId: 'label', drawerId: 'local', text: 'Label', x: 0.2, y: 0.2 });
        overlay.setTool('laser');
        move();
        overlay.visibilityButton.click();
        overlay.annotationsHidden.should.be.true();
        overlay.laserPointers.size.should.equal(0);
        overlay.screenWrap.classList.contains('video-drawing-annotations-hidden').should.be.true();
        overlay.visibilityButton.getAttribute('aria-label').should.equal('Show annotations');
        overlay.toolButtons.pencil.disabled.should.be.true();
        const count = arcs.length;
        overlay.receiveAnnotation({
            action: 'create',
            annotationId: 'incoming',
            drawerId: 'remote',
            tool: 'circle',
            color: '#ff0000',
            width: 0.004,
            points: [
                { x: 0.2, y: 0.2 },
                { x: 0.3, y: 0.3 },
            ],
        });
        arcs.length.should.equal(count);
        overlay.textAnnotations.size.should.equal(1);
        overlay.annotations.size.should.equal(1);
        emitted.filter((data) => data.type !== 'laser').length.should.equal(0);
        overlay.visibilityButton.click();
        overlay.annotationsHidden.should.be.false();
        overlay.toolButtons.pencil.disabled.should.be.false();
        arcs.length.should.be.above(count);
    });

    it('locks participant editing, cancels unfinished drawing, and keeps viewing controls available', () => {
        should(overlay.permissionsButton).equal(undefined);
        overlay.toolButtons.pencil.click();
        overlay.canvas.dispatchEvent(new dom.window.MouseEvent('pointerdown', { clientX: 100, clientY: 100 }));
        overlay.annotations.size.should.equal(1);
        dom.window.Overlay.receive({ type: 'permissions', screenOwnerId: 'owner', allowed: false });
        overlay.annotations.size.should.equal(0);
        overlay.isDrawing.should.be.false();
        overlay.tool.should.equal('view');
        overlay.isActive.should.be.true();
        overlay.toolButtons.pencil.disabled.should.be.true();
        overlay.undoButton.disabled.should.be.true();
        overlay.clearButton.disabled.should.be.true();
        overlay.visibilityButton.disabled.should.be.false();
        overlay.downloadButtons.every((button) => !button.disabled).should.be.true();
        overlay.canvas.dispatchEvent(new dom.window.MouseEvent('pointerdown', { clientX: 100, clientY: 100 }));
        overlay.annotations.size.should.equal(0);
        overlay.addTextAnnotation({ annotationId: 'owned', drawerId: 'local', text: 'Label', x: 0.2, y: 0.2 });
        const text = overlay.textAnnotations.get('owned');
        overlay.duplicateTextAnnotation(text);
        overlay.deleteTextAnnotationWithHistory(text);
        overlay.clearAnnotations(true);
        overlay.textAnnotations.size.should.equal(1);
        emitted.length.should.equal(0);
        dom.window.Overlay.receive({ type: 'permissions', screenOwnerId: 'owner', allowed: true });
        overlay.tool.should.equal('pencil');
        overlay.toolButtons.pencil.disabled.should.be.false();
        overlay.canManageTextAnnotation(text).should.be.true();
    });

    it('queues permission events before overlay creation and provides owner-only permission controls', () => {
        dom.window.Overlay.receive({ type: 'permissions', screenOwnerId: 'queued', allowed: false });
        const queued = new dom.window.Overlay('queued', overlay.screenWrap, overlay.video);
        queued.bindControls(dom.window.document.createElement('button'));
        queued.participantsAllowed.should.be.false();
        queued.toolButtons.pencil.disabled.should.be.true();
        queued.setTool('pencil');
        queued.tool.should.equal('view');
        queued.destroy();
        dom.window.Overlay.pendingPermissions.size.should.equal(0);
        dom.window.Overlay.getLocalDrawerId = () => 'owner';
        const ownerOverlay = new dom.window.Overlay('owner', overlay.screenWrap, overlay.video);
        ownerOverlay.bindControls(dom.window.document.createElement('button'));
        ownerOverlay.setTool('eraser');
        ownerOverlay.permissionsButton.click();
        should(emitted.at(-1)).containEql({ type: 'permissions', screenOwnerId: 'owner', allowed: false });
        ownerOverlay.setParticipantsAllowed(false);
        ownerOverlay.tool.should.equal('eraser');
        ownerOverlay.permissionsButton.getAttribute('aria-label').should.equal('Enable participant annotations');
        ownerOverlay.toolButtons.pencil.disabled.should.be.false();
        ownerOverlay.setTool('pencil');
        ownerOverlay.tool.should.equal('pencil');
        ownerOverlay.destroy();
    });

    it('keeps swatches and the custom color picker in sync without changing the drawing tool', () => {
        overlay.setTool('pencil');
        overlay.colorButtons.length.should.equal(5);
        overlay.colorButtons[0].getAttribute('aria-pressed').should.equal('true');
        overlay.colorButtons[1].click();
        overlay.color.should.equal('#ff1744');
        overlay.colorInput.value.should.equal('#ff1744');
        overlay.tool.should.equal('pencil');
        overlay.colorButtons[0].getAttribute('aria-pressed').should.equal('false');
        overlay.colorButtons[1].getAttribute('aria-pressed').should.equal('true');
        overlay.colorInput.value = '#123456';
        overlay.colorInput.dispatchEvent(new dom.window.Event('input'));
        overlay.color.should.equal('#123456');
        overlay.colorButtons.every((button) => button.getAttribute('aria-pressed') === 'false').should.be.true();
        overlay.colorInput.value = '#ffffff';
        overlay.colorInput.dispatchEvent(new dom.window.Event('input'));
        overlay.colorButtons[4].getAttribute('aria-pressed').should.equal('true');
    });
});

describe('screen annotation snapshots and diamond geometry', () => {
    let dom;
    let overlay;
    let drawnImages;
    let renderModes;

    beforeEach(() => {
        dom = new JSDOM('<div id="screen"><video></video><canvas></canvas></div>', { runScripts: 'outside-only' });
        const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'videoDrawing.js'), 'utf8');
        dom.window.eval(`${source}\nwindow.Overlay = VideoDrawingOverlay;`);
        drawnImages = [];
        renderModes = [];
        dom.window.HTMLCanvasElement.prototype.getContext = () => ({
            drawImage: (...args) => drawnImages.push(args),
        });
        dom.window.HTMLCanvasElement.prototype.toBlob = (callback) => callback(new dom.window.Blob(['png']));
        overlay = Object.create(dom.window.Overlay.prototype);
        overlay.screenWrap = dom.window.document.querySelector('#screen');
        overlay.canvas = dom.window.document.querySelector('canvas');
        overlay.video = dom.window.document.querySelector('video');
        for (const [property, value] of Object.entries({
            clientWidth: 800,
            clientHeight: 450,
            offsetLeft: 20,
            offsetTop: 30,
        })) {
            Object.defineProperty(overlay.canvas, property, { value });
        }
        for (const [property, value] of Object.entries({ videoWidth: 1920, videoHeight: 1080, readyState: 2 })) {
            Object.defineProperty(overlay.video, property, { value, configurable: true });
        }
        overlay.render = (showDetails = true) => renderModes.push(showDetails);
        overlay.textAnnotations = new Map();
        overlay.downloadButtons = [
            dom.window.document.createElement('button'),
            dom.window.document.createElement('button'),
        ];
    });

    afterEach(() => dom.window.close());

    it('composes the video and drawing canvas at source resolution without selection controls', async () => {
        const snapshot = await overlay.captureSnapshot();
        snapshot.width.should.equal(1920);
        snapshot.height.should.equal(1080);
        drawnImages[0].should.deepEqual([overlay.video, 0, 0, 1920, 1080]);
        drawnImages[1].should.deepEqual([overlay.canvas, 0, 0, 1920, 1080]);
        renderModes.should.deepEqual([false, true]);
    });

    it('exports only the video frame when annotations are locally hidden', async () => {
        overlay.annotationsHidden = true;
        overlay.textAnnotations.set('label', {});
        const snapshot = await overlay.captureSnapshot();
        snapshot.width.should.equal(1920);
        drawnImages.length.should.equal(1);
        should(drawnImages[0][0]).equal(overlay.video);
        renderModes.length.should.equal(0);
    });

    it('captures formatted text at canvas-relative coordinates and cleans up on renderer failure', async () => {
        const element = dom.window.document.createElement('div');
        element.className = 'video-drawing-text-annotation video-drawing-text-selected video-drawing-text-bold';
        element.innerHTML =
            '<span class="video-drawing-text-content">Label</span><button>Edit</button><span class="video-drawing-text-author">Author</span>';
        element.style.transform = 'rotate(15deg)';
        for (const [property, value] of Object.entries({
            offsetLeft: 100,
            offsetTop: 90,
            offsetWidth: 150,
            offsetHeight: 60,
        })) {
            Object.defineProperty(element, property, { value });
        }
        overlay.screenWrap.appendChild(element);
        overlay.textAnnotations.set('label', { element });
        dom.window.html2canvas = async (frame, options) => {
            const clone = frame.querySelector('.video-drawing-text-annotation');
            clone.style.left.should.equal('80px');
            clone.style.top.should.equal('60px');
            clone.style.transform.should.equal('rotate(15deg)');
            clone.classList.contains('video-drawing-text-bold').should.be.true();
            clone.classList.contains('video-drawing-text-selected').should.be.false();
            should(clone.querySelector('button, .video-drawing-text-author')).equal(null);
            options.scale.should.equal(2.4);
            throw new Error('renderer failure');
        };
        await should(overlay.captureSnapshot()).be.rejectedWith('renderer failure');
        should(dom.window.document.querySelector('[aria-hidden="true"]')).equal(null);
        element.querySelector('button').textContent.should.equal('Edit');
    });

    it('downloads a PNG and restores the download controls', async () => {
        let saved;
        dom.window.saveBlobToFile = (blob, name) => (saved = { blob, name });
        await overlay.downloadSnapshot('png');
        saved.name.should.match(/^screen-annotations-.*\.png$/);
        saved.blob.size.should.be.above(0);
        overlay.isCapturing.should.be.false();
        overlay.downloadButtons.every((button) => !button.disabled).should.be.true();
    });

    it('downloads a correctly sized single-page PDF', async () => {
        let options;
        let imageArgs;
        let fileName;
        dom.window.jspdf = {
            jsPDF: class {
                constructor(config) {
                    options = config;
                }
                addImage(...args) {
                    imageArgs = args;
                }
                save(name) {
                    fileName = name;
                }
            },
        };
        await overlay.downloadSnapshot('pdf');
        options.orientation.should.equal('landscape');
        Array.from(options.format).should.deepEqual([1920, 1080]);
        imageArgs.slice(1).should.deepEqual(['PNG', 0, 0, 1920, 1080]);
        fileName.should.match(/\.pdf$/);
    });

    it('reports an unavailable video frame without leaving downloads disabled', async () => {
        Object.defineProperty(overlay.video, 'readyState', { value: 0 });
        let reported;
        dom.window.console.error = () => {};
        dom.window.userLog = (type, message) => (reported = { type, message });
        await overlay.downloadSnapshot('png');
        reported.type.should.equal('error');
        overlay.isCapturing.should.be.false();
        overlay.downloadButtons.every((button) => !button.disabled).should.be.true();
        drawnImages.length.should.equal(0);
    });

    it('surrounds the full circle with its selection border before and after moving', () => {
        const borders = [];
        overlay.context = {
            save() {},
            beginPath() {},
            setLineDash() {},
            stroke() {},
            restore() {},
            rect: (...bounds) => borders.push(bounds),
        };
        const annotation = {
            tool: 'circle',
            points: [
                { x: 0.5, y: 0.5 },
                { x: 0.6, y: 0.6 },
            ],
        };
        const rect = { width: 800, height: 600 };
        overlay.renderAnnotationSelection(annotation, rect);
        annotation.points = [
            { x: 0.25, y: 0.25 },
            { x: 0.35, y: 0.35 },
        ];
        overlay.renderAnnotationSelection(annotation, rect);
        borders.should.deepEqual([
            [295, 195, 210, 210],
            [95, 45, 210, 210],
        ]);
    });

    it('renders four diamond vertices and selects its interior but not bounding-box corners', () => {
        const vertices = [];
        let closed = false;
        overlay.context = {
            save() {},
            beginPath() {},
            stroke() {},
            restore() {},
            moveTo: (...point) => vertices.push(point),
            lineTo: (...point) => vertices.push(point),
            closePath: () => (closed = true),
        };
        const annotation = {
            annotationId: 'diamond',
            tool: 'diamond',
            color: '#ff0000',
            width: 0.004,
            points: [
                { x: 0.2, y: 0.2 },
                { x: 0.8, y: 0.8 },
            ],
        };
        overlay.annotations = new Map([['diamond', annotation]]);
        overlay.renderAnnotation(annotation, { width: 800, height: 450 });
        vertices.should.deepEqual([
            [400, 90],
            [640, 225],
            [400, 360],
            [160, 225],
        ]);
        closed.should.be.true();
        overlay.findAnnotationAtPoint({ x: 0.5, y: 0.5 }).should.equal(annotation);
        should(overlay.findAnnotationAtPoint({ x: 0.2, y: 0.2 })).equal(undefined);
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
        panel.querySelector('.video-drawing-text-background-color').disabled.should.be.false();
        should(panel.querySelector('.video-drawing-text-rotation')).be.ok();
        for (const control of editor.querySelectorAll('button, input, select')) {
            control.getAttribute('aria-label').should.not.be.empty();
            control.getAttribute('aria-label').should.startWith('tooltips:');
            should(control._tippy).be.ok();
            control._tippy.placement.should.equal('bottom');
            control.hasAttribute('title').should.be.false();
        }
    });

    it('streams a live draft while typing and clears it when the editor closes', () => {
        const emitted = [];
        dom.window.Overlay.onEmitDrawing = (data) => emitted.push(data);
        overlay.canInteract = () => true;
        overlay.screenOwnerId = 'owner';
        input.value = 'Hello';
        input.dispatchEvent(new dom.window.Event('input'));
        input.value = 'Hello world';
        input.dispatchEvent(new dom.window.Event('input'));
        emitted.length.should.equal(0);
        editor.querySelector('.video-drawing-text-cancel').click();
        emitted.length.should.equal(1);
        should(emitted[0].action).equal('draft');
        should(emitted[0].text).equal('');
    });

    it('shows remote drafts as unmanageable temporary text and removes them when emptied', () => {
        overlay.textAnnotations = new Map();
        overlay.addTextAnnotation = dom.window.Overlay.prototype.addTextAnnotation;
        overlay.ownsAnnotation = () => true;
        overlay.positionTextAnnotation = () => {};
        const draft = { action: 'draft', drawerId: 'peer', annotationId: 'draft', text: 'Hi', x: 0.1, y: 0.1 };
        overlay.receiveText(draft);
        should(overlay.textAnnotations.get('draft:peer').element.querySelector('button')).be.null();
        overlay.receiveText({ ...draft, text: 'Hi there' });
        overlay.textAnnotations.size.should.equal(1);
        overlay.textAnnotations.get('draft:peer').text.should.equal('Hi there');
        overlay.textAnnotations
            .get('draft:peer')
            .element.classList.contains('video-drawing-text-highlight')
            .should.be.true();
        overlay.receiveText({ ...draft, text: '' });
        overlay.textAnnotations.size.should.equal(0);
        overlay.receiveText({ ...draft, action: 'create', annotationId: 'saved' });
        overlay.textAnnotations
            .get('saved')
            .element.classList.contains('video-drawing-text-highlight')
            .should.be.true();
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

    it('enables the background by selecting a color and allows toggling it off and on', () => {
        input.value = 'Colored background';
        editor.querySelector('[aria-expanded]').click();
        const background = editor.querySelector('.video-drawing-text-background-color');
        const toggle = editor.querySelector('.fa-fill-drip');
        toggle.getAttribute('aria-pressed').should.equal('false');
        background.disabled.should.be.false();
        background.value = '#00ff00';
        background.dispatchEvent(new dom.window.Event('input'));
        toggle.getAttribute('aria-pressed').should.equal('true');
        input.style.backgroundColor.should.equal('rgb(0, 255, 0)');
        toggle.click();
        input.style.backgroundColor.should.equal('transparent');
        background.disabled.should.be.false();
        toggle.click();
        input.style.backgroundColor.should.equal('rgb(0, 255, 0)');
        editor.querySelector('.video-drawing-text-save').click();
        overlay.savedAnnotation.backgroundColor.should.equal('#00ff00');
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
