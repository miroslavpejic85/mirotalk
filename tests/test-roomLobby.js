'use strict';

// npx mocha tests/test-roomLobby.js

const should = require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const RoomLobby = require('../app/src/roomLobby');

const PORT = 3098;
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

function waitFor(socket, event, predicate = () => true, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            resolve(null);
        }, timeoutMs);
        function handler(data) {
            if (!predicate(data)) return;
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(data || {});
        }
        socket.on(event, handler);
    });
}

function joinAndAwait(socket, cfg, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => finish('timeout'), timeoutMs);
        const onInfo = (data) => finish('serverInfo', data);
        const onLobby = (data) => data?.action === 'waiting' && finish('waiting');
        function finish(event, data) {
            clearTimeout(timer);
            socket.off('serverInfo', onInfo);
            socket.off('lobby', onLobby);
            resolve({ event, data });
        }
        socket.on('serverInfo', onInfo);
        socket.on('lobby', onLobby);
        socket.emit('join', cfg);
    });
}

const lobbyList = (socket, size) =>
    waitFor(socket, 'lobby', (data) => data?.action === 'list' && data.peers.length === size);

describe('room lobby', () => {
    describe('unit', () => {
        beforeEach(() => RoomLobby.reset());

        it('tracks the waiting peers in arrival order, one lobby per peer', () => {
            RoomLobby.add('r1', 'a', { peer_name: 'Alice' });
            RoomLobby.add('r1', 'b', { peer_name: 'Bob', peer_avatar: 'x' });
            RoomLobby.count('r1').should.equal(2);
            RoomLobby.list('r1')
                .map((p) => p.peer_name)
                .should.eql(['Alice', 'Bob']);
            RoomLobby.list('r1')[0].should.not.have.property('admit');

            // Waiting for another room replaces the previous wait
            should(RoomLobby.add('r2', 'a', { peer_name: 'Alice' })).equal('r1');
            RoomLobby.has('r1', 'a').should.be.false();
            RoomLobby.has('r2', 'a').should.be.true();

            RoomLobby.removePeer('a').should.equal('r2');
            RoomLobby.count('r2').should.equal(0);
            should(RoomLobby.remove('r1', 'missing')).be.null();
            RoomLobby.remove('r1', 'b').peer_name.should.equal('Bob');
            RoomLobby.ids('r1').should.eql([]);
        });

        it('toggles the lobby per room', () => {
            RoomLobby.isEnabled('r1').should.be.false();
            RoomLobby.setEnabled('r1', true);
            RoomLobby.isEnabled('r1').should.be.true();
            RoomLobby.isEnabled('r2').should.be.false();
            RoomLobby.setEnabled('r1', false);
            RoomLobby.isEnabled('r1').should.be.false();
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
            data.lobby.should.be.true();
            return host;
        }

        const hostAction = (host, room, action, peer_id) =>
            host.emit('lobby', { room_id: room, peer_name: 'host', peer_uuid: 'host-uuid', action, peer_id });

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
                    LOBBY_ENABLED: 'true',
                },
                stdio: ['ignore', 'ignore', 'ignore'],
            });
            await waitForServer(20000);
        });

        after(() => {
            sockets.forEach((s) => s.close());
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('holds a guest in the lobby and lets it in once the presenter accepts', async () => {
            const room = 'lobby-accept';
            const host = await openRoom(room);
            const guest = await connect();

            const listed = lobbyList(host, 1);
            (await joinAndAwait(guest, joinCfg(room, 'guest'))).event.should.equal('waiting');
            const list = await listed;
            list.peers[0].peer_id.should.equal(guest.id);
            list.peers[0].peer_name.should.equal('guest');

            const admitted = waitFor(guest, 'lobby', (data) => data?.action === 'admitted');
            const info = waitFor(guest, 'serverInfo');
            const emptied = lobbyList(host, 0);
            hostAction(host, room, 'accept', guest.id);
            (await admitted).should.be.ok();
            (await info).is_presenter.should.be.false();
            (await emptied).should.be.ok();
        });

        it('rejects a guest', async () => {
            const room = 'lobby-reject';
            const host = await openRoom(room);
            const guest = await connect();

            const listed = lobbyList(host, 1);
            (await joinAndAwait(guest, joinCfg(room, 'guest'))).event.should.equal('waiting');
            await listed;

            const rejected = waitFor(guest, 'lobby', (data) => data?.action === 'rejected');
            const info = waitFor(guest, 'serverInfo', () => true, 1000);
            hostAction(host, room, 'reject', guest.id);
            (await rejected).should.be.ok();
            should(await info).be.null();
        });

        it('ignores lobby actions from non presenters and spoofed presenter identities', async () => {
            const room = 'lobby-guard';
            const host = await openRoom(room);

            // A participant admitted earlier is in the room, but not a presenter
            const member = await connect();
            const memberListed = lobbyList(host, 1);
            (await joinAndAwait(member, joinCfg(room, 'member'))).event.should.equal('waiting');
            await memberListed;
            const memberInfo = waitFor(member, 'serverInfo');
            hostAction(host, room, 'accept', member.id);
            (await memberInfo).should.be.ok();

            const guest = await connect();
            const listed = lobbyList(host, 1);
            (await joinAndAwait(guest, joinCfg(room, 'guest'))).event.should.equal('waiting');
            await listed;

            const info = waitFor(guest, 'serverInfo', () => true, 1000);
            member.emit('lobby', {
                room_id: room,
                peer_name: 'member',
                peer_uuid: 'member-uuid',
                action: 'accept',
                peer_id: guest.id,
            });
            member.emit('lobby', { room_id: room, peer_name: 'host', peer_uuid: 'host-uuid', action: 'acceptAll' });
            member.emit('roomAction', {
                room_id: room,
                peer_name: 'member',
                peer_uuid: 'member-uuid',
                action: 'lobbyOff',
            });

            // A socket outside the room can't act either
            const outsider = await connect();
            outsider.emit('lobby', { room_id: room, peer_name: 'host', peer_uuid: 'host-uuid', action: 'acceptAll' });

            should(await info).be.null();
        });

        it('lets everyone waiting in when the presenter turns the lobby off', async () => {
            const room = 'lobby-off';
            const host = await openRoom(room);
            const guests = [await connect(), await connect()];

            const listed = lobbyList(host, 2);
            for (const [i, guest] of guests.entries()) {
                (await joinAndAwait(guest, joinCfg(room, 'guest' + i))).event.should.equal('waiting');
            }
            await listed;

            const infos = guests.map((guest) => waitFor(guest, 'serverInfo'));
            host.emit('roomAction', { room_id: room, peer_name: 'host', peer_uuid: 'host-uuid', action: 'lobbyOff' });
            for (const info of await Promise.all(infos)) info.lobby.should.be.false();

            // New guests join directly
            const late = await connect();
            (await joinAndAwait(late, joinCfg(room, 'late'))).event.should.equal('serverInfo');

            // Turned on again, new guests wait
            host.emit('roomAction', { room_id: room, peer_name: 'host', peer_uuid: 'host-uuid', action: 'lobbyOn' });
            await sleep(200);
            const next = await connect();
            (await joinAndAwait(next, joinCfg(room, 'next'))).event.should.equal('waiting');
        });

        it('accepts or rejects everyone at once', async () => {
            const room = 'lobby-all';
            const host = await openRoom(room);
            const guests = [await connect(), await connect(), await connect()];

            let listed = lobbyList(host, 2);
            for (const [i, guest] of guests.slice(0, 2).entries()) {
                (await joinAndAwait(guest, joinCfg(room, 'guest' + i))).event.should.equal('waiting');
            }
            await listed;

            const infos = guests.slice(0, 2).map((guest) => waitFor(guest, 'serverInfo'));
            hostAction(host, room, 'acceptAll');
            for (const info of await Promise.all(infos)) info.should.be.ok();

            listed = lobbyList(host, 1);
            (await joinAndAwait(guests[2], joinCfg(room, 'guest2'))).event.should.equal('waiting');
            await listed;
            const rejected = waitFor(guests[2], 'lobby', (data) => data?.action === 'rejected');
            hostAction(host, room, 'rejectAll');
            (await rejected).should.be.ok();
        });

        it('drops a guest that leaves the lobby and keeps guests waiting while no presenter is in', async () => {
            const room = 'lobby-leave';
            const host = await openRoom(room);
            const guest = await connect();

            let listed = lobbyList(host, 1);
            (await joinAndAwait(guest, joinCfg(room, 'guest'))).event.should.equal('waiting');
            await listed;

            const emptied = lobbyList(host, 0);
            guest.close();
            (await emptied).should.be.ok();

            // The presenter leaves: the waiting guest keeps waiting for the next presenter
            const waiting = await connect();
            listed = lobbyList(host, 1);
            (await joinAndAwait(waiting, joinCfg(room, 'waiting'))).event.should.equal('waiting');
            await listed;
            host.close();
            await sleep(300);
            should(await waitFor(waiting, 'serverInfo', () => true, 800)).be.null();

            // The next presenter opens the room and gets the waiting list
            const nextHost = await connect();
            const nextListed = lobbyList(nextHost, 1);
            (await joinAndAwait(nextHost, joinCfg(room, 'host2'))).data.is_presenter.should.be.true();
            (await nextListed).peers[0].peer_id.should.equal(waiting.id);
        });
    });
});
