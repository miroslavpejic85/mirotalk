'use strict';

(() => {
    // Component styles live in the Shadow DOM, so page CSS cannot leak in or be affected.
    // Colors follow the host page through --landing-* variables, with dark defaults.
    const styles = `
        :host {
            --switcher-bg: var(--landing-surface, #1d2026);
            --switcher-text: var(--landing-text, #f4f7fb);
            --switcher-muted: var(--landing-text-muted, #959cb1);
            --switcher-primary: var(--landing-primary, #376df9);
            --switcher-border: var(--landing-border, rgba(255, 255, 255, .1));
            position: relative;
            display: inline-flex;
            flex: 0 0 auto;
            font: inherit;
            color: var(--switcher-text);
            color-scheme: dark;
        }

        :host([hidden]) {
            display: none;
        }

        * {
            box-sizing: border-box;
        }

        [hidden] {
            display: none !important;
        }

        /* Trigger */
        button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 44px;
            height: 44px;
            padding: 0 10px;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            color: var(--switcher-muted);
            cursor: pointer;
        }

        .trigger-label {
            font-size: 14px;
            font-weight: 600;
        }

        button:hover,
        button[aria-expanded="true"] {
            background: rgba(70, 120, 249, .12);
            border-color: var(--switcher-border);
            color: var(--switcher-text);
        }

        svg {
            display: block;
            width: 22px;
            height: 22px;
            flex-shrink: 0;
        }

        button:focus-visible,
        a:focus-visible {
            outline: 2px solid var(--switcher-primary);
            outline-offset: 3px;
        }

        /* Panel */
        .panel {
            position: fixed;
            inset: auto;
            width: min(560px, calc(100vw - 24px));
            margin: 0;
            padding: 20px;
            overflow: auto;
            overscroll-behavior: contain;
            border: 1px solid var(--switcher-border);
            border-radius: 18px;
            background: var(--switcher-bg);
            color: var(--switcher-text);
            box-shadow: 0 24px 70px rgba(0, 0, 0, .45);
            font: inherit;
            line-height: 1.4;
            text-align: left;
        }

        .panel::backdrop {
            background: transparent;
        }

        .panel.fallback {
            z-index: 100;
        }

        h2 {
            margin: 0 0 4px;
            font-size: 18px;
            font-weight: 600;
            color: var(--switcher-text);
        }

        p {
            margin: 0 0 16px;
            font-size: 13px;
            color: var(--switcher-muted);
        }

        /* App grid */
        ul {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 0;
            padding: 0;
            list-style: none;
        }

        li:last-child:nth-child(odd) {
            grid-column: 1 / -1;
        }

        a {
            color: var(--switcher-text);
            text-decoration: none;
        }

        .app {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            height: 100%;
            min-height: 88px;
            padding: 12px;
            border: 1px solid transparent;
            border-radius: 12px;
            transition: background-color .18s ease, border-color .18s ease;
        }

        .app:hover {
            background: rgba(255, 255, 255, .05);
            border-color: var(--switcher-border);
        }

        .app[aria-current] {
            background: rgba(70, 120, 249, .12);
            border-color: var(--switcher-primary);
        }

        .icon {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(70, 120, 249, .14);
            color: #8aa9ff;
        }

        .name {
            display: block;
            font-size: 14px;
            font-weight: 600;
        }

        .description {
            display: block;
            margin-top: 3px;
            font-size: 12px;
            color: var(--switcher-muted);
        }

        .current {
            display: block;
            margin-top: 5px;
            font-size: 11px;
            font-weight: 600;
            color: #8aa9ff;
        }

        /* Documentation footer */
        .footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--switcher-border);
        }

        .docs {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 44px;
            padding: 0 12px;
            border-radius: 10px;
            color: var(--switcher-muted);
            font-size: 13px;
            font-weight: 600;
            transition: background-color .18s ease, color .18s ease;
        }

        .docs:hover {
            background: rgba(255, 255, 255, .05);
            color: var(--switcher-text);
        }

        .docs svg {
            width: 18px;
            height: 18px;
        }

        .docs .external {
            margin-left: auto;
            width: 14px;
            height: 14px;
        }

        @media (max-width: 640px) {
            button {
                width: 44px;
                padding: 10px;
            }

            .trigger-label {
                display: none;
            }
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
        }

        /* Responsive */
        @media (max-width: 480px) {
            .panel {
                padding: 16px;
            }

            ul {
                gap: 6px;
            }

            .app {
                flex-direction: column;
                gap: 8px;
                padding: 10px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .app,
            .docs {
                transition: none;
            }
        }
    `;

    const apps = [
        [
            'sfu',
            'SFU',
            'Scalable video meetings',
            'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
        ],
        ['p2p', 'P2P', 'Peer-to-peer video calls', 'm16 8 6-4v16l-6-4 M2 6h14v12H2z'],
        ['c2c', 'C2C', 'Simple one-to-one calls', 'M7 3H3v4c0 7.73 6.27 14 14 14h4v-4l-5-2-2 2a15 15 0 0 1-7-7l2-2z'],
        [
            'bro',
            'BRO',
            'Live video broadcasting',
            'M8.5 8.5a5 5 0 0 0 0 7 M15.5 8.5a5 5 0 0 1 0 7 M5 5a10 10 0 0 0 0 14 M19 5a10 10 0 0 1 0 14 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0',
        ],
        [
            'cme',
            'CME',
            'Click-to-call available users',
            'M9 9l5 12 1.8-5.2L21 14z M7.2 2.2 8 5.1 M5.1 8l-2.9-.8 M14 4.1 12 6 M6 12l-1.9 2',
        ],
        [
            'rnd',
            'RND',
            'Meet someone new',
            'M3 7h3c5 0 7 10 12 10h3 M18 14l3 3-3 3 M3 17h3c2 0 3-1 4-3 M14 10c1-2 2-3 4-3h3 M18 4l3 3-3 3',
        ],
        ['cloud', 'Cloud', 'Schedule and manage meetings', 'M7 18a5 5 0 1 1 1-9 7 7 0 0 1 13 3 3 3 0 0 1-1 6z'],
        // No public instance: links to its docs unless a self-hosted dashboard URL is configured.
        [
            'admin',
            'Admin',
            'Manage your MiroTalk servers',
            'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z M9 12l2 2 4-4',
            'https://docs.mirotalk.com/sites/admin/',
        ],
    ];

    const DEFAULT_DOCS_URL = 'https://docs.mirotalk.com/';
    // RND (18+ random video chat) and Admin (no public demo) are opt-in through the apps attribute.
    const OPT_IN_APPS = ['rnd', 'admin'];
    const DEFAULT_APPS = apps.filter(([id]) => !OPT_IN_APPS.includes(id));

    const icon = (path) =>
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

    const template = document.createElement('template');
    template.innerHTML = `
        <style>${styles}</style>
        <button type="button" aria-label="MiroTalk apps" title="MiroTalk apps" aria-expanded="false" aria-controls="apps">
            ${icon('M3 3h4v4H3z M10 3h4v4h-4z M17 3h4v4h-4z M3 10h4v4H3z M10 10h4v4h-4z M17 10h4v4h-4z M3 17h4v4H3z M10 17h4v4h-4z M17 17h4v4h-4z')}
            <span class="trigger-label">Apps</span>
        </button>
        <section id="apps" class="panel" popover="auto" aria-labelledby="apps-title" hidden>
            <h2 id="apps-title">MiroTalk apps</h2>
            <p>One ecosystem. More ways to connect.</p>
            <nav aria-label="MiroTalk applications">
                <ul></ul>
            </nav>
            <footer class="footer">
                <a class="docs" href="${DEFAULT_DOCS_URL}" target="_blank" rel="noopener noreferrer">
                    ${icon('M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M8 7h8')}
                    <span>Documentation</span>
                    <svg class="external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7 M8 7h9v9"/></svg>
                    <span class="sr-only">(opens in a new tab)</span>
                </a>
            </footer>
        </section>`;

    const DEFAULT_DOMAIN = 'mirotalk.com';
    const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/i;

    // Only http(s) links are allowed; relative values resolve against the current page.
    function toHttpUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            const url = new URL(value.trim(), location.href);
            return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
        } catch {
            return null;
        }
    }

    function parseUrls(value) {
        try {
            const urls = JSON.parse(value || '{}');
            return urls && typeof urls === 'object' && !Array.isArray(urls) ? urls : {};
        } catch {
            return {};
        }
    }

    class MiroTalkAppSwitcher extends HTMLElement {
        static get observedAttributes() {
            return ['active-app', 'domain', 'apps', 'urls', 'docs-url'];
        }

        constructor() {
            super();
            this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
            this.button = this.shadowRoot.querySelector('button');
            this.panel = this.shadowRoot.querySelector('.panel');
            this.list = this.shadowRoot.querySelector('ul');
            this.render();
            this.onOutsideClick = (event) => {
                if (!event.composedPath().includes(this)) this.close();
            };
            this.onFocus = (event) => {
                if (!event.composedPath().includes(this)) this.close();
            };
            this.onKeydown = (event) => {
                if (event.key === 'Escape' && this.isOpen) {
                    event.preventDefault();
                    this.close();
                    this.button.focus();
                }
            };
            this.onPosition = () => this.positionPanel();
            this.button.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
            this.panel.addEventListener('click', (event) => {
                if (event.target.closest('a')) this.close();
            });
            this.panel.addEventListener('toggle', (event) => {
                if (event.newState === 'closed') this.close();
            });
        }

        connectedCallback() {
            this.updateActiveApp();
            document.addEventListener('click', this.onOutsideClick);
            document.addEventListener('focusin', this.onFocus);
            document.addEventListener('keydown', this.onKeydown);
            window.addEventListener('resize', this.onPosition);
            window.addEventListener('scroll', this.onPosition, true);
        }

        disconnectedCallback() {
            this.close();
            document.removeEventListener('click', this.onOutsideClick);
            document.removeEventListener('focusin', this.onFocus);
            document.removeEventListener('keydown', this.onKeydown);
            window.removeEventListener('resize', this.onPosition);
            window.removeEventListener('scroll', this.onPosition, true);
        }

        attributeChangedCallback(name) {
            if (name === 'active-app') this.updateActiveApp();
            else this.render();
        }

        get isOpen() {
            return this.button.getAttribute('aria-expanded') === 'true';
        }

        get selectedApps() {
            const value = this.getAttribute('apps');
            if (!value || !value.trim()) return DEFAULT_APPS;
            const ids = [
                ...new Set(
                    value
                        .toLowerCase()
                        .split(',')
                        .map((id) => id.trim())
                ),
            ];
            return ids.map((id) => apps.find(([appId]) => appId === id)).filter(Boolean);
        }

        resolveUrl(id) {
            const override = toHttpUrl(parseUrls(this.getAttribute('urls'))[id]);
            if (override) return override;
            const defaultUrl = apps.find(([appId]) => appId === id)?.[4];
            if (defaultUrl) return new URL(defaultUrl);
            const domain = (this.getAttribute('domain') || '').trim();
            return new URL(`https://${id}.${DOMAIN_PATTERN.test(domain) ? domain : DEFAULT_DOMAIN}/`);
        }

        // Missing attribute keeps the official docs; an empty or invalid value hides the footer.
        renderDocs() {
            const docs = this.shadowRoot.querySelector('.docs');
            const url = this.hasAttribute('docs-url')
                ? toHttpUrl(this.getAttribute('docs-url'))
                : new URL(DEFAULT_DOCS_URL);
            if (url) docs.href = url.href;
            docs.parentElement.hidden = !url;
        }

        render() {
            this.renderDocs();
            const items = this.selectedApps.map(([id, name, description, path]) => {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.className = 'app';
                link.href = this.resolveUrl(id).href;
                link.dataset.app = id;
                link.innerHTML = `<span class="icon">${icon(path)}</span><span><span class="name"></span><span class="description"></span><span class="current" hidden>Current app</span></span>`;
                link.querySelector('.name').textContent = name;
                link.querySelector('.description').textContent = description;
                item.append(link);
                return item;
            });
            this.list.replaceChildren(...items);
            this.button.hidden = items.length === 0;
            if (!items.length) this.close();
            this.updateActiveApp();
        }

        // Explicit active-app wins; otherwise pick the app whose URL best matches the current page.
        detectActiveApp() {
            let match = null;
            let length = -1;
            this.list.querySelectorAll('a[data-app]').forEach((link) => {
                const url = new URL(link.href);
                if (url.origin === location.origin && location.pathname.startsWith(url.pathname)) {
                    if (url.pathname.length > length) {
                        match = link.dataset.app;
                        length = url.pathname.length;
                    }
                }
            });
            return match;
        }

        updateActiveApp() {
            if (!this.list) return;
            const active = this.getAttribute('active-app') ?? this.detectActiveApp();
            this.list.querySelectorAll('a[data-app]').forEach((link) => {
                const current = link.dataset.app === active;
                if (current) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
                link.querySelector('.current').hidden = !current;
            });
        }

        open() {
            this.panel.hidden = false;
            this.button.setAttribute('aria-expanded', 'true');
            if (typeof this.panel.showPopover === 'function') this.panel.showPopover();
            else {
                this.panel.removeAttribute('popover');
                this.panel.classList.add('fallback');
            }
            this.positionPanel();
            this.panel.querySelector('a')?.focus({ preventScroll: true });
        }

        close() {
            if (!this.isOpen) return;
            if (typeof this.panel.hidePopover === 'function' && this.panel.matches(':popover-open')) {
                this.panel.hidePopover();
            }
            this.button.setAttribute('aria-expanded', 'false');
            this.panel.hidden = true;
        }

        positionPanel() {
            if (!this.isOpen) return;
            const rect = this.button.getBoundingClientRect();
            const top = Math.max(12, Math.min(rect.bottom + 12, window.innerHeight - 100));
            const width = this.panel.getBoundingClientRect().width;
            this.panel.style.top = `${top}px`;
            this.panel.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
            this.panel.style.maxHeight = `${Math.max(76, window.innerHeight - top - 12)}px`;
        }
    }

    customElements.define('mirotalk-app-switcher', MiroTalkAppSwitcher);
})();
