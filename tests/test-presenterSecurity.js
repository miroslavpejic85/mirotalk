'use strict';

// npx mocha tests/test-presenterSecurity.js

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3098;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');
const ROOM = 'presenter-security-room';
const PRESENTER_NAME = 'Alice-Presenter';
const PRESENTER_UUID = 'presenter-secret-uuid';

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

function joinAndAwait(socket, cfg, timeoutMs = 6000) {
    return new Promise((resolve) => {
        const done = (result) => {
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => resolve({ event: 'timeout' }), timeoutMs);
        socket.once('serverInfo', (data) => done({ event: 'serverInfo', data }));
        socket.once('unauthorized', () => done({ event: 'unauthorized' }));
        socket.emit('join', cfg);
    });
}

function receiveOnce(socket, event, emit, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${event} was not received`)), timeoutMs);
        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
        emit();
    });
}

describe('presenter identity security', function () {
    this.timeout(40000);

    let presenter;
    let participant;

    before(async () => {
        serverProcess = spawn(process.execPath, [SERVER], {
            env: {
                ...process.env,
                PORT: String(PORT),
                PRESENTERS: JSON.stringify(['AllowlistedAccount']),
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
        const presenterResult = await joinAndAwait(
            presenter,
            joinCfg({ peer_name: PRESENTER_NAME, peer_uuid: PRESENTER_UUID })
        );
        presenterResult.event.should.equal('serverInfo');
        presenterResult.data.is_presenter.should.be.true();

        participant = await connectSocket();
        const participantResult = await joinAndAwait(participant, joinCfg());
        participantResult.event.should.equal('serverInfo');
        participantResult.data.is_presenter.should.be.false();
    });

    after(() => {
        presenter?.close();
        participant?.close();
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('does not disclose peer_uuid in whiteboard or command relays', async () => {
        const payloads = [
            await receiveOnce(participant, 'whiteboardAction', () => {
                presenter.emit('whiteboardAction', {
                    room_id: ROOM,
                    peer_name: PRESENTER_NAME,
                    peer_uuid: PRESENTER_UUID,
                    action: 'lock',
                });
            }),
            await receiveOnce(participant, 'wbCanvasToJson', () => {
                presenter.emit('wbCanvasToJson', {
                    room_id: ROOM,
                    peer_name: PRESENTER_NAME,
                    peer_uuid: PRESENTER_UUID,
                    wbCanvasJson: JSON.stringify({ objects: [] }),
                });
            }),
            await receiveOnce(participant, 'whiteboardObject', () => {
                presenter.emit('whiteboardObject', {
                    room_id: ROOM,
                    peer_name: PRESENTER_NAME,
                    peer_uuid: PRESENTER_UUID,
                    action: 'remove',
                    object_id: 'object-1',
                });
            }),
            await receiveOnce(participant, 'cmd', () => {
                presenter.emit('cmd', {
                    action: 'test',
                    send_to_all: true,
                    data: {
                        room_id: ROOM,
                        peer_name: PRESENTER_NAME,
                        peer_uuid: PRESENTER_UUID,
                    },
                });
            }),
        ];

        payloads.slice(0, 3).forEach((payload) => payload.should.not.have.property('peer_uuid'));
        payloads[3].data.should.not.have.property('peer_uuid');
    });

    it('does not move presenter status away from a connected presenter', async () => {
        const attacker = await connectSocket();
        try {
            const result = await joinAndAwait(
                attacker,
                joinCfg({ peer_name: PRESENTER_NAME, peer_uuid: PRESENTER_UUID })
            );
            result.event.should.equal('serverInfo');
            result.data.is_presenter.should.be.false();
        } finally {
            attacker.close();
        }
    });

    it('does not trust an allowlisted display name without authentication', async () => {
        const attacker = await connectSocket();
        try {
            const result = await joinAndAwait(attacker, joinCfg({ peer_name: 'AllowlistedAccount' }));
            result.event.should.equal('serverInfo');
            result.data.is_presenter.should.be.false();
        } finally {
            attacker.close();
        }
    });
});
