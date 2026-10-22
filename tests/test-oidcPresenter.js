'use strict';

// npx mocha tests/test-oidcPresenter.js

require('should');

const { isOidcConfiguredPresenter } = require('../app/src/oidcPresenter');

describe('test-oidcPresenter', () => {
    const list = ['admin', 'Alice@Example.com', 'auth0|12345'];

    it('matches a verified email case-insensitively', () => {
        isOidcConfiguredPresenter({ email: 'alice@example.com', email_verified: true }, list).should.be.true();
    });

    it('matches an email when the provider omits email_verified', () => {
        isOidcConfiguredPresenter({ email: 'alice@example.com' }, list).should.be.true();
    });

    it('rejects an unverified email', () => {
        isOidcConfiguredPresenter({ email: 'alice@example.com', email_verified: false }, list).should.be.false();
        isOidcConfiguredPresenter({ email: 'alice@example.com', email_verified: 'false' }, list).should.be.false();
    });

    it('matches the sub exactly (case-sensitive)', () => {
        isOidcConfiguredPresenter({ sub: 'auth0|12345' }, list).should.be.true();
        isOidcConfiguredPresenter({ sub: 'AUTH0|12345' }, list).should.be.false();
    });

    it('matches the sub even when the email is unverified', () => {
        isOidcConfiguredPresenter({ sub: 'auth0|12345', email: 'x@y.z', email_verified: false }, list).should.be.true();
    });

    it('never matches the display name', () => {
        isOidcConfiguredPresenter({ name: 'admin', nickname: 'admin' }, list).should.be.false();
    });

    it('rejects users not in the list and empty/invalid inputs', () => {
        isOidcConfiguredPresenter({ email: 'bob@example.com', sub: 'other' }, list).should.be.false();
        isOidcConfiguredPresenter({ email: '', sub: '' }, ['']).should.be.false();
        isOidcConfiguredPresenter(null, list).should.be.false();
        isOidcConfiguredPresenter({ email: 'alice@example.com' }, []).should.be.false();
        isOidcConfiguredPresenter({ email: 'alice@example.com' }, undefined).should.be.false();
    });

    it('matches any authenticated OIDC user with the wildcard entry', () => {
        isOidcConfiguredPresenter({ sub: 'auth0|anyone' }, ['*']).should.be.true();
        isOidcConfiguredPresenter({ sub: 'auth0|anyone', email: 'x@example.com' }, ['host', '*']).should.be.true();
        isOidcConfiguredPresenter({ email: 'x@example.com' }, ['*']).should.be.false();
        isOidcConfiguredPresenter({ sub: '' }, ['*']).should.be.false();
        isOidcConfiguredPresenter(null, ['*']).should.be.false();
    });
});
