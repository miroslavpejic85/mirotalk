'use strict';

module.exports = class ServerApi {
    constructor(host, authorization, api_key_secret) {
        this._host = host;
        this._authorization = authorization;
        this._api_key_secret = api_key_secret;
    }

    /**
     * Check if user is authorized
     * @returns true/false
     */
    isAuthorized() {
        if (this._authorization != this._api_key_secret) return false;
        return true;
    }

    /**
     * Request meeting room endpoint
     * @returns  entrypoint / Room URL for your meeting.
     */
    getMeetingURL(uuid) {
        return 'http' + (this._host.includes('localhost') ? '' : 's') + '://' + this._host + '/join/' + uuid;
    }
};
