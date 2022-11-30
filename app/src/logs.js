'use strict';

const util = require('util');

const colors = require('colors');

colors.enable(); //colors.disable();

const options = {
    depth: null,
    colors: true,
};
module.exports = class Logs {
    constructor(appName = 'miroTalkP2P', debugOn = true) {
        this.appName = colors.yellow(appName);
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
            '[' + this.getDataTime() + '] [' + this.appName + '] ' + colors.green(msg),
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
            '[' + this.getDataTime() + '] [' + this.appName + '] ' + colors.yellow(msg),
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
            '[' + this.getDataTime() + '] [' + this.appName + '] ' + colors.red(msg),
            util.inspect(op, options),
        );
    }

    /**
     * Get date time
     * @returns {string} date to ISO string
     */
    getDataTime() {
        return colors.cyan(new Date().toISOString().replace(/T/, ' ').replace(/Z/, ''));
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
        return colors.magenta('+' + time + type);
    }
};
