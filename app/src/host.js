'use strict';

module.exports = class Host {
    constructor() {
        this.authorizedIPs = new Map();
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
