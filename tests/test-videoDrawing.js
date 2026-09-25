'use strict';

// npx mocha tests/test-videoDrawing.js

require('should');

const path = require('path');
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
});
