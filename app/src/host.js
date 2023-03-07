'use strict';

const Logs = require('./logs');
const log = new Logs('Host');

module.exports = class Host {
    constructor(ip, authorized) {
        this.auth = new Map();
        this.auth.set(ip, authorized);
        //log.debug('AUTH ---> ', this.auth.get(ip));
    }
    isAuthorized(ip) {
        return this.auth.has(ip);
    }
    deleteIP(ip) {
        return this.auth.delete(ip);
    }
};
