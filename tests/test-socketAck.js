'use strict';

// npx mocha tests/test-socketAck.js

require('should');

const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3098;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');

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

async function assertServerAlive() {
    await sleep(500);
    (serverProcess.exitCode === null && serverProcess.signalCode === null).should.be.true(
        'server process exited after malformed socket event'
    );
    const probe = await connectSocket();
    probe.connected.should.be.true();
}

describe('socket events without acknowledgment (DoS)', function () {
    this.timeout(40000);

    let socket;

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
        socket = await connectSocket();
    });

    after(() => {
        sockets.forEach((s) => s.close());
        if (serverProcess) serverProcess.kill('SIGKILL');
    });

    it('survives a data event with an unknown method and no ack', async () => {
        socket.emit('data', { method: 'unrecognized-local-test' });
        await assertServerAlive();
    });

    it('survives a checkPeerName data event with no ack', async () => {
        socket.emit('data', { method: 'checkPeerName', room_id: 'r', peer_id: 'p', peer_name: 'n' });
        await assertServerAlive();
    });

    it('survives a getChatGPT data event with no ack', async () => {
        socket.emit('data', { method: 'getChatGPT', room_id: 'r', peer_name: 'n', params: {} });
        await assertServerAlive();
    });

    it('still acknowledges a data event when an ack is requested', async () => {
        const res = await socket.timeout(3000).emitWithAck('data', { method: 'unrecognized-local-test' });
        res.should.be.false();
    });

    it('survives getWhisperTranscription with a null payload', async () => {
        socket.emit('getWhisperTranscription', null, () => {});
        await assertServerAlive();
    });

    it('survives translateChatMessage with a null payload', async () => {
        socket.emit('translateChatMessage', null, () => {});
        await assertServerAlive();
    });

    it('still answers translateChatMessage when not in the room', async () => {
        const res = await socket.timeout(3000).emitWithAck('translateChatMessage', { room_id: 'nope', text: 'hi' });
        res.should.have.property('error');
    });
});
