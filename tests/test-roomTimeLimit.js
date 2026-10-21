'use strict';

// npx mocha tests/test-roomTimeLimit.js

require('should');

const path = require('path');
const sinon = require('sinon');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const RoomTimeLimit = require('../app/src/roomTimeLimit');

const PORT = 3095;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');

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
        peer_name: 'peer-' + Math.random().toString(36).slice(2),
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
        socket.once('roomTimeLimitReached', () => done({ event: 'roomTimeLimitReached' }));
        socket.once('serverInfo', (data) => done({ event: 'serverInfo', data }));
        socket.emit('join', cfg);
    });
}

function waitFor(socket, event, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${event} timeout`)), timeoutMs);
        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

describe('test-roomTimeLimit', function () {
    describe('module', () => {
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers({ now: 1000000 });
        });

        afterEach(() => {
            RoomTimeLimit.reset();
            clock.restore();
        });

        it('parses only valid HH:MM:SS durations', () => {
            RoomTimeLimit.parseDuration('00:00:30').should.equal(30000);
            RoomTimeLimit.parseDuration('01:02:03').should.equal(3723000);
            RoomTimeLimit.parseDuration('99:59:59').should.equal(359999000);
            RoomTimeLimit.parseDuration('00:00:00').should.equal(0);
            RoomTimeLimit.parseDuration('00:60:00').should.equal(0);
            RoomTimeLimit.parseDuration('00:00:60').should.equal(0);
            RoomTimeLimit.parseDuration('1:00:00').should.equal(0);
            RoomTimeLimit.parseDuration('unlimited').should.equal(0);
            RoomTimeLimit.parseDuration(undefined).should.equal(0);
            RoomTimeLimit.parseDuration(3600).should.equal(0);
        });

        it('does not start with an invalid duration', () => {
            RoomTimeLimit.start('room', 'unlimited').should.equal(false);
            RoomTimeLimit.start('room', undefined).should.equal(false);
            (RoomTimeLimit.get('room') === null).should.equal(true);
        });

        it('starts once, reports the remaining time and ignores later requests', () => {
            (RoomTimeLimit.get('room') === null).should.equal(true);

            RoomTimeLimit.start('room', '00:10:00').should.equal(true);
            clock.tick(60000);
            RoomTimeLimit.get('room').should.eql({ durationMs: 600000, remainingMs: 540000, reached: false });

            // A later presenter cannot shorten or extend it
            RoomTimeLimit.start('room', '00:00:05').should.equal(false);
            RoomTimeLimit.get('room').remainingMs.should.equal(540000);
        });

        it('notifies when the time is up and again once the grace period is over', () => {
            const onReached = sinon.spy();
            const onGraceEnd = sinon.spy();
            RoomTimeLimit.start('room', '00:00:30', { onReached, onGraceEnd });

            clock.tick(29999);
            RoomTimeLimit.isReached('room').should.equal(false);
            onReached.callCount.should.equal(0);

            clock.tick(1);
            RoomTimeLimit.isReached('room').should.equal(true);
            RoomTimeLimit.get('room').remainingMs.should.equal(0);
            onReached.callCount.should.equal(1);
            onGraceEnd.callCount.should.equal(0);

            clock.tick(RoomTimeLimit.GRACE_MS);
            onGraceEnd.callCount.should.equal(1);
        });

        it('keeps rooms independent', () => {
            RoomTimeLimit.start('room-a', '00:00:10');
            RoomTimeLimit.start('room-b', '00:00:20');
            clock.tick(10000);
            RoomTimeLimit.isReached('room-a').should.equal(true);
            RoomTimeLimit.isReached('room-b').should.equal(false);
        });

        it('clears the timers when the room closes', () => {
            const onReached = sinon.spy();
            const onGraceEnd = sinon.spy();
            RoomTimeLimit.start('room', '00:00:30', { onReached, onGraceEnd });
            RoomTimeLimit.clear('room');
            clock.tick(60000);
            (RoomTimeLimit.get('room') === null).should.equal(true);
            onReached.callCount.should.equal(0);
            onGraceEnd.callCount.should.equal(0);
        });
    });

    describe('signaling server', function () {
        this.timeout(40000);

        let serverProcess;
        const sockets = [];

        const connect = async () => {
            const socket = await connectSocket();
            sockets.push(socket);
            return socket;
        };

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
        });

        afterEach(() => {
            while (sockets.length) sockets.pop().close();
        });

        after(() => {
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('ignores a time limit requested by a non-presenter', async () => {
            const room = 'time-limit-guest';
            const presenter = await connect();
            const host = await joinAndAwait(presenter, joinCfg(room));
            host.event.should.equal('serverInfo');
            host.data.is_presenter.should.equal(true);
            (host.data.time_limit === null).should.equal(true);

            const guest = await connect();
            const joined = await joinAndAwait(guest, joinCfg(room, { room_duration: '00:00:01' }));
            joined.event.should.equal('serverInfo');
            joined.data.is_presenter.should.equal(false);
            (joined.data.time_limit === null).should.equal(true);
        });

        it('shares the presenter time limit, ends it for everyone and rejects late joiners', async () => {
            const room = 'time-limit-shared';
            const presenter = await connect();
            const host = await joinAndAwait(presenter, joinCfg(room, { room_duration: '00:00:02' }));
            host.event.should.equal('serverInfo');
            host.data.time_limit.durationMs.should.equal(2000);
            host.data.time_limit.reached.should.equal(false);

            // A later peer can't change it and gets the remaining time
            const guest = await connect();
            const joined = await joinAndAwait(guest, joinCfg(room, { room_duration: '00:10:00' }));
            joined.event.should.equal('serverInfo');
            joined.data.time_limit.durationMs.should.equal(2000);
            joined.data.time_limit.remainingMs.should.be.belowOrEqual(2000);

            const [hostEnd, guestEnd] = await Promise.all([
                waitFor(presenter, 'roomTimeLimit'),
                waitFor(guest, 'roomTimeLimit'),
            ]);
            hostEnd.should.eql({ action: 'end' });
            guestEnd.should.eql({ action: 'end' });

            const late = await connect();
            (await joinAndAwait(late, joinCfg(room))).event.should.equal('roomTimeLimitReached');
        });

        it('starts a new time limit once the room has been emptied', async () => {
            const room = 'time-limit-reopen';
            const first = await connect();
            (await joinAndAwait(first, joinCfg(room, { room_duration: '00:00:01' }))).event.should.equal('serverInfo');
            await waitFor(first, 'roomTimeLimit');
            first.close();
            await sleep(300);

            const second = await connect();
            const reopened = await joinAndAwait(second, joinCfg(room));
            reopened.event.should.equal('serverInfo');
            (reopened.data.time_limit === null).should.equal(true);
        });
    });
});
