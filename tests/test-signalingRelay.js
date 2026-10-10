'use strict';

// npx mocha tests/test-signalingRelay.js

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3097;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');
const ROOM_A = 'relay-room-a';
const ROOM_B = 'relay-room-b';

let serverProcess;
const sockets = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
        socket.on('connect', () => {
            clearTimeout(timer);
            sockets.push(socket);
            resolve(socket);
        });
        socket.on('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function joinRoom(channel) {
    const socket = await connectSocket();
    const serverInfo = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('join timeout')), 6000);
        socket.once('serverInfo', () => {
            clearTimeout(timer);
            resolve();
        });
    });
    socket.emit('join', {
        channel,
        channel_password: '',
        peer_uuid: 'uuid-' + Math.random().toString(36).slice(2),
        peer_name: 'peer-' + Math.random().toString(36).slice(2, 8),
        peer_avatar: '',
        peer_video: false,
        peer_audio: false,
        peer_video_status: false,
        peer_audio_status: false,
        peer_screen_status: false,
        peer_hand_status: false,
        peer_rec_status: false,
        peer_privacy_status: false,
        peer_info: {},
    });
    await serverInfo;
    return socket;
}

// Resolves true if `event` reaches `target` within the window after `emit()` runs
async function delivered(target, event, emit, windowMs = 500) {
    let received = false;
    const handler = () => (received = true);
    target.on(event, handler);
    emit();
    await sleep(windowMs);
    target.off(event, handler);
    return received;
}

describe('signaling relay isolation', function () {
    this.timeout(40000);

    let victim;
    let friend;
    let outsider; // joined a different room
    let lurker; // connected, never joined

    const offer = { type: 'offer', sdp: 'v=0\r\ns=FORGED\r\n' };

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

        victim = await joinRoom(ROOM_A);
        friend = await joinRoom(ROOM_A);
        outsider = await joinRoom(ROOM_B);
        lurker = await connectSocket();
    });

    after(() => {
        sockets.forEach((s) => s.close());
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('relays SDP and ICE between peers of the same room', async () => {
        (
            await delivered(victim, 'sessionDescription', () =>
                friend.emit('relaySDP', { peer_id: victim.id, session_description: offer })
            )
        ).should.be.true();
        (
            await delivered(victim, 'iceCandidate', () =>
                friend.emit('relayICE', { peer_id: victim.id, ice_candidate: {} })
            )
        ).should.be.true();
    });

    for (const [label, getSender] of [
        ['a peer of another room', () => outsider],
        ['a socket that never joined', () => lurker],
    ]) {
        it(`blocks SDP and ICE from ${label}`, async () => {
            const sender = getSender();
            (
                await delivered(victim, 'sessionDescription', () =>
                    sender.emit('relaySDP', { peer_id: victim.id, session_description: offer })
                )
            ).should.be.false();
            (
                await delivered(victim, 'iceCandidate', () =>
                    sender.emit('relayICE', { peer_id: victim.id, ice_candidate: {} })
                )
            ).should.be.false();
        });
    }

    it('blocks cross-room targeted peerAction, cmd and fileInfo', async () => {
        const cases = [
            ['peerAction', { room_id: ROOM_B, peer_id: victim.id, peer_action: 'ping', send_to_all: false }],
            ['cmd', { action: 'ping', send_to_all: false, data: { room_id: ROOM_B, to_peer_id: victim.id } }],
            [
                'fileInfo',
                {
                    room_id: ROOM_B,
                    peer_id: victim.id,
                    broadcast: false,
                    file: { fileName: 'a.txt', fileSize: 1, fileType: 'text/plain' },
                },
            ],
        ];
        for (const [event, payload] of cases) {
            (await delivered(victim, event, () => outsider.emit(event, payload))).should.be.false();
        }
    });

    it('does not accept room metadata keys as relay targets', async () => {
        // 'constructor' used to crash the process (sockets['constructor'].emit is not a function)
        friend.emit('relaySDP', { peer_id: 'lock', session_description: offer });
        friend.emit('relayICE', { peer_id: 'constructor', ice_candidate: {} });
        await sleep(300);
        (
            await delivered(victim, 'sessionDescription', () =>
                friend.emit('relaySDP', { peer_id: victim.id, session_description: offer })
            )
        ).should.be.true();
    });
});
