'use strict';

const { Client4 } = require('@mattermost/client');
const { v4: uuidV4 } = require('uuid');
const TokenManager = require('./tokenManager');
const Logger = require('./logs');
const log = new Logger('Mattermost');

// Token operations
class TokenService {
    constructor(secret, expiresIn, encryptionKey) {
        this.tokenManager = new TokenManager(secret, expiresIn, encryptionKey);
    }

    createToken(payload) {
        return this.tokenManager.create(payload, true);
    }

    decodeToken(token) {
        return this.tokenManager.decodePayload(token);
    }
}

// Mattermost authentication
class MattermostAuthService {
    constructor({ serverUrl, username, password }) {
        this.client = new Client4();
        this.client.setUrl(serverUrl);
        this.username = username;
        this.password = password;
    }

    async login() {
        try {
            const user = await this.client.login(this.username, this.password);
            log.debug('Logged into Mattermost as', user.username);
        } catch (error) {
            log.error('Failed to log into Mattermost:', error);
        }
    }
}

// Meeting-related operations
class MeetingService {
    constructor(tokenService, serverUrl, disabledEndpoints = [], secure = false) {
        this.tokenService = tokenService;
        this.serverUrl = serverUrl;
        this.disabledEndpoints = disabledEndpoints;
        this.secure = secure;
    }

    isEndpointDisabled(endpoint) {
        return this.disabledEndpoints.includes(endpoint);
    }

    createTokenPayload(userId) {
        return {
            userId,
            roomId: uuidV4(),
            timestamp: Date.now(),
        };
    }

    createMeetingURL(req) {
        return `${this.getBaseURL(req)}/join/${uuidV4()}`;
    }

    createSecureMeetingURL(req, userId) {
        const payload = this.createTokenPayload(userId);
        const token = this.tokenService.createToken(payload);
        return {
            url: `${this.getBaseURL(req)}/mattermost/join/${encodeURIComponent(token)}`,
            payload,
        };
    }

    decodeToken(token) {
        return this.tokenService.decodeToken(token);
    }

    getBaseURL(req) {
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${host}`;
    }
}

// Just handles routing and delegates everything
class MattermostController {
    constructor(app, config, htmlInjector, clientHtml) {
        try {
            this.validateConfig(config);

            const tokenService = new TokenService(
                config.token || 'fallback-secret-at-least-32-chars',
                config.roomTokenExpire || '15m',
                config.encryptionKey || 'fallback-encryption-key-32chars',
            );

            this.authService = new MattermostAuthService({
                serverUrl: config.server_url,
                username: config.username,
                password: config.password,
            });

            this.meetingService = new MeetingService(
                tokenService,
                config.server_url,
                config.api_disabled,
                config.security,
            );

            this.token = config.token;
            this.app = app;
            this.htmlInjector = htmlInjector;
            this.clientHtml = clientHtml;

            this.authService.login();
            this.setupRoutes();
        } catch (error) {
            log.error('MattermostController disabled due to config error:', error.message);
        }
    }

    validateConfig(cfg) {
        if (!cfg.enabled || !cfg.server_url || !cfg.token || !cfg.username || !cfg.password) {
            throw new Error('Invalid Mattermost configuration');
        }
    }

    setupRoutes() {
        this.app.post('/mattermost', (req, res) => {
            if (this.meetingService.isEndpointDisabled('mattermost')) {
                return res.end('`This endpoint has been disabled`. Please contact the administrator.');
            }

            const { token, text, command, channel_id, user_id } = req.body;
            if (token !== this.token) {
                log.error('Invalid token attempt', { token });
                return res.status(403).send('Invalid token');
            }

            if (this.isP2PCommand(command, text)) {
                try {
                    const meetingUrl = this.generateMeetingUrl(req, user_id);
                    const message = this.getMeetingResponseMessage(meetingUrl);

                    return res.json({
                        response_type: 'in_channel',
                        text: message,
                        channel_id,
                    });
                } catch (error) {
                    log.error('Meeting creation failed', { error, user_id });
                    return res.status(500).json({ error: 'Failed to create meeting' });
                }
            }

            return res.status(404).send('Command not recognized');
        });

        this.app.get('/mattermost/join/:roomToken', (req, res) => {
            if (this.meetingService.isEndpointDisabled('mattermost')) {
                return res.end('This endpoint has been disabled');
            }

            const { roomToken } = req.params;

            if (!roomToken) {
                return res.status(401).send('Token required');
            }

            try {
                const payload = this.meetingService.decodeToken(roomToken);
                if (!payload || !payload.userId || !payload.roomId) {
                    log.error('Invalid or malformed token payload', payload);
                    return res.status(400).send('Invalid token');
                }

                log.debug('Decoded payload', payload);
                return this.htmlInjector.injectHtml(this.clientHtml, res);
            } catch (error) {
                log.error('Token processing error', {
                    error: error.message,
                    token: roomToken.substring(0, 20) + '...',
                });
                return res.status(500).send('Error processing token');
            }
        });
    }

    isP2PCommand(command, text) {
        const normalizedCommand = command?.trim();
        const normalizedText = text?.trim();
        return normalizedCommand === '/p2p' || normalizedText === '/p2p';
    }

    generateMeetingUrl(req, userId) {
        if (this.meetingService.secure) {
            return this.meetingService.createSecureMeetingURL(req, userId).url;
        }
        return this.meetingService.createMeetingURL(req);
    }

    getMeetingResponseMessage(meetingUrl) {
        return this.meetingService.secure
            ? `🔒 [Join your secure private meeting](${meetingUrl})`
            : `🌐 Join meeting: ${meetingUrl}`;
    }
}

module.exports = MattermostController;
