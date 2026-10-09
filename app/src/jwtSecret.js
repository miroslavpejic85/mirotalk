'use strict';

const crypto = require('crypto');

const MIN_SECRET_LENGTH = 32;

// Values that were published in the source/templates and must never be accepted.
const KNOWN_DEFAULT_SECRETS = ['mirotalk_jwt_secret', 'mirotalkp2p_jwt_secret'];

// Each purpose gets an independent key derived from the master secret (HKDF), so signing,
// payload encryption and Mattermost tokens never share the same key material.
const PURPOSES = { sign: 'jwt-sign', encrypt: 'payload-encrypt', mattermost: 'mattermost-encrypt' };

let cached = null;

function validateSecret(secret) {
    if (!secret || typeof secret !== 'string') return 'JWT_KEY is not set';
    if (KNOWN_DEFAULT_SECRETS.includes(secret)) return 'JWT_KEY is set to a publicly known default value';
    if (secret.length < MIN_SECRET_LENGTH) return `JWT_KEY must be at least ${MIN_SECRET_LENGTH} characters long`;
    return null;
}

// Returns a usable master secret or throws; there is deliberately no insecure fallback.
function resolveJwtSecret(rawSecret) {
    const problem = validateSecret(rawSecret);
    if (problem) {
        throw new Error(`${problem}. Set a strong secret (e.g. "openssl rand -hex 32") in JWT_KEY.`);
    }
    return rawSecret;
}

function deriveKey(secret, purpose) {
    return Buffer.from(crypto.hkdfSync('sha256', secret, '', `mirotalkp2p:${purpose}`, 32)).toString('hex');
}

// Memoized so every module (server, api) signs and verifies with the same keys.
function getJwtKeys(rawSecret = process.env.JWT_KEY) {
    const secret = resolveJwtSecret(rawSecret);
    if (!cached || cached.secret !== secret) {
        cached = {
            secret,
            keys: Object.freeze({
                sign: deriveKey(secret, PURPOSES.sign),
                encrypt: deriveKey(secret, PURPOSES.encrypt),
                mattermost: deriveKey(secret, PURPOSES.mattermost),
            }),
        };
    }
    return cached.keys;
}

module.exports = {
    getJwtKeys,
    resolveJwtSecret,
    deriveKey,
    MIN_SECRET_LENGTH,
    KNOWN_DEFAULT_SECRETS,
    PURPOSES,
};
