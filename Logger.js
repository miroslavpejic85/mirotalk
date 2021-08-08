'use strict';

module.exports = class Logger {
    constructor(appName) {
        if (appName) this.appName = appName;
        else this.appName = 'mirotalk';
    }

    debug(msg, op = '') {
        let dataTime = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
        console.log('[' + dataTime + '] [' + this.appName + '] ' + msg, op);
    }

    warn(msg, op = '') {
        let dataTime = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
        console.warn('[' + dataTime + '] [' + this.appName + '] ' + msg, op);
    }

    error(msg, op = '') {
        let dataTime = new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
        console.error('[' + dataTime + '] [' + this.appName + '] ' + msg, op);
    }
};
