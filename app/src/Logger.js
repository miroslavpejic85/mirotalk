'use strict';

const util = require('util');

const options = {
    depth: null,
    colors: true,
};

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
        this.timeStart = Date.now();
        this.timeEnd = null;
        this.timeElapsedMs = null;
    }

    /**
     * Console debug logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    debug(msg, op = '') {
        if (this.debugOn) {
            this.timeEnd = Date.now();
            this.timeElapsedMs = this.getFormatTime(Math.floor(this.timeEnd - this.timeStart));
            console.debug(
                '[' + this.getDataTime() + '] [' + this.appName + '] ' + msg,
                util.inspect(op, options),
                this.timeElapsedMs,
            );
            this.timeStart = Date.now();
        }
    }

    /**
     * Console logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    log(msg, op = '') {
        console.log('[' + this.getDataTime() + '] [' + this.appName + '] ' + msg, util.inspect(op, options));
    }

    /**
     * Console info logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    info(msg, op = '') {
        console.info(
            '[' + this.getDataTime() + '] [' + this.appName + '] ' + Log.fg.green + msg + Log.ac.reset,
            util.inspect(op, options),
        );
    }

    /**
     * Console warning logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    warn(msg, op = '') {
        console.info(
            '[' + this.getDataTime() + '] [' + this.appName + '] ' + Log.fg.yellow + msg + Log.ac.reset,
            util.inspect(op, options),
        );
    }

    /**
     * Console error logs
     * @param {string} msg message
     * @param {object} op optional params
     * @returns
     */
    error(msg, op = '') {
        console.info(
            '[' + this.getDataTime() + '] [' + this.appName + '] ' + Log.fg.red + msg + Log.ac.reset,
            util.inspect(op, options),
        );
    }

    /**
     * Get date time
     * @returns {string} date to ISO string
     */
    getDataTime() {
        return Log.fg.cyan + new Date().toISOString().replace(/T/, ' ').replace(/Z/, '') + Log.ac.reset;
    }

    /**
     * Get format time
     * @param {integer} ms
     * @returns formatted time
     */
    getFormatTime(ms) {
        let time = Math.floor(ms);
        let type = 'ms';

        if (ms >= 1000) {
            time = Math.floor((ms / 1000) % 60);
            type = 's';
        }
        if (ms >= 60000) {
            time = Math.floor((ms / 1000 / 60) % 60);
            type = 'm';
        }
        if (ms >= (3, 6e6)) {
            time = Math.floor((ms / 1000 / 60 / 60) % 24);
            type = 'h';
        }
        return Log.fg.magenta + '+' + time + type + Log.ac.reset;
    }
};
