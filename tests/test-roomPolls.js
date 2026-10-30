'use strict';

// npx mocha tests/test-roomPolls.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const { io } = require('socket.io-client');
const RoomPolls = require('../app/src/roomPolls');

const ROOT = path.join(__dirname, '..');
const clientSource = fs.readFileSync(path.join(ROOT, 'public/js/poll.js'), 'utf8');
const clientHtml = fs.readFileSync(path.join(ROOT, 'public/views/client.html'), 'utf8');
const clientJs = fs.readFileSync(path.join(ROOT, 'public/js/client.js'), 'utf8');
const buttonsJs = fs.readFileSync(path.join(ROOT, 'public/js/buttons.js'), 'utf8');
const configTemplate = fs.readFileSync(path.join(ROOT, 'app/src/config.template.js'), 'utf8');

const PORT = 3094;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(ROOT, 'app', 'src', 'server.js');
const ROOM = 'room-polls-test';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('room polls', () => {
    // ####################################################
    // SERVER STATE MODULE
    // ####################################################

    describe('server state (unit)', () => {
        const alice = { key: 'u:alice', name: 'Alice' };
        const bob = { key: 'u:bob', name: 'Bob' };

        beforeEach(() => RoomPolls.reset());

        it('validates and normalizes a new poll', () => {
            assert.equal(
                RoomPolls.create('r', { question: '  ', options: ['a', 'b'] }, alice).error,
                'The question is required'
            );
            assert.equal(
                RoomPolls.create('r', { question: 'Q?', options: ['Yes', ' yes ', ''] }, alice).error,
                'At least 2 different options are required'
            );
            assert.equal(RoomPolls.create('r', { question: 'Q?', options: 'a,b' }, alice).error, 'Invalid request');
            const many = Array.from({ length: 11 }, (_, i) => `opt ${i}`);
            assert.equal(RoomPolls.create('r', { question: 'Q?', options: many }, alice).error, 'Too many options');

            const { poll } = RoomPolls.create(
                'r',
                { question: ' Lunch\u202E\u0000 at   noon? ', options: ['Yes', 'No', 'yes'], anonymous: 'true' },
                alice
            );
            assert.equal(poll.question, 'Lunch at noon?');
            assert.deepEqual(poll.options, ['Yes', 'No']);
            assert.equal(poll.anonymous, false, 'only a real boolean enables anonymous mode');
            assert.equal(poll.open, true);
            assert.equal(poll.question.length <= RoomPolls.LIMITS.MAX_QUESTION_LENGTH, true);
        });

        it('caps the number of polls per room', () => {
            for (let i = 0; i < RoomPolls.LIMITS.MAX_POLLS_PER_ROOM; i++) {
                assert.ok(RoomPolls.create('r', { question: `Q${i}`, options: ['a', 'b'] }, alice).poll);
            }
            assert.equal(
                RoomPolls.create('r', { question: 'one more', options: ['a', 'b'] }, alice).error,
                'The maximum number of polls has been reached'
            );
            assert.ok(RoomPolls.create('other', { question: 'Q', options: ['a', 'b'] }, alice).poll);
        });

        it('counts one vote per voter, allows changing and retracting it', () => {
            const { poll } = RoomPolls.create('r', { question: 'Q', options: ['a', 'b', 'c'] }, alice);
            RoomPolls.vote('r', poll.id, alice, 0);
            RoomPolls.vote('r', poll.id, alice, 0);
            RoomPolls.vote('r', poll.id, bob, 0);
            let view = RoomPolls.toPublic(poll, alice.key);
            assert.equal(view.total_votes, 2);
            assert.deepEqual(
                view.options.map((o) => o.votes),
                [2, 0, 0]
            );

            RoomPolls.vote('r', poll.id, alice, 2);
            view = RoomPolls.toPublic(poll, alice.key);
            assert.deepEqual(
                view.options.map((o) => o.votes),
                [1, 0, 1]
            );
            assert.equal(view.my_vote, 2);

            RoomPolls.vote('r', poll.id, alice, -1);
            view = RoomPolls.toPublic(poll, alice.key);
            assert.equal(view.total_votes, 1);
            assert.equal(view.my_vote, -1);
        });

        it('rejects invalid and late votes', () => {
            const { poll } = RoomPolls.create('r', { question: 'Q', options: ['a', 'b'] }, alice);
            assert.equal(RoomPolls.vote('r', poll.id, bob, 2).error, 'Invalid request');
            assert.equal(RoomPolls.vote('r', poll.id, bob, '1').error, 'Invalid request');
            assert.equal(RoomPolls.vote('r', poll.id, bob, 0.5).error, 'Invalid request');
            assert.equal(RoomPolls.vote('r', 'missing', bob, 0).error, 'Poll not found');
            assert.equal(RoomPolls.vote('other-room', poll.id, bob, 0).error, 'Poll not found');
            RoomPolls.close('r', poll.id);
            assert.equal(RoomPolls.vote('r', poll.id, bob, 0).error, 'The poll is closed');
        });

        it('serializes per viewer without leaking voter keys', () => {
            const { poll } = RoomPolls.create('r', { question: 'Q', options: ['a', 'b'] }, alice);
            RoomPolls.vote('r', poll.id, { key: 'u:carol', name: 'Tom &amp; Jerry' }, 1);
            RoomPolls.vote('r', poll.id, bob, 0);

            const forAlice = RoomPolls.toPublic(poll, alice.key);
            const forBob = RoomPolls.toPublic(poll, bob.key);
            assert.equal(forAlice.is_mine, true);
            assert.equal(forBob.is_mine, false);
            assert.equal(forAlice.my_vote, -1);
            assert.equal(forBob.my_vote, 0);
            assert.deepEqual(forAlice.options[1].voters, ['Tom & Jerry']);
            assert.equal(forAlice.creator_name, 'Alice');

            const raw = JSON.stringify(forAlice);
            assert.ok(!raw.includes('u:'), 'voter keys stay on the server');

            const anon = RoomPolls.create('r', { question: 'A', options: ['a', 'b'], anonymous: true }, alice).poll;
            RoomPolls.vote('r', anon.id, bob, 0);
            const anonView = RoomPolls.toPublic(anon, alice.key);
            assert.equal(anonView.options[0].votes, 1);
            assert.equal(anonView.options[0].voters, undefined);
            assert.ok(!JSON.stringify(anonView).includes('Bob'));
        });

        it('removes polls and clears rooms', () => {
            const { poll } = RoomPolls.create('r', { question: 'Q', options: ['a', 'b'] }, alice);
            assert.equal(RoomPolls.isCreator(poll, alice.key), true);
            assert.equal(RoomPolls.isCreator(poll, bob.key), false);
            assert.equal(RoomPolls.remove('r', poll.id), true);
            assert.equal(RoomPolls.list('r').length, 0);
            RoomPolls.create('r', { question: 'Q', options: ['a', 'b'] }, alice);
            RoomPolls.clear('r');
            assert.equal(RoomPolls.list('r').length, 0);
        });
    });

    // ####################################################
    // SIGNALING SERVER
    // ####################################################

    describe('signaling server', function () {
        this.timeout(40000);

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
                    socket.polls = [];
                    socket.on('poll', (data) => socket.polls.push(data));
                    resolve(socket);
                });
                socket.on('connect_error', (err) => {
                    clearTimeout(timer);
                    reject(err);
                });
            });
        }

        async function join(name, uuid) {
            const socket = await connect();
            const peer_uuid = uuid || `uuid-${name}-${Math.random().toString(36).slice(2)}`;
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('join timeout')), 5000);
                socket.once('serverInfo', () => {
                    clearTimeout(timer);
                    resolve();
                });
                socket.emit('join', {
                    channel: ROOM,
                    channel_password: '',
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
                });
            });
            socket.peerName = name;
            socket.peerUuid = peer_uuid;
            await sleep(150);
            return socket;
        }

        function emitPoll(socket, action, data = {}) {
            socket.emit('poll', {
                room_id: ROOM,
                peer_name: socket.peerName,
                peer_uuid: socket.peerUuid,
                action,
                ...data,
            });
        }

        const last = (socket, action) => [...socket.polls].reverse().find((data) => data.action === action);

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

        after(() => {
            sockets.forEach((socket) => socket.close());
            if (serverProcess) serverProcess.kill('SIGKILL');
        });

        it('keeps one authoritative state shared by the whole room', async () => {
            const presenter = await join('presenter');
            const guest = await join('guest');
            assert.deepEqual(last(guest, 'list').polls, [], 'joiners receive the (empty) snapshot');

            emitPoll(guest, 'create', { question: 'Pizza <img src=x onerror=alert(1)>?', options: ['Yes', 'No'] });
            await sleep(250);
            const created = last(presenter, 'update');
            assert.ok(created, 'presenter received the new poll');
            assert.equal(created.created_by, guest.id);
            assert.equal(created.poll.question, 'Pizza <img src=x onerror=alert(1)>?', 'stored as plain text');
            assert.equal(created.poll.is_mine, false);
            assert.equal(last(guest, 'update').poll.is_mine, true);
            const pollId = created.poll.id;

            // Same voter twice + another voter: counted once each
            emitPoll(guest, 'vote', { poll_id: pollId, option: 0 });
            emitPoll(presenter, 'vote', { poll_id: pollId, option: 0 });
            await sleep(150);
            emitPoll(guest, 'vote', { poll_id: pollId, option: 0 });
            await sleep(250);
            let poll = last(presenter, 'update').poll;
            assert.equal(poll.total_votes, 2);
            assert.equal(poll.options[0].votes, 2);
            assert.equal(poll.my_vote, 0);

            // Change vote
            emitPoll(guest, 'vote', { poll_id: pollId, option: 1 });
            await sleep(250);
            poll = last(presenter, 'update').poll;
            assert.deepEqual(
                poll.options.map((o) => o.votes),
                [1, 1]
            );
            assert.deepEqual(poll.options[1].voters, ['guest']);
            assert.equal(last(guest, 'update').poll.my_vote, 1);

            // Late joiner gets the current state
            const late = await join('late');
            const snapshot = last(late, 'list');
            assert.equal(snapshot.polls.length, 1);
            assert.equal(snapshot.polls[0].total_votes, 2);
            assert.equal(snapshot.polls[0].my_vote, -1);

            // Voter identities never reach the clients
            for (const socket of [presenter, guest, late]) {
                const raw = JSON.stringify(socket.polls);
                for (const peer of [presenter, guest, late]) assert.ok(!raw.includes(peer.peerUuid));
            }
        });

        it('only lets the creator or a presenter close and delete a poll', async () => {
            const [presenter, guest, late] = sockets.slice(0, 3);

            emitPoll(presenter, 'create', { question: 'Presenter poll', options: ['A', 'B'] });
            await sleep(250);
            const pollId = last(guest, 'update').poll.id;

            guest.polls.length = 0;
            emitPoll(guest, 'close', { poll_id: pollId });
            emitPoll(late, 'delete', { poll_id: pollId });
            await sleep(250);
            assert.equal(last(guest, 'update'), undefined, 'participants cannot close it');
            assert.equal(last(guest, 'delete'), undefined, 'participants cannot delete it');

            emitPoll(presenter, 'close', { poll_id: pollId });
            await sleep(250);
            assert.equal(last(guest, 'update').poll.open, false);

            emitPoll(guest, 'vote', { poll_id: pollId, option: 0 });
            await sleep(250);
            assert.equal(last(guest, 'error').message, 'The poll is closed');

            // Presenter can delete a guest poll
            const guestPollId = last(late, 'list').polls[0].id;
            emitPoll(presenter, 'delete', { poll_id: guestPollId });
            await sleep(250);
            assert.equal(last(late, 'delete').poll_id, guestPollId);

            // Creator can delete its own poll
            emitPoll(late, 'create', { question: 'Mine', options: ['A', 'B'] });
            await sleep(250);
            const minePollId = last(late, 'update').poll.id;
            emitPoll(late, 'delete', { poll_id: minePollId });
            await sleep(250);
            assert.equal(last(presenter, 'delete').poll_id, minePollId);
        });

        it('ignores sockets that did not join the room', async () => {
            const [presenter] = sockets;
            const outsider = await connect();
            presenter.polls.length = 0;
            outsider.emit('poll', { room_id: ROOM, action: 'create', question: 'Spam', options: ['A', 'B'] });
            await sleep(300);
            assert.equal(presenter.polls.length, 0);
            assert.equal(outsider.polls.length, 0);
        });

        it('rejects invalid polls with an error to the sender only', async () => {
            const [presenter, guest] = sockets;
            presenter.polls.length = 0;
            emitPoll(guest, 'create', { question: 'Only one option', options: ['A', 'a'] });
            await sleep(250);
            assert.equal(last(guest, 'error').message, 'At least 2 different options are required');
            assert.equal(presenter.polls.length, 0);
        });

        it('separates participants sharing a browser and keeps the vote on rejoin', async () => {
            // peer_uuid lives in localStorage: two tabs of one browser share it
            const sharedUuid = 'shared-browser-uuid';
            const tabA = await join('tab-a', sharedUuid);
            const tabB = await join('tab-b', sharedUuid);

            emitPoll(tabA, 'create', { question: 'Shared browser', options: ['A', 'B'] });
            await sleep(250);
            const pollId = last(tabA, 'update').poll.id;
            assert.equal(last(tabB, 'update').poll.is_mine, false, 'other participant of the same browser');

            emitPoll(tabA, 'vote', { poll_id: pollId, option: 0 });
            emitPoll(tabB, 'vote', { poll_id: pollId, option: 1 });
            await sleep(250);
            const poll = last(tabB, 'update').poll;
            assert.equal(poll.total_votes, 2);
            assert.equal(poll.my_vote, 1);

            // Refresh / reconnect of tab A: same browser uuid and name -> same voter
            tabA.close();
            await sleep(200);
            const tabA2 = await join('tab-a', sharedUuid);
            const snapshot = last(tabA2, 'list').polls.find((p) => p.id === pollId);
            assert.equal(snapshot.my_vote, 0);
            assert.equal(snapshot.is_mine, true);
            emitPoll(tabA2, 'vote', { poll_id: pollId, option: 0 });
            await sleep(250);
            assert.equal(last(tabB, 'update').poll.total_votes, 2, 'no double vote after a refresh');
        });
    });

    // ####################################################
    // CLIENT UI
    // ####################################################

    describe('client UI', () => {
        function setup({ presenter = false } = {}) {
            const dom = new JSDOM(
                `<form id="pollForm" class="hidden">
                    <input id="pollQuestion" type="text" />
                    <div id="pollOptions"></div>
                    <button id="pollAddOptionBtn" type="button"></button>
                    <input id="pollAnonymous" type="checkbox" />
                    <button id="pollCancelBtn" type="button"></button>
                </form>
                <div id="pollEmpty"></div>
                <div id="pollList"></div>
                <span id="pollCount"></span>`,
                { runScripts: 'outside-only' }
            );
            const { window } = dom;
            window.eval(`${clientSource}\nwindow.RoomPolls = RoomPolls;`);
            const doc = window.document;
            const sent = [];
            const errors = [];
            const created = [];
            const polls = new window.RoomPolls({
                elements: {
                    list: doc.getElementById('pollList'),
                    empty: doc.getElementById('pollEmpty'),
                    form: doc.getElementById('pollForm'),
                    question: doc.getElementById('pollQuestion'),
                    options: doc.getElementById('pollOptions'),
                    addOptionBtn: doc.getElementById('pollAddOptionBtn'),
                    anonymous: doc.getElementById('pollAnonymous'),
                    cancelBtn: doc.getElementById('pollCancelBtn'),
                    count: doc.getElementById('pollCount'),
                },
                // JSON round trip like the socket transport (also drops jsdom realm prototypes)
                send: (action, data) => sent.push(JSON.parse(JSON.stringify({ action, ...data }))),
                getMyPeerId: () => 'me',
                isPresenter: () => presenter,
                onError: (message) => errors.push(message),
                onPollCreated: (poll, isMine) => created.push({ poll, isMine }),
                translate: (text) => text,
            });
            return { window, doc, polls, sent, errors, created };
        }

        const samplePoll = (extra = {}) => ({
            id: 'p1',
            question: 'Best <b>day</b>?',
            anonymous: false,
            open: true,
            created_at: 1,
            creator_name: 'Bob',
            is_mine: false,
            my_vote: -1,
            total_votes: 4,
            options: [
                { text: 'Monday', votes: 1, voters: ['Ann'] },
                { text: '<img src=x onerror=alert(1)>', votes: 3, voters: ['X', 'Y', 'Z'] },
            ],
            ...extra,
        });

        it('renders server state as plain text', () => {
            const { doc, polls, created } = setup();
            polls.handle({ action: 'update', poll: samplePoll(), created_by: 'bob' });
            assert.equal(created.length, 1);
            assert.equal(created[0].isMine, false);

            const card = doc.querySelector('.poll-card');
            assert.equal(card.querySelector('.poll-question').textContent, 'Best <b>day</b>?');
            assert.equal(doc.querySelector('img'), null, 'no HTML injection');
            assert.equal(doc.querySelector('b'), null);
            const results = [...doc.querySelectorAll('.poll-option-result')].map((el) => el.textContent);
            assert.deepEqual(results, ['25% (1)', '75% (3)']);
            assert.equal(doc.querySelectorAll('.poll-voters')[1].textContent, 'X, Y, Z');
            assert.equal(doc.getElementById('pollCount').textContent, '1');
            assert.ok(doc.getElementById('pollEmpty').classList.contains('hidden'));
            assert.equal(card.querySelector('.poll-card-actions'), null, 'no manage actions for others');
        });

        it('sends votes and retracts the current choice', () => {
            const { doc, polls, sent } = setup();
            polls.handle({ action: 'list', polls: [samplePoll({ my_vote: 1 })] });
            const buttons = doc.querySelectorAll('.poll-option');
            assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
            buttons[0].click();
            buttons[1].click();
            assert.deepEqual(sent, [
                { action: 'vote', poll_id: 'p1', option: 0 },
                { action: 'vote', poll_id: 'p1', option: -1 },
            ]);
        });

        it('locks closed polls and shows manage actions to the creator or presenter', async () => {
            const { doc, polls, sent } = setup({ presenter: true });
            polls.handle({ action: 'list', polls: [samplePoll({ open: false })] });
            assert.ok(doc.querySelector('.poll-card').classList.contains('is-closed'));
            assert.ok([...doc.querySelectorAll('.poll-option')].every((btn) => btn.disabled));
            polls.vote('p1', 0);
            assert.equal(sent.length, 0);

            const actions = doc.querySelectorAll('.poll-card-actions button');
            assert.equal(actions.length, 1, 'only delete for a closed poll');
            actions[0].click();
            await new Promise((resolve) => setTimeout(resolve, 0));
            assert.deepEqual(sent, [{ action: 'delete', poll_id: 'p1' }]);

            polls.handle({ action: 'delete', poll_id: 'p1' });
            assert.equal(doc.querySelectorAll('.poll-card').length, 0);
            assert.ok(!doc.getElementById('pollEmpty').classList.contains('hidden'));
        });

        it('validates the create form before sending', () => {
            const { doc, polls, sent, errors } = setup();
            polls.showForm();
            assert.equal(doc.querySelectorAll('#pollOptions input').length, 2);

            polls.submitForm();
            assert.deepEqual(errors, ['The question is required']);

            doc.getElementById('pollQuestion').value = ' Where? ';
            const inputs = doc.querySelectorAll('#pollOptions input');
            inputs[0].value = 'Rome';
            inputs[1].value = ' rome ';
            polls.submitForm();
            assert.equal(errors[1], 'At least 2 different options are required');

            for (let i = 0; i < 20; i++) doc.getElementById('pollAddOptionBtn').click();
            assert.equal(doc.querySelectorAll('#pollOptions input').length, 10);
            doc.querySelectorAll('#pollOptions input')[2].value = 'Paris';
            doc.getElementById('pollAnonymous').checked = false;
            polls.submitForm();
            assert.deepEqual(sent, [
                { action: 'create', question: 'Where?', options: ['Rome', 'Paris'], anonymous: false },
            ]);
            assert.ok(doc.getElementById('pollForm').classList.contains('hidden'));
            assert.equal(doc.querySelectorAll('#pollOptions input').length, 2, 'form reset');
        });

        it('ignores malformed server messages', () => {
            const { doc, polls } = setup();
            polls.handle(null);
            polls.handle({ action: 'update', poll: { id: 1 } });
            polls.handle({ action: 'list', polls: 'nope' });
            assert.equal(doc.querySelectorAll('.poll-card').length, 0);
        });
    });

    // ####################################################
    // WIRING
    // ####################################################

    describe('wiring', () => {
        it('loads the polls UI and exposes a configurable button', () => {
            assert.match(clientHtml, /<script defer src="\.\.\/js\/poll\.js"><\/script>/);
            assert.match(clientHtml, /<link rel="stylesheet" href="\.\.\/css\/poll\.css" \/>/);
            assert.match(clientHtml, /data-buttons="[^"]*\bpollBtn\b[^"]*"/);
            assert.match(clientHtml, /id="pollRoom"/);
            assert.match(buttonsJs, /showPollBtn: true/);
            assert.match(configTemplate, /showPollBtn: getEnvBoolean\(process\.env\.SHOW_POLL_BUTTON, true\)/);
            assert.match(clientJs, /signalingSocket\.on\('poll', handlePoll\)/);
            assert.match(clientJs, /\{ element: pollBtn, display: buttons\.main\.showPollBtn \}/);
        });
    });
});
