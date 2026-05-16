'use strict';

module.exports = class Host {
    constructor() {
        this.authorizedIPs = new Map();
    }

    /**
     * Get IP from req
     * @param {object} req
     * @returns string IP
     */
    getIP(req) {
        // Rely on Express's resolved req.ip which honours the configured
        // `trust proxy` setting. Reading X-Forwarded-For directly would let
        // any client spoof its source address.
        return req.ip || (req.socket && req.socket.remoteAddress);
    }

    /**
     * Get authorized IPs
     * @returns object
     */
    getAuthorizedIPs() {
        return Object.fromEntries(this.authorizedIPs);
    }

    /**
     * Set authorized IP
     * @param {string} ip
     * @param {boolean} authorized
     */
    setAuthorizedIP(ip, authorized) {
        this.authorizedIPs.set(ip, authorized);
    }

    /**
     * Check if IP is authorized
     * @param {string} ip
     * @returns boolean
     */
    isAuthorizedIP(ip) {
        return this.authorizedIPs.has(ip);
    }

    /**
     * Delete ip from authorized IPs
     * @param {string} ip
     * @returns boolean
     */
    deleteIP(ip) {
        return this.authorizedIPs.delete(ip);
    }
};
