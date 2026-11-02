const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { buildRobotsTxt, buildSitemapXml, buildJsonLd } = require('../app/src/seo');
const HtmlInjector = require('../app/src/htmlInjector');

describe('test-seo', function () {
    const landing = path.join(__dirname, '../public/views/landing.html');
    const client = path.join(__dirname, '../public/views/client.html');

    function render(brand) {
        const injector = new HtmlInjector([landing], brand);
        let html = '';
        injector.injectHtml(landing, { headersSent: false, send: (body) => (html = body) });
        injector.cleanup();
        return html;
    }

    it('robots.txt disallows private pages and advertises the sitemap', () => {
        const txt = buildRobotsTxt('https://example.com/');
        assert.ok(txt.includes('Disallow: /join'));
        assert.ok(txt.includes('Sitemap: https://example.com/sitemap.xml'));
        assert.ok(!txt.includes('Disallow: /\n'));
    });

    it('robots.txt blocks everything for protected hosts', () => {
        const txt = buildRobotsTxt('https://example.com', { blockAll: true });
        assert.ok(txt.includes('Disallow: /\n'));
        assert.ok(!txt.includes('Sitemap:'));
    });

    it('sitemap lists only public pages under the configured base url', () => {
        const xml = buildSitemapXml('https://example.com/', new Date('2026-01-02T00:00:00Z'));
        assert.ok(xml.includes('<loc>https://example.com/</loc>'));
        assert.ok(xml.includes('<loc>https://example.com/privacy</loc>'));
        assert.ok(xml.includes('<lastmod>2026-01-02</lastmod>'));
        assert.ok(!xml.includes('/join'));
    });

    it('JSON-LD is valid JSON and cannot break out of the script tag', () => {
        const json = buildJsonLd({
            name: 'MiroTalk P2P',
            description: '</script><script>alert(1)</script>',
            url: 'https://example.com',
            image: 'https://example.com/i.png',
        });
        assert.ok(!json.includes('<'));
        const data = JSON.parse(json);
        assert.strictEqual(data['@graph'][1]['@type'], 'SoftwareApplication');
    });

    [true, false].forEach((htmlInjection) => {
        it(`landing page resolves SEO placeholders (htmlInjection=${htmlInjection})`, () => {
            const html = render({ htmlInjection, og: { url: 'https://example.com/' } });
            assert.ok(html.includes('<link rel="canonical" href="https://example.com/" />'));
            assert.ok(!/{{(CANONICAL_URL|JSON_LD)}}/.test(html));
            const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
            assert.strictEqual(blocks.length, 2);
            blocks.forEach((b) => JSON.parse(b[1]));
            assert.ok(html.includes('id="faq"') && html.includes('id="about"'));
        });
    });

    it('room pages are not indexable', () => {
        assert.ok(fs.readFileSync(client, 'utf8').includes('<meta name="robots" content="noindex, nofollow" />'));
    });
});
