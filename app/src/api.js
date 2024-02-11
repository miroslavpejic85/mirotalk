'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidV4 } = require('uuid');

const JWT_KEY = process.env.JWT_KEY || 'mirotalk_jwt_secret';
const JWT_EXP = process.env.JWT_EXP || '1h';

module.exports = class ServerApi {
    constructor(host = null, authorization = null, api_key_secret = null) {
        this._host = host;
        this._authorization = authorization;
        this._api_key_secret = api_key_secret;
    }

    isAuthorized() {
        if (this._authorization != this._api_key_secret) return false;
        return true;
    }

    getMeetingURL() {
        return this.getProtocol() + this._host + '/join/' + uuidV4();
    }

    getJoinURL(data) {
        // Get data...
        const { room, name, audio, video, screen, hide, notify, token } = data;

        let jwtToken = '';

        if (token) {
            const { username, password, presenter, expire } = token;
            jwtToken =
                '&token=' +
                jwt.sign({ username: username, password: password, presenter: presenter }, JWT_KEY, {
                    expiresIn: expire ? expire : JWT_EXP,
                });
        }
        return (
            this.getProtocol() +
            this._host +
            '/join?room=' +
            room +
            '&name=' +
            name +
            '&audio=' +
            audio +
            '&video=' +
            video +
            '&screen=' +
            screen +
            '&hide=' +
            hide +
            '&notify=' +
            notify +
            jwtToken
        );
    }

    getProtocol() {
        return 'http' + (this._host.includes('localhost') ? '' : 's') + '://';
    }
};
