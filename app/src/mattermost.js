'use strict';

const { Client4 } = require('@mattermost/client');
const { v4: uuidV4 } = require('uuid');
const TokenManager = require('./tokenManager');
const Logger = require('./logs');
const log = new Logger('Mattermost');

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

class MattermostService {
    constructor(config) {
        this.validateConfig(config);

        this.token = config.token;
        this.serverUrl = config.server_url;
        this.username = config.username;
        this.password = config.password;
        this.disabledEndpoints = config.api_disabled || [];

        this.client = new Client4();
        this.client.setUrl(this.serverUrl);

        this.tokenService = new TokenService(
            this.token || 'fallback-secret-at-least-32-chars',
            config.roomTokenExpire || '15m',
            config.encryptionKey || 'fallback-encryption-key-32chars'
        );
    }

    validateConfig(config) {
        if (!config.enabled || !config.server_url || !config.token || !config.username || !config.password) {
            throw new Error('Invalid Mattermost configuration');
        }
    }

    async authenticate() {
        try {
            const user = await this.client.login(this.username, this.password);
            log.debug('Logged into Mattermost as', user.username);
        } catch (error) {
            log.error('Failed to log into Mattermost:', error);
        }
    }

    isEndpointDisabled(endpoint) {
        return this.disabledEndpoints.includes(endpoint);
    }

    createMeetingToken(userId) {
        const payload = {
            userId,
            roomId: uuidV4(),
            timestamp: Date.now(),
        };

        const token = this.tokenService.createToken(payload);
        return { token, payload };
    }

    validateToken(token) {
        return this.tokenService.decodeToken(token);
    }

    getMeetingURL(req, roomToken) {
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${host}/mattermost/join/${encodeURIComponent(roomToken)}`;
    }
}

class MattermostController {
    constructor(app, mattermostCfg, htmlInjector, clientHtml) {
        try {
            this.service = new MattermostService(mattermostCfg);
        } catch (error) {
            log.error('MattermostController disabled due to config error:', error.message);
            return;
        }

        this.htmlInjector = htmlInjector;
        this.clientHtml = clientHtml;
        this.app = app;
        this.token = mattermostCfg.token;

        this.service.authenticate();
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.post('/mattermost', (req, res) => {
            if (this.service.isEndpointDisabled('mattermost')) {
                return res.end('`This endpoint has been disabled`. Please contact the administrator.');
            }

            const { token, text, command, channel_id, user_id } = req.body;

            if (token !== this.token) {
                log.error('Invalid token attempt', { token });
                return res.status(403).send('Invalid token');
            }

            if (command?.trim() === '/p2p' || text?.trim() === '/p2p') {
                try {
                    const { token: roomToken } = this.service.createMeetingToken(user_id);
                    const meetingUrl = this.service.getMeetingURL(req, roomToken);

                    return res.json({
                        response_type: 'in_channel',
                        text: `🔗 [Click here to join your private meeting](${meetingUrl})`,
                        channel_id,
                    });
                } catch (error) {
                    log.error('Token creation failed', error);
                    return res.status(500).send('Error creating meeting');
                }
            }

            return res.status(404).send('Command not recognized');
        });

        this.app.get('/mattermost/join/:roomToken', (req, res) => {
            if (this.service.isEndpointDisabled('mattermost')) {
                return res.end('This endpoint has been disabled');
            }

            const { roomToken } = req.params;

            if (!roomToken) {
                return res.status(401).send('Token required');
            }

            try {
                const payload = this.service.validateToken(roomToken);
                log.debug('Decoded payload', payload);

                if (!payload || !payload.userId || !payload.roomId) {
                    log.error('Invalid or malformed token payload', payload);
                    return res.status(400).send('Invalid token');
                }

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
}

module.exports = MattermostController;
