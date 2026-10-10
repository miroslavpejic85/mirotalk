'use strict';

// npx mocha tests/test-roomPassword.js

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const RoomPassword = require('../app/src/roomPassword');

const PORT = 3097;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');
const ROOM = 'room-password-guard';
const PASSWORD = 'S3cret!42';

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

function joinCfg(extra = {}) {
    return {
        channel: ROOM,
        channel_password: '',
        peer_uuid: 'uuid-' + Math.random().toString(36).slice(2),
        peer_name: 'participant',
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

function joinAndAwait(socket, cfg, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve('timeout'), timeoutMs);
        const done = (event) => {
            clearTimeout(timer);
            resolve(event);
        };
        socket.once('serverInfo', () => done('serverInfo'));
        socket.once('roomIsLocked', () => done('roomIsLocked'));
        socket.emit('join', cfg);
    });
}

function checkPassword(socket, password, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no checkPassword reply')), timeoutMs);
        socket.once('roomAction', (data) => {
            clearTimeout(timer);
            resolve(data.password);
        });
        socket.emit('roomAction', { room_id: ROOM, peer_name: 'x', action: 'checkPassword', password });
    });
}

describe('room password guard', () => {
    describe('unit', () => {
        beforeEach(() => RoomPassword.reset());

        it('compares passwords', () => {
            RoomPassword.passwordMatches('abc', 'abc').should.be.true();
            RoomPassword.passwordMatches('abc', 'abd').should.be.false();
            RoomPassword.passwordMatches('abc', undefined).should.be.false();
            RoomPassword.passwordMatches(undefined, undefined).should.be.true();
        });

        it('blocks after max failures and expires after the window', () => {
            const t = 1000;
            for (let i = 0; i < RoomPassword.MAX_FAILED_ATTEMPTS; i++) {
                RoomPassword.isBlocked('1.1.1.1', 'r', t).should.be.false();
                RoomPassword.recordFailure('1.1.1.1', 'r', t);
            }
            RoomPassword.isBlocked('1.1.1.1', 'r', t).should.be.true();
            RoomPassword.isBlocked('2.2.2.2', 'r', t).should.be.false();
            RoomPassword.isBlocked('1.1.1.1', 'other', t).should.be.false();
            RoomPassword.isBlocked('1.1.1.1', 'r', t + RoomPassword.WINDOW_MS + 1).should.be.false();
        });
    });

    describe('server', function () {
        this.timeout(40000);

        let serverProcess;
        let presenter;
        const sockets = [];

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

            presenter = await connectSocket();
            const cfg = joinCfg({ peer_name: 'victim', peer_uuid: 'victim-uuid' });
            (await joinAndAwait(presenter, cfg)).should.equal('serverInfo');
            presenter.emit('roomAction', {
                room_id: ROOM,
                peer_name: 'victim',
                peer_uuid: 'victim-uuid',
                action: 'lock',
                password: PASSWORD,
            });
            await sleep(300);
        });

        after(() => {
            presenter?.close();
            sockets.forEach((s) => s.close());
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('still accepts the right password and rejects a wrong one', async () => {
            const guest = await connectSocket();
            sockets.push(guest);
            (await checkPassword(guest, 'nope')).should.equal('KO');
            (await checkPassword(guest, PASSWORD)).should.equal('OK');
            (await joinAndAwait(guest, joinCfg({ channel_password: PASSWORD }))).should.equal('serverInfo');
        });

        it('throttles checkPassword and join guesses, even with the right password', async () => {
            const attacker = await connectSocket();
            sockets.push(attacker);

            for (let i = 0; i < RoomPassword.MAX_FAILED_ATTEMPTS; i++) {
                (await checkPassword(attacker, 'wrong' + i)).should.equal('KO');
            }
            (await checkPassword(attacker, PASSWORD)).should.equal('KO');

            const other = await connectSocket();
            sockets.push(other);
            (await joinAndAwait(other, joinCfg({ channel_password: PASSWORD }))).should.equal('roomIsLocked');
        });
    });
});
