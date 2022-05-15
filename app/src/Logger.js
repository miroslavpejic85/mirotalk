'use strict';

module.exports = class Logger {
    constructor(appName, debugOn = true) {
        if (appName) this.appName = appName;
        else this.appName = 'mirotalk';
        this.debugOn = debugOn;
    }

    /**
     * Console debug logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    debug(msg, op = '') {
        if (this.debugOn === false) return;
        console.debug('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, op);
    }

    /**
     * Console logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    log(msg, op = '') {
        console.log('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, op);
    }

    /**
     * Console info logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    info(msg, op = '') {
        console.info('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, op);
    }

    /**
     * Console warning logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    warn(msg, op = '') {
        console.warn('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, op);
    }

    /**
     * Console error logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    error(msg, op = '') {
        console.error('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, op);
    }

    /**
     * Get date time
     * @returns {string} date to ISO string
     */
    getDataTime() {
        return new Date().toISOString().replace(/T/, ' ').replace(/Z/, '');
    }
};
