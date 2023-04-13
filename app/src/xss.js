'use strict';

const xss = require('xss');

/**
 * Prevent XSS injection by client side
 * @param {object} cfg
 * @returns sanitized object
 */
const checkXSS = (cfg) => {
    if (typeof cfg === 'object' && Object.keys(cfg).length > 0) {
        // Object to string and remove XSS injection
        const config = xss(JSON.stringify(cfg));
        // String sanitized to object
        return JSON.parse(config);
    }
    return xss(cfg);
};

module.exports = checkXSS;
