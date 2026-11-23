'use strict';

// npx mocha tests/test-identityBinding.js

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3098;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');
const ROOM = 'identity-room';

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

async function joinRoom(peer_name, channel = ROOM) {
    const socket = await connectSocket();
    socket.peer_name = peer_name;
    socket.peer_uuid = 'uuid-' + Math.random().toString(36).slice(2);
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
        peer_uuid: socket.peer_uuid,
        peer_name,
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

// Resolves the payload `target` receives for `event` after `emit()` runs (null when nothing arrives)
async function received(target, event, emit, windowMs = 500) {
    let payload = null;
    const handler = (data) => (payload = data);
    target.on(event, handler);
    emit();
    await sleep(windowMs);
    target.off(event, handler);
    return payload;
}

describe('server-bound sender identity', function () {
    this.timeout(40000);

    let presenter;
    let observer;
    let impostor;

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
                KLIPY_API_ENABLED: 'true',
                KLIPY_API_KEY: 'test-klipy-key',
            },
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        await waitForServer(20000);

        presenter = await joinRoom('presenter-user');
        observer = await joinRoom('observer-user');
        impostor = await joinRoom('impostor-user');
    });

    after(() => {
        sockets.forEach((s) => s.close());
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('binds the message author to the sending connection', async () => {
        const data = await received(observer, 'message', () =>
            impostor.emit('message', { type: 'roomEmoji', room_id: ROOM, peer_name: 'presenter-user', emoji: 'x' })
        );
        data.peer_name.should.equal('impostor-user');
    });

    it('binds the roomGif sender tile to the sending connection and drops unsafe GIF URLs', async () => {
        const gif = 'https://static.klipy.com/ii/abc/md.webp';
        const data = await received(observer, 'message', () =>
            impostor.emit('message', {
                type: 'roomGif',
                room_id: ROOM,
                peer_id: presenter.id,
                peer_name: 'presenter-user',
                gif,
            })
        );
        data.peer_id.should.equal(impostor.id);
        data.peer_name.should.equal('impostor-user');
        data.gif.should.equal(gif);

        const unsafe = await received(observer, 'message', () =>
            impostor.emit('message', { type: 'roomGif', room_id: ROOM, gif: 'http://static.klipy.com/a.gif' })
        );
        (unsafe === null).should.be.true();
    });

    it('binds the peerStatus owner to the sending connection', async () => {
        const data = await received(observer, 'peerStatus', () =>
            impostor.emit('peerStatus', {
                room_id: ROOM,
                peer_id: presenter.id,
                peer_name: 'presenter-user',
                element: 'hand',
                status: true,
            })
        );
        data.peer_id.should.equal(impostor.id);
        data.peer_name.should.equal('impostor-user');
    });

    it('binds the fileInfo sender to the sending connection', async () => {
        const data = await received(observer, 'fileInfo', () =>
            impostor.emit('fileInfo', {
                room_id: ROOM,
                peer_id: observer.id,
                peer_name: 'presenter-user',
                peer_avatar: 'https://evil.example/a.png',
                broadcast: true,
                file: { fileName: 'a.txt', fileSize: 1, fileType: 'text/plain' },
            })
        );
        data.peer_name.should.equal('impostor-user');
        // The impostor joined without an avatar: the server stores the sanitized (false) value, never the spoofed one
        data.peer_avatar.should.be.false();
    });

    it('binds the videoPlayer, caption and cmd identity to the sending connection', async () => {
        const video = await received(observer, 'videoPlayer', () =>
            impostor.emit('videoPlayer', {
                room_id: ROOM,
                peer_name: 'presenter-user',
                video_action: 'close',
                broadcast: true,
            })
        );
        video.peer_name.should.equal('impostor-user');

        const caption = await received(observer, 'caption', () =>
            impostor.emit('caption', { room_id: ROOM, peer_name: 'presenter-user', action: 'stop' })
        );
        caption.peer_name.should.equal('impostor-user');

        const cmd = await received(observer, 'cmd', () =>
            impostor.emit('cmd', {
                action: 'geoLocationKO',
                send_to_all: false,
                data: { room_id: ROOM, peer_id: presenter.id, peer_name: 'presenter-user', to_peer_id: observer.id },
            })
        );
        cmd.data.peer_id.should.equal(impostor.id);
        cmd.data.peer_name.should.equal('impostor-user');
    });

    it('binds the peerAction actor to the sending connection', async () => {
        const data = await received(observer, 'peerAction', () =>
            impostor.emit('peerAction', {
                room_id: ROOM,
                peer_id: presenter.id,
                peer_name: 'presenter-user',
                peer_action: 'screenStop',
                send_to_all: true,
            })
        );
        data.peer_id.should.equal(impostor.id);
        data.peer_name.should.equal('impostor-user');
    });

    it('relays peer names as plain text, without HTML tags', async () => {
        const mallory = await joinRoom(
            '<img src=https://attacker.example/t.png width=1>Mallory<a href=https://evil.example>!</a>'
        );
        const status = await received(observer, 'peerStatus', () =>
            mallory.emit('peerStatus', {
                room_id: ROOM,
                peer_id: mallory.id,
                peer_name: mallory.peer_name,
                element: 'hand',
                status: true,
            })
        );
        status.peer_name.should.equal('Mallory!');

        const renamed = await received(observer, 'peerName', () =>
            mallory.emit('peerName', {
                room_id: ROOM,
                peer_name_old: mallory.peer_name,
                peer_name_new: '<a href=https://evil.example>Click to verify</a><img src=x>',
                peer_avatar: '',
            })
        );
        renamed.peer_name.should.equal('Click to verify');
        mallory.close();
    });

    it('keeps presenter rights when the requested name contained HTML, relaying the plain text name', async () => {
        const room = 'identity-room-html-name';
        const host = await joinRoom('<b>Host</b><img src=https://attacker.example/t.png>', room);
        const guest = await joinRoom('guest-user', room);

        const data = await received(guest, 'roomAction', () =>
            // The client keeps sending the name as typed: the server normalizes it before the presenter check
            host.emit('roomAction', {
                room_id: room,
                peer_name: host.peer_name,
                peer_uuid: host.peer_uuid,
                action: 'joinLockOn',
            })
        );
        data.action.should.equal('joinLockOn');
        data.peer_name.should.equal('Host');
        host.close();
        guest.close();
    });

    it('drops a kicked peer that ignores the kickOut notification', async () => {
        const kicked = await received(impostor, 'kickOut', () =>
            presenter.emit('kickOut', {
                room_id: ROOM,
                peer_id: impostor.id,
                peer_uuid: presenter.peer_uuid,
                peer_name: presenter.peer_name,
                peer_kicked_reason: 'test',
            })
        );
        kicked.peer_name.should.equal('presenter-user');
        impostor.connected.should.be.true();

        await sleep(9000);
        impostor.connected.should.be.false();
        observer.connected.should.be.true();
    });
});
