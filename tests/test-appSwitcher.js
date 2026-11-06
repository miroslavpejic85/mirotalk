'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../public/js/appSwitcher.js'), 'utf8');

describe('MiroTalk app switcher', () => {
    let dom;
    let window;
    let document;
    let switcher;
    let root;
    let button;
    let panel;

    beforeEach(() => {
        dom = new JSDOM(
            '<!doctype html><body><nav><a href="#about">About</a><mirotalk-app-switcher active-app="p2p"></mirotalk-app-switcher><a id="meeting" href="#roomName">Start a meeting</a></nav></body>',
            { url: 'https://p2p.mirotalk.com/', runScripts: 'outside-only' }
        );
        window = dom.window;
        document = window.document;
        window.eval(source);
        switcher = document.querySelector('mirotalk-app-switcher');
        root = switcher.shadowRoot;
        button = root.querySelector('button');
        panel = root.querySelector('.panel');
    });

    afterEach(() => dom.window.close());

    it('renders the six default destinations, each with a name, description and icon', () => {
        const links = [...root.querySelectorAll('a[data-app]')];
        assert.deepEqual(
            links.map((link) => link.href),
            ['sfu', 'p2p', 'c2c', 'bro', 'cme', 'cloud'].map((id) => `https://${id}.mirotalk.com/`)
        );
        assert.deepEqual(
            links.map((link) => link.querySelector('.name').textContent),
            ['SFU', 'P2P', 'C2C', 'BRO', 'CME', 'Cloud']
        );
        links.forEach((link) => {
            assert.ok(link.querySelector('.description').textContent.trim());
            assert.equal(link.querySelector('svg').getAttribute('aria-hidden'), 'true');
        });
        assert.equal(root.querySelector('[data-app="cme"] .description').textContent, 'Click-to-call available users');
    });

    it('starts collapsed and connects the accessible trigger to its panel', () => {
        assert.equal(button.getAttribute('aria-label'), 'MiroTalk apps');
        assert.equal(button.getAttribute('aria-controls'), panel.id);
        assert.equal(button.getAttribute('aria-expanded'), 'false');
        assert.equal(panel.hidden, true);
    });

    it('highlights only the current app, including on self-hosted deployments', () => {
        dom.reconfigure({ url: 'https://meet.example.org/' });
        assert.equal(root.querySelectorAll('[aria-current]').length, 1);
        assert.equal(root.querySelector('[aria-current]').dataset.app, 'p2p');
        assert.equal(root.querySelector('[data-app="p2p"] .current').hidden, false);
        assert.equal(root.querySelector('[data-app="sfu"] .current').hidden, true);
    });

    it('updates the active app when its attribute changes', () => {
        switcher.setAttribute('active-app', 'sfu');
        assert.equal(root.querySelector('[aria-current]').dataset.app, 'sfu');
        assert.equal(root.querySelectorAll('[aria-current]').length, 1);
        switcher.setAttribute('active-app', 'unknown');
        assert.equal(root.querySelectorAll('[aria-current]').length, 0);
    });

    it('infers the active app only from an exact official hostname when no attribute is set', () => {
        for (const id of ['sfu', 'p2p', 'c2c', 'bro', 'cme', 'cloud']) {
            dom.reconfigure({ url: `https://${id}.mirotalk.com/` });
            switcher.removeAttribute('active-app');
            switcher.updateActiveApp();
            assert.equal(root.querySelector('[aria-current]').dataset.app, id);
        }
        dom.reconfigure({ url: 'https://p2p.mirotalk.com.example.org/' });
        switcher.updateActiveApp();
        assert.equal(root.querySelectorAll('[aria-current]').length, 0);
    });

    it('opens without native popover support, focuses the first link and toggles closed', () => {
        button.click();
        assert.equal(panel.hidden, false);
        assert.equal(button.getAttribute('aria-expanded'), 'true');
        assert.equal(root.activeElement, root.querySelector('a'));
        button.click();
        assert.equal(panel.hidden, true);
        assert.equal(button.getAttribute('aria-expanded'), 'false');
    });

    it('dismisses on Escape and restores trigger focus', () => {
        button.click();
        root.querySelector('a').dispatchEvent(
            new window.KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                composed: true,
                cancelable: true,
            })
        );
        assert.equal(panel.hidden, true);
        assert.equal(root.activeElement, button);
    });

    it('keeps internal clicks open and dismisses outside clicks without preventing existing navigation', () => {
        button.click();
        root.querySelector('h2').click();
        assert.equal(panel.hidden, false);
        const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
        document.querySelector('a').dispatchEvent(event);
        assert.equal(panel.hidden, true);
        assert.equal(event.defaultPrevented, false);
        assert.equal(document.querySelector('a').getAttribute('href'), '#about');
        assert.equal(document.getElementById('meeting').getAttribute('href'), '#roomName');
    });

    it('dismisses when focus leaves and does not steal focus', () => {
        button.click();
        document.getElementById('meeting').focus();
        assert.equal(panel.hidden, true);
        assert.equal(document.activeElement.id, 'meeting');
    });

    it('does not prevent normal app link navigation', () => {
        button.click();
        let preventedBySwitcher;
        root.addEventListener('click', (event) => {
            preventedBySwitcher = event.defaultPrevented;
            event.preventDefault();
        });
        const event = new window.MouseEvent('click', { bubbles: true, composed: true, cancelable: true });
        const link = root.querySelector('a');
        link.dispatchEvent(event);
        assert.equal(preventedBySwitcher, false);
        assert.equal(panel.hidden, true);
    });

    it('cleans up listeners on removal and works after reconnection', () => {
        button.click();
        switcher.remove();
        assert.equal(panel.hidden, true);
        document.body.append(switcher);
        button.click();
        assert.equal(panel.hidden, false);
        document.getElementById('meeting').focus();
        assert.equal(panel.hidden, true);
    });

    it('supports independent reusable instances', () => {
        const other = document.createElement('mirotalk-app-switcher');
        other.setAttribute('active-app', 'cloud');
        document.body.append(other);
        assert.equal(other.shadowRoot.querySelector('[aria-current]').dataset.app, 'cloud');
        button.click();
        other.shadowRoot.querySelector('button').click();
        assert.equal(panel.hidden, true);
        assert.equal(other.shadowRoot.querySelector('.panel').hidden, false);
    });

    it('clamps the dropdown to a narrow viewport and limits its scrollable height', () => {
        window.innerWidth = 320;
        window.innerHeight = 568;
        button.getBoundingClientRect = () => ({ right: 300, bottom: 54 });
        panel.getBoundingClientRect = () => ({ width: 296 });
        button.click();
        assert.equal(panel.style.left, '12px');
        assert.equal(panel.style.top, '66px');
        assert.equal(panel.style.maxHeight, '490px');

        window.innerWidth = 768;
        window.innerHeight = 640;
        button.getBoundingClientRect = () => ({ right: 700, bottom: 62 });
        panel.getBoundingClientRect = () => ({ width: 560 });
        window.dispatchEvent(new window.Event('resize'));
        assert.equal(panel.style.left, '140px');
        assert.equal(panel.style.top, '74px');
        assert.equal(panel.style.maxHeight, '554px');
    });

    it('is included only in the landing navigation without replacing existing links', () => {
        const html = fs.readFileSync(path.join(__dirname, '../public/views/landing.html'), 'utf8');
        const landing = new JSDOM(html);
        const nav = landing.window.document.querySelector('.landing-nav');
        assert.equal(nav.querySelector('mirotalk-app-switcher').getAttribute('active-app'), 'p2p');
        assert.equal(nav.querySelector('#navAboutLink').getAttribute('href'), '#about');
        assert.equal(nav.querySelector('#startMeetingLink').getAttribute('href'), '#roomName');
        assert.equal(landing.window.document.querySelectorAll('script[src="../js/appSwitcher.js"]').length, 1);
        landing.window.close();
    });
});

describe('MiroTalk app switcher visibility config', () => {
    const root = path.join(__dirname, '..');
    const brandSource = fs.readFileSync(path.join(root, 'public/js/brand.js'), 'utf8');

    // Mirrors landing.html: starts hidden and brand.js runs before appSwitcher.js defines the element.
    async function renderWithBrand(serverBrand, inspect = (el) => el.hidden) {
        const dom = new JSDOM(
            '<!doctype html><body><nav><mirotalk-app-switcher id="appSwitcher" active-app="p2p" hidden></mirotalk-app-switcher></nav></body>',
            { url: 'https://p2p.mirotalk.com/', runScripts: 'outside-only' }
        );
        dom.window.sessionStorage.setItem('brandDataP2P', JSON.stringify(serverBrand));
        dom.window.console.log = () => {};
        dom.window.eval(brandSource);
        await new Promise((resolve) => setTimeout(resolve, 0));
        dom.window.eval(source);
        const result = inspect(dom.window.document.getElementById('appSwitcher'));
        dom.window.close();
        return result;
    }

    const hrefs = (el) => [...el.shadowRoot.querySelectorAll('a[data-app]')].map((link) => link.href);

    it('is hidden by default, including for older config.js files without the key', async () => {
        assert.equal(await renderWithBrand({}), true);
        assert.equal(await renderWithBrand({ html: { faq: true } }), true);
        assert.equal(await renderWithBrand({ html: { appSwitcher: false } }), true);
    });

    it('is shown only when brand.html.appSwitcher is true', async () => {
        assert.equal(await renderWithBrand({ html: { appSwitcher: true } }), false);
    });

    it('is opt-in through SHOW_APP_SWITCHER (default false)', () => {
        const template = fs.readFileSync(path.join(root, 'app/src/config.template.js'), 'utf8');
        const envTemplate = fs.readFileSync(path.join(root, '.env.template'), 'utf8');
        assert.match(template, /appSwitcher: getEnvBoolean\(process\.env\.SHOW_APP_SWITCHER\),/);
        assert.match(envTemplate, /^SHOW_APP_SWITCHER=false\b/m);
    });

    it('starts hidden in the landing markup so it never flashes before brand settings load', () => {
        const html = fs.readFileSync(path.join(root, 'public/views/landing.html'), 'utf8');
        const landing = new JSDOM(html);
        assert.equal(landing.window.document.getElementById('appSwitcher').hasAttribute('hidden'), true);
        landing.window.close();
    });

    it('lets the hidden attribute override the component display style', () => {
        const dom = new JSDOM('<!doctype html><body><mirotalk-app-switcher></mirotalk-app-switcher></body>', {
            runScripts: 'outside-only',
        });
        dom.window.eval(source);
        const sheet = dom.window.document
            .querySelector('mirotalk-app-switcher')
            .shadowRoot.querySelector('style').sheet;
        const rule = [...sheet.cssRules].find((cssRule) => cssRule.selectorText === ':host([hidden])');
        assert.equal(rule.style.display, 'none');
        dom.window.close();
    });

    it('keeps the official links when the server brand has no appSwitcher settings', async () => {
        assert.deepEqual(
            await renderWithBrand({}, hrefs),
            ['sfu', 'p2p', 'c2c', 'bro', 'cme', 'cloud'].map((id) => `https://${id}.mirotalk.com/`)
        );
    });

    it('applies server domain, app list and URL overrides before the element is upgraded', async () => {
        const result = await renderWithBrand(
            {
                appSwitcher: {
                    domain: 'example.org',
                    apps: ['cloud', 'sfu', 'p2p'],
                    urls: { sfu: 'https://meet.example.org/sfu', p2p: '' },
                },
            },
            (el) => ({ hrefs: hrefs(el), active: el.shadowRoot.querySelector('[aria-current]').dataset.app })
        );
        assert.deepEqual(result.hrefs, [
            'https://cloud.example.org/',
            'https://meet.example.org/sfu',
            'https://p2p.example.org/',
        ]);
        assert.equal(result.active, 'p2p');
    });

    it('passes the docs URL from brand settings, where an empty value hides the footer', async () => {
        const footer = (el) => ({
            hidden: el.shadowRoot.querySelector('.footer').hidden,
            href: el.shadowRoot.querySelector('.footer a').href,
        });
        assert.deepEqual(await renderWithBrand({}, footer), { hidden: false, href: 'https://docs.mirotalk.com/' });
        assert.deepEqual(await renderWithBrand({ appSwitcher: { docsUrl: 'https://help.example.org' } }, footer), {
            hidden: false,
            href: 'https://help.example.org/',
        });
        assert.equal((await renderWithBrand({ appSwitcher: { docsUrl: '' } }, footer)).hidden, true);
    });

    it('exposes domain, app list and per-app URLs through env vars with official defaults', () => {
        const template = fs.readFileSync(path.join(root, 'app/src/config.template.js'), 'utf8');
        const envTemplate = fs.readFileSync(path.join(root, '.env.template'), 'utf8');
        assert.match(template, /domain: process\.env\.APP_SWITCHER_DOMAIN \|\| 'mirotalk\.com'/);
        assert.match(template, /apps: process\.env\.APP_SWITCHER_APPS \|\| 'sfu,p2p,c2c,bro,cme,cloud'/);
        assert.match(envTemplate, /^APP_SWITCHER_DOMAIN=mirotalk\.com\b/m);
        assert.match(envTemplate, /^APP_SWITCHER_APPS=sfu,p2p,c2c,bro,cme,cloud\b/m);
        for (const id of ['SFU', 'P2P', 'C2C', 'BRO', 'CME', 'RND', 'CLOUD', 'ADMIN']) {
            assert.match(template, new RegExp(`${id.toLowerCase()}: process\\.env\\.APP_SWITCHER_${id}_URL \\|\\| ''`));
            assert.match(envTemplate, new RegExp(`^APP_SWITCHER_${id}_URL=`, 'm'));
        }
        assert.match(template, /docsUrl: process\.env\.APP_SWITCHER_DOCS_URL \?\? 'https:\/\/docs\.mirotalk\.com\/'/);
        assert.match(envTemplate, /^APP_SWITCHER_DOCS_URL=https:\/\/docs\.mirotalk\.com\/ /m);
    });
});

describe('MiroTalk app switcher link configuration', () => {
    function mount(attributes, url = 'https://meet.example.org/') {
        const dom = new JSDOM(
            `<!doctype html><body><mirotalk-app-switcher ${attributes}></mirotalk-app-switcher></body>`,
            {
                url,
                runScripts: 'outside-only',
            }
        );
        dom.window.eval(source);
        const el = dom.window.document.querySelector('mirotalk-app-switcher');
        const links = () => [...el.shadowRoot.querySelectorAll('a[data-app]')];
        return { dom, el, links };
    }

    it('builds links from a custom base domain, including a port', () => {
        const { dom, links } = mount('domain="example.org:8443"');
        assert.equal(links()[0].href, 'https://sfu.example.org:8443/');
        assert.equal(links().length, 6);
        dom.window.close();
    });

    it('falls back to mirotalk.com for an invalid domain', () => {
        const { dom, links } = mount('domain="evil.com/path?x=1"');
        assert.equal(links()[0].href, 'https://sfu.mirotalk.com/');
        dom.window.close();
    });

    it('shows only known apps from the list, in order and without duplicates', () => {
        const { dom, links } = mount('apps=" Cloud, sfu,unknown,sfu "');
        assert.deepEqual(
            links().map((link) => link.dataset.app),
            ['cloud', 'sfu']
        );
        dom.window.close();
    });

    it('hides the trigger when no known app is selected', () => {
        const { dom, el, links } = mount('apps="none"');
        assert.equal(links().length, 0);
        assert.equal(el.shadowRoot.querySelector('button').hidden, true);
        el.setAttribute('apps', 'p2p');
        assert.equal(links().length, 1);
        assert.equal(el.shadowRoot.querySelector('button').hidden, false);
        dom.window.close();
    });

    it('accepts http(s) and relative overrides but rejects unsafe or malformed ones', () => {
        const urls = JSON.stringify({
            sfu: 'https://video.example.org/sfu/',
            p2p: '/p2p/',
            c2c: 'javascript:alert(1)',
            bro: 'data:text/html,hi',
            cme: 42,
            cloud: 'http://[bad',
        }).replace(/"/g, '&quot;');
        const { dom, links } = mount(`domain="example.org" urls="${urls}"`);
        assert.deepEqual(
            links().map((link) => link.href),
            [
                'https://video.example.org/sfu/',
                'https://meet.example.org/p2p/',
                'https://c2c.example.org/',
                'https://bro.example.org/',
                'https://cme.example.org/',
                'https://cloud.example.org/',
            ]
        );
        dom.window.close();
    });

    it('ignores invalid urls JSON', () => {
        const { dom, links } = mount('urls="{not json"');
        assert.equal(links()[0].href, 'https://sfu.mirotalk.com/');
        dom.window.close();
    });

    it('detects the active app from custom domains and path-based URLs', () => {
        const urls = JSON.stringify({ sfu: 'https://example.org/', p2p: 'https://example.org/p2p/' }).replace(
            /"/g,
            '&quot;'
        );
        let mounted = mount(`domain="example.org" urls="${urls}"`, 'https://example.org/p2p/join/room');
        assert.equal(mounted.el.shadowRoot.querySelector('[aria-current]').dataset.app, 'p2p');
        mounted.dom.window.close();

        mounted = mount(`domain="example.org" urls="${urls}"`, 'https://example.org/sfu-room');
        assert.equal(mounted.el.shadowRoot.querySelector('[aria-current]').dataset.app, 'sfu');
        mounted.dom.window.close();

        mounted = mount('domain="example.org"', 'https://cloud.example.org/dashboard');
        assert.equal(mounted.el.shadowRoot.querySelector('[aria-current]').dataset.app, 'cloud');
        mounted.dom.window.close();
    });

    it('re-renders when configured at runtime and keeps names as text', () => {
        const { dom, el, links } = mount('');
        el.setAttribute('domain', 'example.org');
        el.setAttribute('urls', JSON.stringify({ cloud: 'https://app.example.org' }));
        assert.equal(links()[0].href, 'https://sfu.example.org/');
        assert.equal(links()[5].href, 'https://app.example.org/');
        assert.equal(links()[5].querySelector('.name').textContent, 'Cloud');
        dom.window.close();
    });

    it('keeps RND out of the defaults but allows it as an explicit opt-in', () => {
        let mounted = mount('');
        assert.equal(mounted.el.shadowRoot.querySelector('[data-app="rnd"]'), null);
        mounted.dom.window.close();

        const urls = JSON.stringify({ rnd: 'https://chat.example.org/' }).replace(/"/g, '&quot;');
        mounted = mount(`domain="example.org" apps="p2p,rnd" urls="${urls}"`);
        assert.deepEqual(
            mounted.links().map((link) => [link.dataset.app, link.href]),
            [
                ['p2p', 'https://p2p.example.org/'],
                ['rnd', 'https://chat.example.org/'],
            ]
        );
        mounted.dom.window.close();
    });

    it('keeps Admin opt-in, linking to its docs unless a dashboard URL is set', () => {
        let mounted = mount('');
        assert.equal(mounted.el.shadowRoot.querySelector('[data-app="admin"]'), null);
        mounted.dom.window.close();

        mounted = mount('domain="example.org" apps="p2p,admin"');
        assert.equal(mounted.links()[1].href, 'https://docs.mirotalk.com/sites/admin/');
        assert.equal(mounted.links()[1].querySelector('.name').textContent, 'Admin');
        mounted.dom.window.close();

        const urls = JSON.stringify({ admin: 'https://admin.example.org/' }).replace(/"/g, '&quot;');
        mounted = mount(`apps="admin" urls="${urls}"`);
        assert.equal(mounted.links()[0].href, 'https://admin.example.org/');
        mounted.dom.window.close();
    });

    it('shows a documentation footer that opens safely in a new tab', () => {
        const { dom, el } = mount('');
        const docs = el.shadowRoot.querySelector('.footer a');
        assert.equal(docs.closest('.footer').hidden, false);
        assert.equal(docs.href, 'https://docs.mirotalk.com/');
        assert.equal(docs.target, '_blank');
        assert.equal(docs.rel, 'noopener noreferrer');
        assert.match(docs.textContent, /Documentation/);
        assert.match(docs.textContent, /opens in a new tab/);
        assert.equal(docs.hasAttribute('data-app'), false);
        dom.window.close();
    });

    it('uses a custom docs URL and hides the footer when it is empty or unsafe', () => {
        const { dom, el } = mount('docs-url="https://help.example.org/"');
        const footer = el.shadowRoot.querySelector('.footer');
        assert.equal(footer.querySelector('a').href, 'https://help.example.org/');
        el.setAttribute('docs-url', '');
        assert.equal(footer.hidden, true);
        el.setAttribute('docs-url', 'javascript:alert(1)');
        assert.equal(footer.hidden, true);
        el.removeAttribute('docs-url');
        assert.equal(footer.hidden, false);
        assert.equal(footer.querySelector('a').href, 'https://docs.mirotalk.com/');
        dom.window.close();
    });
});
