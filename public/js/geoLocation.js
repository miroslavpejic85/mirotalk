'use strict';

/**
 * NotificationService
 * Handles all user notifications and popups related to geolocation actions.
 * @class
 */
class NotificationService {
    /**
     * @param {Object} options
     * @param {Object} options.Swal - SweetAlert2 instance.
     * @param {string} options.swBg - Background color for Swal.
     * @param {Object} options.images - Images object containing geoLocation image.
     * @param {Function} options.playSound - Function to play notification sounds.
     */
    constructor({ Swal, swBg, images, playSound }) {
        this.Swal = Swal;
        this.swalBackground = swBg;
        this.image = images.geoLocation;
        this.playSound = playSound;
    }

    /**
     * Show a progress popup with a timer.
     * @param {string} title
     * @param {string} message
     * @param {number} timeout - Duration in ms.
     * @param {string} [icon='success']
     */
    showProgress(title, message, timeout, icon = 'success') {
        this.Swal.fire({
            allowOutsideClick: false,
            background: this.swalBackground,
            icon,
            title,
            html: message,
            timer: timeout,
            timerProgressBar: true,
            didOpen: () => {
                this.Swal.showLoading();
            },
        });
    }

    /**
     * Show a confirmation popup asking the user to share their location.
     * @param {string} from_peer_name - Name of the peer requesting location.
     * @returns {Promise<Object>} Swal result promise.
     */
    showConfirmLocation(from_peer_name) {
        this.playSound('notify');
        return this.Swal.fire({
            allowOutsideClick: false,
            allowEscapeKey: false,
            background: this.swalBackground,
            imageUrl: this.image,
            position: 'center',
            title: 'Geo Location',
            html: `Would you like to share your location to ${from_peer_name}?`,
            showDenyButton: true,
            confirmButtonText: `Yes`,
            denyButtonText: `No`,
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        });
    }

    /**
     * Show a popup asking the user if they want to open a peer's geolocation.
     * @param {string} peer_name - Name of the peer whose location is shared.
     * @returns {Promise<Object>} Swal result promise.
     */
    showOpenLocation(peer_name) {
        this.playSound('notify');
        return this.Swal.fire({
            allowOutsideClick: false,
            allowEscapeKey: false,
            background: this.swalBackground,
            imageUrl: this.image,
            position: 'center',
            title: 'Geo Location',
            html: `Would you like to open ${peer_name} geolocation?`,
            showDenyButton: true,
            confirmButtonText: `Yes`,
            denyButtonText: `No`,
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        });
    }
}

/**
 * GeoService
 * Static utility for accessing browser geolocation.
 * @class
 */
class GeoService {
    /**
     * Get the current position using the browser's geolocation API.
     * @param {Function} success - Success callback.
     * @param {Function} error - Error callback.
     * @param {PositionOptions} [options] - Geolocation options.
     */
    static getCurrentPosition(success, error, options = {}) {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(success, error, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
                ...options,
            });
        } else {
            error({ code: 'NOT_SUPPORTED' });
        }
    }
}

/**
 * PeerGeoLocation
 * Handles all peer-to-peer geolocation request/response logic.
 * @class
 */
class PeerGeoLocation {
    /**
     * @param {Object} options
     * @param {string} options.room_id - Room identifier.
     * @param {string} options.peer_name - Local peer name.
     * @param {string} options.peer_id - Local peer ID.
     * @param {string} options.peer_uuid - Local peer UUID.
     * @param {Function} options.sendToServer - Function to send data to the server.
     * @param {Function} options.msgPopup - Function to show message popups.
     * @param {NotificationService} options.notificationService - Notification service instance.
     * @param {GeoService} options.geoService - Geolocation service instance.
     * @param {Function} options.openURL - Function to open URLs.
     */
    constructor({
        room_id,
        peer_name,
        peer_id,
        peer_uuid,
        sendToServer,
        msgPopup,
        notificationService,
        geoService,
        openURL,
    }) {
        this.room_id = room_id;
        this.peer_name = peer_name;
        this.peer_id = peer_id;
        this.peer_uuid = peer_uuid;
        this.sendToServer = sendToServer;
        this.msgPopup = msgPopup;
        this.notificationService = notificationService;
        this.geoService = geoService;
        this.openURL = openURL;
        this._geoResponded = {}; // Guard for each request
    }

    /**
     * Generate a unique request key for each geo request.
     * @param {string} requester_peer_id
     * @returns {string}
     */
    _makeRequestKey(requester_peer_id) {
        // You can use timestamp or a random string for uniqueness
        return `${requester_peer_id}:${Date.now()}:${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Show a progress popup for peer actions.
     * @param {string} title
     * @param {string} message
     * @param {number} timeout
     * @param {string} [action='na']
     */
    peerActionProgress(title, message, timeout, action = 'na') {
        const icon = action === 'eject' ? 'warning' : 'success';
        this.notificationService.showProgress(title, message, timeout, icon);
    }

    /**
     * Send a geolocation request to a peer.
     * @param {string} to_peer_id - The peer to request location from.
     */
    askPeerGeoLocation(to_peer_id) {
        this.sendToServer('cmd', {
            action: 'geoLocation',
            send_to_all: false,
            data: {
                room_id: this.room_id,
                peer_name: this.peer_name,
                peer_id: this.peer_id,
                peer_uuid: this.peer_uuid,
                to_peer_id: to_peer_id,
                request_id: this._makeRequestKey(this.peer_id), // Add unique request id
            },
        });
        this.peerActionProgress(
            'Geolocation',
            'Geolocation requested. Please wait for confirmation...',
            6000,
            'geolocation'
        );
    }

    /**
     * Send a geolocation response (OK or KO) to the requester.
     * @param {string} requester_peer_id - The peer who requested location.
     * @param {string} action - 'geoLocationOK' or 'geoLocationKO'.
     * @param {Object|null} geoLocation - Geolocation data or null.
     * @param {string|boolean} [error=false] - Error message or false.
     * @param {string} [request_id] - Unique request id.
     */
    sendPeerGeoLocation(requester_peer_id, action, geoLocation = null, error = false, request_id = null) {
        this.sendToServer('cmd', {
            action: action,
            send_to_all: false,
            data: {
                room_id: this.room_id,
                peer_name: this.peer_name,
                peer_id: this.peer_id,
                peer_uuid: this.peer_uuid,
                to_peer_id: requester_peer_id,
                geoLocation,
                request_id,
            },
            error,
        });
    }

    /**
     * Prompt the user to confirm sharing their location.
     * @param {Object} data - Data from the geoLocation request.
     */
    confirmPeerGeoLocation(data) {
        const request_id = data.request_id || this._makeRequestKey(data.peer_id);
        if (this._geoResponded[request_id]) return;
        this._geoResponded[request_id] = false;
        this.notificationService.showConfirmLocation(data.peer_name).then((result) => {
            if (result.isConfirmed) {
                this.getPeerGeoLocation(data.peer_id, request_id);
            } else {
                this.denyPeerGeoLocation(data.peer_id, request_id);
            }
        });
    }

    /**
     * Request the user's geolocation and send the result.
     * @param {string} requester_peer_id - The peer who requested location.
     * @param {string} request_id - Unique request id.
     */
    getPeerGeoLocation(requester_peer_id, request_id) {
        this.geoService.getCurrentPosition(
            (position) => this.handleGeoLocationSuccess(requester_peer_id, position, request_id),
            (error) => this.handleGeoLocationError(requester_peer_id, error, request_id)
        );
    }

    /**
     * Handle successful geolocation retrieval.
     * @param {string} requester_peer_id
     * @param {Object} position
     * @param {string} request_id
     */
    handleGeoLocationSuccess(requester_peer_id, position, request_id) {
        if (this._geoResponded[request_id]) return;
        this._geoResponded[request_id] = true;
        setTimeout(() => {
            delete this._geoResponded[request_id];
        }, 60000); // Cleanup after 1 min
        const geoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        this.sendPeerGeoLocation(requester_peer_id, 'geoLocationOK', geoLocation, false, request_id);
    }

    /**
     * Handle geolocation errors.
     * @param {string} requester_peer_id
     * @param {Object} error
     * @param {string} request_id
     */
    handleGeoLocationError(requester_peer_id, error, request_id) {
        console.error('GeoLocation Error:', error);
        if (this._geoResponded[request_id]) return;
        this._geoResponded[request_id] = true;
        setTimeout(() => {
            delete this._geoResponded[request_id];
        }, 60000); // Cleanup after 1 min
        let geoError;
        switch (error.code) {
            case error.PERMISSION_DENIED:
                geoError = 'User denied the request for Geolocation';
                break;
            case error.POSITION_UNAVAILABLE:
                geoError = 'Location information is unavailable';
                break;
            case error.TIMEOUT:
                geoError = 'The request to get user location timed out';
                break;
            case error.UNKNOWN_ERROR:
                geoError = 'An unknown error occurred';
                break;
            case 'NOT_SUPPORTED':
                geoError = 'Geolocation is not supported by this browser';
                break;
            default:
                geoError = 'Geolocation error';
                break;
        }
        this.sendPeerGeoLocation(requester_peer_id, 'geoLocationKO', null, geoError, request_id);
        this.msgPopup('warning', geoError, 'top-end', 5000);
    }

    /**
     * Send a denial response for geolocation sharing.
     * @param {string} requester_peer_id
     * @param {string} request_id
     */
    denyPeerGeoLocation(requester_peer_id, request_id) {
        if (this._geoResponded[request_id]) return;
        this._geoResponded[request_id] = true;
        setTimeout(() => {
            delete this._geoResponded[request_id];
        }, 60000); // Cleanup after 1 min
        this.sendPeerGeoLocation(
            requester_peer_id,
            'geoLocationKO',
            null,
            `${this.peer_name}: Has declined permission for geolocation`,
            request_id
        );
    }

    /**
     * Handle receiving a peer's geolocation response.
     * @param {Object} config - The command config received from the server.
     */
    handleGeoPeerLocation(config) {
        if (config.error) {
            this.msgPopup('warning', config.error, 'top-end', 5000);
            return;
        }
        if (!config.data || !config.data.geoLocation) {
            this.msgPopup('warning', 'Geolocation data is not available', 'top-end', 5000);
            return;
        }
        const geoLocation = config.data.geoLocation;
        this.notificationService.showOpenLocation(config.data.peer_name).then((result) => {
            if (result.isConfirmed) {
                this.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${geoLocation.latitude},${geoLocation.longitude}`,
                    true
                );
            }
        });
    }
}
