'use strict';

require('should');
const { getJwtKeys, resolveJwtSecret, KNOWN_DEFAULT_SECRETS } = require('../app/src/jwtSecret');

describe('test-jwtSecret', () => {
    const strong = 'a'.repeat(32);

    it('rejects a missing secret', () => {
        (() => resolveJwtSecret(undefined)).should.throw(/not set/);
        (() => resolveJwtSecret('')).should.throw(/not set/);
    });

    it('rejects the published default secrets', () => {
        KNOWN_DEFAULT_SECRETS.forEach((secret) => {
            (() => resolveJwtSecret(secret)).should.throw(/publicly known/);
        });
    });

    it('rejects a short secret', () => {
        (() => resolveJwtSecret('short')).should.throw(/at least 32/);
    });

    it('accepts a strong secret', () => {
        resolveJwtSecret(strong).should.equal(strong);
    });

    it('derives distinct, deterministic keys per purpose', () => {
        const keys = getJwtKeys(strong);
        new Set([keys.sign, keys.encrypt, keys.mattermost]).size.should.equal(3);
        Object.values(keys).forEach((k) => k.should.not.equal(strong));
        getJwtKeys(strong).should.deepEqual(keys);
    });

    it('derives different keys for different secrets', () => {
        getJwtKeys(strong).sign.should.not.equal(getJwtKeys('b'.repeat(32)).sign);
    });
});
