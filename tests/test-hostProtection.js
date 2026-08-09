'use strict';

// npx mocha tests/test-hostProtection.js
//
// Regression tests for HOST_PROTECTED host protection must NOT be bypassable via unauthenticated
// Socket.IO 'join' requests. These boot the real server with HOST_PROTECTED=true
// and HOST_USER_AUTH left at its default (false), then exercise the signaling and
// HTTP entry points end to end.

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3097;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');

// Host credentials injected via HOST_USERS below (kept explicit so the test does
// not depend on the developer's local .env).
const HOST_USER = 'MiroTalk';
const HOST_PASS = 'P2P';

let serverProcess;

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
        const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
        socket.on('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });
        socket.on('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function joinCfg(channel, extra = {}) {
    return {
        channel,
        channel_password: '',
        peer_uuid: 'uuid-' + Math.random().toString(36).slice(2),
        peer_name: 'tester',
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
        ...extra,
    };
}

// Emit 'join' and resolve with the first decisive server response.
function joinAndAwait(socket, cfg, timeoutMs = 6000) {
    return new Promise((resolve) => {
        const done = (result) => {
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => resolve({ event: 'timeout' }), timeoutMs);
        socket.once('unauthorized', () => done({ event: 'unauthorized' }));
        socket.once('roomIsLocked', () => done({ event: 'roomIsLocked' }));
        socket.once('serverInfo', (data) => done({ event: 'serverInfo', data }));
        socket.emit('join', cfg);
    });
}

async function login(username, password) {
    const res = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, token: data.message };
}

describe('test-hostProtection (GHSA-8cwh-jg4g-8jg6)', function () {
    this.timeout(40000);

    before(async () => {
        serverProcess = spawn(process.execPath, [SERVER], {
            env: {
                ...process.env,
                PORT: String(PORT),
                HOST_PROTECTED: 'true',
                HOST_USER_AUTH: 'false',
                HOST_USERS: JSON.stringify([{ username: HOST_USER, password: HOST_PASS }]),
                JWT_KEY: 'mirotalk_jwt_secret',
                NGROK_ENABLED: 'false',
                SENTRY_ENABLED: 'false',
                IP_LOOKUP_ENABLED: 'false',
                OIDC_ENABLED: 'false',
            },
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        await waitForServer(20000);
    });

    after(() => {
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('rejects an unauthenticated Socket.IO join for a new protected room', async () => {
        const socket = await connectSocket();
        try {
            const result = await joinAndAwait(socket, joinCfg('regress-unauth-room'));
            result.event.should.equal('unauthorized');
        } finally {
            socket.close();
        }
    });

    it('does not create the room after a rejected join (HTTP /join stays on the waiting room)', async () => {
        const room = 'regress-http-room';

        const socket = await connectSocket();
        try {
            const result = await joinAndAwait(socket, joinCfg(room));
            result.event.should.equal('unauthorized');
        } finally {
            socket.close();
        }

        // A guest hitting the HTTP layer must NOT get the meeting client for a room
        // that was never legitimately opened; they get the waiting room instead.
        const res = await fetch(`${BASE}/join/${room}`);
        const html = await res.text();
        html.should.not.match(/id="audioBtn"/); // meeting client marker
        html.should.match(/id="hostLoginLink"/); // waiting room marker
    });

    it('allows an authenticated host (valid JWT) to open a protected room as presenter', async () => {
        const { status, token } = await login(HOST_USER, HOST_PASS);
        status.should.equal(200);
        token.should.be.a.String();

        const socket = await connectSocket();
        try {
            const result = await joinAndAwait(
                socket,
                joinCfg('regress-host-room', { peer_token: token, peer_name: 'host', peer_uuid: 'host-uuid' })
            );
            result.event.should.equal('serverInfo');
            result.data.is_presenter.should.be.true();
        } finally {
            socket.close();
        }
    });

    it('allows a tokenless guest to join a protected room already opened by a host (not as presenter)', async () => {
        const { token } = await login(HOST_USER, HOST_PASS);
        const room = 'regress-guest-room';

        const host = await connectSocket();
        try {
            const hostResult = await joinAndAwait(
                host,
                joinCfg(room, { peer_token: token, peer_name: 'host', peer_uuid: 'host-uuid' })
            );
            hostResult.event.should.equal('serverInfo');

            const guest = await connectSocket();
            try {
                const guestResult = await joinAndAwait(
                    guest,
                    joinCfg(room, { peer_name: 'guest', peer_uuid: 'guest-uuid' })
                );
                guestResult.event.should.equal('serverInfo');
                guestResult.data.is_presenter.should.be.false();
            } finally {
                guest.close();
            }
        } finally {
            host.close();
        }
    });
});
