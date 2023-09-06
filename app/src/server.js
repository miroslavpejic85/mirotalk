/*
http://patorjk.com/software/taag/#p=display&f=ANSI%20Regular&t=Server

███████ ███████ ██████  ██    ██ ███████ ██████  
██      ██      ██   ██ ██    ██ ██      ██   ██ 
███████ █████   ██████  ██    ██ █████   ██████  
     ██ ██      ██   ██  ██  ██  ██      ██   ██ 
███████ ███████ ██   ██   ████   ███████ ██   ██                                           

dependencies: {
    @sentry/node            : https://www.npmjs.com/package/@sentry/node
    @sentry/integrations    : https://www.npmjs.com/package/@sentry/integrations
    axios                   : https://www.npmjs.com/package/axios
    body-parser             : https://www.npmjs.com/package/body-parser
    compression             : https://www.npmjs.com/package/compression
    colors                  : https://www.npmjs.com/package/colors
    cors                    : https://www.npmjs.com/package/cors
    crypto-js               : https://www.npmjs.com/package/crypto-js
    dotenv                  : https://www.npmjs.com/package/dotenv
    express                 : https://www.npmjs.com/package/express
    ngrok                   : https://www.npmjs.com/package/ngrok
    qs                      : https://www.npmjs.com/package/qs
    openai                  : https://www.npmjs.com/package/openai
    socket.io               : https://www.npmjs.com/package/socket.io
    swagger                 : https://www.npmjs.com/package/swagger-ui-express
    uuid                    : https://www.npmjs.com/package/uuid
    xss                     : https://www.npmjs.com/package/xss
    yamljs                  : https://www.npmjs.com/package/yamljs
}
*/

/**
 * MiroTalk P2P - Server component
 *
 * @link    GitHub: https://github.com/miroslavpejic85/mirotalk
 * @link    Official Live demo: https://p2p.mirotalk.com
 * @license For open source use: AGPLv3
 * @license For commercial use or closed source, contact us at license.mirotalk@gmail.com or purchase directly from CodeCanyon
 * @license CodeCanyon: https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661
 * @author  Miroslav Pejic - miroslav.pejic.85@gmail.com
 * @version 1.0.5
 *
 */

'use strict'; // https://www.w3schools.com/js/js_strict.asp

require('dotenv').config();

const { Server } = require('socket.io');
const http = require('http');
const https = require('https');
const compression = require('compression');
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const app = express();
const checkXSS = require('./xss.js');
const Host = require('./host');
const Logs = require('./logs');
const log = new Logs('server');

const domain = process.env.HOST || 'localhost';
const isHttps = process.env.HTTPS == 'true';
const port = process.env.PORT || 3000; // must be the same to client.js signalingServerPort
const host = `http${isHttps ? 's' : ''}://${domain}:${port}`;

let io, server, authHost;

if (isHttps) {
    const fs = require('fs');
    const options = {
        key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem'), 'utf-8'),
        cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem'), 'utf-8'),
    };
    server = https.createServer(options, app);
} else {
    server = http.createServer(app);
}

/*  
    Set maxHttpBufferSize from 1e6 (1MB) to 1e7 (10MB)
*/
io = new Server({
    maxHttpBufferSize: 1e7,
    transports: ['websocket'],
}).listen(server);

// console.log(io);

// Host protection (disabled by default)
const hostProtected = getEnvBoolean(process.env.HOST_PROTECTED);
const hostCfg = {
    protected: hostProtected,
    username: process.env.HOST_USERNAME,
    password: process.env.HOST_PASSWORD,
    authenticated: !hostProtected,
};

// Swagger config
const yamlJS = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = yamlJS.load(path.join(__dirname + '/../api/swagger.yaml'));

// Api config
const { v4: uuidV4 } = require('uuid');
const apiBasePath = '/api/v1'; // api endpoint path
const api_docs = host + apiBasePath + '/docs'; // api docs
const api_key_secret = process.env.API_KEY_SECRET || 'mirotalk_default_secret';

// Ngrok config
const ngrok = require('ngrok');
const ngrokEnabled = getEnvBoolean(process.env.NGROK_ENABLED);
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;

// Stun (https://bloggeek.me/webrtcglossary/stun/)
// Turn (https://bloggeek.me/webrtcglossary/turn/)
let iceServers = [];
const stunServerUrl = process.env.STUN_SERVER_URL;
const turnServerUrl = process.env.TURN_SERVER_URL;
const turnServerUsername = process.env.TURN_SERVER_USERNAME;
const turnServerCredential = process.env.TURN_SERVER_CREDENTIAL;
const stunServerEnabled = getEnvBoolean(process.env.STUN_SERVER_ENABLED);
const turnServerEnabled = getEnvBoolean(process.env.TURN_SERVER_ENABLED);
// Stun is mandatory for not internal network
if (stunServerEnabled && stunServerUrl) iceServers.push({ urls: stunServerUrl });
// Turn is recommended if direct peer to peer connection is not possible
if (turnServerEnabled && turnServerUrl && turnServerUsername && turnServerCredential) {
    iceServers.push({ urls: turnServerUrl, username: turnServerUsername, credential: turnServerCredential });
}

// Test Stun and Turn connection with query params
// const testStunTurn = host + '/test?iceServers=' + JSON.stringify(iceServers);
const testStunTurn = host + '/test';

// IP Lookup
const IPLookupEnabled = getEnvBoolean(process.env.IP_LOOKUP_ENABLED);

// Survey URL
const surveyEnabled = getEnvBoolean(process.env.SURVEY_ENABLED);
const surveyURL = process.env.SURVEY_URL || 'https://www.questionpro.com/t/AUs7VZq00L';

// Sentry config
const Sentry = require('@sentry/node');
const { CaptureConsole } = require('@sentry/integrations');
const sentryEnabled = getEnvBoolean(process.env.SENTRY_ENABLED);
const sentryDSN = process.env.SENTRY_DSN;
const sentryTracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE;

// Slack API
const CryptoJS = require('crypto-js');
const qS = require('qs');
const slackEnabled = getEnvBoolean(process.env.SLACK_ENABLED);
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const bodyParser = require('body-parser');

// Setup sentry client
if (sentryEnabled) {
    Sentry.init({
        dsn: sentryDSN,
        integrations: [
            new CaptureConsole({
                // array of methods that should be captured
                // defaults to ['log', 'info', 'warn', 'error', 'debug', 'assert']
                levels: ['warn', 'error'],
            }),
        ],
        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: sentryTracesSampleRate,
    });
}

// OpenAI/ChatGPT
let chatGPT;
const configChatGPT = {
    enabled: getEnvBoolean(process.env.CHATGPT_ENABLED),
    basePath: process.env.CHATGPT_BASE_PATH,
    apiKey: process.env.CHATGTP_APIKEY,
    model: process.env.CHATGTP_MODEL,
    max_tokens: parseInt(process.env.CHATGPT_MAX_TOKENS),
    temperature: parseInt(process.env.CHATGPT_TEMPERATURE),
};
if (configChatGPT.enabled) {
    if (configChatGPT.apiKey) {
        const { OpenAI } = require('openai');
        const configuration = {
            basePath: configChatGPT.basePath,
            apiKey: configChatGPT.apiKey,
        };
        chatGPT = new OpenAI(configuration);
    } else {
        log.warning('ChatGPT seems enabled, but you missing the apiKey!');
    }
}

// directory
const dir = {
    public: path.join(__dirname, '../../', 'public'),
};
// html views
const views = {
    about: path.join(__dirname, '../../', 'public/views/about.html'),
    client: path.join(__dirname, '../../', 'public/views/client.html'),
    landing: path.join(__dirname, '../../', 'public/views/landing.html'),
    login: path.join(__dirname, '../../', 'public/views/login.html'),
    newCall: path.join(__dirname, '../../', 'public/views/newcall.html'),
    notFound: path.join(__dirname, '../../', 'public/views/404.html'),
    permission: path.join(__dirname, '../../', 'public/views/permission.html'),
    privacy: path.join(__dirname, '../../', 'public/views/privacy.html'),
    stunTurn: path.join(__dirname, '../../', 'public/views/testStunTurn.html'),
};

let channels = {}; // collect channels
let sockets = {}; // collect sockets
let peers = {}; // collect peers info grp by channels
let presenters = {}; // collect presenters grp by channels

app.use(cors()); // Enable All CORS Requests for all origins
app.use(compression()); // Compress all HTTP responses using GZip
app.use(express.json()); // Api parse body data as json
app.use(express.static(dir.public)); // Use all static files from the public folder
app.use(bodyParser.urlencoded({ extended: true })); // Need for Slack API body parser
app.use(apiBasePath + '/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // api docs

// Logs requests
app.use((req, res, next) => {
    log.debug('New request:', {
        // headers: req.headers,
        body: req.body,
        method: req.method,
        path: req.originalUrl,
    });
    next();
});

// POST start from here...
app.post('*', function (next) {
    next();
});

// GET start from here...
app.get('*', function (next) {
    next();
});

// Remove trailing slashes in url handle bad requests
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError || err.status === 400 || 'body' in err) {
        log.error('Request Error', {
            header: req.headers,
            body: req.body,
            error: err.message,
        });
        return res.status(400).send({ status: 404, message: err.message }); // Bad request
    }
    if (req.path.substr(-1) === '/' && req.path.length > 1) {
        let query = req.url.slice(req.path.length);
        res.redirect(301, req.path.slice(0, -1) + query);
    } else {
        next();
    }
});

// main page
app.get(['/'], (req, res) => {
    if (hostCfg.protected) {
        hostCfg.authenticated = false;
        res.sendFile(views.login);
    } else {
        res.sendFile(views.landing);
    }
});

// mirotalk about
app.get(['/about'], (req, res) => {
    res.sendFile(views.about);
});

// set new room name and join
app.get(['/newcall'], (req, res) => {
    if (hostCfg.protected) {
        const ip = getIP(req);
        if (allowedIP(ip)) {
            res.sendFile(views.newCall);
        } else {
            hostCfg.authenticated = false;
            res.sendFile(views.login);
        }
    } else {
        res.sendFile(views.newCall);
    }
});

// if not allow video/audio
app.get(['/permission'], (req, res) => {
    res.sendFile(views.permission);
});

// privacy policy
app.get(['/privacy'], (req, res) => {
    res.sendFile(views.privacy);
});

// test Stun and Turn connections
app.get(['/test'], (req, res) => {
    if (Object.keys(req.query).length > 0) {
        log.debug('Request Query', req.query);
    }
    res.sendFile(views.stunTurn);
});

// no room name specified to join
app.get('/join/', (req, res) => {
    if (hostCfg.authenticated && Object.keys(req.query).length > 0) {
        log.debug('Request Query', req.query);
        /* 
            http://localhost:3000/join?room=test&name=mirotalk&audio=1&video=1&screen=1&notify=1
            https://p2p.mirotalk.com/join?room=test&name=mirotalk&audio=1&video=1&screen=1&notify=1
            https://mirotalk.up.railway.app/join?room=test&name=mirotalk&audio=1&video=1&screen=1&notify=1
        */
        const { room, name, audio, video, screen, notify } = checkXSS(req.query);
        // all the params are mandatory for the direct room join
        // if (room && name && audio && video && screen && notify) {
        if (room) {
            // only room mandatory
            return res.sendFile(views.client);
        }
    }
    if (hostCfg.protected) {
        return res.sendFile(views.login);
    }
    res.redirect('/');
});

// Join Room by id
app.get('/join/:roomId', function (req, res) {
    // log.debug('Join to room', { roomId: req.params.roomId });
    if (hostCfg.authenticated) {
        res.sendFile(views.client);
    } else {
        if (hostCfg.protected) {
            return res.sendFile(views.login);
        }
        res.redirect('/');
    }
});

// Not specified correctly the room id
app.get('/join/*', function (req, res) {
    res.redirect('/');
});

// logged
app.get(['/logged'], (req, res) => {
    const ip = getIP(req);
    if (allowedIP(ip)) {
        res.sendFile(views.landing);
    } else {
        hostCfg.authenticated = false;
        res.sendFile(views.login);
    }
});

/* AXIOS */

// handle login on host protected
app.post(['/login'], (req, res) => {
    if (hostCfg.protected) {
        const ip = getIP(req);
        log.debug(`Request login to host from: ${ip}`, req.body);
        const { username, password } = checkXSS(req.body);
        if (username == hostCfg.username && password == hostCfg.password) {
            hostCfg.authenticated = true;
            authHost = new Host(ip, true);
            log.debug('LOGIN OK', { ip: ip, authorized: authHost.isAuthorized(ip) });
            res.status(200).json({ message: 'authorized' });
        } else {
            log.debug('LOGIN KO', { ip: ip, authorized: false });
            hostCfg.authenticated = false;
            res.status(401).json({ message: 'unauthorized' });
        }
    } else {
        res.redirect('/');
    }
});

/**
    MiroTalk API v1
    For api docs we use: https://swagger.io/
*/

// request meeting room endpoint
app.post([apiBasePath + '/meeting'], (req, res) => {
    // check if user was authorized for the api call
    const { headers, body } = req;
    const authorization = headers.authorization;
    if (authorization != api_key_secret) {
        log.debug('MiroTalk get meeting - Unauthorized', {
            headers: headers,
            body: body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    // setup meeting URL
    const host = req.headers.host;
    const meetingURL = getMeetingURL(host);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ meeting: meetingURL }));

    // log.debug the output if all done
    log.debug('MiroTalk get meeting - Authorized', {
        headers: headers,
        body: body,
        meeting: meetingURL,
    });
});

/*
    MiroTalk Slack app v1
    https://api.slack.com/authentication/verifying-requests-from-slack
*/

//Slack request meeting room endpoint
app.post('/slack', (req, res) => {
    if (!slackEnabled) return res.end('`Under maintenance` - Please check back soon.');

    log.debug('Slack', req.headers);

    if (!slackSigningSecret) return res.end('`Slack Signing Secret is empty!`');

    const slackSignature = req.headers['x-slack-signature'];
    const requestBody = qS.stringify(req.body, { format: 'RFC1738' });
    const timeStamp = req.headers['x-slack-request-timestamp'];
    const time = Math.floor(new Date().getTime() / 1000);

    // The request timestamp is more than five minutes from local time. It could be a replay attack, so let's ignore it.
    if (Math.abs(time - timeStamp) > 300) return res.end('`Wrong timestamp` - Ignore this request.');

    // Get Signature to compare it later
    const sigBaseString = 'v0:' + timeStamp + ':' + requestBody;
    const mySignature = 'v0=' + CryptoJS.HmacSHA256(sigBaseString, slackSigningSecret);

    // Valid Signature return a meetingURL
    if (mySignature == slackSignature) {
        const host = req.headers.host;
        const meetingURL = getMeetingURL(host);
        log.debug('Slack', { meeting: meetingURL });
        return res.end(meetingURL);
    }
    // Something wrong
    return res.end('`Wrong signature` - Verification failed!');
});

/**
 * Request meeting room endpoint
 * @returns  entrypoint / Room URL for your meeting.
 */
function getMeetingURL(host) {
    return 'http' + (host.includes('localhost') ? '' : 's') + '://' + host + '/join/' + uuidV4();
}

// end of MiroTalk API v1

// not match any of page before, so 404 not found
app.get('*', function (req, res) {
    res.sendFile(views.notFound);
});

/**
 * Expose server to external with https tunnel using ngrok
 * https://ngrok.com
 */
async function ngrokStart() {
    try {
        await ngrok.authtoken(ngrokAuthToken);
        await ngrok.connect(port);
        const api = ngrok.getApi();
        //const data = JSON.parse(await api.get('api/tunnels')); // v3
        const data = await api.listTunnels(); // v4
        const pu0 = data.tunnels[0].public_url;
        const pu1 = data.tunnels[1].public_url;
        const tunnelHttps = pu0.startsWith('https') ? pu0 : pu1;
        // server settings
        log.debug('settings', {
            host_protected: hostCfg.protected,
            host_username: hostCfg.username,
            host_password: hostCfg.password,
            iceServers: iceServers,
            ngrok: {
                ngrok_enabled: ngrokEnabled,
                ngrok_token: ngrokAuthToken,
            },
            server: host,
            server_tunnel: tunnelHttps,
            test_ice_servers: testStunTurn,
            api_docs: api_docs,
            api_key_secret: api_key_secret,
            use_self_signed_certificate: isHttps,
            turn_enabled: turnServerEnabled,
            ip_lookup_enabled: IPLookupEnabled,
            chatGPT_enabled: configChatGPT.enabled,
            slack_enabled: slackEnabled,
            sentry_enabled: sentryEnabled,
            survey_enabled: surveyEnabled,
            survey_url: surveyURL,
            node_version: process.versions.node,
        });
    } catch (err) {
        log.warn('[Error] ngrokStart', err.body);
        process.exit(1);
    }
}

/**
 * Start Local Server with ngrok https tunnel (optional)
 */
server.listen(port, null, () => {
    log.debug(
        `%c

	███████╗██╗ ██████╗ ███╗   ██╗      ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
	██╔════╝██║██╔════╝ ████╗  ██║      ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
	███████╗██║██║  ███╗██╔██╗ ██║█████╗███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
	╚════██║██║██║   ██║██║╚██╗██║╚════╝╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
	███████║██║╚██████╔╝██║ ╚████║      ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
	╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝      ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ started...

	`,
        'font-family:monospace',
    );

    // https tunnel
    if (ngrokEnabled && isHttps === false) {
        ngrokStart();
    } else {
        // server settings
        log.debug('settings', {
            host_protected: hostCfg.protected,
            host_username: hostCfg.username,
            host_password: hostCfg.password,
            iceServers: iceServers,
            server: host,
            test_ice_servers: testStunTurn,
            api_docs: api_docs,
            api_key_secret: api_key_secret,
            use_self_signed_certificate: isHttps,
            turn_enabled: turnServerEnabled,
            ip_lookup_enabled: IPLookupEnabled,
            chatGPT_enabled: configChatGPT.enabled,
            slack_enabled: slackEnabled,
            sentry_enabled: sentryEnabled,
            survey_enabled: surveyEnabled,
            survey_url: surveyURL,
            node_version: process.versions.node,
        });
    }
});

/**
 * On peer connected
 * Users will connect to the signaling server, after which they'll issue a "join"
 * to join a particular channel. The signaling server keeps track of all sockets
 * who are in a channel, and on join will send out 'addPeer' events to each pair
 * of users in a channel. When clients receive the 'addPeer' even they'll begin
 * setting up an RTCPeerConnection with one another. During this process they'll
 * need to relay ICECandidate information to one another, as well as SessionDescription
 * information. After all of that happens, they'll finally be able to complete
 * the peer connection and will be in streaming audio/video between eachother.
 */
io.sockets.on('connect', async (socket) => {
    log.debug('[' + socket.id + '] connection accepted', {
        host: socket.handshake.headers.host.split(':')[0],
        time: socket.handshake.time,
    });

    socket.channels = {};
    sockets[socket.id] = socket;

    const transport = socket.conn.transport.name; // in most cases, "polling"
    log.debug('[' + socket.id + '] Connection transport', transport);

    /**
     * Check upgrade transport
     */
    socket.conn.on('upgrade', () => {
        const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
        log.debug('[' + socket.id + '] Connection upgraded transport', upgradedTransport);
    });

    /**
     * On peer diconnected
     */
    socket.on('disconnect', async (reason) => {
        for (let channel in socket.channels) {
            await removePeerFrom(channel);
            removeIP(socket);
        }
        log.debug('[' + socket.id + '] disconnected', { reason: reason });
        delete sockets[socket.id];
    });

    /**
     * Handle incoming data, res with a callback
     */
    socket.on('data', async (dataObj, cb) => {
        const data = checkXSS(dataObj);

        log.debug('Socket Promise', data);
        //...
        const { room_id, peer_id, peer_name, method, params } = data;

        switch (method) {
            case 'checkPeerName':
                log.debug('Check if peer name exists', { peer_name: peer_name, room_id: room_id });
                for (let id in peers[room_id]) {
                    if (peer_id != id && peers[room_id][id]['peer_name'] == peer_name) {
                        log.debug('Peer name found', { peer_name: peer_name, room_id: room_id });
                        cb(true);
                        break;
                    }
                }
                break;
            case 'getChatGPT':
                // https://platform.openai.com/docs/introduction
                if (!configChatGPT.enabled) return cb('ChatGPT seems disabled, try later!');
                try {
                    // https://platform.openai.com/docs/api-reference/completions/create
                    const completion = await chatGPT.completions.create({
                        model: configChatGPT.model || 'text-davinci-003',
                        prompt: params.prompt,
                        max_tokens: configChatGPT.max_tokens || 1000,
                        temperature: configChatGPT.temperature || 0,
                    });
                    const response = completion.choices[0].text;
                    log.debug('ChatGPT', {
                        time: params.time,
                        room: room_id,
                        name: peer_name,
                        prompt: params.prompt,
                        response: response,
                    });
                    cb(response);
                } catch (error) {
                    if (error instanceof OpenAI.APIError) {
                        log.error('ChatGPT', {
                            status: error.status,
                            message: error.message,
                            code: error.code,
                            type: error.type,
                        });
                        cb(error.message);
                    } else {
                        // Non-API error
                        log.error('ChatGPT', error);
                        cb(error);
                    }
                }
                break;
            //....
            default:
                cb(false);
                break;
        }
        cb(false);
    });

    /**
     * On peer join
     */
    socket.on('join', async (cfg) => {
        // Get peer IPv4 (::1 Its the loopback address in ipv6, equal to 127.0.0.1 in ipv4)
        const peer_ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

        // Get peer Geo Location
        if (IPLookupEnabled && peer_ip != '::1') {
            cfg.peer_geo = await getPeerGeoLocation(peer_ip);
        }

        // Prevent XSS injection
        const config = checkXSS(cfg);

        // log.debug('Join room', config);
        log.debug('[' + socket.id + '] join ', config);

        const {
            channel,
            channel_password,
            peer_uuid,
            peer_name,
            peer_video,
            peer_audio,
            peer_video_status,
            peer_audio_status,
            peer_screen_status,
            peer_hand_status,
            peer_rec_status,
            peer_privacy_status,
        } = config;

        if (channel in socket.channels) {
            return log.debug('[' + socket.id + '] [Warning] already joined', channel);
        }
        // no channel aka room in channels init
        if (!(channel in channels)) channels[channel] = {};

        // no channel aka room in peers init
        if (!(channel in peers)) peers[channel] = {};

        // no presenter aka host in presenters init
        if (!(channel in presenters)) presenters[channel] = {};

        // room locked by the participants can't join
        if (peers[channel]['lock'] === true && peers[channel]['password'] != channel_password) {
            log.debug('[' + socket.id + '] [Warning] Room Is Locked', channel);
            return socket.emit('roomIsLocked');
        }

        // collect presenters grp by channels
        if (Object.keys(presenters[channel]).length === 0) {
            presenters[channel] = {
                peer_ip: peer_ip,
                peer_name: peer_name,
                peer_uuid: peer_uuid,
                is_presenter: true,
            };
        }

        // Check if peer is presenter
        const isPresenter = await isPeerPresenter(channel, socket.id, peer_name, peer_uuid);

        log.debug('[Join] - connected presenters grp by roomId', presenters);

        // collect peers info grp by channels
        peers[channel][socket.id] = {
            peer_name: peer_name,
            peer_presenter: isPresenter,
            peer_video: peer_video,
            peer_audio: peer_audio,
            peer_video_status: peer_video_status,
            peer_audio_status: peer_audio_status,
            peer_screen_status: peer_screen_status,
            peer_hand_status: peer_hand_status,
            peer_rec_status: peer_rec_status,
            peer_privacy_status: peer_privacy_status,
        };
        log.debug('[Join] - connected peers grp by roomId', peers);

        await addPeerTo(channel);

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;

        const peerCounts = Object.keys(peers[channel]).length;

        // Send some server info to joined peer
        await sendToPeer(socket.id, sockets, 'serverInfo', {
            peers_count: peerCounts,
            is_presenter: isPresenter,
            survey: {
                active: surveyEnabled,
                url: surveyURL,
            },
        });
    });

    /**
     * Relay ICE to peers
     */
    socket.on('relayICE', async (config) => {
        const { peer_id, ice_candidate } = config;

        // log.debug('[' + socket.id + '] relay ICE-candidate to [' + peer_id + '] ', {
        //     address: config.ice_candidate,
        // });

        await sendToPeer(peer_id, sockets, 'iceCandidate', {
            peer_id: socket.id,
            ice_candidate: ice_candidate,
        });
    });

    /**
     * Relay SDP to peers
     */
    socket.on('relaySDP', async (config) => {
        const { peer_id, session_description } = config;

        log.debug('[' + socket.id + '] relay SessionDescription to [' + peer_id + '] ', {
            type: session_description.type,
        });

        await sendToPeer(peer_id, sockets, 'sessionDescription', {
            peer_id: socket.id,
            session_description: session_description,
        });
    });

    /**
     * Handle Room action
     */
    socket.on('roomAction', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        //log.debug('[' + socket.id + '] Room action:', config);
        const { room_id, peer_id, peer_name, peer_uuid, password, action } = config;

        // Check if peer is presenter
        const isPresenter = await isPeerPresenter(room_id, peer_id, peer_name, peer_uuid);

        let room_is_locked = false;
        //
        try {
            switch (action) {
                case 'lock':
                    if (!isPresenter) return;
                    peers[room_id]['lock'] = true;
                    peers[room_id]['password'] = password;
                    await sendToRoom(room_id, socket.id, 'roomAction', {
                        peer_name: peer_name,
                        action: action,
                    });
                    room_is_locked = true;
                    break;
                case 'unlock':
                    if (!isPresenter) return;
                    delete peers[room_id]['lock'];
                    delete peers[room_id]['password'];
                    await sendToRoom(room_id, socket.id, 'roomAction', {
                        peer_name: peer_name,
                        action: action,
                    });
                    break;
                case 'checkPassword':
                    const data = {
                        peer_name: peer_name,
                        action: action,
                        password: password == peers[room_id]['password'] ? 'OK' : 'KO',
                    };
                    await sendToPeer(socket.id, sockets, 'roomAction', data);
                    break;
            }
        } catch (err) {
            log.error('Room action', toJson(err));
        }
        log.debug('[' + socket.id + '] Room ' + room_id, { locked: room_is_locked, password: password });
    });

    /**
     * Relay NAME to peers
     */
    socket.on('peerName', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        // log.debug('Peer name', config);
        const { room_id, peer_name_old, peer_name_new } = config;

        let peer_id_to_update = null;

        for (let peer_id in peers[room_id]) {
            if (peers[room_id][peer_id]['peer_name'] == peer_name_old && peer_id == socket.id) {
                peers[room_id][peer_id]['peer_name'] = peer_name_new;
                presenters[room_id]['peer_name'] = peer_name_new;
                peer_id_to_update = peer_id;
            }
        }

        if (peer_id_to_update) {
            const data = {
                peer_id: peer_id_to_update,
                peer_name: peer_name_new,
            };
            log.debug('[' + socket.id + '] emit peerName to [room_id: ' + room_id + ']', data);

            await sendToRoom(room_id, socket.id, 'peerName', data);
        }
    });

    /**
     * Relay Audio Video Hand ... Status to peers
     */
    socket.on('peerStatus', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        // log.debug('Peer status', config);
        const { room_id, peer_name, peer_id, element, status } = config;

        const data = {
            peer_id: peer_id,
            peer_name: peer_name,
            element: element,
            status: status,
        };

        try {
            for (let peer_id in peers[room_id]) {
                if (peers[room_id][peer_id]['peer_name'] == peer_name && peer_id == socket.id) {
                    switch (element) {
                        case 'video':
                            peers[room_id][peer_id]['peer_video_status'] = status;
                            break;
                        case 'audio':
                            peers[room_id][peer_id]['peer_audio_status'] = status;
                            break;
                        case 'screen':
                            peers[room_id][peer_id]['peer_screen_status'] = status;
                            break;
                        case 'hand':
                            peers[room_id][peer_id]['peer_hand_status'] = status;
                            break;
                        case 'rec':
                            peers[room_id][peer_id]['peer_rec_status'] = status;
                            break;
                        case 'privacy':
                            peers[room_id][peer_id]['peer_privacy_status'] = status;
                            break;
                    }
                }
            }

            log.debug('[' + socket.id + '] emit peerStatus to [room_id: ' + room_id + ']', data);

            await sendToRoom(room_id, socket.id, 'peerStatus', data);
        } catch (err) {
            log.error('Peer Status', toJson(err));
        }
    });

    /**
     * Relay actions to peers or specific peer in the same room
     */
    socket.on('peerAction', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        // log.debug('Peer action', config);
        const { room_id, peer_id, peer_uuid, peer_name, peer_use_video, peer_action, send_to_all } = config;

        // Only the presenter can do this actions
        const presenterActions = ['muteAudio', 'hideVideo', 'ejectAll'];
        if (presenterActions.some((v) => peer_action === v)) {
            // Check if peer is presenter
            const isPresenter = await isPeerPresenter(room_id, peer_id, peer_name, peer_uuid);
            // if not presenter do nothing
            if (!isPresenter) return;
        }

        const data = {
            peer_id: peer_id,
            peer_name: peer_name,
            peer_action: peer_action,
            peer_use_video: peer_use_video,
        };

        if (send_to_all) {
            log.debug('[' + socket.id + '] emit peerAction to [room_id: ' + room_id + ']', data);

            await sendToRoom(room_id, socket.id, 'peerAction', data);
        } else {
            log.debug('[' + socket.id + '] emit peerAction to [' + peer_id + '] from room_id [' + room_id + ']');

            await sendToPeer(peer_id, sockets, 'peerAction', data);
        }
    });

    /**
     * Relay Kick out peer from room
     */
    socket.on('kickOut', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        const { room_id, peer_id, peer_uuid, peer_name } = config;

        // Check if peer is presenter
        const isPresenter = await isPeerPresenter(room_id, peer_id, peer_name, peer_uuid);

        // Only the presenter can kickOut others
        if (isPresenter) {
            log.debug('[' + socket.id + '] kick out peer [' + peer_id + '] from room_id [' + room_id + ']');

            await sendToPeer(peer_id, sockets, 'kickOut', {
                peer_name: peer_name,
            });
        }
    });

    /**
     * Relay File info
     */
    socket.on('fileInfo', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        // log.debug('File info', config);
        const { room_id, peer_id, peer_name, broadcast, file } = config;

        // check if valid fileName
        if (!isValidFileName(file.fileName)) {
            log.debug('[' + socket.id + '] File name not valid', config);
            return;
        }

        function bytesToSize(bytes) {
            let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes == 0) return '0 Byte';
            let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
        }

        log.debug('[' + socket.id + '] Peer [' + peer_name + '] send file to room_id [' + room_id + ']', {
            peerName: peer_name,
            fileName: file.fileName,
            fileSize: bytesToSize(file.fileSize),
            fileType: file.fileType,
            broadcast: broadcast,
        });

        if (broadcast) {
            await sendToRoom(room_id, socket.id, 'fileInfo', config);
        } else {
            await sendToPeer(peer_id, sockets, 'fileInfo', config);
        }
    });

    /**
     * Abort file sharing
     */
    socket.on('fileAbort', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        const { room_id, peer_name } = config;

        log.debug('[' + socket.id + '] Peer [' + peer_name + '] send fileAbort to room_id [' + room_id + ']');
        await sendToRoom(room_id, socket.id, 'fileAbort');
    });

    /**
     * Relay video player action
     */
    socket.on('videoPlayer', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        // log.debug('Video player', config);
        const { room_id, peer_id, peer_name, video_action, video_src } = config;

        // Check if valid video src url
        if (video_action == 'open' && !isValidHttpURL(video_src)) {
            log.debug('[' + socket.id + '] Video src not valid', config);
            return;
        }

        const data = {
            peer_id: socket.id,
            peer_name: peer_name,
            video_action: video_action,
            video_src: video_src,
        };

        if (peer_id) {
            log.debug('[' + socket.id + '] emit videoPlayer to [' + peer_id + '] from room_id [' + room_id + ']', data);

            await sendToPeer(peer_id, sockets, 'videoPlayer', data);
        } else {
            log.debug('[' + socket.id + '] emit videoPlayer to [room_id: ' + room_id + ']', data);

            await sendToRoom(room_id, socket.id, 'videoPlayer', data);
        }
    });

    /**
     * Whiteboard actions for all user in the same room
     */
    socket.on('wbCanvasToJson', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        // log.debug('Whiteboard send canvas', config);
        const { room_id } = config;
        await sendToRoom(room_id, socket.id, 'wbCanvasToJson', config);
    });

    socket.on('whiteboardAction', async (cfg) => {
        // Prevent XSS injection
        const config = checkXSS(cfg);
        log.debug('Whiteboard', config);
        const { room_id } = config;
        await sendToRoom(room_id, socket.id, 'whiteboardAction', config);
    });

    /**
     * Add peers to channel
     * @param {string} channel room id
     */
    async function addPeerTo(channel) {
        for (let id in channels[channel]) {
            // offer false
            await channels[channel][id].emit('addPeer', {
                peer_id: socket.id,
                peers: peers[channel],
                should_create_offer: false,
                iceServers: iceServers,
            });
            // offer true
            socket.emit('addPeer', {
                peer_id: id,
                peers: peers[channel],
                should_create_offer: true,
                iceServers: iceServers,
            });
            log.debug('[' + socket.id + '] emit addPeer [' + id + ']');
        }
    }

    /**
     * Remove peers from channel
     * @param {string} channel room id
     */
    async function removePeerFrom(channel) {
        if (!(channel in socket.channels)) {
            return log.debug('[' + socket.id + '] [Warning] not in ', channel);
        }
        try {
            delete socket.channels[channel];
            delete channels[channel][socket.id];
            delete peers[channel][socket.id]; // delete peer data from the room

            switch (Object.keys(peers[channel]).length) {
                case 0: // last peer disconnected from the room without room lock & password set
                    delete peers[channel];
                    delete presenters[channel];
                    break;
                case 2: // last peer disconnected from the room having room lock & password set
                    if (peers[channel]['lock'] && peers[channel]['password']) {
                        delete peers[channel]; // clean lock and password value from the room
                        delete presenters[channel]; // clean the presenter from the channel
                    }
                    break;
            }
        } catch (err) {
            log.error('Remove Peer', toJson(err));
        }
        log.debug('[removePeerFrom] - connected peers grp by roomId', peers);
        log.debug('[removePeerFrom] - connected presenters grp by roomId', presenters);

        for (let id in channels[channel]) {
            await channels[channel][id].emit('removePeer', { peer_id: socket.id });
            socket.emit('removePeer', { peer_id: id });
            log.debug('[' + socket.id + '] emit removePeer [' + id + ']');
        }
    }

    /**
     * Object to Json
     * @param {object} data object
     * @returns {json} indent 4 spaces
     */
    function toJson(data) {
        return JSON.stringify(data, null, 4); // "\t"
    }

    /**
     * Send async data to all peers in the same room except yourself
     * @param {string} room_id id of the room to send data
     * @param {string} socket_id socket id of peer that send data
     * @param {string} msg message to send to the peers in the same room
     * @param {object} config data to send to the peers in the same room
     */
    async function sendToRoom(room_id, socket_id, msg, config = {}) {
        for (let peer_id in channels[room_id]) {
            // not send data to myself
            if (peer_id != socket_id) {
                await channels[room_id][peer_id].emit(msg, config);
                //console.log('Send to room', { msg: msg, config: config });
            }
        }
    }

    /**
     * Send async data to specified peer
     * @param {string} peer_id id of the peer to send data
     * @param {object} sockets all peers connections
     * @param {string} msg message to send to the peer in the same room
     * @param {object} config data to send to the peer in the same room
     */
    async function sendToPeer(peer_id, sockets, msg, config = {}) {
        if (peer_id in sockets) {
            await sockets[peer_id].emit(msg, config);
            //console.log('Send to peer', { msg: msg, config: config });
        }
    }
}); // end [sockets.on-connect]

/**
 * Get Env as boolean
 * @param {string} key
 * @param {boolean} force_true_if_undefined
 * @returns boolean
 */
function getEnvBoolean(key, force_true_if_undefined = false) {
    if (key == undefined && force_true_if_undefined) return true;
    return key == 'true' ? true : false;
}

/**
 * Check if valid filename
 * @param {string} fileName
 * @returns boolean
 */
function isValidFileName(fileName) {
    const invalidChars = /[\\\/\?\*\|:"<>]/;
    return !invalidChars.test(fileName);
}

/**
 * Check if valid URL
 * @param {string} str to check
 * @returns boolean true/false
 */
function isValidHttpURL(url) {
    const pattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$',
        'i',
    ); // fragment locator
    return pattern.test(url);
}

/**
 * get Peer geo Location using GeoJS
 * https://www.geojs.io/docs/v1/endpoints/geo/
 *
 * @param {string} ip
 * @returns json
 */
async function getPeerGeoLocation(ip) {
    const endpoint = `https://get.geojs.io/v1/ip/geo/${ip}.json`;
    log.debug('Get peer geo', { ip: ip, endpoint: endpoint });
    return axios
        .get(endpoint)
        .then((response) => response.data)
        .catch((error) => log.error(error));
}

/**
 * Check if peer is Presenter
 * @param {string} room_id
 * @param {string} peer_id
 * @param {string} peer_uuid
 * @returns boolean
 */
async function isPeerPresenter(room_id, peer_id, peer_name, peer_uuid) {
    let isPresenter = false;
    if (typeof presenters[room_id] === 'undefined' || presenters[room_id] === null) return false;
    try {
        isPresenter =
            typeof presenters === 'object' &&
            Object.keys(presenters[room_id]).length > 1 &&
            presenters[room_id]['peer_name'] === peer_name &&
            presenters[room_id]['peer_uuid'] === peer_uuid;
    } catch (err) {
        log.error('isPeerPresenter', err);
        return false;
    }
    log.debug('[' + peer_id + '] isPeerPresenter', {
        peer_name: peer_name,
        peer_uuid: peer_uuid,
        isPresenter: isPresenter,
        presenter: presenters[room_id],
    });
    return isPresenter;
}

/**
 * Get ip
 * @param {object} req
 * @returns string ip
 */
function getIP(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

/**
 * Check if auth ip
 * @param {string} ip
 * @returns boolean
 */
function allowedIP(ip) {
    return authHost != null && authHost.isAuthorized(ip);
}

/**
 * Remove hosts auth ip on socket disconnect
 * @param {object} socket
 */
function removeIP(socket) {
    if (hostCfg.protected) {
        const ip = socket.handshake.address;
        log.debug('Host protected check ip', { ip: ip });
        if (ip && allowedIP(ip)) {
            authHost.deleteIP(ip);
            hostCfg.authenticated = false;
            log.debug('Remove IP from auth', { ip: ip });
        }
    }
}
