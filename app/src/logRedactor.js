'use strict';

// Masks credentials in values passed to the Logger, so they never reach stdout/docker logs/log shippers.

const REDACTED = '***';
const MAX_DEPTH = 20;

// Matched against the key lowercased with '_' and '-' removed
const SENSITIVE_KEY_PATTERNS = [
    /pass(word|wd|phrase)?$/, // password, channel_password, peer_password, pass (smtp auth)
    /secret/, // secret, clientSecret, api_key_secret
    /token$/, // token, authToken, peer_token (not tokenExpire / max_tokens)
    /key(id)?$/, // key, apiKey, privateKey, x-api-key, accessKeyId
    /authorization$/, // authorization, proxy-authorization headers
    /cookie$/, // cookie, set-cookie
    /credentials?$/,
    /dsn$/,
];

// scheme://user:password@host -> scheme://user:***@host
const URL_CREDENTIALS_REGEX = /(\b[a-z][a-z0-9+.-]*:\/\/[^\s:/?#@]*:)[^\s/?#@]+@/gi;

function isSensitiveKey(key) {
    if (typeof key !== 'string') return false;
    const normalized = key.toLowerCase().replace(/[_-]/g, '');
    return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function redactString(value) {
    return value.replace(URL_CREDENTIALS_REGEX, `$1${REDACTED}@`);
}

function redactSensitiveValue(value, seen, depth) {
    // Keep "not set" and feature flags visible, they are useful when reading the config
    if (value === undefined || value === null || value === '' || typeof value === 'boolean') return value;
    if (Array.isArray(value) || isPlainObject(value)) return redactValue(value, seen, depth);
    return REDACTED;
}

function redactValue(value, seen = new WeakMap(), depth = 0) {
    if (typeof value === 'string') return redactString(value);
    if (depth > MAX_DEPTH) return value;

    // Only plain data is copied; class instances (Error, Map, ...) are left untouched for util.inspect
    if (Array.isArray(value)) {
        if (seen.has(value)) return seen.get(value);
        const copy = [];
        seen.set(value, copy);
        for (const item of value) copy.push(redactValue(item, seen, depth + 1));
        return copy;
    }

    if (isPlainObject(value)) {
        if (seen.has(value)) return seen.get(value);
        const copy = Object.create(Object.getPrototypeOf(value));
        seen.set(value, copy);
        for (const key of Object.keys(value)) {
            copy[key] = isSensitiveKey(key)
                ? redactSensitiveValue(value[key], seen, depth + 1)
                : redactValue(value[key], seen, depth + 1);
        }
        return copy;
    }

    return value;
}

module.exports = {
    REDACTED,
    isSensitiveKey,
    redact: (value) => redactValue(value),
};
