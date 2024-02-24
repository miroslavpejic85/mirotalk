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
        // Get data
        const { room, name, audio, video, screen, notify, hide, token } = data;

        const roomValue = room || uuidV4();
        const nameValue = name || 'User-' + this.getRandomNumber();
        const audioValue = audio || false;
        const videoValue = video || false;
        const screenValue = screen || false;
        const hideValue = hide || false;
        const notifyValue = notify || false;
        const jwtToken = token ? '&token=' + this.getToken(token) : '';

        const joinURL =
            this.getProtocol() +
            this._host +
            '/join?' +
            `room=${roomValue}` +
            `&name=${encodeURIComponent(nameValue)}` +
            `&audio=${audioValue}` +
            `&video=${videoValue}` +
            `&screen=${screenValue}` +
            `&hide=${hideValue}` +
            `&notify=${notifyValue}` +
            jwtToken;

        return joinURL;
    }

    getToken(token) {
        if (!token) return '';

        const { username = 'username', password = 'password', presenter = false, expire } = token;
        const expireValue = expire || JWT_EXP;
        const payload = {
            username: String(username),
            password: String(password),
            presenter: String(presenter),
        };
        const jwtToken = jwt.sign(payload, JWT_KEY, { expiresIn: expireValue });
        return jwtToken;
    }

    getProtocol() {
        return 'http' + (this._host.includes('localhost') ? '' : 's') + '://';
    }

    getRandomNumber() {
        return Math.floor(Math.random() * 999999);
    }
};
