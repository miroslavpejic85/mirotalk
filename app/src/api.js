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

        const roomValue = room || uuidV4();
        const nameValue = name || 'User-' + this.getRandomNumber();
        const audioValue = audio || false;
        const videoValue = video || false;
        const screenValue = screen || false;
        const hideValue = hide || false;
        const notifyValue = notify || false;

        let jwtToken = '';

        if (token) {
            // JWT.io
            const { username, password, presenter, expire } = token;

            const usernameValue = username || 'username';
            const passwordValue = password || 'password';
            const presenterValue = String(presenter);
            const expireValue = expire || JWT_EXP;

            jwtToken =
                '&token=' +
                jwt.sign({ username: usernameValue, password: passwordValue, presenter: presenterValue }, JWT_KEY, {
                    expiresIn: expireValue,
                });
        }
        return (
            this.getProtocol() +
            this._host +
            '/join?room=' +
            roomValue +
            '&name=' +
            nameValue +
            '&audio=' +
            audioValue +
            '&video=' +
            videoValue +
            '&screen=' +
            screenValue +
            '&hide=' +
            hideValue +
            '&notify=' +
            notifyValue +
            jwtToken
        );
    }

    getProtocol() {
        return 'http' + (this._host.includes('localhost') ? '' : 's') + '://';
    }

    getRandomNumber() {
        return Math.floor(Math.random() * 999999);
    }
};
