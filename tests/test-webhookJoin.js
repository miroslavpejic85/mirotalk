'use strict';

// npx mocha tests/test-webhookJoin.js
//
// A peer's bearer credentials (peer_token, identity/presenter/breakout tokens, room password)
// are consumed by the join and must never reach the join webhook or the other room members.

require('should');

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3098;
const WEBHOOK_PORT = 3099;
const BASE = `http://localhost:${PORT}`;
const SERVER = path.join(__dirname, '..', 'app', 'src', 'server.js');

const HOST_USER = 'MiroTalk';
const HOST_PASS = '550e8400-e29b-41d4-a716-446655440000';

const SECRETS = {
    create_room_token: 'secret-create-room-token',
    identity_token: 'secret-identity-token',
    oidc_presenter_token: 'secret-oidc-presenter-token',
    breakout_token: 'secret-breakout-token',
};

let serverProcess;
let webhookServer;
const webhookEvents = [];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, timeoutMs, message) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            if (await check()) return;
        } catch (err) {
            // not ready yet
        }
        await sleep(100);
    }
    throw new Error(message);
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
        const timer = setTimeout(() => resolve({ event: 'timeout' }), timeoutMs);
        socket.once('unauthorized', () => {
            clearTimeout(timer);
            resolve({ event: 'unauthorized' });
        });
        socket.once('serverInfo', (data) => {
            clearTimeout(timer);
            resolve({ event: 'serverInfo', data });
        });
        socket.emit('join', cfg);
    });
}

describe('test-webhookJoin', function () {
    this.timeout(40000);

    before(async () => {
        webhookServer = http.createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
                webhookEvents.push(JSON.parse(body));
                res.end('{}');
            });
        });
        await new Promise((resolve) => webhookServer.listen(WEBHOOK_PORT, resolve));

        serverProcess = spawn(process.execPath, [SERVER], {
            env: {
                ...process.env,
                PORT: String(PORT),
                HOST_PROTECTED: 'false',
                HOST_USER_AUTH: 'false',
                HOST_USERS: JSON.stringify([{ username: HOST_USER, password: HOST_PASS }]),
                JWT_KEY: 'test-jwt-key-0123456789-abcdefghijklmnop',
                WEBHOOK_ENABLED: 'true',
                WEBHOOK_URL: `http://localhost:${WEBHOOK_PORT}/webhook-endpoint`,
                NGROK_ENABLED: 'false',
                SENTRY_ENABLED: 'false',
                IP_LOOKUP_ENABLED: 'false',
                OIDC_ENABLED: 'false',
            },
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        await waitFor(() => fetch(`${BASE}/`, { redirect: 'manual' }), 20000, 'Server did not become ready in time');
    });

    after(async () => {
        if (serverProcess) serverProcess.kill('SIGKILL');
        if (webhookServer) await new Promise((resolve) => webhookServer.close(resolve));
    });

    it('never forwards the peer credentials to the join webhook or to the other room members', async () => {
        const res = await fetch(`${BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: HOST_USER, password: HOST_PASS }),
        });
        const peer_token = (await res.json()).message;
        peer_token.should.be.a.String();

        const room = 'webhook-secrets-room';
        const guest = await connectSocket();
        const host = await connectSocket();
        const guestReceived = [];
        guest.onAny((event, ...args) => guestReceived.push(JSON.stringify([event, ...args])));
        try {
            (await joinAndAwait(guest, joinCfg(room, { peer_name: 'guest' }))).event.should.equal('serverInfo');
            const hostResult = await joinAndAwait(
                host,
                joinCfg(room, { peer_name: 'host', peer_token, channel_password: 'secret-room-pass', ...SECRETS })
            );
            hostResult.event.should.equal('serverInfo');

            await waitFor(
                () => webhookEvents.some((e) => e.event === 'join' && e.data.peer_name === 'host'),
                5000,
                'join webhook not received'
            );
            const { data } = webhookEvents.find((e) => e.event === 'join' && e.data.peer_name === 'host');
            data.channel.should.equal(room);
            data.should.have.property('timestamp');
            data.should.not.have.properties(['peer_token', 'channel_password', ...Object.keys(SECRETS)]);

            await waitFor(() => guestReceived.some((e) => e.includes('"host"')), 5000, 'host not announced');
            const leaked = [peer_token, 'secret-room-pass', ...Object.values(SECRETS)];
            for (const payload of [JSON.stringify(webhookEvents), ...guestReceived]) {
                for (const secret of leaked) payload.should.not.containEql(secret);
            }
        } finally {
            guest.close();
            host.close();
        }
    });
});
