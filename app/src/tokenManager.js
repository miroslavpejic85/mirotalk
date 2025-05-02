'use strict';

const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const Logger = require('./logs');

/**
 * Handles JWT signing and verification.
 */
class JWTService {
    /**
     * @param {string} secret - JWT secret key.
     * @param {string} algorithm - Signing algorithm (default: 'HS256').
     */
    constructor(secret, algorithm = 'HS256') {
        this.secret = secret;
        this.algorithm = algorithm;
    }

    /**
     * Signs a payload into a JWT token.
     * @param {Object} payload
     * @param {string|number} expiresIn - Expiration time (e.g., '1h', 3600).
     * @returns {string}
     */
    sign(payload, expiresIn) {
        return jwt.sign(payload, this.secret, {
            expiresIn,
            algorithm: this.algorithm,
        });
    }

    /**
     * Verifies a JWT token.
     * @param {string} token
     * @param {boolean} [ignoreExpiration=false]
     * @returns {Object}
     */
    verify(token, ignoreExpiration = false) {
        return jwt.verify(token, this.secret, {
            ignoreExpiration,
            algorithms: [this.algorithm],
            clockTolerance: 30,
        });
    }

    /**
     * Decodes a JWT token without verification.
     * @param {string} token
     * @returns {Object|null}
     */
    decode(token) {
        return jwt.decode(token);
    }
}

/**
 * Handles AES encryption and decryption.
 */
class EncryptionService {
    /**
     * @param {string} encryptionKey - Secret key for encryption/decryption.
     */
    constructor(encryptionKey) {
        this.encryptionKey = encryptionKey;
    }

    /**
     * Encrypts a payload using AES.
     * @param {any} payload
     * @param {string} [type=typeof payload]
     * @returns {{ encrypted: string, type: string }}
     */
    encrypt(payload, type = typeof payload) {
        const stringified = type === 'object' ? JSON.stringify(payload) : String(payload);
        return {
            encrypted: CryptoJS.AES.encrypt(stringified, this.encryptionKey).toString(),
            type,
        };
    }

    /**
     * Decrypts AES-encrypted data.
     * @param {{ encrypted: string, type: string }} encryptedPayload
     * @returns {any}
     */
    decrypt(encryptedPayload) {
        const { encrypted, type } = encryptedPayload;
        const bytes = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        if (!decrypted) throw new Error('Decryption failed');

        switch (type) {
            case 'object':
                return JSON.parse(decrypted);
            case 'number':
                return Number(decrypted);
            default:
                return decrypted;
        }
    }
}

/**
 * Compares payloads for token validation.
 */
class PayloadComparator {
    /**
     * Checks if actual matches expected payload.
     * @param {Object} expected
     * @param {Object} actual
     * @returns {boolean}
     */
    static match(expected, actual) {
        if (typeof expected === 'object') {
            return Object.keys(expected).every((key) => JSON.stringify(expected[key]) === JSON.stringify(actual[key]));
        }

        const value = actual?.value ?? actual;
        return String(value) === String(expected);
    }

    /**
     * Returns the difference between expected and actual payloads.
     * @param {Object} expected
     * @param {Object} actual
     * @returns {Object}
     */
    static diff(expected, actual) {
        const diff = {};
        Object.keys(expected).forEach((key) => {
            if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
                diff[key] = { expected: expected[key], actual: actual[key] };
            }
        });
        return diff;
    }
}

/**
 * TokenManager class that handles logs
 */
class TokenLogger {
    constructor(LoggerClass) {
        return new LoggerClass('TokenManager');
    }
}

/**
 * TokenManager class that handles token creation, validation, and decryption.
 */
class TokenManager {
    /**
     * @param {string} jwtSecret - Secret used for signing JWTs.
     * @param {string|number} defaultExpiry - Default token expiry (e.g., '24h').
     * @param {string} encryptionKey - Secret key for AES encryption.
     */
    constructor(jwtSecret, defaultExpiry = 24, encryptionKey) {
        this.jwtService = new JWTService(jwtSecret);
        this.encryptionService = new EncryptionService(encryptionKey);
        this.logger = new TokenLogger(Logger);
        this.defaultExpiry = defaultExpiry;
    }

    /**
     * Creates a JWT token, optionally encrypting the payload.
     * @param {any} payload
     * @param {boolean} [encode=false] - Whether to encrypt the payload.
     * @param {string|number} [expiresIn=defaultExpiry]
     * @returns {string}
     */
    create(payload, encode = false, expiresIn = this.defaultExpiry) {
        try {
            if (!payload && payload !== 0) throw new Error('Invalid payload');

            const expiry = this._normalizeExpiry(expiresIn);
            const data = encode
                ? this.encryptionService.encrypt(payload)
                : typeof payload === 'object'
                  ? payload
                  : { value: payload };

            return this.jwtService.sign(data, expiry);
        } catch (error) {
            this.logger.error('Token creation failed', error);
            throw error;
        }
    }

    /**
     * Validates a token and checks if payload matches.
     * @param {any} expectedPayload
     * @param {string} token
     * @param {boolean} [decode=false] - Whether to decrypt the token.
     * @param {boolean} [ignoreExpiry=false]
     * @returns {boolean}
     */
    validate(expectedPayload, token, decode = false, ignoreExpiry = false) {
        try {
            const decoded = this.jwtService.verify(token, ignoreExpiry);

            const payload = decode ? this.encryptionService.decrypt(decoded) : decoded;

            const isMatch = PayloadComparator.match(expectedPayload, payload);

            if (!isMatch) {
                this.logger.debug('Payload mismatch', {
                    expected: expectedPayload,
                    actual: payload,
                    diff: PayloadComparator.diff(expectedPayload, payload),
                });
            }

            return isMatch;
        } catch (error) {
            this.logger.error('Token validation failed', { error: error.message });
            return false;
        }
    }

    /**
     * Decodes and decrypts token payload if necessary.
     * @param {string} token
     * @returns {any|null}
     */
    decodePayload(token) {
        try {
            const decoded = this.jwtService.verify(token);
            return decoded?.encrypted ? this.encryptionService.decrypt(decoded) : decoded;
        } catch (error) {
            this.logger.error('Decode failed', { error: error.message });
            return null;
        }
    }

    /**
     * Extracts raw payload from a token without verification.
     * @param {string} token
     * @returns {any|null}
     */
    extractPayload(token) {
        try {
            const decoded = this.jwtService.decode(token);
            if (!decoded || decoded.encrypted) return null;

            return decoded.payload ?? decoded.value ?? decoded;
        } catch (err) {
            this.logger.error('Payload extraction failed', { error: err.message });
            return null;
        }
    }

    /**
     * Normalizes expiration format.
     * @private
     * @param {string|number} exp
     * @returns {string|number}
     */
    _normalizeExpiry(exp) {
        if (typeof exp === 'number' || (typeof exp === 'string' && /^(\d+|\d+\.\d+)[smhd]?$/i.test(exp))) {
            return exp;
        }

        this.logger.warn(`Invalid expiry "${exp}", defaulting to "24h"`);
        return '24h';
    }
}

module.exports = TokenManager;
