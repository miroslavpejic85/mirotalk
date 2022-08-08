'use strict';

/**
 * Log colors
 */
const Log = {
    // action
    ac: {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        underscore: '\x1b[4m',
        blink: '\x1b[5m',
        reverse: '\x1b[7m',
        hidden: '\x1b[8m',
    },
    // Foreground (text) colors
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        crimson: '\x1b[38m',
    },
    // Background colors
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        crimson: '\x1b[48m',
    },
};
module.exports = class Logger {
    constructor(appName = 'miroTalkP2P', debugOn = true) {
        this.appName = Log.fg.yellow + appName + Log.ac.reset;
        this.debugOn = debugOn;
    }

    /**
     * Console debug logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    debug(msg, op = '') {
        if (this.debugOn) console.debug('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, op);
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
        return Log.fg.cyan + new Date().toISOString().replace(/T/, ' ').replace(/Z/, '') + Log.ac.reset;
    }
};
