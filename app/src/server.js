/*
http://patorjk.com/software/taag/#p=display&f=ANSI%20Regular&t=Server

███████ ███████ ██████  ██    ██ ███████ ██████  
██      ██      ██   ██ ██    ██ ██      ██   ██ 
███████ █████   ██████  ██    ██ █████   ██████  
     ██ ██      ██   ██  ██  ██  ██      ██   ██ 
███████ ███████ ██   ██   ████   ███████ ██   ██                                           

dependencies: {
    @mattermost/client      : https://www.npmjs.com/package/@mattermost/client
    @sentry/node            : https://www.npmjs.com/package/@sentry/node
    axios                   : https://www.npmjs.com/package/axios
    compression             : https://www.npmjs.com/package/compression
    colors                  : https://www.npmjs.com/package/colors
    cors                    : https://www.npmjs.com/package/cors
    crypto-js               : https://www.npmjs.com/package/crypto-js
    dotenv                  : https://www.npmjs.com/package/dotenv
    express                 : https://www.npmjs.com/package/express
    express-openid-connect  : https://www.npmjs.com/package/express-openid-connect
    jsonwebtoken            : https://www.npmjs.com/package/jsonwebtoken
    js-yaml                 : https://www.npmjs.com/package/js-yaml
    ngrok                   : https://www.npmjs.com/package/ngrok
    qs                      : https://www.npmjs.com/package/qs
    openai                  : https://www.npmjs.com/package/openai
    socket.io               : https://www.npmjs.com/package/socket.io
    swagger                 : https://www.npmjs.com/package/swagger-ui-express
    uuid                    : https://www.npmjs.com/package/uuid
    xss                     : https://www.npmjs.com/package/xss
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
 * @version 1.3.93
 *
 */

'use strict'; // https://www.w3schools.com/js/js_strict.asp

require('dotenv').config();

const { auth, requiresAuth } = require('express-openid-connect');
const { Server } = require('socket.io');
const http = require('http');
const https = require('https');
const compression = require('compression');
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const app = express();
const fs = require('fs');
const checkXSS = require('./xss.js');
const ServerApi = require('./api');
const mattermostCli = require('./mattermost.js');
const Host = require('./host');
const Logs = require('./logs');
const log = new Logs('server');

// Email alerts and notifications
const nodemailer = require('./lib/nodemailer');

const packageJson = require('../../package.json');

const domain = process.env.HOST || 'localhost';
const isHttps = process.env.HTTPS == 'true'; // Use self-signed certificates instead of Certbot and Let's Encrypt
const port = process.env.PORT || 3000; // must be the same to client.js signalingServerPort
const host = `http${isHttps ? 's' : ''}://${domain}:${port}`;

const authHost = new Host(); // Authenticated IP by Login

let server;

if (isHttps) {
    // Define paths to the SSL key and certificate files
    const keyPath = path.join(__dirname, '../ssl/key.pem');
    const certPath = path.join(__dirname, '../ssl/cert.pem');

    // Check if SSL key file exists
    if (!fs.existsSync(keyPath)) {
        log.error('SSL key file not found.');
        process.exit(1); // Exit the application if the key file is missing
    }

    // Check if SSL certificate file exists
    if (!fs.existsSync(certPath)) {
        log.error('SSL certificate file not found.');
        process.exit(1); // Exit the application if the certificate file is missing
    }

    // Read SSL key and certificate files securely
    const options = {
        key: fs.readFileSync(keyPath, 'utf-8'),
        cert: fs.readFileSync(certPath, 'utf-8'),
    };

    // Create HTTPS server using self-signed certificates
    server = https.createServer(options, app);
} else {
    server = http.createServer(app);
}

// Cors

const cors_origin = process.env.CORS_ORIGIN;
const cors_methods = process.env.CORS_METHODS;

let corsOrigin = '*';
let corsMethods = ['GET', 'POST'];

if (cors_origin && cors_origin !== '*') {
    try {
        corsOrigin = JSON.parse(cors_origin);
    } catch (error) {
        log.error('Error parsing CORS_ORIGIN', error.message);
    }
}

if (cors_methods && cors_methods !== '') {
    try {
        corsMethods = JSON.parse(cors_methods);
    } catch (error) {
        log.error('Error parsing CORS_METHODS', error.message);
    }
}

const corsOptions = {
    origin: corsOrigin,
    methods: corsMethods,
};

/*  
    Set maxHttpBufferSize from 1e6 (1MB) to 1e7 (10MB)
*/
const io = new Server({
    maxHttpBufferSize: 1e7,
    transports: ['websocket'],
    cors: corsOptions,
}).listen(server);

// console.log(io);

// Host protection (disabled by default)
const hostProtected = getEnvBoolean(process.env.HOST_PROTECTED);
const userAuth = getEnvBoolean(process.env.HOST_USER_AUTH);
const hostUsersString = process.env.HOST_USERS || '[{"username": "MiroTalk", "password": "P2P"}]';
const hostUsers = JSON.parse(hostUsersString);
const hostCfg = {
    protected: hostProtected,
    user_auth: userAuth,
    users: hostUsers,
    authenticated: !hostProtected,
};

// JWT config
const jwtCfg = {
    JWT_KEY: process.env.JWT_KEY || 'mirotalk_jwt_secret',
    JWT_EXP: process.env.JWT_EXP || '1h',
};

// Room presenters
const roomPresentersString = process.env.PRESENTERS || '["MiroTalk P2P"]';
const roomPresenters = JSON.parse(roomPresentersString);

// Swagger config
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, '/../api/swagger.yaml'), 'utf8'));

// Api config
const { v4: uuidV4 } = require('uuid');
const apiBasePath = '/api/v1'; // api endpoint path
const api_docs = host + apiBasePath + '/docs'; // api docs
const api_key_secret = process.env.API_KEY_SECRET || 'mirotalkp2p_default_secret';
const apiDisabledString = process.env.API_DISABLED || '["token", "meetings"]';
const api_disabled = JSON.parse(apiDisabledString);

// Ngrok config
const ngrok = require('ngrok');
const ngrokEnabled = getEnvBoolean(process.env.NGROK_ENABLED);
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;

// Stun (https://bloggeek.me/webrtcglossary/stun/)
// Turn (https://bloggeek.me/webrtcglossary/turn/)
const iceServers = [];
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

// Redirect URL
const redirectEnabled = getEnvBoolean(process.env.REDIRECT_ENABLED);
const redirectURL = process.env.REDIRECT_URL || '/newcall';

// Sentry config
const Sentry = require('@sentry/node');
const sentryEnabled = getEnvBoolean(process.env.SENTRY_ENABLED);
const sentryDSN = process.env.SENTRY_DSN;
const sentryTracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE;

// Slack API
const CryptoJS = require('crypto-js');
const qS = require('qs');
const slackEnabled = getEnvBoolean(process.env.SLACK_ENABLED);
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

// Setup sentry client
if (sentryEnabled) {
    Sentry.init({
        dsn: sentryDSN,
        integrations: [
            Sentry.captureConsoleIntegration({
                // ['log', 'info', 'warn', 'error', 'debug', 'assert']
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
    apiKey: process.env.CHATGPT_APIKEY,
    model: process.env.CHATGPT_MODEL,
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

// Mattermost config
const mattermostCfg = {
    enabled: getEnvBoolean(process.env.MATTERMOST_ENABLED),
    server_url: process.env.MATTERMOST_SERVER_URL,
    username: process.env.MATTERMOST_USERNAME,
    password: process.env.MATTERMOST_PASSWORD,
    token: process.env.MATTERMOST_TOKEN,
    api_disabled: api_disabled,
};

// IP Whitelist
const ipWhitelist = {
    enabled: getEnvBoolean(process.env.IP_WHITELIST_ENABLED),
    allowed: process.env.IP_WHITELIST_ALLOWED ? JSON.parse(process.env.IP_WHITELIST_ALLOWED) : [],
};

// OIDC - Open ID Connect
const OIDC = {
    enabled: process.env.OIDC_ENABLED ? getEnvBoolean(process.env.OIDC_ENABLED) : false,
    config: {
        issuerBaseURL: process.env.OIDC_ISSUER_BASE_URL,
        clientID: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        baseURL: process.env.OIDC_BASE_URL,
        secret: process.env.SESSION_SECRET,
        authorizationParams: {
            response_type: 'code',
            scope: 'openid profile email',
        },
        authRequired: process.env.OIDC_AUTH_REQUIRED ? getEnvBoolean(process.env.OIDC_AUTH_REQUIRED) : false, // Set to true if authentication is required for all routes
        auth0Logout: true, // Set to true to enable logout with Auth0
        routes: {
            callback: '/auth/callback', // Indicating the endpoint where your application will handle the callback from the authentication provider after a user has been authenticated.
            login: false, // Dedicated route in your application for user login.
            logout: '/logout', // Indicating the endpoint where your application will handle user logout requests.
        },
    },
};

// Custom middleware function for OIDC authentication
function OIDCAuth(req, res, next) {
    if (OIDC.enabled) {
        // Apply requiresAuth() middleware conditionally
        requiresAuth()(req, res, function () {
            log.debug('[OIDC] ------> requiresAuth');
            // Check if user is authenticated
            if (req.oidc.isAuthenticated()) {
                log.debug('[OIDC] ------> User isAuthenticated');
                // User is authenticated
                if (hostCfg.protected) {
                    const ip = authHost.getIP(req);
                    hostCfg.authenticated = true;
                    authHost.setAuthorizedIP(ip, true);
                    // Check...
                    log.debug('[OIDC] ------> Host protected', {
                        authenticated: hostCfg.authenticated,
                        authorizedIPs: authHost.getAuthorizedIPs(),
                    });
                }
                next();
            } else {
                // User is not authenticated
                res.status(401).send('Unauthorized');
            }
        });
    } else {
        next();
    }
}

// stats configuration
const statsData = {
    enabled: process.env.STATS_ENABLED ? getEnvBoolean(process.env.STATS_ENABLED) : true,
    src: process.env.STATS_SCR || 'https://stats.mirotalk.com/script.js',
    id: process.env.STATS_ID || 'c7615aa7-ceec-464a-baba-54cb605d7261',
};

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
    privacy: path.join(__dirname, '../../', 'public/views/privacy.html'),
    stunTurn: path.join(__dirname, '../../', 'public/views/testStunTurn.html'),
};

const channels = {}; // collect channels
const sockets = {}; // collect sockets
const peers = {}; // collect peers info grp by channels
const presenters = {}; // collect presenters grp by channels

app.use(express.static(dir.public)); // Use all static files from the public folder
app.use(cors(corsOptions)); // Enable CORS with options
app.use(compression()); // Compress all HTTP responses using GZip
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(apiBasePath + '/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // api docs

// Restrict access to specified IP
app.use((req, res, next) => {
    if (!ipWhitelist.enabled) return next();
    const clientIP = getIP(req);
    log.debug('Check IP', clientIP);
    if (ipWhitelist.allowed.includes(clientIP)) {
        next();
    } else {
        log.info('Forbidden: Access denied from this IP address', { clientIP: clientIP });
        res.status(403).json({ error: 'Forbidden', message: 'Access denied from this IP address.' });
    }
});

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

// Mattermost
const mattermost = new mattermostCli(app, mattermostCfg);

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

// OpenID Connect
if (OIDC.enabled) {
    try {
        app.use(auth(OIDC.config));
    } catch (err) {
        log.error(err);
        process.exit(1);
    }
}

// Route to display user information
app.get('/profile', OIDCAuth, (req, res) => {
    if (OIDC.enabled) {
        return res.json(req.oidc.user); // Send user information as JSON
    }
    res.sendFile(views.notFound);
});

// Authentication Callback Route
app.get('/auth/callback', (req, res, next) => {
    next(); // Let express-openid-connect handle this route
});

// Logout Route
app.get('/logout', (req, res) => {
    if (OIDC.enabled) {
        //
        if (hostCfg.protected) {
            const ip = authHost.getIP(req);
            if (authHost.isAuthorizedIP(ip)) {
                authHost.deleteIP(ip);
            }
            hostCfg.authenticated = false;
            //
            log.debug('[OIDC] ------> Logout', {
                authenticated: hostCfg.authenticated,
                authorizedIPs: authHost.getAuthorizedIPs(),
            });
        }
        req.logout(); // Logout user
    }
    res.redirect('/'); // Redirect to the home page after logout
});

// main page
app.get(['/'], OIDCAuth, (req, res) => {
    if (!OIDC.enabled && hostCfg.protected) {
        const ip = getIP(req);
        if (allowedIP(ip)) {
            res.sendFile(views.landing);
            hostCfg.authenticated = true;
        } else {
            hostCfg.authenticated = false;
            res.redirect('/login');
        }
    } else {
        res.sendFile(views.landing);
    }
});

// set new room name and join
app.get(['/newcall'], OIDCAuth, (req, res) => {
    if (!OIDC.enabled && hostCfg.protected) {
        const ip = getIP(req);
        if (allowedIP(ip)) {
            res.redirect('/');
            hostCfg.authenticated = true;
        } else {
            hostCfg.authenticated = false;
            res.redirect('/login');
        }
    } else {
        res.sendFile(views.newCall);
    }
});

// Get stats endpoint
app.get(['/stats'], (req, res) => {
    //log.debug('Send stats', statsData);
    res.send(statsData);
});

// mirotalk about
app.get(['/about'], (req, res) => {
    res.sendFile(views.about);
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

// Handle Direct join room with params
app.get('/join/', async (req, res) => {
    if (Object.keys(req.query).length > 0) {
        log.debug('Request Query', req.query);
        /* 
            http://localhost:3000/join?room=test&name=mirotalk&audio=1&video=1&screen=0&notify=0&hide=0
            https://p2p.mirotalk.com/join?room=test&name=mirotalk&audio=1&video=1&screen=0&notify=0&hide=0
            https://mirotalk.up.railway.app/join?room=test&name=mirotalk&audio=1&video=1&screen=0&notify=0&hide=0
        */
        const { room, name, audio, video, screen, notify, hide, token } = checkXSS(req.query);

        const allowRoomAccess = isAllowedRoomAccess('/join/params', req, hostCfg, peers, room);

        if (!allowRoomAccess && !token) {
            return res.status(401).json({ message: 'Direct Room Join Unauthorized' });
        }

        let peerUsername,
            peerPassword = '';
        let isPeerValid = false;
        let isPeerPresenter = false;

        if (token) {
            try {
                // Check if valid JWT token
                const validToken = await isValidToken(token);

                // Not valid token
                if (!validToken) {
                    return res.status(401).json({ message: 'Invalid Token' });
                }

                const { username, password, presenter } = checkXSS(decodeToken(token));
                // Peer credentials
                peerUsername = username;
                peerPassword = password;
                // Check if valid peer
                isPeerValid = isAuthPeer(username, password);
                // Check if presenter
                isPeerPresenter = presenter === '1' || presenter === 'true';
            } catch (err) {
                // Invalid token
                log.error('Direct Join JWT error', err.message);
                return hostCfg.protected || hostCfg.user_auth ? res.sendFile(views.login) : res.sendFile(views.landing);
            }
        }

        const OIDCUserAuthenticated = OIDC.enabled && req.oidc.isAuthenticated();

        // Peer valid going to auth as host
        if ((hostCfg.protected && isPeerValid && isPeerPresenter && !hostCfg.authenticated) || OIDCUserAuthenticated) {
            const ip = getIP(req);
            hostCfg.authenticated = true;
            authHost.setAuthorizedIP(ip, true);
            log.debug('Direct Join user auth as host done', {
                ip: ip,
                username: peerUsername,
                password: peerPassword,
            });
        }

        // Check if peer authenticated or valid
        if (room && (hostCfg.authenticated || isPeerValid)) {
            // only room mandatory
            return res.sendFile(views.client);
        } else {
            return res.sendFile(views.login);
        }
    }
});

// Join Room by id
app.get('/join/:roomId', function (req, res) {
    //
    const { roomId } = req.params;

    if (!roomId) {
        log.warn('/join/:roomId empty', roomId);
        return res.redirect('/');
    }

    const allowRoomAccess = isAllowedRoomAccess('/join/:roomId', req, hostCfg, peers, roomId);

    if (allowRoomAccess) {
        res.sendFile(views.client);
    } else {
        !OIDC.enabled && hostCfg.protected ? res.redirect('/login') : res.redirect('/');
    }
});

// Not specified correctly the room id
app.get('/join/*', function (req, res) {
    res.redirect('/');
});

// Login
app.get(['/login'], (req, res) => {
    res.sendFile(views.login);
});

// Logged
app.get(['/logged'], (req, res) => {
    const ip = getIP(req);
    if (allowedIP(ip)) {
        res.redirect('/');
    } else {
        hostCfg.authenticated = false;
        res.redirect('/login');
    }
});

/* AXIOS */

// handle login on host protected
app.post(['/login'], (req, res) => {
    //
    const ip = getIP(req);
    log.debug(`Request login to host from: ${ip}`, req.body);

    const { username, password } = checkXSS(req.body);

    const isPeerValid = isAuthPeer(username, password);

    // Peer valid going to auth as host
    if (hostCfg.protected && isPeerValid && !hostCfg.authenticated) {
        const ip = getIP(req);
        hostCfg.authenticated = true;
        authHost.setAuthorizedIP(ip, true);
        log.debug('HOST LOGIN OK', {
            ip: ip,
            authorized: authHost.isAuthorizedIP(ip),
            authorizedIps: authHost.getAuthorizedIPs(),
        });
        const token = encodeToken({ username: username, password: password, presenter: true });
        return res.status(200).json({ message: token });
    }

    // Peer auth valid
    if (isPeerValid) {
        log.debug('PEER LOGIN OK', { ip: ip, authorized: true });
        const isPresenter = roomPresenters && roomPresenters.includes(username).toString();
        const token = encodeToken({ username: username, password: password, presenter: isPresenter });
        return res.status(200).json({ message: token });
    } else {
        return res.status(401).json({ message: 'unauthorized' });
    }
});

/**
    MiroTalk API v1
    For api docs we use: https://swagger.io/
*/

// request token endpoint
app.post([`${apiBasePath}/token`], (req, res) => {
    // Check if endpoint allowed
    if (api_disabled.includes('token')) {
        return res.status(403).json({
            error: 'This endpoint has been disabled. Please contact the administrator for further information.',
        });
    }
    // check if user was authorized for the api call
    const { host, authorization } = req.headers;
    const api = new ServerApi(host, authorization, api_key_secret);
    if (!api.isAuthorized()) {
        log.debug('MiroTalk get token - Unauthorized', {
            header: req.headers,
            body: req.body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    // Get Token
    const token = api.getToken(req.body);
    res.json({ token: token });
    // log.debug the output if all done
    log.debug('MiroTalk get token - Authorized', {
        header: req.headers,
        body: req.body,
        token: token,
    });
});

// request meetings list
app.get([`${apiBasePath}/meetings`], (req, res) => {
    // Check if endpoint allowed
    if (api_disabled.includes('meetings')) {
        return res.status(403).json({
            error: 'This endpoint has been disabled. Please contact the administrator for further information.',
        });
    }
    // check if user was authorized for the api call
    const { host, authorization } = req.headers;
    const api = new ServerApi(host, authorization, api_key_secret);
    if (!api.isAuthorized()) {
        log.debug('MiroTalk get meetings - Unauthorized', {
            header: req.headers,
            body: req.body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    // Get meetings
    const meetings = api.getMeetings(peers);
    res.json({ meetings: meetings });
    // log.debug the output if all done
    log.debug('MiroTalk get meetings - Authorized', {
        header: req.headers,
        body: req.body,
        meetings: meetings,
    });
});

// API request meeting room endpoint
app.post([`${apiBasePath}/meeting`], (req, res) => {
    // Check if endpoint allowed
    if (api_disabled.includes('meeting')) {
        return res.status(403).json({
            error: 'This endpoint has been disabled. Please contact the administrator for further information.',
        });
    }
    const { host, authorization } = req.headers;
    const api = new ServerApi(host, authorization, api_key_secret);
    if (!api.isAuthorized()) {
        log.debug('MiroTalk get meeting - Unauthorized', {
            header: req.headers,
            body: req.body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    const meetingURL = api.getMeetingURL();
    res.json({ meeting: meetingURL });
    log.debug('MiroTalk get meeting - Authorized', {
        header: req.headers,
        body: req.body,
        meeting: meetingURL,
    });
});

// API request join room endpoint
app.post([`${apiBasePath}/join`], (req, res) => {
    // Check if endpoint allowed
    if (api_disabled.includes('join')) {
        return res.status(403).json({
            error: 'This endpoint has been disabled. Please contact the administrator for further information.',
        });
    }
    const { host, authorization } = req.headers;
    const api = new ServerApi(host, authorization, api_key_secret);
    if (!api.isAuthorized()) {
        log.debug('MiroTalk get join - Unauthorized', {
            header: req.headers,
            body: req.body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    const joinURL = api.getJoinURL(req.body);
    res.json({ join: joinURL });
    log.debug('MiroTalk get join - Authorized', {
        header: req.headers,
        body: req.body,
        join: joinURL,
    });
});

/*
    MiroTalk Slack app v1
    https://api.slack.com/authentication/verifying-requests-from-slack
*/

// Slack request meeting room endpoint
app.post('/slack', (req, res) => {
    if (!slackEnabled) return res.end('`Under maintenance` - Please check back soon.');

    // Check if endpoint allowed
    if (api_disabled.includes('slack')) {
        return res.end('`This endpoint has been disabled`. Please contact the administrator for further information.');
    }

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
 * Get Server config
 * @param {string} tunnel
 * @returns server config
 */
function getServerConfig(tunnel = false) {
    return {
        // General Server Information
        server: host,
        server_tunnel: tunnel,
        api_docs: api_docs,

        // Core Configurations
        jwtCfg: jwtCfg,
        cors: corsOptions,
        iceServers: iceServers,
        test_ice_servers: testStunTurn,
        email: nodemailer.emailCfg.alert ? nodemailer.emailCfg : false,

        // Security, Authorization, and User Management
        oidc: OIDC.enabled ? OIDC : false,
        host_protected: hostCfg.protected || hostCfg.user_auth ? hostCfg : false,
        presenters: roomPresenters,
        ip_whitelist: ipWhitelist.enabled ? ipWhitelist : false,
        self_signed_certificate: isHttps,
        api_key_secret: api_key_secret,

        // Media and Connection Settings
        turn_enabled: turnServerEnabled,
        ip_lookup_enabled: IPLookupEnabled,

        // Integrations
        chatGPT_enabled: configChatGPT.enabled ? configChatGPT : false,
        slack_enabled: slackEnabled,
        mattermost_enabled: mattermostCfg.enabled ? mattermostCfg : false,

        // Monitoring and Logging
        sentry_enabled: sentryEnabled,
        stats: statsData.enabled ? statsData : false,

        // Ngrok Configuration
        ngrok: ngrokEnabled
            ? {
                  enabled: ngrokEnabled,
                  token: ngrokAuthToken,
              }
            : false,

        // URLs for Redirection and Survey
        survey: surveyEnabled ? surveyURL : false,
        redirect: redirectEnabled ? redirectURL : false,

        // Versions information
        app_version: packageJson.version,
        node_version: process.versions.node,
    };
}

/**
 * Expose server to external with https tunnel using ngrok
 * https://ngrok.com
 */
async function ngrokStart() {
    try {
        await ngrok.authtoken(ngrokAuthToken);
        await ngrok.connect(port);
        const api = ngrok.getApi();
        const list = await api.listTunnels();
        const tunnel = list.tunnels[0].public_url;
        log.info('Server config', getServerConfig(tunnel));
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
        log.info('Server config', getServerConfig());
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
     * On peer disconnected
     */
    socket.on('disconnect', async (reason) => {
        removeIP(socket);
        for (let channel in socket.channels) {
            await removePeerFrom(channel);
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
                if (!configChatGPT.enabled) return cb({ message: 'ChatGPT seems disabled, try later!' });
                // https://platform.openai.com/docs/api-reference/completions/create
                try {
                    const { time, prompt, context } = params;
                    // Add the prompt to the context
                    context.push({ role: 'user', content: prompt });
                    // Call OpenAI's API to generate response
                    const completion = await chatGPT.chat.completions.create({
                        model: configChatGPT.model || 'gpt-3.5-turbo',
                        messages: context,
                        max_tokens: configChatGPT.max_tokens || 1000,
                        temperature: configChatGPT.temperature || 0,
                    });
                    // Extract message from completion
                    const message = completion.choices[0].message.content.trim();
                    // Add response to context
                    context.push({ role: 'assistant', content: message });
                    // Log conversation details
                    log.info('ChatGPT', {
                        time: time,
                        room: room_id,
                        name: peer_name,
                        context: context,
                    });
                    // Callback response to client
                    cb({ message: message, context: context });
                } catch (error) {
                    if (error.name === 'APIError') {
                        log.error('ChatGPT', {
                            name: error.name,
                            status: error.status,
                            message: error.message,
                            code: error.code,
                            type: error.type,
                        });
                        cb({ message: error.message });
                    } else {
                        // Non-API error
                        log.error('ChatGPT', error);
                        cb({ message: error.message });
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
        const peer_ip = getSocketIP(socket);

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
            peer_token,
            peer_video,
            peer_audio,
            peer_video_status,
            peer_audio_status,
            peer_screen_status,
            peer_hand_status,
            peer_rec_status,
            peer_privacy_status,
            peer_info,
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

        let is_presenter = true;

        // User Auth required, we check if peer valid
        if (hostCfg.user_auth || peer_token) {
            // Check JWT
            if (peer_token) {
                try {
                    const validToken = await isValidToken(peer_token);

                    if (!validToken) {
                        // redirect peer to login page
                        return socket.emit('unauthorized');
                    }

                    const { username, password, presenter } = checkXSS(decodeToken(peer_token));

                    const isPeerValid = isAuthPeer(username, password);

                    if (!isPeerValid) {
                        // redirect peer to login page
                        return socket.emit('unauthorized');
                    }

                    // Presenter if token 'presenter' is '1'/'true' or first to join room
                    is_presenter =
                        presenter === '1' || presenter === 'true' || Object.keys(presenters[channel]).length === 0;

                    log.debug('[' + socket.id + '] JOIN ROOM - USER AUTH check peer', {
                        ip: peer_ip,
                        peer_username: username,
                        peer_password: password,
                        peer_valid: isPeerValid,
                        peer_presenter: is_presenter,
                    });
                } catch (err) {
                    // redirect peer to login page
                    log.error('[' + socket.id + '] [Warning] Join Room JWT error', err.message);
                    return socket.emit('unauthorized');
                }
            } else {
                // redirect peer to login page
                return socket.emit('unauthorized');
            }
        }

        // room locked by the participants can't join
        if (peers[channel]['lock'] === true && peers[channel]['password'] != channel_password) {
            log.debug('[' + socket.id + '] [Warning] Room Is Locked', channel);
            return socket.emit('roomIsLocked');
        }

        // Set the presenters
        const presenter = {
            peer_ip: peer_ip,
            peer_name: peer_name,
            peer_uuid: peer_uuid,
            is_presenter: is_presenter,
        };
        // first we check if the username match the presenters username
        if (roomPresenters && roomPresenters.includes(peer_name)) {
            presenters[channel][socket.id] = presenter;
        } else {
            // if not match the presenters username, the first one join room is the presenter
            if (Object.keys(presenters[channel]).length === 0) {
                presenters[channel][socket.id] = presenter;
            }
        }

        // Check if peer is presenter, if token check the presenter key
        const isPresenter = peer_token ? is_presenter : await isPeerPresenter(channel, socket.id, peer_name, peer_uuid);

        // Some peer info data
        const { osName, osVersion, browserName, browserVersion } = peer_info;

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
            os: osName ? `${osName} ${osVersion}` : '',
            browser: browserName ? `${browserName} ${browserVersion}` : '',
        };

        const activeRooms = getActiveRooms();

        log.info('[Join] - active rooms and peers count', activeRooms);

        log.info('[Join] - connected presenters grp by roomId', presenters);

        log.info('[Join] - connected peers grp by roomId', peers);

        await addPeerTo(channel);

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;

        const peerCounts = Object.keys(peers[channel]).length;

        // Send some server info to joined peer
        await sendToPeer(socket.id, sockets, 'serverInfo', {
            peers_count: peerCounts,
            host_protected: hostCfg.protected,
            user_auth: hostCfg.user_auth,
            is_presenter: isPresenter,
            survey: {
                active: surveyEnabled,
                url: surveyURL,
            },
            redirect: {
                active: redirectEnabled,
                url: redirectURL,
            },
            //...
        });

        // SCENARIO: Notify when the first user join room and is awaiting assistance...
        if (peerCounts === 1) {
            nodemailer.sendEmailAlert('join', {
                room_id: channel,
                peer_name: peer_name,
                domain: socket.handshake.headers.host.split(':')[0],
                os: osName ? `${osName} ${osVersion}` : '',
                browser: browserName ? `${browserName} ${browserVersion}` : '',
            }); // .env EMAIL_ALERT=true
        }
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
                default:
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
                // presenter
                if (presenters && presenters[room_id] && presenters[room_id][peer_id]) {
                    presenters[room_id][peer_id]['peer_name'] = peer_name_new;
                }
                peer_id_to_update = peer_id;
                log.debug('[' + socket.id + '] Peer name changed', {
                    peer_name_old: peer_name_old,
                    peer_name_new: peer_name_new,
                });
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
     * Handle messages
     */
    socket.on('message', async (message) => {
        const data = checkXSS(message);
        log.debug('Got message', data);
        await sendToRoom(data.room_id, socket.id, 'message', data);
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
                        default:
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

    socket.on('fileReceiveAbort', async (cfg) => {
        const config = checkXSS(cfg);
        const { room_id, peer_name } = config;
        log.debug('[' + socket.id + '] Peer [' + peer_name + '] send fileReceiveAbort to room_id [' + room_id + ']');
        await sendToRoom(room_id, socket.id, 'fileReceiveAbort', config);
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
                default:
                    break;
            }
        } catch (err) {
            log.error('Remove Peer', toJson(err));
        }

        const activeRooms = getActiveRooms();

        log.info('[removePeerFrom] - active rooms and peers count', activeRooms);

        log.info('[removePeerFrom] - connected presenters grp by roomId', presenters);

        log.info('[removePeerFrom] - connected peers grp by roomId', peers);

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
        'i', // fragment locator
    );
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
 * @param {string} peer_name
 * @param {string} peer_uuid
 * @returns boolean
 */
async function isPeerPresenter(room_id, peer_id, peer_name, peer_uuid) {
    try {
        if (!presenters[room_id] || !presenters[room_id][peer_id]) {
            // Presenter not in the presenters config list, disconnected, or peer_id changed...
            for (const [existingPeerID, presenter] of Object.entries(presenters[room_id] || {})) {
                if (presenter.peer_name === peer_name) {
                    log.debug('[' + peer_id + '] Presenter found', presenters[room_id][existingPeerID]);
                    return true;
                }
            }
            return false;
        }

        const isPresenter =
            (typeof presenters[room_id] === 'object' &&
                Object.keys(presenters[room_id][peer_id]).length > 1 &&
                presenters[room_id][peer_id]['peer_name'] === peer_name &&
                presenters[room_id][peer_id]['peer_uuid'] === peer_uuid) ||
            (roomPresenters && roomPresenters.includes(peer_name));

        log.debug('[' + peer_id + '] isPeerPresenter', presenters[room_id][peer_id]);

        return isPresenter;
    } catch (err) {
        log.error('isPeerPresenter', err);
        return false;
    }
}

/**
 * Check if peer is present in the host users
 * @param {string} username
 * @param {string} password
 * @returns Boolean true/false
 */
function isAuthPeer(username, password) {
    return hostCfg.users && hostCfg.users.some((user) => user.username === username && user.password === password);
}

/**
 * Check if valid JWT token
 * @param {string} token
 * @returns boolean
 */
async function isValidToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwtCfg.JWT_KEY, (err, decoded) => {
            if (err) {
                // Token is invalid
                resolve(false);
            } else {
                // Token is valid
                resolve(true);
            }
        });
    });
}

/**
 * Encode JWT token payload
 * @param {object} token
 * @returns
 */
function encodeToken(token) {
    if (!token) return '';

    const { username = 'username', password = 'password', presenter = false, expire } = token;

    const expireValue = expire || jwtCfg.JWT_EXP;

    // Constructing payload
    const payload = {
        username: String(username),
        password: String(password),
        presenter: String(presenter),
    };

    // Encrypt payload using AES encryption
    const payloadString = JSON.stringify(payload);
    const encryptedPayload = CryptoJS.AES.encrypt(payloadString, jwtCfg.JWT_KEY).toString();

    // Constructing JWT token
    const jwtToken = jwt.sign({ data: encryptedPayload }, jwtCfg.JWT_KEY, { expiresIn: expireValue });

    return jwtToken;
}

/**
 * Decode JWT Payload data
 * @param {object} jwtToken
 * @returns mixed
 */
function decodeToken(jwtToken) {
    if (!jwtToken) return null;

    // Verify and decode the JWT token
    const decodedToken = jwt.verify(jwtToken, jwtCfg.JWT_KEY);
    if (!decodedToken || !decodedToken.data) {
        throw new Error('Invalid token');
    }

    // Decrypt the payload using AES decryption
    const decryptedPayload = CryptoJS.AES.decrypt(decodedToken.data, jwtCfg.JWT_KEY).toString(CryptoJS.enc.Utf8);

    // Parse the decrypted payload as JSON
    const payload = JSON.parse(decryptedPayload);

    return payload;
}

/**
 * Get All connected peers count grouped by roomId
 * @return {object} array
 */
function getActiveRooms() {
    const roomPeersArray = [];
    // Iterate through each room
    for (const roomId in peers) {
        if (peers.hasOwnProperty(roomId)) {
            // Get the count of peers in the current room
            const peersCount = Object.keys(peers[roomId]).length;
            roomPeersArray.push({
                roomId: roomId,
                peersCount: peersCount,
            });
        }
    }
    return roomPeersArray;
}

/**
 * Check if Allowed Room Access
 * @param {string} logMessage
 * @param {object} req
 * @param {object} hostCfg
 * @param {object} peers
 * @param {string} roomId
 * @returns boolean true/false
 */
function isAllowedRoomAccess(logMessage, req, hostCfg, peers, roomId) {
    const OIDCUserAuthenticated = OIDC.enabled && req.oidc.isAuthenticated();
    const hostUserAuthenticated = hostCfg.protected && hostCfg.authenticated;
    const roomExist = roomId in peers;
    const roomCount = Object.keys(peers).length;

    const allowRoomAccess =
        (!hostCfg.protected && !OIDC.enabled) || // No host protection and OIDC mode enabled (default)
        (OIDCUserAuthenticated && roomExist) || // User authenticated via OIDC and room Exist
        (hostUserAuthenticated && roomExist) || // User authenticated via Login and room Exist
        ((OIDCUserAuthenticated || hostUserAuthenticated) && roomCount === 0) || // User authenticated joins the first room
        roomExist; // User Or Guest join an existing Room

    log.debug(logMessage, {
        OIDCUserAuthenticated: OIDCUserAuthenticated,
        hostUserAuthenticated: hostUserAuthenticated,
        roomExist: roomExist,
        roomCount: roomCount,
        extraInfo: {
            roomId: roomId,
            OIDCUserEnabled: OIDC.enabled,
            hostProtected: hostCfg.protected,
            hostAuthenticated: hostCfg.authenticated,
        },
        allowRoomAccess: allowRoomAccess,
    });

    return allowRoomAccess;
}

/**
 * Get ip
 * @param {object} req
 * @returns string ip
 */
function getIP(req) {
    return req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'] || req.socket.remoteAddress || req.ip;
}

/**
 * Get IP from socket
 * @param {object} socket
 * @returns string
 */
function getSocketIP(socket) {
    return (
        socket.handshake.headers['x-forwarded-for'] ||
        socket.handshake.headers['X-Forwarded-For'] ||
        socket.handshake.address
    );
}

/**
 * Check if auth ip
 * @param {string} ip
 * @returns boolean
 */
function allowedIP(ip) {
    const authorizedIPs = authHost.getAuthorizedIPs();
    const authorizedIP = authHost.isAuthorizedIP(ip);
    log.info('Allowed IPs', { ip: ip, authorizedIP: authorizedIP, authorizedIPs: authorizedIPs });
    return authHost != null && authorizedIP;
}

/**
 * Remove hosts auth ip on socket disconnect
 * @param {object} socket
 */
function removeIP(socket) {
    if (hostCfg.protected) {
        const ip = getSocketIP(socket);
        log.debug('[removeIP] - Host protected check ip', { ip: ip });
        if (ip && allowedIP(ip)) {
            authHost.deleteIP(ip);
            hostCfg.authenticated = false;
            log.info('[removeIP] - Remove IP from auth', {
                ip: ip,
                authorizedIps: authHost.getAuthorizedIPs(),
            });
        }
    }
}
