'use strict';

// npx mocha tests/test-oidcCreateRoom.js
//
// With OIDC enabled, an unauthenticated Socket.IO 'join' must NOT be able to open a new room:
// it needs the short-lived create-room token that GET /createRoomToken only issues to
// requesters the HTTP room creation policy allows.

require('should');

const path = require('path');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const { getJwtKeys } = require('../app/src/jwtSecret');

const PORT = 3098;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');
const JWT_KEY = 'test-jwt-key-0123456789-abcdefghijklmnop';

let serverProcess;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            await fetch(`${BASE}/join/ping`, { redirect: 'manual' });
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
        socket.once('roomIsLocked', () => done({ event: 'roomIsLocked' }));
        socket.once('serverInfo', (data) => done({ event: 'serverInfo', data }));
        socket.emit('join', cfg);
    });
}

async function join(cfg) {
    const socket = await connectSocket();
    try {
        return await joinAndAwait(socket, cfg);
    } finally {
        socket.close();
    }
}

describe('test-oidcCreateRoom', function () {
    this.timeout(40000);

    const keys = getJwtKeys(JWT_KEY);
    const mint = (roomId, options = {}) =>
        jwt.sign({ scope: 'create-room', roomId }, keys.createRoom, { expiresIn: '2m', ...options });

    before(async () => {
        serverProcess = spawn(process.execPath, [SERVER], {
            env: {
                ...process.env,
                PORT: String(PORT),
                HOST_PROTECTED: 'false',
                HOST_USER_AUTH: 'false',
                JWT_KEY,
                NGROK_ENABLED: 'false',
                SENTRY_ENABLED: 'false',
                IP_LOOKUP_ENABLED: 'false',
                OIDC_ENABLED: 'true',
                OIDC_ISSUER_BASE_URL: 'http://127.0.0.1:9',
                OIDC_CLIENT_ID: 'test-client',
                OIDC_CLIENT_SECRET: 'test-secret',
                OIDC_BASE_URL: BASE,
                OIDC_LOCK_USERNAME: 'true',
                SESSION_SECRET: 'test-oidc-secret-0123456789-abcdefghijklmnop',
            },
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        await waitForServer(20000);
    });

    after(() => {
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('rejects a Socket.IO join that opens a new room without a create-room token', async () => {
        const result = await join(joinCfg('oidc-no-token'));
        result.event.should.equal('unauthorized');
    });

    it('rejects a token minted for another room', async () => {
        const result = await join(joinCfg('oidc-room-a', { create_room_token: mint('oidc-room-b') }));
        result.event.should.equal('unauthorized');
    });

    it('rejects a token signed with another key', async () => {
        const forged = jwt.sign({ scope: 'create-room', roomId: 'oidc-forged' }, keys.sign, { expiresIn: '2m' });
        const result = await join(joinCfg('oidc-forged', { create_room_token: forged }));
        result.event.should.equal('unauthorized');
    });

    it('rejects an expired token', async () => {
        const expired = mint('oidc-expired', { expiresIn: '-10s' });
        const result = await join(joinCfg('oidc-expired', { create_room_token: expired }));
        result.event.should.equal('unauthorized');
    });

    it('allows opening a new room with a valid create-room token, then guests join without one', async () => {
        const room = 'oidc-valid';
        const host = await connectSocket();
        try {
            const hostResult = await joinAndAwait(host, joinCfg(room, { create_room_token: mint(room) }));
            hostResult.event.should.equal('serverInfo');
            hostResult.data.is_presenter.should.be.true();

            const guestResult = await join(joinCfg(room, { peer_name: 'guest' }));
            guestResult.event.should.equal('serverInfo');
            guestResult.data.is_presenter.should.be.false();
        } finally {
            host.close();
        }
    });
    describe('OIDC presenters (PRESENTERS by verified email or sub)', () => {
        const presenterToken = (roomId, key = keys.oidcPresenter, options = {}) =>
            jwt.sign({ scope: 'oidc-presenter', roomId }, key, { expiresIn: '2m', ...options });

        // Host opens the room, then a second peer joins with the given extra join data
        async function secondPeerIsPresenter(room, extra) {
            const host = await connectSocket();
            try {
                const hostResult = await joinAndAwait(host, joinCfg(room, { create_room_token: mint(room) }));
                hostResult.event.should.equal('serverInfo');
                const result = await join(joinCfg(room, { peer_name: 'second', ...extra }));
                result.event.should.equal('serverInfo');
                return result.data.is_presenter;
            } finally {
                host.close();
            }
        }

        it('makes a peer with a valid OIDC presenter token a presenter', async () => {
            const room = 'oidc-pres-a';
            (await secondPeerIsPresenter(room, { oidc_presenter_token: presenterToken(room) })).should.be.true();
        });

        it('ignores a presenter token minted for another room', async () => {
            const isPresenter = await secondPeerIsPresenter('oidc-pres-b', {
                oidc_presenter_token: presenterToken('oidc-pres-other'),
            });
            isPresenter.should.be.false();
        });

        it('ignores a presenter token signed with another key', async () => {
            const room = 'oidc-pres-c';
            const isPresenter = await secondPeerIsPresenter(room, {
                oidc_presenter_token: presenterToken(room, keys.createRoom),
            });
            isPresenter.should.be.false();
        });

        it('ignores an expired presenter token', async () => {
            const room = 'oidc-pres-d';
            const isPresenter = await secondPeerIsPresenter(room, {
                oidc_presenter_token: presenterToken(room, keys.oidcPresenter, { expiresIn: '-10s' }),
            });
            isPresenter.should.be.false();
        });

        it('does not issue a presenter token without an OIDC session', async () => {
            const res = await fetch(`${BASE}/oidcPresenterToken?room=oidc-pres-e`, { redirect: 'manual' });
            if (res.status === 200) {
                const data = await res.json();
                (data.token === null).should.be.true();
            } else {
                res.status.should.not.equal(200);
            }
        });
    });

    describe('OIDC_LOCK_USERNAME', () => {
        const identity = (name, key = keys.identity) =>
            jwt.sign({ scope: 'oidc-identity', name }, key, { expiresIn: '2m' });

        // Join as host (valid create-room token) and resolve the peers map a later guest receives
        async function peersSeenByGuest(room, hostExtra) {
            const host = await connectSocket();
            try {
                const hostResult = await joinAndAwait(
                    host,
                    joinCfg(room, { create_room_token: mint(room), peer_name: 'Mallory', ...hostExtra })
                );
                hostResult.event.should.equal('serverInfo');

                const guest = await connectSocket();
                try {
                    const added = new Promise((resolve) => guest.once('addPeer', resolve));
                    await joinAndAwait(guest, joinCfg(room, { peer_name: 'guest' }));
                    const { peers } = await added;
                    return Object.values(peers)
                        .map((p) => p.peer_name)
                        .filter((n) => n !== undefined);
                } finally {
                    guest.close();
                }
            } finally {
                host.close();
            }
        }

        it('uses the verified name instead of the client-supplied one', async () => {
            const names = await peersSeenByGuest('oidc-lock-a', { identity_token: identity('Alice Verified') });
            names.should.containEql('Alice Verified');
            names.should.not.containEql('Mallory');
        });

        it('ignores an identity token signed with another key', async () => {
            const names = await peersSeenByGuest('oidc-lock-b', { identity_token: identity('Alice', keys.sign) });
            names.should.containEql('Mallory');
            names.should.not.containEql('Alice');
        });

        it('blocks renaming a peer whose name is verified', async () => {
            const room = 'oidc-lock-c';
            const host = await connectSocket();
            const guest = await connectSocket();
            try {
                const hostResult = await joinAndAwait(
                    host,
                    joinCfg(room, { create_room_token: mint(room), identity_token: identity('Alice Verified') })
                );
                hostResult.event.should.equal('serverInfo');
                await joinAndAwait(guest, joinCfg(room, { peer_name: 'guest' }));

                let renamed = false;
                guest.on('peerName', () => (renamed = true));
                host.emit('peerName', {
                    room_id: room,
                    peer_name_old: 'Alice Verified',
                    peer_name_new: 'Mallory',
                    peer_avatar: '',
                });
                await sleep(800);
                renamed.should.be.false();
            } finally {
                host.close();
                guest.close();
            }
        });
    });
});
