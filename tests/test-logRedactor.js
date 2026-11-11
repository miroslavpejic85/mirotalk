'use strict';

const assert = require('assert');
const { redact, isSensitiveKey, REDACTED } = require('../app/src/logRedactor');

describe('logRedactor', () => {
    it('masks sensitive keys at any depth', () => {
        const out = redact({
            api_key_secret: 'mirotalkp2p_default_secret',
            ngrok: { enabled: true, token: 'ngrok-token' },
            host: { users: [{ username: 'admin', password: 'pw' }] },
            oidc: { config: { clientSecret: 'cs', clientID: 'id' } },
            email: { username: 'u', password: 'p', port: 587 },
            chatGPT: { apiKey: 'sk-123', model: 'gpt' },
            header: { authorization: 'Bearer x', cookie: 'a=b', host: 'localhost' },
        });
        assert.strictEqual(out.api_key_secret, REDACTED);
        assert.strictEqual(out.ngrok.token, REDACTED);
        assert.strictEqual(out.ngrok.enabled, true);
        assert.strictEqual(out.host.users[0].password, REDACTED);
        assert.strictEqual(out.host.users[0].username, 'admin');
        assert.strictEqual(out.oidc.config.clientSecret, REDACTED);
        assert.strictEqual(out.oidc.config.clientID, 'id');
        assert.strictEqual(out.email.password, REDACTED);
        assert.strictEqual(out.email.port, 587);
        assert.strictEqual(out.chatGPT.apiKey, REDACTED);
        assert.strictEqual(out.header.authorization, REDACTED);
        assert.strictEqual(out.header.cookie, REDACTED);
        assert.strictEqual(out.header.host, 'localhost');
    });

    it('masks socket join credentials', () => {
        const out = redact({ channel: 'room', channel_password: 'secret', peer_token: 'jwt', peer_name: 'bob' });
        assert.deepStrictEqual(out, {
            channel: 'room',
            channel_password: REDACTED,
            peer_token: REDACTED,
            peer_name: 'bob',
        });
    });

    it('keeps empty / boolean sensitive values visible', () => {
        const out = redact({ password: '', token: null, secret: false, apiKey: undefined });
        assert.deepStrictEqual(out, { password: '', token: null, secret: false, apiKey: undefined });
    });

    it('masks credentials embedded in URLs', () => {
        assert.strictEqual(redact('turn://user:pass@host:3478'), `turn://user:${REDACTED}@host:3478`);
        assert.strictEqual(redact({ url: 'https://a:b@x.com/p' }).url, `https://a:${REDACTED}@x.com/p`);
    });

    it('does not flag non-sensitive keys', () => {
        ['tokenExpire', 'max_tokens', 'username', 'keyboard', 'peer_uuid', 'host'].forEach((k) =>
            assert.strictEqual(isSensitiveKey(k), false, k)
        );
    });

    it('does not mutate input, handles cycles and leaves class instances alone', () => {
        const input = { password: 'p' };
        input.self = input;
        const err = new Error('boom');
        const out = redact({ input, err });
        assert.strictEqual(input.password, 'p');
        assert.strictEqual(out.input.password, REDACTED);
        assert.strictEqual(out.input.self, out.input);
        assert.strictEqual(out.err, err);
    });

    it('passes primitives through', () => {
        assert.strictEqual(redact(''), '');
        assert.strictEqual(redact(42), 42);
        assert.strictEqual(redact(undefined), undefined);
    });
});
