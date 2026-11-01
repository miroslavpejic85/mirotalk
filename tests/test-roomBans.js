'use strict';

// npx mocha tests/test-roomBans.js

const should = require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const RoomBans = require('../app/src/roomBans');

const PORT = 3097;
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

function joinCfg(room, name, extra = {}) {
    return {
        channel: room,
        channel_password: '',
        peer_uuid: `${name}-uuid`,
        peer_name: name,
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

function waitFor(socket, event, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data || {});
        });
    });
}

// Resolves with the first join outcome: 'serverInfo', 'roomBanned' or 'timeout'
function joinAndAwait(socket, cfg, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => finish('timeout'), timeoutMs);
        const onInfo = (data) => finish('serverInfo', data);
        const onBanned = () => finish('roomBanned');
        function finish(event, data) {
            clearTimeout(timer);
            socket.off('serverInfo', onInfo);
            socket.off('roomBanned', onBanned);
            resolve({ event, data });
        }
        socket.on('serverInfo', onInfo);
        socket.on('roomBanned', onBanned);
        socket.emit('join', cfg);
    });
}

describe('room bans', () => {
    describe('unit', () => {
        beforeEach(() => RoomBans.reset());

        it('matches a banned peer by peer_uuid or identity, per room', () => {
            RoomBans.ban('r1', { peer_uuid: 'u1', identity: 'alice' }).should.be.true();
            RoomBans.isBanned('r1', { peer_uuid: 'u1' }).should.be.true();
            RoomBans.isBanned('r1', { peer_uuid: 'other', identity: 'alice' }).should.be.true();
            RoomBans.isBanned('r1', { peer_uuid: 'other', identity: 'bob' }).should.be.false();
            RoomBans.isBanned('r2', { peer_uuid: 'u1', identity: 'alice' }).should.be.false();
        });

        it('ignores empty values and refuses a ban without anything to match', () => {
            RoomBans.ban('r1', { peer_uuid: '', identity: '' }).should.be.false();
            RoomBans.ban('r1').should.be.false();
            RoomBans.isBanned('r1', { peer_uuid: '', identity: '' }).should.be.false();
            RoomBans.isBanned('r1', { peer_uuid: undefined }).should.be.false();
        });

        it('limits the bans of a room and clears them', () => {
            for (let i = 0; i < 500; i++) RoomBans.ban('r1', { peer_uuid: `u${i}` }).should.be.true();
            RoomBans.ban('r1', { peer_uuid: 'one-too-many' }).should.be.false();
            RoomBans.clear('r1');
            RoomBans.isBanned('r1', { peer_uuid: 'u1' }).should.be.false();
        });
    });

    describe('server', function () {
        this.timeout(60000);

        let serverProcess;
        const sockets = [];

        async function connect() {
            const socket = await connectSocket();
            sockets.push(socket);
            return socket;
        }

        async function openRoom(room) {
            const host = await connect();
            const { event, data } = await joinAndAwait(host, joinCfg(room, 'host'));
            event.should.equal('serverInfo');
            data.is_presenter.should.be.true();
            data.ban.should.be.true();
            return host;
        }

        async function joinGuest(room, name, extra) {
            const guest = await connect();
            const { event } = await joinAndAwait(guest, joinCfg(room, name, extra));
            event.should.equal('serverInfo');
            return guest;
        }

        const kick = (host, room, peer_id, ban) =>
            host.emit('kickOut', {
                room_id: room,
                peer_id,
                peer_uuid: 'host-uuid',
                peer_name: 'host',
                peer_kicked_reason: 'bye',
                ban,
            });

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
                    LOBBY_ENABLED: 'false',
                    ROOM_BAN_ENABLED: 'true',
                },
                stdio: ['ignore', 'ignore', 'ignore'],
            });
            await waitForServer(20000);
        });

        after(() => {
            sockets.forEach((s) => s.close());
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('keeps a banned peer out of the room, while a plain eject can rejoin', async () => {
            const room = 'ban-basic';
            const host = await openRoom(room);

            const ejected = await joinGuest(room, 'ejected');
            const ejectedNotice = waitFor(ejected, 'kickOut');
            kick(host, room, ejected.id, false);
            (await ejectedNotice).banned.should.be.false();
            (await joinAndAwait(await connect(), joinCfg(room, 'ejected'))).event.should.equal('serverInfo');

            const banned = await joinGuest(room, 'banned');
            const bannedNotice = waitFor(banned, 'kickOut');
            kick(host, room, banned.id, true);
            (await bannedNotice).banned.should.be.true();

            // Same browser id, even with another name
            const again = await connect();
            (await joinAndAwait(again, joinCfg(room, 'banned'))).event.should.equal('roomBanned');
            const renamed = await connect();
            (await joinAndAwait(renamed, joinCfg(room, 'renamed', { peer_uuid: 'banned-uuid' }))).event.should.equal(
                'roomBanned'
            );

            // Other browsers and other rooms are not affected
            (await joinAndAwait(await connect(), joinCfg(room, 'newcomer'))).event.should.equal('serverInfo');
            (await joinAndAwait(await connect(), joinCfg('ban-other-room', 'banned'))).event.should.equal('serverInfo');
        });

        it('ignores a ban from a non presenter', async () => {
            const room = 'ban-guard';
            const host = await openRoom(room);
            const member = await joinGuest(room, 'member');
            const victim = await joinGuest(room, 'victim');

            const notice = waitFor(victim, 'kickOut', 1000);
            member.emit('kickOut', {
                room_id: room,
                peer_id: victim.id,
                peer_uuid: 'host-uuid',
                peer_name: 'host',
                ban: true,
            });
            should(await notice).be.null();
            host.connected.should.be.true();
            (await joinAndAwait(await connect(), joinCfg(room, 'victim'))).event.should.equal('serverInfo');
        });

        it('never bans a presenter', async () => {
            const room = 'ban-presenter';
            const host = await openRoom(room);

            const notice = waitFor(host, 'kickOut', 1000);
            host.emit('kickOut', {
                room_id: room,
                peer_id: host.id,
                peer_uuid: 'host-uuid',
                peer_name: 'host',
                ban: true,
            });
            (await notice)?.banned?.should.be.false();
            (await joinAndAwait(await connect(), joinCfg(room, 'host'))).event.should.equal('serverInfo');
        });
    });
});
