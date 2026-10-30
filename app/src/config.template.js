'use strict';

/**
 * ==============================================
 * MiroTalk P2P v.2.2.42 - Configuration File
 * ==============================================
 *
 * This file is the central configuration source.
 * All environment variables are read here so the
 * rest of the codebase imports config values
 * instead of reading process.env directly.
 *
 * Structure (same order as .env.template):
 *   1. Core                         6. API & Webhook
 *   2. Security                     7. Integrations
 *   3. Authentication & Access      8. Monitoring & Notifications
 *   4. WebRTC (STUN/TURN)           9. UI Customization (Branding)
 *   5. Rooms & Features            10. UI Buttons
 *
 * Setup:
 *   cp app/src/config.template.js app/src/config.js
 *   Then edit config.js to match your environment.
 *
 * Docker/container environments inject values via
 * environment variables which are read at startup.
 *
 * Branding and customizations require a license:
 * https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661
 */

require('dotenv').config();

const packageJson = require('../../package.json');
const { parseHostUsers } = require('./hostUsers');

// Helper: parse env string to boolean
function getEnvBoolean(key, force_true_if_undefined = false) {
    if (key == undefined && force_true_if_undefined) return true;
    return key == 'true' ? true : false;
}

// Helper: safely parse JSON env vars with a fallback
function parseJsonEnv(envValue, fallback) {
    if (!envValue) return fallback;
    try {
        return JSON.parse(envValue);
    } catch (e) {
        return fallback;
    }
}

const port = process.env.PORT || 3000;

module.exports = {
    // ##########################################################
    // 1. CORE
    // ##########################################################

    // ==========================================
    // Server
    // ==========================================
    server: {
        port: port,
        host: process.env.HOST || `http://localhost:${port}`,
        environment: process.env.NODE_ENV || 'development',
        trustProxy: !!getEnvBoolean(process.env.TRUST_PROXY),

        /**
         * Embed (iframe) Restrictions
         * ---------------------------
         * Controls which origins are allowed to embed MiroTalk P2P in an <iframe>
         * via the HTTP `Content-Security-Policy: frame-ancestors` header
         * (also mirrored to `X-Frame-Options` when possible for legacy browsers).
         *
         * Behavior:
         * - Empty / unset  → header NOT set, embedding allowed anywhere (default).
         * - 'none'         → block ALL embedding (frame-ancestors 'none' + X-Frame-Options: DENY).
         * - 'self'         → only same-origin embedding (frame-ancestors 'self' + X-Frame-Options: SAMEORIGIN).
         * - list           → comma-separated origins, 'self' is always implicitly included.
         *                    Wildcards like https://*.example.com are valid in CSP.
         *
         * IMPORTANT: This affects the widget too — the MiroTalk widget embeds
         * the room in an iframe on the host site, so every site that should
         * load the widget must be listed here.
         */
        embed: {
            allowedOrigins: process.env.ALLOWED_EMBED_ORIGINS
                ? process.env.ALLOWED_EMBED_ORIGINS.split(',')
                      .map((o) => o.trim())
                      .filter(Boolean)
                : [],
        },
    },

    // ##########################################################
    // 2. SECURITY
    // ##########################################################

    // ==========================================
    // JWT
    // ==========================================
    jwt: {
        key: process.env.JWT_KEY, // Required: min 32 chars (openssl rand -hex 32), server won't start without it
        exp: process.env.JWT_EXP || '1h',
    },

    // ==========================================
    // CORS
    // ==========================================
    cors: {
        origin: parseJsonEnv(process.env.CORS_ORIGIN, '*'),
        methods: parseJsonEnv(process.env.CORS_METHODS, ['GET', 'POST']),
    },

    // ==========================================
    // IP Whitelist
    // ==========================================
    ipWhitelist: {
        enabled: getEnvBoolean(process.env.IP_WHITELIST_ENABLED),
        allowed: parseJsonEnv(process.env.IP_WHITELIST_ALLOWED, []),
    },

    // ##########################################################
    // 3. AUTHENTICATION & ACCESS
    // ##########################################################

    // ==========================================
    // Host Protection
    // ==========================================
    host: {
        protected: getEnvBoolean(process.env.HOST_PROTECTED),
        userAuth: getEnvBoolean(process.env.HOST_USER_AUTH),
        // HOST_USERS (same format as MiroTalk SFU), passwords must contain between 1 and 36 characters:
        // - Compact: username:password:displayname:room1,room2|username2:password2:displayname2:*
        // - JSON:    [{"username":"alice","password":"pw","displayname":"Alice","allowed_rooms":["*"]}]
        // - displayname   : optional, enforced as the user's name in the room (not editable)
        // - allowed_rooms : optional, rooms the user can open/join with this login ('*' = all, default)
        // Empty by default: a shipped username/password is a public credential, set your own.
        users: parseHostUsers(process.env.HOST_USERS),
        maxLoginAttempts: process.env.HOST_MAX_LOGIN_ATTEMPTS || 5,
        minLoginBlockTime: process.env.HOST_MIN_LOGIN_BLOCK_TIME || 15, // in minutes
        // /createRoomToken rate limit (per IP)
        createRoomTokenMaxRequests: parseInt(process.env.CREATE_ROOM_TOKEN_RATE_LIMIT_MAX) || 10,
        createRoomTokenWindowMinutes: parseInt(process.env.CREATE_ROOM_TOKEN_RATE_LIMIT_WINDOW_MINUTES) || 1,
        maxRoomParticipants: parseInt(process.env.ROOM_MAX_PARTICIPANTS) || 1000,
        showActiveRooms: getEnvBoolean(process.env.SHOW_ACTIVE_ROOMS) || false,
    },

    // ==========================================
    // OIDC - OpenID Connect
    // ==========================================
    oidc: {
        enabled: process.env.OIDC_ENABLED ? getEnvBoolean(process.env.OIDC_ENABLED) : false,
        allowRoomCreationForAuthUsers: process.env.OIDC_ALLOW_ROOMS_CREATION_FOR_AUTH_USERS
            ? getEnvBoolean(process.env.OIDC_ALLOW_ROOMS_CREATION_FOR_AUTH_USERS)
            : false,
        // Authenticated OIDC users join with the name verified by the identity provider and cannot change it
        lockUsername: process.env.OIDC_LOCK_USERNAME ? getEnvBoolean(process.env.OIDC_LOCK_USERNAME) : true,
        baseUrlDynamic: process.env.OIDC_BASE_URL_DYNAMIC ? getEnvBoolean(process.env.OIDC_BASE_URL_DYNAMIC) : false,
        /*
         * When `baseUrlDynamic` is true, the OIDC baseURL (and therefore the redirect_uri
         * sent to the IdP) is derived from the incoming `Host` header. To prevent
         * Host-header injection from redirecting authorization codes to an attacker,
         * list every origin the server is allowed to serve here (full origin, no path).
         * The static `config.baseURL` is always trusted and does not need to be repeated.
         * Example: ['https://p2p.mirotalk.com', 'https://meet.example.com']
         */
        allowedDynamicBaseURLs: process.env.OIDC_ALLOWED_DYNAMIC_BASE_URLS
            ? process.env.OIDC_ALLOWED_DYNAMIC_BASE_URLS.split(',')
                  .map((u) => u.trim())
                  .filter(Boolean)
            : [],
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
            authRequired: process.env.OIDC_AUTH_REQUIRED ? getEnvBoolean(process.env.OIDC_AUTH_REQUIRED) : false,
            auth0Logout: process.env.OIDC_AUTH_LOGOUT ? getEnvBoolean(process.env.OIDC_AUTH_LOGOUT) : true,
            routes: {
                callback: '/auth/callback',
                login: false,
                logout: '/logout',
            },
        },
    },

    // ==========================================
    // Presenters
    // ==========================================
    // Array of authenticated identities who are always presenters:
    // - LOGIN usernames for host protection / user auth or a valid JWT token
    // - verified email or `sub` of the OIDC user when OIDC is enabled
    // - '*' : any authenticated OIDC user (OIDC only, never matches host logins or JWT usernames)
    // The join-form display name is never matched, so with no auth enabled this list has no
    // effect (the first participant to join is the presenter). Empty by default.
    presenters: parseJsonEnv(process.env.PRESENTERS, []),

    // ##########################################################
    // 4. WEBRTC (STUN/TURN)
    // ##########################################################

    // ==========================================
    // WebRTC ICE Servers
    // ==========================================
    webrtc: {
        stun: {
            enabled: getEnvBoolean(process.env.STUN_SERVER_ENABLED),
            url: process.env.STUN_SERVER_URL,
        },
        turn: {
            enabled: getEnvBoolean(process.env.TURN_SERVER_ENABLED),
            url: process.env.TURN_SERVER_URL,
            username: process.env.TURN_SERVER_USERNAME,
            credential: process.env.TURN_SERVER_CREDENTIAL,
        },
    },

    // ##########################################################
    // 5. ROOMS & FEATURES
    // ##########################################################

    // ==========================================
    // Breakout Rooms
    // ==========================================
    // Presenters split the participants into smaller rooms (disabled by default).
    // When disabled the server ignores every breakout request, so no breakout ticket is ever issued.
    breakoutRooms: {
        enabled: getEnvBoolean(process.env.BREAKOUT_ROOMS_ENABLED),
    },

    // ==========================================
    // Survey
    // ==========================================
    survey: {
        enabled: getEnvBoolean(process.env.SURVEY_ENABLED),
        url: process.env.SURVEY_URL || 'https://www.questionpro.com/t/AUs7VZq00L',
    },

    // ==========================================
    // Redirect
    // ==========================================
    redirect: {
        enabled: getEnvBoolean(process.env.REDIRECT_ENABLED),
        url: process.env.REDIRECT_URL || '/newcall',
    },

    // ##########################################################
    // 6. API & WEBHOOK
    // ##########################################################

    // ==========================================
    // API
    // ==========================================
    api: {
        keySecret: process.env.API_KEY_SECRET,
        disabled: parseJsonEnv(process.env.API_DISABLED, ['token', 'meetings']),
    },

    // ==========================================
    // Webhook
    // ==========================================
    webhook: {
        enabled: getEnvBoolean(process.env.WEBHOOK_ENABLED), // Enable webhook functionality
        url: process.env.WEBHOOK_URL || 'http://localhost:8888/webhook-endpoint', // Webhook server URL
    },

    // ##########################################################
    // 7. INTEGRATIONS
    // ##########################################################

    // ==========================================
    // Ngrok
    // ==========================================
    ngrok: {
        enabled: getEnvBoolean(process.env.NGROK_ENABLED),
        authToken: process.env.NGROK_AUTH_TOKEN,
    },

    // ==========================================
    // Slack
    // ==========================================
    slack: {
        enabled: getEnvBoolean(process.env.SLACK_ENABLED),
        signingSecret: process.env.SLACK_SIGNING_SECRET,
    },

    // ==========================================
    // Mattermost
    // ==========================================
    mattermost: {
        enabled: getEnvBoolean(process.env.MATTERMOST_ENABLED),
        serverUrl: process.env.MATTERMOST_SERVER_URL,
        username: process.env.MATTERMOST_USERNAME,
        password: process.env.MATTERMOST_PASSWORD,
        token: process.env.MATTERMOST_TOKEN,
        roomTokenExpire: process.env.MATTERMOST_ROOM_TOKEN_EXPIRE,
    },

    // ==========================================
    // ChatGPT / OpenAI
    // ==========================================
    chatGPT: {
        enabled: getEnvBoolean(process.env.CHATGPT_ENABLED),
        basePath: process.env.CHATGPT_BASE_PATH,
        apiKey: process.env.CHATGPT_APIKEY,
        model: process.env.CHATGPT_MODEL || 'gpt-6-luna',
        max_tokens: parseInt(process.env.CHATGPT_MAX_TOKENS),
        temperature: parseFloat(process.env.CHATGPT_TEMPERATURE),
        // Reasoning models only (none|low|medium|high|xhigh|max), empty for non-reasoning models.
        // temperature is only sent when reasoning_effort is 'none' or empty.
        reasoning_effort: process.env.CHATGPT_REASONING_EFFORT ?? 'none',
    },

    // ==========================================
    // GIF Search in chat (KLIPY)
    // ==========================================
    // Optional GIF picker in the chat, powered by KLIPY
    // (a free, drop-in replacement for the discontinued Tenor API).
    //
    // Setup:
    // 1. Create a free API key at https://partner.klipy.com/ (API Keys)
    // 2. Set KLIPY_API_ENABLED=true and KLIPY_API_KEY in your .env file
    // 3. Restart the server
    //
    // - enabled       : Enable/disable GIF search [true/false] (default: false)
    // - apiKey        : KLIPY app key. Per KLIPY's integration requirements, searches are
    //                   sent directly from the browser, so this key is shared with joined peers.
    // - contentFilter : Content safety level [off/low/medium/high] (default: 'high')
    //
    // Notes:
    // - Testing-mode keys are limited to 100 requests/hour; request Production access
    //   in the KLIPY Partner Panel to remove the limit.
    // - Attribution: the picker uses the required "Search KLIPY" placeholder and shows "Powered by KLIPY".
    //   See https://docs.klipy.com/attribution and https://docs.klipy.com/integration-requirements
    gifSearch: {
        enabled: getEnvBoolean(process.env.KLIPY_API_ENABLED),
        apiKey: process.env.KLIPY_API_KEY || '',
        contentFilter: process.env.KLIPY_CONTENT_FILTER || 'high',
    },

    // ==========================================
    // Whisper Speech-to-Text (server-side transcription)
    // ==========================================
    // Server-side audio transcription using an OpenAI-compatible Whisper
    // endpoint. Works with the official OpenAI API or any self-hosted,
    // OpenAI-compatible server (whisper.cpp server, faster-whisper, etc.).
    //
    // IMPORTANT: Whisper is a side-channel only. The browser records short
    // audio segments from a SECONDARY copy of the local microphone stream and
    // sends them here for transcription. It NEVER sits in the WebRTC media
    // path: the RTCPeerConnection audio track is untouched and keeps the
    // lowest possible latency. The resulting text is distributed to peers over
    // the existing WebRTC DataChannel, not through this server.
    //
    // - enabled        : Enable/disable Whisper transcription [true/false] (default: false)
    // - basePath       : OpenAI-compatible API endpoint (default: 'https://api.openai.com/v1/')
    //                    For a self-hosted server use e.g. 'http://localhost:8000/v1/'
    // - apiKey         : API secret key (ALWAYS store in .env, never sent to the browser).
    //                    May be empty for self-hosted servers that don't require auth.
    // - model          : Whisper model name (default: 'whisper-1')
    // - language       : Optional ISO-639-1 language hint (e.g. 'en'). Empty = auto-detect.
    // - segmentSeconds : Length of each recorded audio segment sent for transcription (default: 3)
    // - maxAudioBytes  : Reject audio segments larger than this (default: 25MB)
    whisper: {
        enabled: getEnvBoolean(process.env.WHISPER_ENABLED),
        basePath: process.env.WHISPER_BASE_PATH || 'https://api.openai.com/v1/',
        apiKey: process.env.WHISPER_API_KEY || '',
        model: process.env.WHISPER_MODEL || 'whisper-1',
        language: process.env.WHISPER_LANGUAGE || '',
        segmentSeconds: parseInt(process.env.WHISPER_SEGMENT_SECONDS) || 3,
        maxAudioBytes: parseInt(process.env.WHISPER_MAX_AUDIO_BYTES) || 25 * 1024 * 1024,
    },

    // ==========================================
    // IP Lookup
    // ==========================================
    ipLookup: {
        enabled: getEnvBoolean(process.env.IP_LOOKUP_ENABLED),
    },

    // ##########################################################
    // 8. MONITORING & NOTIFICATIONS
    // ##########################################################

    // ==========================================
    // Sentry
    // ==========================================
    sentry: {
        enabled: getEnvBoolean(process.env.SENTRY_ENABLED),
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.0'),
        logLevels: process.env.SENTRY_LOG_LEVELS
            ? process.env.SENTRY_LOG_LEVELS.split(',').map((level) => level.trim())
            : ['error'],
    },

    // ==========================================
    // Email
    // ==========================================
    email: {
        alert: process.env.EMAIL_ALERT === 'true' || false,
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
        sendTo: process.env.EMAIL_SEND_TO,
        https: process.env.HTTPS === 'true' || false,
        serverPort: process.env.PORT || 3000,
    },

    // ==========================================
    // Stats / Analytics
    // ==========================================
    stats: {
        enabled: process.env.STATS_ENABLED ? getEnvBoolean(process.env.STATS_ENABLED) : true,
        src: process.env.STATS_SCR || 'https://stats.mirotalk.com/script.js',
        id: process.env.STATS_ID || 'c7615aa7-ceec-464a-baba-54cb605d7261',
    },

    // ##########################################################
    // 9. UI CUSTOMIZATION (BRANDING)
    // ##########################################################

    // ==========================================
    // Branding (UI customizations)
    // ==========================================
    // Every value can be overridden via environment variables (see .env.template),
    // unset variables keep the defaults below. Set BRAND_HTML_INJECTION=false to
    // disable HTML injection and use static branding in the public/views folder.
    brand: {
        htmlInjection: getEnvBoolean(process.env.BRAND_HTML_INJECTION, true),
        app: {
            language: process.env.UI_LANGUAGE || 'en', // https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes
            translationMode: process.env.UI_TRANSLATION_MODE || 'google', // In-room UI: auto (native file else Google) | native (human files only, no Google) | google (default, always Google)
            name: process.env.APP_NAME || 'MiroTalk',
            title:
                process.env.APP_TITLE ||
                '<h1>MiroTalk</h1>Free browser based Real-time video calls.<br />Simple, Secure, Fast.',
            description:
                process.env.APP_DESCRIPTION ||
                'Start your next video call with a single click. No download, plug-in, or login is required. Just get straight to talking, messaging, and sharing your screen.',
            joinDescription: process.env.JOIN_DESCRIPTION || 'Pick a room name.<br />How about this one?',
            joinButtonLabel: process.env.JOIN_BUTTON_LABEL || 'JOIN ROOM',
            customizeRoomButtonLabel: process.env.CUSTOMIZE_BUTTON_LABEL || 'CUSTOMIZE ROOM',
            joinLastLabel: process.env.JOIN_LAST_LABEL || 'Your recent room:',
        },
        og: {
            type: process.env.OG_TYPE || 'app-webrtc',
            siteName: process.env.OG_SITE_NAME || 'MiroTalk',
            title: process.env.OG_TITLE || 'MiroTalk P2P - Open Source WebRTC Video Calls & Meetings',
            description:
                process.env.OG_DESCRIPTION ||
                'MiroTalk P2P is an open-source self-hosted WebRTC video calling and meeting platform. Create fast peer-to-peer video calls with screen sharing, chat, whiteboard and collaboration directly in the browser.',
            image: process.env.OG_IMAGE_URL || 'https://p2p.mirotalk.com/images/preview.png',
            url: process.env.OG_URL || 'https://p2p.mirotalk.com',
        },
        site: {
            shortcutIcon: process.env.SITE_ICON_PATH || '../images/logo.svg',
            appleTouchIcon: process.env.APPLE_TOUCH_ICON_PATH || '../images/logo.svg',
            landingTitle: process.env.SITE_TITLE || 'MiroTalk P2P - Open Source WebRTC Video Calls & Meetings',
            newCallTitle: process.env.NEW_CALL_TITLE || 'MiroTalk a Free Secure Video Calls, Chat & Screen Sharing.',
            newCallRoomTitle: process.env.NEW_ROOM_TITLE || 'Pick name. <br />Share URL. <br />Start conference.',
            newCallRoomDescription:
                process.env.NEW_ROOM_DESC ||
                "Each room has its disposable URL. Just pick a room name and share your custom URL. It's that easy.",
            loginTitle: process.env.LOGIN_TITLE || 'MiroTalk - Host Protected login required.',
            loginHeading: process.env.LOGIN_HEADING || 'Welcome back',
            loginDescription: process.env.LOGIN_DESCRIPTION || 'Enter your credentials to continue.',
            loginButtonLabel: process.env.LOGIN_BUTTON_LABEL || 'Login',
            joinRoomTitle: process.env.JOIN_ROOM_TITLE || 'Pick name.<br />Share URL.<br />Start conference.',
            joinRoomButtonLabel: process.env.JOIN_ROOM_BUTTON_LABEL || 'JOIN ROOM',
            clientTitle: process.env.CLIENT_TITLE || 'MiroTalk WebRTC Video call, Chat Room & Screen Sharing.',
            privacyPolicyTitle: process.env.PRIVACY_POLICY_TITLE || 'MiroTalk - privacy and policy.',
            stunTurnTitle: process.env.STUN_TURN_TITLE || 'Test Stun/Turn Servers.',
            notFoundTitle: process.env.NOT_FOUND_TITLE || 'MiroTalk - 404 Page not found.',
            waitingRoomTitle: process.env.WHO_ARE_YOU_TITLE || 'MiroTalk - Waiting for host to start the meeting',
            waitingRoomHeading: process.env.WHO_ARE_YOU_WAITING_ROOM_HEADING || 'Waiting for host...',
            waitingRoomDescription:
                process.env.WHO_ARE_YOU_WAITING_ROOM_DESCRIPTION ||
                "The meeting hasn't started yet.<br />You'll join automatically when the host opens the room.",
            waitingRoomStatus: process.env.WHO_ARE_YOU_WAITING_ROOM_STATUS || 'Checking room status...',
            waitingRoomReady: process.env.WHO_ARE_YOU_WAITING_ROOM_READY || 'Room is ready! Joining...',
            waitingRoomWaiting:
                process.env.WHO_ARE_YOU_WAITING_ROOM_WAITING || 'Waiting for host to start the meeting...',
            waitingRoomHostLink: process.env.WHO_ARE_YOU_WAITING_ROOM_HOST_LINK || 'Are you the host?',
            waitingRoomLoginLink: process.env.WHO_ARE_YOU_WAITING_ROOM_LOGIN_LINK || 'Login here',
            waitingRoomElapsedJust: process.env.WHO_ARE_YOU_WAITING_ROOM_ELAPSED_JUST || 'Just started waiting',
            waitingRoomElapsedMinutes: process.env.WHO_ARE_YOU_WAITING_ROOM_ELAPSED_MINUTES || 'Waiting for {minutes}',
            waitingRoomSongUrl: process.env.WHO_ARE_YOU_WAITING_ROOM_SONG_URL || '../sounds/waiting-music.mp3',
        },
        html: {
            topSponsors: getEnvBoolean(process.env.SHOW_TOP_SPONSORS, true),
            features: getEnvBoolean(process.env.SHOW_FEATURES, true),
            teams: getEnvBoolean(process.env.SHOW_TEAMS, true), // please keep me always true ;)
            tryEasier: getEnvBoolean(process.env.SHOW_TRY_EASIER, true),
            poweredBy: getEnvBoolean(process.env.SHOW_POWERED_BY, true),
            sponsors: getEnvBoolean(process.env.SHOW_SPONSORS, true),
            pastSponsors: getEnvBoolean(process.env.SHOW_PAST_SPONSORS, true),
            advertisers: getEnvBoolean(process.env.SHOW_ADVERTISERS, true),
            supportUs: getEnvBoolean(process.env.SHOW_SUPPORT_US, true),
            footer: getEnvBoolean(process.env.SHOW_FOOTER, true),
            version: getEnvBoolean(process.env.SHOW_VERSION, true), // show app version in landing footer
        },
        about: {
            imageUrl: process.env.ABOUT_IMAGE_URL || '../images/mirotalk-logo.gif',
            title: `WebRTC P2P v${packageJson.version}`,
            html: `
                <div class="about-content">
                    <p class="about-description">
                        Secure peer-to-peer video meetings directly in your browser.
                    </p>
                    <a
                        class="about-primary-action"
                        data-umami-event="About button"
                        href="${process.env.SUPPORT_URL || 'https://docs.mirotalk.com/sites/p2p'}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i class="fas fa-info-circle" aria-hidden="true"></i>
                        <span>${process.env.SUPPORT_TEXT || 'About'}</span>
                    </a>
                    <dl class="about-details">
                        <div>
                            <dt>${process.env.AUTHOR_LABEL || 'Author'}</dt>
                            <dd>
                                <a
                                    id="linkedin-button"
                                    data-umami-event="Linkedin button"
                                    href="${process.env.LINKEDIN_URL || 'https://www.linkedin.com/in/miroslav-pejic-976a07101/'}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >${process.env.AUTHOR_NAME || 'Miroslav Pejic'}</a>
                            </dd>
                        </div>
                        <div>
                            <dt>${process.env.EMAIL_LABEL || 'Email'}</dt>
                            <dd>
                                <a
                                    id="email-button"
                                    data-umami-event="Email button"
                                    href="mailto:${process.env.CONTACT_EMAIL || 'miroslav.pejic.85@gmail.com'}?subject=${process.env.EMAIL_SUBJECT || 'MiroTalk P2P info'}"
                                >${process.env.CONTACT_EMAIL || 'miroslav.pejic.85@gmail.com'}</a>
                            </dd>
                        </div>
                    </dl>
                    <footer class="about-footer">
                        &copy; ${new Date().getFullYear()} ${process.env.COPYRIGHT_TEXT || 'MiroTalk P2P. All rights reserved.'}
                    </footer>
                </div>
            `,
        },
        // https://docs.mirotalk.com/mirotalk-p2p/integration/#widgets-integration
        widget: {
            enabled: getEnvBoolean(process.env.WIDGET_ENABLED),
            roomId: process.env.WIDGET_ROOM_ID || 'support-room',
            theme: process.env.WIDGET_THEME || 'dark',
            widgetState: process.env.WIDGET_STATE || 'closed',
            widgetType: process.env.WIDGET_TYPE || 'support',
            supportWidget: {
                position: process.env.WIDGET_SUPPORT_POSITION || 'bottom-right',
                expertImages: process.env.WIDGET_SUPPORT_EXPERT_IMAGES
                    ? process.env.WIDGET_SUPPORT_EXPERT_IMAGES.split(',')
                          .map((url) => url.trim())
                          .filter(Boolean)
                    : [
                          'https://photo.cloudron.pocketsolution.net/uploads/original/95/7d/a5f7f7a2c89a5fee7affda5f013c.jpeg',
                      ],
                buttons: {
                    audio: getEnvBoolean(process.env.WIDGET_SUPPORT_BUTTON_AUDIO, true),
                    video: getEnvBoolean(process.env.WIDGET_SUPPORT_BUTTON_VIDEO, true),
                    screen: getEnvBoolean(process.env.WIDGET_SUPPORT_BUTTON_SCREEN, true),
                    chat: getEnvBoolean(process.env.WIDGET_SUPPORT_BUTTON_CHAT, true),
                    join: getEnvBoolean(process.env.WIDGET_SUPPORT_BUTTON_JOIN, true),
                },
                checkOnlineStatus: getEnvBoolean(process.env.WIDGET_SUPPORT_CHECK_ONLINE_STATUS),
                isOnline: getEnvBoolean(process.env.WIDGET_SUPPORT_IS_ONLINE, true),
                customMessages: {
                    heading: process.env.WIDGET_SUPPORT_HEADING || 'Need Help?',
                    subheading: process.env.WIDGET_SUPPORT_SUBHEADING || 'Get instant support from our expert team!',
                    connectText: process.env.WIDGET_SUPPORT_CONNECT_TEXT || 'connect in < 5 seconds',
                    onlineText: process.env.WIDGET_SUPPORT_ONLINE_TEXT || 'We are online',
                    offlineText: process.env.WIDGET_SUPPORT_OFFLINE_TEXT || 'We are offline',
                    poweredBy: process.env.WIDGET_SUPPORT_POWERED_BY || 'Powered by MiroTalk',
                },
            },
        },
        //...
    },

    // ==========================================
    // Themes
    // ==========================================
    /**
     * Theme definitions — CSS custom properties for each theme.
     * Admins can override individual themes or add new ones.
     * The client merges these with built-in defaults, so you
     * only need to specify the properties you want to change.
     * Dialog actions use --room-switch-accent / --dd-color and --select-bg.
     * Override --swal-confirm-bg and --swal-neutral-bg to customize them.
     * Button text contrast is selected automatically; destructive actions stay red.
     * Join meeting uses a darker accent with white text. --swal-join-bg and
     * --swal-join-hover-bg overrides are darkened if needed for text contrast.
     */
    themes: {
        /* Example: override dark theme background
        dark: {
            '--body-bg': 'radial-gradient(#1a1a2e, #0a0a14)',
            '--msger-bg': 'radial-gradient(#1a1a2e, #0a0a14)',
        },
        */
        /* Example: add a custom theme
        ocean: {
            '--body-bg': 'radial-gradient(#0d2137, #061220)',
            '--msger-bg': 'radial-gradient(#0d2137, #061220)',
            '--msger-private-bg': 'radial-gradient(#0d2137, #061220)',
            '--wb-bg': 'radial-gradient(#0d2137, #061220)',
            '--elem-border-color': '1px solid rgba(56, 189, 248, 0.15)',
            '--navbar-bg': 'rgba(6, 18, 32, 0.88)',
            '--select-bg': '#0f2a45',
            '--tab-btn-active': '#163d5e',
            '--box-shadow': '0px 4px 12px 0px rgba(0, 0, 0, 0.5)',
            '--left-msg-bg': '#112d4a',
            '--right-msg-bg': '#0a1f35',
            '--private-msg-bg': '#0e2540',
            '--btn-bar-bg-color': '#E0F2FE',
            '--btn-bar-color': '#061220',
            '--btns-bg-color': 'rgba(6, 18, 32, 0.75)',
            '--dd-color': '#38BDF8',
        },
        */
    },

    // ##########################################################
    // 10. UI BUTTONS
    // ##########################################################

    // ==========================================
    // UI Buttons
    // ==========================================
    /**
     * Configuration for controlling the visibility of buttons in the MiroTalk P2P client.
     * Set properties to true to show the corresponding buttons, or false to hide them.
     * Every button can also be hidden via environment variables (e.g. SHOW_AUDIO_BUTTON=false), see .env.template.
     * Unset variables keep the defaults below.
     * captionBtn, showSwapCameraBtn, showScreenShareBtn, showFullScreenBtn, showVideoPipBtn, showDocumentPipBtn -> (auto-detected).
     */
    buttons: {
        main: {
            showAudioBtn: getEnvBoolean(process.env.SHOW_AUDIO_BUTTON, true),
            showVideoBtn: getEnvBoolean(process.env.SHOW_VIDEO_BUTTON, true),
            showScreenBtn: getEnvBoolean(process.env.SHOW_SCREEN_BUTTON, true), // autodetected
            showMyHandBtn: getEnvBoolean(process.env.SHOW_RAISE_HAND, true),
            showChatRoomBtn: getEnvBoolean(process.env.SHOW_CHAT_BUTTON, true),
            showParticipantsBtn: getEnvBoolean(process.env.SHOW_PARTICIPANTS_BUTTON, true),
            showMySettingsBtn: getEnvBoolean(process.env.SHOW_SETTINGS, true),
            showExtraBtn: getEnvBoolean(process.env.SHOW_EXTRA_BUTTON, true),
            showShareQr: getEnvBoolean(process.env.SHOW_SHARE_ROOM_QR_ON_HOVER, true),
            showShareRoomBtn: getEnvBoolean(process.env.SHOW_SHARE_BUTTON, true), // For guests
            showHideMeBtn: getEnvBoolean(process.env.SHOW_HIDE_ME, true),
            showRecordStreamBtn: getEnvBoolean(process.env.SHOW_RECORD_BUTTON, true),
            showFullScreenBtn: getEnvBoolean(process.env.SHOW_FULLSCREEN_BUTTON, true),
            showRoomEmojiPickerBtn: getEnvBoolean(process.env.SHOW_EMOJI, true),
            showCaptionRoomBtn: getEnvBoolean(process.env.SHOW_CAPTION_BUTTON, true),
            showWhiteboardBtn: getEnvBoolean(process.env.SHOW_WHITEBOARD, true),
            showEditorBtn: getEnvBoolean(process.env.SHOW_EDITOR_BUTTON, true),
            showPollBtn: getEnvBoolean(process.env.SHOW_POLL_BUTTON, true),
            showBreakoutBtn: getEnvBoolean(process.env.SHOW_BREAKOUT_ROOM_BUTTON, true), // Presenters only, shown when breakoutRooms.enabled (BREAKOUT_ROOMS_ENABLED)
            showSnapshotRoomBtn: getEnvBoolean(process.env.SHOW_SNAPSHOT, true),
            showFileShareBtn: getEnvBoolean(process.env.SHOW_FILE_SHARE_BUTTON, true),
            showDocumentPipBtn: getEnvBoolean(process.env.SHOW_DOCUMENT_PIP, true),
            showAboutBtn: getEnvBoolean(process.env.SHOW_ABOUT, true), // Please keep me always true, Thank you!
        },
        chat: {
            showTogglePinBtn: getEnvBoolean(process.env.SHOW_CHAT_PIN, true),
            showMaxBtn: getEnvBoolean(process.env.SHOW_CHAT_MAXIMIZE, true),
            showSaveMessageBtn: getEnvBoolean(process.env.SHOW_CHAT_SAVE, true),
            showMarkDownBtn: getEnvBoolean(process.env.SHOW_CHAT_MARKDOWN, true),
            showGifBtn: getEnvBoolean(process.env.SHOW_CHAT_GIF, true), // Shown only when gifSearch (KLIPY) is enabled with an API key
            showChatGPTBtn: getEnvBoolean(process.env.CHATGPT_ENABLED, true),
            showFileShareBtn: getEnvBoolean(process.env.SHOW_CHAT_FILE_SHARE, true),
            showShareVideoAudioBtn: getEnvBoolean(process.env.SHOW_CHAT_SHARE_VIDEO_AUDIO, true),
            showParticipantsBtn: getEnvBoolean(process.env.SHOW_CHAT_PARTICIPANTS, true),
        },
        caption: {
            showTogglePinBtn: getEnvBoolean(process.env.SHOW_CAPTION_PIN, true),
            showMaxBtn: getEnvBoolean(process.env.SHOW_CAPTION_MAXIMIZE, true),
        },
        settings: {
            showActiveRoomsBtn: getEnvBoolean(process.env.SHOW_ROOMS, true),
            showMicOptionsBtn: getEnvBoolean(process.env.SHOW_MIC_OPTIONS, true),
            showTabRoomPeerName: getEnvBoolean(process.env.SHOW_TAB_ROOM_PEER_NAME, true),
            showTabRoomParticipants: getEnvBoolean(process.env.SHOW_TAB_ROOM_PARTICIPANTS, true),
            showTabRoomSecurity: getEnvBoolean(process.env.SHOW_TAB_ROOM_SECURITY, true),
            showTabEmailInvitation: getEnvBoolean(process.env.SHOW_EMAIL_INVITE, true),
            showCaptionEveryoneBtn: getEnvBoolean(process.env.SHOW_CAPTION_EVERYONE, true),
            showMuteEveryoneBtn: getEnvBoolean(process.env.SHOW_MUTE_EVERYONE, true),
            showHideEveryoneBtn: getEnvBoolean(process.env.SHOW_HIDE_EVERYONE, true),
            showStopScreenEveryoneBtn: getEnvBoolean(process.env.SHOW_STOP_SCREEN_EVERYONE, true),
            showEjectEveryoneBtn: getEnvBoolean(process.env.SHOW_EJECT_EVERYONE, true),
            showLockRoomBtn: getEnvBoolean(process.env.SHOW_LOCK_ROOM, true),
            showUnlockRoomBtn: getEnvBoolean(process.env.SHOW_UNLOCK_ROOM, true),
            showJoinLockBtn: getEnvBoolean(process.env.SHOW_JOIN_LOCK, true),
            showShortcutsBtn: getEnvBoolean(process.env.SHOW_KEYBOARD_SHORTCUTS, true),
            showRoomBackground: getEnvBoolean(process.env.SHOW_ROOM_BACKGROUND, true), // per-user image behind the video grid, stored only in the browser
            customNoiseSuppression: getEnvBoolean(process.env.CUSTOM_NOISE_SUPPRESSION_ENABLED, true),
            customNoiseSuppressionDefault: getEnvBoolean(process.env.CUSTOM_NOISE_SUPPRESSION_DEFAULT, true), // initial state, users can still toggle it
        },
        remote: {
            showAudioVolume: getEnvBoolean(process.env.SHOW_VOLUME_CONTROL, true),
            audioBtnClickAllowed: getEnvBoolean(process.env.REMOTE_AUDIO_BUTTON_CLICK_ALLOWED, true),
            videoBtnClickAllowed: getEnvBoolean(process.env.REMOTE_VIDEO_BUTTON_CLICK_ALLOWED, true),
            showVideoPipBtn: getEnvBoolean(process.env.ENABLE_PIP, true),
            showKickOutBtn: getEnvBoolean(process.env.SHOW_EJECT_BUTTON, true),
            showSnapShotBtn: getEnvBoolean(process.env.SHOW_SNAPSHOT_BUTTON, true),
            showFileShareBtn: getEnvBoolean(process.env.SHOW_SEND_FILE, true),
            showShareVideoAudioBtn: getEnvBoolean(process.env.SHOW_SEND_VIDEO, true),
            showGeoLocationBtn: getEnvBoolean(process.env.SHOW_GEO_LOCATION, true),
            showPrivateMessageBtn: getEnvBoolean(process.env.SHOW_SEND_MESSAGE, true),
            showZoomInOutBtn: getEnvBoolean(process.env.SHOW_ZOOM_BUTTON),
            showVideoFocusBtn: getEnvBoolean(process.env.SHOW_FOCUS_BUTTON, true),
        },
        local: {
            showVideoPipBtn: getEnvBoolean(process.env.ENABLE_PIP, true),
            showSnapShotBtn: getEnvBoolean(process.env.SHOW_SNAPSHOT_BUTTON, true),
            showVideoCircleBtn: getEnvBoolean(process.env.SHOW_VIDEO_CIRCLE_BUTTON, true),
            showZoomInOutBtn: getEnvBoolean(process.env.SHOW_ZOOM_BUTTON),
            showVideoFocusBtn: getEnvBoolean(process.env.SHOW_FOCUS_BUTTON, true),
        },
        whiteboard: {
            whiteboardLockBtn: getEnvBoolean(process.env.SHOW_WB_LOCK),
        },
    },
};
