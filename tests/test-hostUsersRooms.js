'use strict';

// npx mocha tests/test-hostUsersRooms.js
//
// HOST_USERS displayname / allowed_rooms (same format as MiroTalk SFU), end to end:
// the displayname is enforced as the peer name and allowed_rooms limits which rooms a login can join.

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3096;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');

const PASS = '550e8400-e29b-41d4-a716-446655440000';
const HOST_USERS = `alice:${PASS}:Alice Admin:*|bob:${PASS}:Bob:bob-room,shared-room|carol:${PASS}`;

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

function joinAndAwait(socket, cfg, timeoutMs = 6000) {
    return new Promise((resolve) => {
        const done = (result) => {
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => resolve({ event: 'timeout' }), timeoutMs);
        socket.once('unauthorized', () => done({ event: 'unauthorized' }));
        socket.once('roomNotAllowed', () => done({ event: 'roomNotAllowed' }));
        socket.once('serverInfo', (data) => done({ event: 'serverInfo', data }));
        socket.emit('join', cfg);
    });
}

async function login(username) {
    const res = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: PASS }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, token: data.message, displayname: data.displayname, allowedRooms: data.allowedRooms };
}

async function join(cfg) {
    const socket = await connectSocket();
    try {
        return await joinAndAwait(socket, cfg);
    } finally {
        socket.close();
    }
}

describe('test-hostUsersRooms (HOST_USERS displayname / allowed_rooms)', function () {
    this.timeout(40000);

    const tokens = {};

    before(async () => {
        serverProcess = spawn(process.execPath, [SERVER], {
            env: {
                ...process.env,
                PORT: String(PORT),
                HOST_PROTECTED: 'false',
                HOST_USER_AUTH: 'true',
                HOST_USERS,
                HOST_MAX_LOGIN_ATTEMPTS: '100',
                JWT_KEY: 'test-jwt-key-0123456789-abcdefghijklmnop',
                NGROK_ENABLED: 'false',
                SENTRY_ENABLED: 'false',
                IP_LOOKUP_ENABLED: 'false',
                OIDC_ENABLED: 'false',
            },
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        await waitForServer(20000);
        for (const user of ['alice', 'bob', 'carol']) tokens[user] = (await login(user)).token;
    });

    after(() => {
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('returns the displayname and allowed rooms on login', async () => {
        const bob = await login('bob');
        bob.status.should.equal(200);
        bob.displayname.should.equal('Bob');
        bob.allowedRooms.should.eql(['bob-room', 'shared-room']);

        const carol = await login('carol');
        carol.displayname.should.equal('carol');
        carol.allowedRooms.should.eql(['*']);
    });

    it('lets a user join an allowed room', async () => {
        const result = await join(joinCfg('bob-room', { peer_token: tokens.bob }));
        result.event.should.equal('serverInfo');
    });

    it('rejects a Socket.IO join to a room outside allowed_rooms', async () => {
        const result = await join(joinCfg('not-bobs-room', { peer_token: tokens.bob }));
        result.event.should.equal('roomNotAllowed');
    });

    it('rejects a direct /join with token to a room outside allowed_rooms', async () => {
        const denied = await fetch(`${BASE}/join/?room=not-bobs-room&token=${encodeURIComponent(tokens.bob)}`);
        denied.status.should.equal(403);

        const allowed = await fetch(`${BASE}/join/?room=bob-room&token=${encodeURIComponent(tokens.bob)}`);
        allowed.status.should.equal(200);
    });

    it('enforces the displayname as the peer name, keeps the typed name without one', async () => {
        const room = 'names-room';
        const alice = await connectSocket();
        try {
            const aliceResult = await joinAndAwait(
                alice,
                joinCfg(room, { peer_token: tokens.alice, peer_name: 'Mallory' })
            );
            aliceResult.event.should.equal('serverInfo');

            const carol = await connectSocket();
            try {
                const added = new Promise((resolve) => carol.once('addPeer', resolve));
                const carolResult = await joinAndAwait(
                    carol,
                    joinCfg(room, { peer_token: tokens.carol, peer_name: 'Carol Typed' })
                );
                carolResult.event.should.equal('serverInfo');
                const { peers } = await added;
                const names = Object.values(peers)
                    .map((p) => p.peer_name)
                    .filter((n) => n !== undefined);
                names.should.containEql('Alice Admin');
                names.should.containEql('Carol Typed');
                names.should.not.containEql('Mallory');
            } finally {
                carol.close();
            }
        } finally {
            alice.close();
        }
    });

    it('blocks renaming a peer whose name comes from the displayname', async () => {
        const room = 'rename-room';
        const alice = await connectSocket();
        const carol = await connectSocket();
        try {
            (await joinAndAwait(alice, joinCfg(room, { peer_token: tokens.alice }))).event.should.equal('serverInfo');
            (await joinAndAwait(carol, joinCfg(room, { peer_token: tokens.carol }))).event.should.equal('serverInfo');

            let renamed = false;
            carol.on('peerName', () => (renamed = true));
            alice.emit('peerName', {
                room_id: room,
                peer_name_old: 'Alice Admin',
                peer_name_new: 'Mallory',
                peer_avatar: '',
            });
            await sleep(800);
            renamed.should.be.false();
        } finally {
            alice.close();
            carol.close();
        }
    });

    it('exposes the locked name on /hostIdentity only for a valid token with a displayname', async () => {
        const get = async (token) => {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            return (await fetch(`${BASE}/hostIdentity`, { headers })).json();
        };
        (await get(tokens.alice)).should.eql({ locked: true, name: 'Alice Admin' });
        (await get(tokens.carol)).should.eql({ locked: false });
        (await get('not-a-token')).should.eql({ locked: false });
        (await get()).should.eql({ locked: false });
    });
});
