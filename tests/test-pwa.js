const assert = require('assert');
const path = require('path');

const { buildWebManifest, buildServiceWorker } = require('../app/src/pwa');
const HtmlInjector = require('../app/src/htmlInjector');

function render(file, brand) {
    const injector = new HtmlInjector([file], brand);
    let html = '';
    try {
        injector.injectHtml(file, { headersSent: false, send: (body) => (html = body) });
    } finally {
        injector.cleanup();
    }
    return html;
}

describe('test-pwa', function () {
    const landing = path.join(__dirname, '../public/views/landing.html');
    const client = path.join(__dirname, '../public/views/client.html');

    it('manifest is installable with defaults (standalone, root scope, 192/512 + maskable icons)', () => {
        const manifest = buildWebManifest({});
        assert.strictEqual(manifest.name, 'MiroTalk');
        assert.strictEqual(manifest.short_name, 'MiroTalk');
        assert.strictEqual(manifest.display, 'standalone');
        assert.strictEqual(manifest.start_url, '/');
        assert.strictEqual(manifest.scope, '/');
        const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}:${i.type}`);
        assert.deepStrictEqual(sizes, ['192x192:any:image/png', '512x512:any:image/png', '512x512:maskable:image/png']);
    });

    it('manifest follows brand settings and strips HTML from them', () => {
        const manifest = buildWebManifest({
            htmlInjection: true,
            app: { name: 'Acme <b>Meet</b>', description: '<h1>Calls</h1> for teams', language: 'it' },
            pwa: { shortName: 'Acme', themeColor: '#ff0000', backgroundColor: 'red;}', icon512: '/logo.svg' },
        });
        assert.strictEqual(manifest.name, 'Acme Meet');
        assert.strictEqual(manifest.short_name, 'Acme');
        assert.strictEqual(manifest.description, 'Calls for teams');
        assert.strictEqual(manifest.lang, 'it');
        assert.strictEqual(manifest.theme_color, '#ff0000');
        assert.strictEqual(manifest.background_color, '#0d0e12');
        assert.deepStrictEqual(manifest.icons[1], {
            src: '/logo.svg',
            sizes: 'any',
            purpose: 'any',
            type: 'image/svg+xml',
        });
    });

    it('manifest ignores brand settings when brand html injection is disabled', () => {
        const manifest = buildWebManifest({ htmlInjection: false, app: { name: 'Acme' }, pwa: { shortName: 'A' } });
        assert.strictEqual(manifest.name, 'MiroTalk');
        assert.strictEqual(manifest.short_name, 'MiroTalk');
    });

    it('service worker carries the app version, or unregisters itself when the PWA is disabled', () => {
        const { version } = require('../package.json');
        const sw = buildServiceWorker({});
        assert.ok(sw.includes('`${CACHE_PREFIX}-' + version + '`'));
        assert.ok(!sw.includes('__APP_VERSION__'));
        const disabled = buildServiceWorker({ pwa: { enabled: false } });
        assert.ok(disabled.includes('self.registration.unregister()'));
        assert.ok(!disabled.includes("addEventListener('fetch'"));
    });

    for (const enabled of [true, false]) {
        it(`pages ${enabled ? 'link' : 'omit'} the manifest and service worker when enabled=${enabled}`, () => {
            for (const htmlInjection of [true, false]) {
                for (const file of [landing, client]) {
                    const html = render(file, { htmlInjection, pwa: { enabled } });
                    assert.strictEqual(html.includes('<link rel="manifest" href="/manifest.webmanifest" />'), enabled);
                    assert.strictEqual(html.includes('src="../js/pwa.js"'), enabled);
                    assert.ok(!html.includes('PWA_START') && !html.includes('PWA_END'));
                }
            }
        });
    }
});
