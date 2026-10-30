'use strict';

// npx mocha tests/test-roomBreakouts.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const { io } = require('socket.io-client');
const RoomBreakouts = require('../app/src/roomBreakouts');

const ROOT = path.join(__dirname, '..');
const clientSource = fs.readFileSync(path.join(ROOT, 'public/js/breakout.js'), 'utf8');
const clientHtml = fs.readFileSync(path.join(ROOT, 'public/views/client.html'), 'utf8');
const clientJs = fs.readFileSync(path.join(ROOT, 'public/js/client.js'), 'utf8');
const buttonsJs = fs.readFileSync(path.join(ROOT, 'public/js/buttons.js'), 'utf8');
const configTemplate = fs.readFileSync(path.join(ROOT, 'app/src/config.template.js'), 'utf8');

const PORT = 3093;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(ROOT, 'app', 'src', 'server.js');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('breakout rooms', () => {
    // ####################################################
    // SERVER STATE MODULE
    // ####################################################

    describe('server state (unit)', () => {
        afterEach(() => RoomBreakouts.reset());

        it('validates and creates a session with unguessable room ids', () => {
            assert.equal(RoomBreakouts.create('main', { rooms: [] }).error, 'At least 1 room is required');
            assert.equal(RoomBreakouts.create('main', { rooms: 'a,b' }).error, 'Invalid request');
            assert.equal(RoomBreakouts.create('main', { rooms: Array(21).fill('x') }).error, 'Too many rooms');
            assert.equal(RoomBreakouts.create('main', { rooms: ['a'], duration: 1.5 }).error, 'Invalid duration');
            assert.equal(RoomBreakouts.create('main', { rooms: ['a'], duration: 241 }).error, 'Invalid duration');

            const now = 1_000_000;
            const { session } = RoomBreakouts.create(
                'main',
                { rooms: [' Team\u202E  A ', '', 'x'.repeat(80)], duration: 10, allow_return: 'true' },
                now
            );
            assert.deepEqual(
                session.rooms.map((room) => room.name),
                ['Team A', 'Room 2', 'x'.repeat(RoomBreakouts.LIMITS.MAX_NAME_LENGTH)]
            );
            assert.equal(session.allowReturn, false, 'only a real boolean allows returning');
            assert.equal(session.endsAt, now + 10 * 60 * 1000);
            assert.equal(new Set(session.rooms.map((room) => room.id)).size, 3);
            for (const room of session.rooms) assert.match(room.id, /^main-breakout-\d+-[0-9a-f]{12}$/);

            assert.equal(RoomBreakouts.create('main', { rooms: ['a'] }).error, 'Breakout rooms are already open');
            assert.equal(
                RoomBreakouts.create(session.rooms[0].id, { rooms: ['a'] }).error,
                'Breakout rooms cannot be nested'
            );
        });

        it('resolves the session of the main and breakout rooms', () => {
            const { session } = RoomBreakouts.create('main', { rooms: ['A', 'B'] });
            const [a, b] = session.rooms;
            assert.equal(RoomBreakouts.getByRoom('main'), session);
            assert.equal(RoomBreakouts.getByRoom(b.id), session);
            assert.equal(RoomBreakouts.getByRoom('other'), undefined);
            assert.equal(RoomBreakouts.isBreakoutRoom(a.id), true);
            assert.equal(RoomBreakouts.isBreakoutRoom('main'), false);
            assert.deepEqual(RoomBreakouts.roomIds(session), ['main', a.id, b.id]);
            assert.equal(RoomBreakouts.getRoomByIndex(session, -1).id, 'main');
            assert.equal(RoomBreakouts.getRoomByIndex(session, 1), b);
            assert.equal(RoomBreakouts.getRoomByIndex(session, 2), undefined);
            assert.equal(RoomBreakouts.getRoomByIndex(session, '0'), undefined);
            assert.equal(RoomBreakouts.getRoom(session, a.id), a);

            RoomBreakouts.end('main');
            assert.equal(RoomBreakouts.getByRoom(a.id), undefined);
            assert.equal(RoomBreakouts.isSessionRoom('main'), false);
        });

        it('keeps the main room state for the returning peers', () => {
            RoomBreakouts.create('main', { rooms: ['A'] });
            RoomBreakouts.saveMainState('main', { lock: true, password: 'secret' });
            assert.deepEqual(RoomBreakouts.takeMainState('main'), { lock: true, password: 'secret' });
            assert.equal(RoomBreakouts.takeMainState('main'), null, 'taken once');

            // Still empty when the session ends: kept for a while, then dropped
            RoomBreakouts.saveMainState('main', { joinLock: true });
            const now = 5_000;
            RoomBreakouts.end('main', now);
            assert.deepEqual(RoomBreakouts.takeMainState('main', now + 1000), { joinLock: true });

            RoomBreakouts.create('main', { rooms: ['A'] });
            RoomBreakouts.saveMainState('main', { lock: true });
            RoomBreakouts.end('main', now);
            assert.equal(RoomBreakouts.takeMainState('main', now + RoomBreakouts.ORPHAN_STATE_TTL_MS + 1), null);
        });

        it('runs and clears the session timers', async () => {
            const { session } = RoomBreakouts.create('main', { rooms: ['A'] });
            let fired = 0;
            RoomBreakouts.setTimer(session, 'end', 20, () => fired++);
            RoomBreakouts.setTimer(session, 'idle', 20, () => fired++);
            RoomBreakouts.clearTimer(session, 'idle');
            await sleep(60);
            assert.equal(fired, 1);
            RoomBreakouts.setTimer(session, 'end', 20, () => fired++);
            RoomBreakouts.end('main');
            await sleep(60);
            assert.equal(fired, 1, 'ending the session clears its timers');
        });

        it('honors only the tracked tickets, and main room tickets for a while after the end', () => {
            const { session } = RoomBreakouts.create('main', { rooms: ['A'] });
            const roomA = session.rooms[0].id;
            const ticket = (room, jti) => ({ main: 'main', sid: session.id, room, jti });
            RoomBreakouts.addTicket(session, 't1');
            RoomBreakouts.addTicket(session, 't2');
            assert.equal(RoomBreakouts.isTicketValid(ticket(roomA, 't1')), true);
            assert.equal(RoomBreakouts.isTicketValid(ticket('main', 't2')), true);
            assert.equal(RoomBreakouts.isTicketValid(ticket(roomA, 'unknown')), false, 'never issued');
            assert.equal(RoomBreakouts.isTicketValid(ticket('other', 't1')), false, 'room outside the session');
            assert.equal(RoomBreakouts.isTicketValid({ ...ticket(roomA, 't1'), sid: 'old' }), false);

            RoomBreakouts.revokeTickets(['t1']);
            assert.equal(RoomBreakouts.isTicketValid(ticket(roomA, 't1')), false, 'revoked');

            const now = 10_000;
            RoomBreakouts.end('main', now);
            assert.equal(RoomBreakouts.isTicketValid(ticket('main', 't2'), now + 1000), true, 'return window');
            assert.equal(RoomBreakouts.isTicketValid(ticket(roomA, 't2'), now + 1000), false, 'rooms are gone');
            assert.equal(
                RoomBreakouts.isTicketValid(ticket('main', 't2'), now + RoomBreakouts.ORPHAN_STATE_TTL_MS + 1),
                false
            );
            RoomBreakouts.revokeTickets(['t2']);
            assert.equal(RoomBreakouts.isTicketValid(ticket('main', 't2'), now + 1000), false);
        });

        it('normalizes broadcast messages', () => {
            assert.equal(RoomBreakouts.cleanMessage('  hi\u0000 <b>all</b>  '), 'hi <b>all</b>');
            assert.equal(RoomBreakouts.cleanMessage(42), '');
            assert.equal(RoomBreakouts.cleanMessage('x'.repeat(400)).length, RoomBreakouts.LIMITS.MAX_MESSAGE_LENGTH);
        });

        it('keeps one pending help request per breakout room', () => {
            const { session } = RoomBreakouts.create('main', { rooms: ['A', 'B'] });
            const [a, b] = session.rooms;
            assert.equal(RoomBreakouts.requestHelp('main', 'host').error, 'Not allowed', 'only breakout rooms');
            assert.equal(RoomBreakouts.requestHelp('other', 'x').error, 'Not allowed');

            const first = RoomBreakouts.requestHelp(a.id, 'alice', 1000);
            assert.deepEqual(first, { request: { peer_name: 'alice', at: 1000 } });
            const again = RoomBreakouts.requestHelp(a.id, 'bob', 2000);
            assert.equal(again.pending, true);
            assert.equal(again.request.peer_name, 'alice', 'the first request is kept');
            assert.equal(RoomBreakouts.getHelp(b.id), undefined);

            assert.equal(RoomBreakouts.clearHelp(a.id), true);
            assert.equal(RoomBreakouts.clearHelp(a.id), false);
            assert.equal(RoomBreakouts.getHelp(a.id), undefined);

            RoomBreakouts.requestHelp(b.id, 'bob');
            RoomBreakouts.end('main');
            assert.equal(RoomBreakouts.getHelp(b.id), undefined, 'gone with the session');
        });
    });

    // ####################################################
    // SIGNALING SERVER (integration)
    // ####################################################

    describe('signaling server (integration)', function () {
        this.timeout(30000);

        let serverProcess;
        const sockets = [];

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

        function connect() {
            return new Promise((resolve, reject) => {
                const socket = io(BASE, { transports: ['websocket'], reconnection: false, forceNew: true });
                const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
                socket.on('connect', () => {
                    clearTimeout(timer);
                    sockets.push(socket);
                    socket.breakouts = [];
                    socket.on('breakout', (data) => socket.breakouts.push(data));
                    resolve(socket);
                });
                socket.on('connect_error', (err) => {
                    clearTimeout(timer);
                    reject(err);
                });
            });
        }

        /**
         * Join a room like the client does
         * @returns {Promise<object>} socket with .result: 'joined' | 'roomIsLocked' | 'roomIsJoinLocked' | 'unauthorized'
         */
        async function join(name, room, { uuid, token, password = '' } = {}) {
            const socket = await connect();
            const peer_uuid = uuid || `uuid-${name}-${Math.random().toString(36).slice(2)}`;
            socket.result = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(`join timeout ${name}`)), 5000);
                const done = (result) => () => {
                    clearTimeout(timer);
                    resolve(result);
                };
                socket.once('serverInfo', (info) => {
                    socket.isPresenter = info.is_presenter;
                    done('joined')();
                });
                for (const event of ['roomIsLocked', 'roomIsJoinLocked', 'unauthorized'])
                    socket.once(event, done(event));
                socket.emit('join', {
                    channel: room,
                    channel_password: password,
                    peer_uuid,
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
                    breakout_token: token,
                });
            });
            socket.peerName = name;
            socket.peerUuid = peer_uuid;
            socket.room = room;
            await sleep(150);
            return socket;
        }

        /** Follow a move order like the client: leave and join the target room with the ticket */
        async function follow(socket, move) {
            socket.close();
            await sleep(100);
            return join(socket.peerName, move.room_id, { uuid: socket.peerUuid, token: move.token });
        }

        function emit(socket, action, data = {}) {
            socket.emit('breakout', {
                room_id: socket.room,
                peer_name: socket.peerName,
                peer_uuid: socket.peerUuid,
                action,
                ...data,
            });
        }

        const last = (socket, action) => [...socket.breakouts].reverse().find((data) => data.action === action);

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
                    BREAKOUT_ROOMS_ENABLED: 'true',
                },
                stdio: ['ignore', 'ignore', 'ignore'],
            });
            await waitForServer(20000);
        });

        after(() => {
            sockets.forEach((socket) => socket.close());
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('lets only the presenter open rooms and moves the assigned peers with a ticket', async () => {
            const MAIN = 'breakout-main-1';
            const host = await join('host', MAIN);
            const alice = await join('alice', MAIN);
            const bob = await join('bob', MAIN);
            assert.equal(host.isPresenter, true);

            const setup = last(host, 'state');
            assert.equal(setup.active, false);
            assert.equal(setup.is_manager, true);
            assert.deepEqual(setup.main_members.map((m) => m.peer_name).sort(), ['alice', 'bob', 'host']);
            assert.equal(last(alice, 'state'), undefined, 'participants get no setup state');

            emit(alice, 'open', { rooms: ['Hijack'] });
            await sleep(200);
            assert.equal(last(host, 'state').active, false, 'participants cannot open rooms');

            emit(host, 'open', {
                rooms: ['Red', 'Blue'],
                allow_return: false,
                assignments: { [alice.id]: 0, [bob.id]: 1, lock: 0, 'not-a-peer': 0 },
            });
            await sleep(250);

            const moveA = last(alice, 'move');
            const moveB = last(bob, 'move');
            assert.equal(moveA.room_name, 'Red');
            assert.equal(moveB.room_name, 'Blue');
            assert.equal(moveA.is_main, false);
            assert.equal(moveA.reason, 'host');
            assert.notEqual(moveA.room_id, moveB.room_id);
            assert.equal(last(host, 'move'), undefined, 'unassigned peers stay');

            const active = last(host, 'state');
            assert.equal(active.active, true);
            assert.deepEqual(
                active.rooms.map((room) => room.name),
                ['Red', 'Blue']
            );
            assert.ok(!JSON.stringify(active).includes(moveA.room_id), 'room ids are never broadcast');

            const alice2 = await follow(alice, moveA);
            const bob2 = await follow(bob, moveB);
            assert.equal(alice2.result, 'joined');
            assert.equal(alice2.isPresenter, false, 'a participant does not become presenter of an empty room');
            const aliceState = last(alice2, 'state');
            assert.deepEqual(aliceState.room, { index: 0, name: 'Red' });
            assert.equal(aliceState.is_manager, false);
            assert.equal(aliceState.rooms, undefined, 'participants do not see the other rooms');

            const live = last(host, 'state');
            assert.deepEqual(
                live.rooms.map((room) => room.members.map((m) => m.peer_name)),
                [['alice'], ['bob']]
            );
            assert.deepEqual(
                live.main_members.map((m) => m.peer_name),
                ['host']
            );

            // Participants cannot return when not allowed, nor manage
            emit(alice2, 'return');
            emit(bob2, 'close');
            await sleep(250);
            assert.equal(last(alice2, 'error').message, 'Not allowed');
            assert.equal(last(alice2, 'move'), undefined);
            assert.equal(last(host, 'state').active, true);

            // Broadcast reaches every room, as plain text
            emit(host, 'broadcast', { message: '  5 minutes left <b>!</b> ' });
            await sleep(250);
            for (const socket of [host, alice2, bob2]) {
                const message = last(socket, 'message');
                assert.equal(message.message, '5 minutes left <b>!</b>');
                assert.equal(message.peer_name, 'host');
            }

            // Host moves bob into alice's room, then visits it as presenter
            emit(host, 'move', { peer_id: bob2.id, room_index: 0 });
            await sleep(250);
            const bobMove = last(bob2, 'move');
            assert.equal(bobMove.room_id, moveA.room_id);
            const bob3 = await follow(bob2, bobMove);

            emit(host, 'join', { room_index: 0 });
            await sleep(250);
            const hostMove = last(host, 'move');
            assert.equal(hostMove.reason, 'self');
            const host2 = await follow(host, hostMove);
            assert.equal(host2.isPresenter, true, 'the presenter role follows the ticket');
            assert.deepEqual(
                last(host2, 'state')
                    .rooms[0].members.map((m) => m.peer_name)
                    .sort(),
                ['alice', 'bob', 'host']
            );

            // Close: everyone in a breakout room goes back to the main room
            emit(host2, 'close');
            await sleep(250);
            for (const socket of [host2, alice2, bob3]) {
                const move = last(socket, 'move');
                assert.equal(move.is_main, true);
                assert.equal(move.room_id, MAIN);
                assert.equal(move.reason, 'closed');
            }
            const back = await follow(host2, last(host2, 'move'));
            assert.equal(back.isPresenter, true, 'the presenter gets the main room back');
            assert.equal(last(back, 'state').active, false);
        });

        it('keeps the main room locked and only lets the moved peers back in', async () => {
            const MAIN = 'breakout-main-2';
            const host = await join('host', MAIN);
            const guest = await join('guest', MAIN);

            host.emit('roomAction', {
                room_id: MAIN,
                peer_name: host.peerName,
                peer_uuid: host.peerUuid,
                password: 'secret',
                action: 'lock',
            });
            await sleep(150);

            emit(host, 'open', { rooms: ['A'], allow_return: true, assignments: { [guest.id]: 0 } });
            await sleep(250);
            const guest2 = await follow(guest, last(guest, 'move'));

            // A stranger cannot use the guest's ticket
            const stolen = await join('mallory', last(guest, 'move').room_id, { token: last(guest, 'move').token });
            assert.equal(stolen.result, 'joined', 'unprotected rooms stay joinable');
            assert.equal(stolen.isPresenter, false);

            // Everyone leaves the main room: it keeps its lock
            emit(host, 'join', { room_index: 0 });
            await sleep(250);
            const host2 = await follow(host, last(host, 'move'));
            assert.equal(host2.isPresenter, true);

            const stranger = await join('stranger', MAIN);
            assert.equal(stranger.result, 'roomIsLocked', 'the emptied main room is still locked');

            // Return allowed: the guest goes back without the password
            emit(guest2, 'return');
            await sleep(250);
            const returnMove = last(guest2, 'move');
            assert.equal(returnMove.is_main, true);

            const thief = await join('thief', MAIN, { token: returnMove.token });
            assert.equal(thief.result, 'roomIsLocked', 'tickets are bound to the peer');

            const guest3 = await follow(guest2, returnMove);
            assert.equal(guest3.result, 'joined');
            assert.equal(guest3.isPresenter, false, 'returning first to the main room does not make a presenter');

            // Locked main room: a password join still works
            const invited = await join('invited', MAIN, { password: 'secret' });
            assert.equal(invited.result, 'joined');
        });

        it('lets a lone presenter reload the main room and revokes the ticket of a kicked peer', async () => {
            const MAIN = 'breakout-main-4';
            const host = await join('host', MAIN);
            const guest = await join('guest', MAIN);
            host.emit('roomAction', {
                room_id: MAIN,
                peer_name: host.peerName,
                peer_uuid: host.peerUuid,
                password: 'secret',
                action: 'lock',
            });
            await sleep(150);

            emit(host, 'open', { rooms: ['A'], assignments: { [guest.id]: 0 } });
            await sleep(250);
            const hostTicket = last(host, 'ticket');
            assert.equal(hostTicket.room_id, MAIN, 'the peers staying in the main room get a ticket to rejoin it');
            const guest2 = await follow(guest, last(guest, 'move'));

            // Alone in the main room, the presenter reloads: the room empties, the ticket gives the role back
            const host2 = await follow(host, hostTicket);
            assert.equal(host2.result, 'joined', 'the kept lock does not lock the presenter out');
            assert.equal(host2.isPresenter, true);

            // Back to the locked main room, then kicked out: the ticket no longer opens the lock
            emit(host2, 'move', { peer_id: guest2.id, room_index: -1 });
            await sleep(250);
            const guestMove = last(guest2, 'move');
            const guest3 = await follow(guest2, guestMove);
            assert.equal(guest3.result, 'joined');
            host2.emit('kickOut', {
                room_id: MAIN,
                peer_id: guest3.id,
                peer_name: host2.peerName,
                peer_uuid: host2.peerUuid,
            });
            await sleep(250);
            guest3.close();
            await sleep(100);
            const again = await join('guest', MAIN, { uuid: guest3.peerUuid, token: guestMove.token });
            assert.equal(again.result, 'roomIsLocked');
        });

        it('gives the emptied main room back to its presenter whoever returns first', async () => {
            const MAIN = 'breakout-main-3';
            const host = await join('host', MAIN);
            const guest = await join('guest', MAIN);

            emit(host, 'open', { rooms: ['A'], assignments: { [guest.id]: 0 } });
            await sleep(250);
            const guest2 = await follow(guest, last(guest, 'move'));
            emit(host, 'join', { room_index: 0 });
            await sleep(250);
            const host2 = await follow(host, last(host, 'move'));

            emit(host2, 'close');
            await sleep(250);
            const guest3 = await follow(guest2, last(guest2, 'move'));
            assert.equal(guest3.isPresenter, false, 'returning first does not make a presenter');
            const host3 = await follow(host2, last(host2, 'move'));
            assert.equal(host3.isPresenter, true);
        });

        it('messages a single room and calls the presenter over for help', async () => {
            const MAIN = 'breakout-main-help';
            const host = await join('host', MAIN);
            const alice = await join('alice', MAIN);
            const bob = await join('bob', MAIN);
            emit(host, 'open', { rooms: ['A', 'B'], assignments: { [alice.id]: 0, [bob.id]: 1 } });
            await sleep(250);
            const alice2 = await follow(alice, last(alice, 'move'));
            const bob2 = await follow(bob, last(bob, 'move'));
            const count = (socket, action) => socket.breakouts.filter((data) => data.action === action).length;

            // A message to one room reaches only that room
            emit(host, 'broadcast', { message: 'Only A', room_index: 0 });
            await sleep(250);
            assert.equal(last(alice2, 'message').message, 'Only A');
            assert.equal(last(bob2, 'message'), undefined);
            assert.equal(last(host, 'message'), undefined, 'the presenter is not in room A');
            emit(host, 'broadcast', { message: 'Main', room_index: -1 });
            await sleep(250);
            assert.equal(last(host, 'message').message, 'Main');
            assert.equal(last(alice2, 'message').message, 'Only A');
            emit(host, 'broadcast', { message: 'Nowhere', room_index: 7 });
            await sleep(250);
            assert.equal(last(host, 'error').message, 'Room not found');

            // Help: participants only, from a breakout room, notifies the presenters once
            emit(host, 'help');
            await sleep(150);
            assert.equal(last(host, 'help'), undefined, 'presenters do not ask for help');
            emit(alice2, 'help');
            await sleep(250);
            assert.deepEqual(last(host, 'help'), { action: 'help', room_index: 0, room_name: 'A', peer_name: 'alice' });
            assert.deepEqual(last(host, 'state').rooms[0].help, { peer_name: 'alice' });
            assert.equal(last(host, 'state').rooms[1].help, null);
            assert.equal(last(alice2, 'state').help_requested, true);
            assert.equal(last(alice2, 'state').rooms, undefined, 'participants still see only their room');
            assert.equal(last(bob2, 'help'), undefined, 'participants are not notified');
            assert.equal(last(bob2, 'state').help_requested, false);
            emit(alice2, 'help');
            await sleep(250);
            assert.equal(count(host, 'help'), 1, 'one pending request per room');

            // The presenter comes in: the request is settled
            emit(host, 'join', { room_index: 0 });
            await sleep(250);
            const host2 = await follow(host, last(host, 'move'));
            await sleep(150);
            assert.equal(last(alice2, 'state').help_requested, false);
            assert.equal(last(host2, 'state').rooms[0].help, null);
            emit(alice2, 'help');
            await sleep(250);
            assert.equal(last(alice2, 'error').message, 'A presenter is already in this room');

            // A room that empties drops its request
            emit(bob2, 'help');
            await sleep(250);
            assert.deepEqual(last(host2, 'state').rooms[1].help, { peer_name: 'bob' });
            bob2.close();
            await sleep(300);
            assert.equal(last(host2, 'state').rooms[1].help, null);

            // Nobody to call over
            host2.close();
            await sleep(300);
            emit(alice2, 'help');
            await sleep(250);
            assert.equal(last(alice2, 'error').message, 'No presenter is available');
            assert.equal(last(alice2, 'state').help_requested, false);
        });
    });

    // ####################################################
    // DISABLED (default)
    // ####################################################

    describe('signaling server with breakout rooms disabled (default)', function () {
        this.timeout(30000);

        const DISABLED_PORT = 3092;
        let serverProcess;
        let socket;

        before(async () => {
            serverProcess = spawn(process.execPath, [SERVER], {
                env: {
                    ...process.env,
                    PORT: String(DISABLED_PORT),
                    JWT_KEY: 'test-jwt-key-0123456789-abcdefghijklmnop',
                    HOST_PROTECTED: 'false',
                    HOST_USER_AUTH: 'false',
                    NGROK_ENABLED: 'false',
                    SENTRY_ENABLED: 'false',
                    IP_LOOKUP_ENABLED: 'false',
                    OIDC_ENABLED: 'false',
                    BREAKOUT_ROOMS_ENABLED: 'false',
                },
                stdio: ['ignore', 'ignore', 'ignore'],
            });
            const deadline = Date.now() + 20000;
            for (;;) {
                try {
                    await fetch(`http://localhost:${DISABLED_PORT}/`, { redirect: 'manual' });
                    break;
                } catch (err) {
                    if (Date.now() > deadline) throw new Error('Server did not become ready in time');
                    await sleep(200);
                }
            }
        });

        after(() => {
            socket?.close();
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('ignores every breakout request, so the button never shows', async () => {
            socket = io(`http://localhost:${DISABLED_PORT}`, {
                transports: ['websocket'],
                reconnection: false,
                forceNew: true,
            });
            const breakouts = [];
            socket.on('breakout', (data) => breakouts.push(data));
            const peer = { room_id: 'breakout-disabled', peer_name: 'host', peer_uuid: 'uuid-disabled-host' };
            const info = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('join timeout')), 8000);
                socket.once('serverInfo', (data) => {
                    clearTimeout(timer);
                    resolve(data);
                });
                socket.emit('join', {
                    channel: peer.room_id,
                    channel_password: '',
                    peer_uuid: peer.peer_uuid,
                    peer_name: peer.peer_name,
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
            });
            assert.equal(info.is_presenter, true);

            socket.emit('breakout', { ...peer, action: 'state' });
            await sleep(150);
            socket.emit('breakout', { ...peer, action: 'open', rooms: ['A'] });
            await sleep(300);
            assert.deepEqual(breakouts, [], 'no state (so no button), no session, no ticket');
        });
    });

    // ####################################################
    // CLIENT UI
    // ####################################################

    describe('client UI', () => {
        function setup() {
            const dom = new JSDOM(
                `<form id="setup">
                    <input id="roomCount" type="number" value="2" />
                    <select id="duration"><option value="0">0</option><option value="15">15</option></select>
                    <input id="allowReturn" type="checkbox" checked />
                    <button id="shuffleBtn" type="button"></button>
                    <div id="names"></div>
                    <div id="peers"></div>
                </form>
                <div id="active">
                    <button id="broadcastBtn" type="button"></button>
                    <button id="endBtn" type="button"></button>
                    <div id="activeRooms"></div>
                </div>
                <span id="timer"></span>
                <div id="banner"><span id="bannerName"></span><span id="bannerTimer"></span>
                <button id="helpBtn" type="button"></button>
                <button id="returnBtn" type="button"></button></div>`,
                { runScripts: 'outside-only' }
            );
            const { window } = dom;
            window.eval(`${clientSource}\nwindow.RoomBreakouts = RoomBreakouts;`);
            const doc = window.document;
            const ids = ['setup', 'roomCount', 'duration', 'allowReturn', 'shuffleBtn', 'names', 'peers', 'active'];
            ids.push('activeRooms', 'broadcastBtn', 'endBtn', 'timer', 'banner', 'bannerName', 'bannerTimer');
            ids.push('returnBtn', 'helpBtn');
            const elements = Object.fromEntries(ids.map((id) => [id, doc.getElementById(id)]));
            const sent = [];
            const moves = [];
            const notices = [];
            const managerChanges = [];
            const tickets = [];
            const helps = [];
            const breakouts = new window.RoomBreakouts({
                elements,
                send: (action, data) => sent.push(JSON.parse(JSON.stringify({ action, ...data }))),
                getMyPeerId: () => 'me',
                onMove: (data) => moves.push(data),
                onTicket: (data) => tickets.push(data),
                onHelp: (data) => helps.push(data),
                onNotice: (text) => notices.push(text),
                onManagerChange: (isManager) => managerChanges.push(isManager),
                confirmClose: () => Promise.resolve(true),
                promptBroadcast: (roomName) => Promise.resolve(`hi ${roomName || 'all'}`),
                translate: (text) => text,
            });
            return { window, doc, elements, breakouts, sent, moves, notices, managerChanges, tickets, helps };
        }

        const members = [
            { peer_id: 'me', peer_name: 'Host', presenter: true },
            { peer_id: 'p1', peer_name: '<img src=x onerror=alert(1)>', presenter: false },
            { peer_id: 'p2', peer_name: 'Bob', presenter: false },
            { peer_id: 'p3', peer_name: 'Eve', presenter: false },
        ];

        it('builds the open request from the setup form', () => {
            const { doc, elements, breakouts, sent, managerChanges } = setup();
            breakouts.handle({
                action: 'state',
                active: false,
                is_manager: true,
                main_members: members,
                now: Date.now(),
            });
            assert.deepEqual(managerChanges, [true]);
            assert.equal(elements.setup.classList.contains('hidden'), false);

            const rows = elements.peers.querySelectorAll('.breakout-member');
            assert.equal(rows.length, 3, 'everyone but me can be assigned');
            assert.equal(rows[0].querySelector('img'), null, 'names are rendered as text');
            assert.equal(rows[0].textContent.includes('<img'), true);

            elements.roomCount.value = '3';
            elements.roomCount.dispatchEvent(new doc.defaultView.Event('change'));
            assert.equal(elements.names.querySelectorAll('input').length, 3);
            elements.names.querySelector('input').value = 'Design';
            elements.names.querySelector('input').dispatchEvent(new doc.defaultView.Event('input'));

            elements.shuffleBtn.click();
            elements.duration.value = '15';
            elements.allowReturn.checked = false;
            elements.setup.dispatchEvent(new doc.defaultView.Event('submit', { cancelable: true }));

            const open = sent.find((msg) => msg.action === 'open');
            assert.deepEqual(open.rooms, ['Design', 'Room 2', 'Room 3']);
            assert.equal(open.duration, 15);
            assert.equal(open.allow_return, false);
            assert.deepEqual(Object.keys(open.assignments).sort(), ['p1', 'p2', 'p3']);
            assert.deepEqual(Object.values(open.assignments).sort(), [0, 1, 2], 'spread evenly');
        });

        it('renders the live rooms for the presenter and moves peers', async () => {
            const { window, doc, elements, breakouts, sent, notices, helps } = setup();
            breakouts.handle({
                action: 'state',
                active: true,
                is_manager: true,
                is_main: true,
                room: null,
                ends_at: Date.now() + 10 * 60 * 1000,
                now: Date.now(),
                main_members: members.slice(0, 1),
                rooms: [
                    { index: 0, name: 'Red', members: members.slice(1, 3), help: { peer_name: 'Bob' } },
                    { index: 1, name: 'Blue', members: [], help: null },
                ],
            });
            assert.equal(elements.setup.classList.contains('hidden'), true);
            assert.equal(elements.active.classList.contains('hidden'), false);
            const cards = elements.activeRooms.querySelectorAll('.breakout-card');
            assert.equal(cards.length, 3, 'main room plus the breakout rooms');
            assert.equal(cards[0].querySelector('.breakout-card-here').textContent, 'You are here');
            assert.match(elements.timer.textContent, /^(10:00|9:59)$/);
            assert.equal(elements.banner.classList.contains('hidden'), true, 'no banner in the main room');

            const select = cards[1].querySelector('select');
            select.value = '1';
            select.dispatchEvent(new doc.defaultView.Event('change'));
            assert.deepEqual(sent.at(-1), { action: 'move', peer_id: 'p1', room_index: 1 });

            cards[2].querySelector('button[aria-label="Message this room"] + button').click();
            assert.deepEqual(sent.at(-1), { action: 'join', room_index: 1 });

            // Help badge on the room asking for it
            assert.equal(cards[1].classList.contains('needs-help'), true);
            assert.equal(cards[1].querySelector('.breakout-card-help').textContent.trim(), 'Help requested');
            assert.equal(cards[2].querySelector('.breakout-card-help'), null);
            breakouts.handle({ action: 'help', room_index: 0, room_name: 'Red', peer_name: 'Bob' });
            breakouts.handle({ action: 'help', room_index: 'x' });
            assert.deepEqual(helps, [{ action: 'help', room_index: 0, room_name: 'Red', peer_name: 'Bob' }]);

            // Message one room, or every room
            cards[1].querySelector('button[aria-label="Message this room"]').click();
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            assert.deepEqual(sent.at(-1), { action: 'broadcast', message: 'hi Red', room_index: 0 });
            assert.equal(notices.at(-1), 'Message sent to Red');
            cards[0].querySelector('button[aria-label="Message this room"]').click();
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            assert.deepEqual(sent.at(-1), { action: 'broadcast', message: 'hi Main room', room_index: -1 });
            elements.broadcastBtn.click();
            await new Promise((resolve) => window.setTimeout(resolve, 0));
            assert.deepEqual(sent.at(-1), { action: 'broadcast', message: 'hi all' });
            window.clearInterval(breakouts.clock);
            window.close();
        });

        it('shows the banner in a breakout room and forwards moves', () => {
            const { elements, breakouts, sent, moves, notices, tickets, helps } = setup();
            breakouts.handle({
                action: 'state',
                active: true,
                is_manager: false,
                is_main: false,
                room: { index: 0, name: 'Red' },
                ends_at: 0,
                allow_return: true,
                now: Date.now(),
            });
            assert.equal(elements.banner.classList.contains('hidden'), false);
            assert.equal(elements.bannerName.textContent, 'Red');
            assert.equal(elements.bannerTimer.classList.contains('hidden'), true, 'no time limit');
            assert.equal(elements.setup.classList.contains('hidden'), true, 'participants have no setup');
            assert.equal(elements.returnBtn.classList.contains('hidden'), false);
            elements.returnBtn.click();
            assert.deepEqual(sent.at(-1), { action: 'return' });

            // Ask for help, once until a presenter comes in
            assert.equal(elements.helpBtn.classList.contains('hidden'), false);
            assert.equal(elements.helpBtn.textContent.trim(), 'Ask for help');
            elements.helpBtn.click();
            assert.deepEqual(sent.at(-1), { action: 'help' });
            const helpState = {
                action: 'state',
                active: true,
                is_manager: false,
                is_main: false,
                room: { index: 0, name: 'Red' },
                ends_at: 0,
                allow_return: true,
                now: Date.now(),
            };
            breakouts.handle({ ...helpState, help_requested: true });
            assert.equal(elements.helpBtn.disabled, true);
            assert.equal(elements.helpBtn.textContent.trim(), 'Help requested');
            assert.equal(notices.at(-1), 'The presenter has been asked for help');
            const sentCount = sent.length;
            breakouts.askHelp();
            assert.equal(sent.length, sentCount, 'no duplicate request');
            breakouts.handle({ ...helpState, help_requested: true });
            assert.equal(notices.filter((n) => n === 'The presenter has been asked for help').length, 1);
            breakouts.handle({ ...helpState, help_requested: false });
            assert.equal(elements.helpBtn.disabled, false);
            notices.length = 0;
            breakouts.handle({ action: 'help', room_index: 0, room_name: 'Red', peer_name: 'x' });
            assert.deepEqual(helps, [], 'participants ignore help alerts');

            breakouts.handle({ action: 'move', room_id: 'main', token: 't', is_main: true, reason: 'closed' });
            breakouts.handle({ action: 'move', room_id: 42, token: 't' });
            assert.equal(moves.length, 1);
            breakouts.handle({ action: 'ticket', room_id: 'main', token: 't' });
            breakouts.handle({ action: 'ticket', room_id: 'main' });
            assert.deepEqual(tickets, [{ action: 'ticket', room_id: 'main', token: 't' }]);

            breakouts.handle({ action: 'state', active: false, is_manager: false, reason: 'closed', now: Date.now() });
            assert.equal(elements.banner.classList.contains('hidden'), true);
            assert.deepEqual(notices, ['Breakout rooms have been closed']);
        });
    });

    // ####################################################
    // WIRING
    // ####################################################

    describe('wiring', () => {
        it('exposes the presenter-only breakout rooms tool', () => {
            assert.match(clientHtml, /data-buttons="[^"]*\bbreakoutBtn\b[^"]*"/);
            assert.match(clientHtml, /id="breakoutRoom"/);
            assert.match(clientHtml, /src="\.\.\/js\/breakout\.js"/);
            assert.match(buttonsJs, /showBreakoutBtn: true/);
            assert.match(
                configTemplate,
                /showBreakoutBtn: getEnvBoolean\(process\.env\.SHOW_BREAKOUT_ROOM_BUTTON, true\)/
            );
            assert.match(
                configTemplate,
                /breakoutRooms: \{\s*enabled: getEnvBoolean\(process\.env\.BREAKOUT_ROOMS_ENABLED\)/,
                'disabled unless BREAKOUT_ROOMS_ENABLED=true'
            );
            assert.match(clientJs, /\{ element: breakoutBtn, display: isBreakoutBtnVisible\(\) \}/);
            assert.match(clientJs, /breakout_token: getBreakoutTicket\(\)/);
        });

        it('builds breakout URLs that resolve back to the exact room id', () => {
            const body = (name) => clientJs.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))[0];
            const make = new Function(
                'window',
                'myPeerName',
                'myAudioStatus',
                'myVideoStatus',
                'getJoinRoomPath',
                `${body('getBreakoutRoomURL')}; return getBreakoutRoomURL;`
            );
            const readRoom = (href) => decodeURIComponent(new URL(href).pathname.split('/join/')[1]);
            const resolve = (urlRoom, ticketRoom) =>
                new Function('readBreakoutTicket', `${body('getBreakoutTicketRoom')}; return getBreakoutTicketRoom;`)(
                    () => ({ room: ticketRoom, token: 't' })
                )(urlRoom);
            const window = { location: { href: 'https://host/join/old?room=old&duration=1&chat=1#x' } };
            const build = make(window, 'Ann', true, false, (room) => '/join/' + encodeURIComponent(room));

            // The room id is encoded in the path and decoded back by getRoomId: it must round trip
            for (const target of [
                'caf%C3%A9-breakout-1-ab',
                'a+b-breakout-1-ab',
                'café b-breakout-1-ab',
                'abc%-breakout-1-ab',
                'plain',
            ]) {
                const href = build(target);
                assert.equal(readRoom(href), target, href);
                assert.equal(resolve(readRoom(href), target), target, href);
                const params = new URL(href).searchParams;
                assert.equal(params.get('room'), null);
                assert.equal(params.get('duration'), null, 'breakout rooms never start their own time limit');
                assert.equal(params.get('chat'), '1', 'other options are kept');
                assert.equal(params.get('name'), 'Ann');
                assert.equal(params.get('audio'), '1');
                assert.equal(params.get('video'), '0');
            }
        });
    });
});
