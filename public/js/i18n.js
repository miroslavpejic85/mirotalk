'use strict';

/**
 * MiroTalk P2P - Optional native (human) translation for the in-room UI.
 *
 * When a native language file exists at `public/lang/<lang>.json` for the configured
 * UI language, it is used to translate the in-room UI and the Google Translate widget
 * is skipped (see translate.js). When no native file exists, the existing runtime
 * machine translation (Google) remains untouched.
 *
 * Namespaces (see public/lang/README.md):
 *   - tooltips : tippy tooltips (setTippy)
 *   - buttons  : text/attributes on <button> elements in the static HTML
 *   - labels   : all other static HTML text and title/placeholder/aria-label attributes
 *   - dialogs  : SweetAlert (Swal.fire) titles, buttons, placeholders and body text
 *   - toasts   : snackbar/toast notifications (userLog / toastMessage / msgPopup)
 *
 * Keys within each namespace are the original English source strings. Missing keys
 * fall back to the original English text (the Google widget is not re-enabled).
 *
 * @link    GitHub: https://github.com/miroslavpejic85/mirotalk
 * @license AGPLv3
 */

(function () {
    const LANG_PATH = '../lang/';

    // Flag + native name shown in the in-room Language settings when native mode is active.
    const LANG_DISPLAY = {
        en: { flag: '🇬🇧', name: 'English' },
        hu: { flag: '🇭🇺', name: 'Magyar' },
        es: { flag: '🇪🇸', name: 'Español' },
        fr: { flag: '🇫🇷', name: 'Français' },
        de: { flag: '🇩🇪', name: 'Deutsch' },
        pt: { flag: '🇵🇹', name: 'Português' },
        it: { flag: '🇮🇹', name: 'Italiano' },
        ru: { flag: '🇷🇺', name: 'Русский' },
        zh: { flag: '🇨🇳', name: '中文' },
        ja: { flag: '🇯🇵', name: '日本語' },
        ar: { flag: '🇸🇦', name: 'العربية' },
        hi: { flag: '🇮🇳', name: 'हिन्दी' },
        sr: { flag: '🇷🇸', name: 'Српски' },
        id: { flag: '🇮🇩', name: 'Bahasa Indonesia' },
        ko: { flag: '🇰🇷', name: '한국어' },
        tr: { flag: '🇹🇷', name: 'Türkçe' },
    };

    const ATTR_KEYS = ['title', 'placeholder', 'aria-label', 'data-tippy-content'];

    // Elements whose text content must never be translated.
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);

    const state = {
        native: false,
        dict: null,
        lang: 'en',
        mode: 'google',
        googleActive: false,
    };

    const NS_ORDER = ['tooltips', 'buttons', 'labels', 'dialogs', 'toasts'];

    const OVERRIDE_KEY = 'uiLanguageOverride';

    /**
     * Resolve a translation for a given source string within a namespace.
     */
    function lookup(key, namespace) {
        const table = state.dict && state.dict[namespace];
        if (table) {
            const value = table[key];
            if (typeof value === 'string' && value.length > 0 && value !== key) return value;
        }
        return null;
    }

    /**
     * Translate a source string. Preserves surrounding whitespace of the original.
     */
    function translate(text, namespace) {
        if (!state.native || typeof text !== 'string' || text.length === 0) return text;
        const key = text.trim();
        if (key.length === 0) return text;
        // Preferred namespace first (keeps context-specific translations like "Cancel"),
        // then fall back across the others so a string is still translated if it exists elsewhere.
        let value = lookup(key, namespace);
        if (value === null) {
            for (const ns of NS_ORDER) {
                if (ns === namespace) continue;
                value = lookup(key, ns);
                if (value !== null) break;
            }
        }
        return value !== null ? text.replace(key, value) : text;
    }

    // Public API used by translate.js and (optionally) other scripts.
    window.i18n = {
        /**
         * Resolves once the native decision is made.
         * @returns {Promise<boolean>} true if native mode is active.
         */
        ready: null,
        t: translate,
        isNative: () => state.native,
        getLang: () => state.lang,
        googleAllowed: true,
    };

    // ####################################################
    // HOOKS (choke points) - no continuous DOM observer
    // ####################################################

    let hookRetries = 0;

    function wrapTippy() {
        if (typeof window.tippy !== 'function') return false; // not loaded yet, retry
        if (window.tippy.__i18nWrapped) return true;
        const original = window.tippy;
        const wrapped = function (targets, options) {
            let source = null;
            if (options && typeof options.content === 'string') {
                source = options.content;
                options = Object.assign({}, options, { content: translate(options.content, 'tooltips') });
            }
            const inst = original(targets, options);
            // Remember the original content so a live language switch can re-translate the tooltip.
            if (source != null && inst) {
                const list = Array.isArray(inst) ? inst : [inst];
                for (const it of list) if (it) it.__i18nSrc = source;
            }
            return inst;
        };
        // Preserve tippy's static helpers (setDefaultProps, delegate, hideAll, ...).
        Object.assign(wrapped, original);
        wrapped.__i18nWrapped = true;
        window.tippy = wrapped;
        return true;
    }

    function wrapSwal() {
        if (typeof window.Swal === 'undefined' || !window.Swal) return false; // not loaded yet, retry
        if (window.Swal.__i18nWrapped) return true;
        const Swal = window.Swal;
        // Keep the original unbound so `this` is preserved for Swal.mixin(...) subclasses
        // (toasts use Swal.mixin({toast:true,...}).fire(); binding to Swal would drop their params).
        const originalFire = Swal.fire;
        const SCALAR_FIELDS = [
            'title',
            'titleText',
            'text',
            'confirmButtonText',
            'cancelButtonText',
            'denyButtonText',
            'inputPlaceholder',
            'footer',
        ];
        Swal.fire = function (...args) {
            const options = args[0];
            if (options && typeof options === 'object' && !Array.isArray(options)) {
                for (const field of SCALAR_FIELDS) {
                    if (typeof options[field] === 'string') {
                        options[field] = translate(options[field], 'dialogs');
                    }
                }
                // Translate the rendered popup text nodes (covers `html` bodies safely).
                const userDidOpen = options.didOpen;
                options.didOpen = function (popup) {
                    try {
                        translateTree(popup, 'dialogs');
                    } catch (err) {
                        console.warn('i18n Swal didOpen error', err.message);
                    }
                    if (typeof userDidOpen === 'function') userDidOpen(popup);
                };
            }
            return originalFire.apply(this, args);
        };
        Swal.__i18nWrapped = true;
        return true;
    }

    // Toasts/snackbars are plain top-level functions in client.js (userLog / toastMessage / msgPopup).
    // They build Swal.mixin({toast:true}).fire() instances that bypass the wrapped Swal.fire,
    // so wrap the functions themselves and translate their message under the 'toasts' namespace.
    function wrapToasts() {
        if (typeof window.userLog === 'function' && !window.userLog.__i18nWrapped) {
            const original = window.userLog;
            const wrapped = function (type, message, ...rest) {
                const translated = typeof message === 'string' ? translate(message, 'toasts') : message;
                return original.call(this, type, translated, ...rest);
            };
            wrapped.__i18nWrapped = true;
            window.userLog = wrapped;
        }
        if (typeof window.toastMessage === 'function' && !window.toastMessage.__i18nWrapped) {
            const original = window.toastMessage;
            const wrapped = function (icon, title, html, ...rest) {
                const t2 = typeof title === 'string' ? translate(title, 'toasts') : title;
                const h2 = typeof html === 'string' ? translate(html, 'toasts') : html;
                return original.call(this, icon, t2, h2, ...rest);
            };
            wrapped.__i18nWrapped = true;
            window.toastMessage = wrapped;
        }
        if (typeof window.msgPopup === 'function' && !window.msgPopup.__i18nWrapped) {
            const original = window.msgPopup;
            const wrapped = function (icon, message, ...rest) {
                const m2 = typeof message === 'string' ? translate(message, 'toasts') : message;
                return original.call(this, icon, m2, ...rest);
            };
            wrapped.__i18nWrapped = true;
            window.msgPopup = wrapped;
        }
        // client.js declares these later; report ready only once at least userLog exists.
        return typeof window.userLog === 'function';
    }

    function installHooks() {
        // Evaluate all so an early-ready hook installs even if another lib is still loading.
        const tippyOk = wrapTippy();
        const swalOk = wrapSwal();
        const toastsOk = wrapToasts();
        if (!(tippyOk && swalOk && toastsOk) && hookRetries < 50) {
            hookRetries++;
            setTimeout(installHooks, 100);
        }
    }

    // ####################################################
    // STATIC DOM PASS (one-time, structure-preserving)
    // ####################################################

    function namespaceFor(node) {
        const parent = node.parentElement;
        if (!parent) return 'labels';
        if (parent.closest('[data-tippy-root], .tippy-box')) return 'tooltips';
        if (parent.closest('button, [role="button"]')) return 'buttons';
        return 'labels';
    }

    function shouldSkip(element) {
        if (!element) return false;
        if (SKIP_TAGS.has(element.tagName)) return true;
        if (element.classList && element.classList.contains('notranslate')) return true;
        if (element.getAttribute && element.getAttribute('translate') === 'no') return true;
        if (element.hasAttribute && element.hasAttribute('data-i18n-skip')) return true;
        return false;
    }

    function translateAttributes(element) {
        const ns = element.closest('[data-tippy-root], .tippy-box')
            ? 'tooltips'
            : element.closest('button, [role="button"]')
              ? 'buttons'
              : 'labels';
        for (const attr of ATTR_KEYS) {
            const current = element.getAttribute(attr);
            if (typeof current !== 'string' || current.trim().length === 0) continue;
            // Keep the original value so switching language can re-translate from English.
            const prop = '__i18nAttr_' + attr;
            const source = element[prop] != null ? element[prop] : current;
            const next = translate(source, ns);
            if (next !== current) {
                if (element[prop] == null) element[prop] = source;
                element.setAttribute(attr, next);
            }
        }
    }

    function translateTextNode(node) {
        const parent = node.parentElement;
        if (!parent || shouldSkip(parent)) return;
        if (parent.closest('.notranslate, [translate="no"], [data-i18n-skip]')) return;
        const source = node.__i18nSrc != null ? node.__i18nSrc : node.nodeValue;
        const next = translate(source, namespaceFor(node));
        if (next !== node.nodeValue) {
            if (node.__i18nSrc == null) node.__i18nSrc = source;
            node.nodeValue = next;
        }
    }

    function translateTree(root, forcedNamespace) {
        if (!root) return;
        // Attributes on the root and its descendants.
        const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [];
        for (const el of elements) {
            if (shouldSkip(el)) continue;
            translateAttributes(el);
        }
        // Text nodes.
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (!node.nodeValue || node.nodeValue.trim().length === 0) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent || shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
                if (parent.closest('.notranslate, [translate="no"], [data-i18n-skip]')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const nodes = [];
        let current;
        while ((current = walker.nextNode())) nodes.push(current);
        for (const node of nodes) {
            if (forcedNamespace) {
                const parent = node.parentElement;
                const ns = parent && parent.closest('button, [role="button"]') ? 'buttons' : forcedNamespace;
                const source = node.__i18nSrc != null ? node.__i18nSrc : node.nodeValue;
                const next = translate(source, ns);
                if (next !== node.nodeValue) {
                    if (node.__i18nSrc == null) node.__i18nSrc = source;
                    node.nodeValue = next;
                }
            } else {
                translateTextNode(node);
            }
        }
    }

    function applyStatic() {
        translateTree(document.body);
    }

    // Translate content added after load (device menus, chat list, participant menus, tooltips).
    // Structure-preserving: only text-node values and known attributes change, so no observer loop
    // (characterData/attributes are not observed) and no broken event handlers.
    let observer = null;

    function installObserver() {
        if (observer || typeof MutationObserver === 'undefined' || !document.body) return;
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    try {
                        if (node.nodeType === Node.ELEMENT_NODE) translateTree(node);
                        else if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
                    } catch (err) {
                        console.warn('i18n observer error', err.message);
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Update already-created tippy tooltips to the current language (uses recorded originals).
    function refreshTooltips() {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
            const inst = el._tippy;
            if (inst && inst.__i18nSrc != null && typeof inst.setContent === 'function') {
                try {
                    inst.setContent(translate(inst.__i18nSrc, 'tooltips'));
                } catch (err) {
                    /* ignore */
                }
            }
        }
    }

    // Live language switch (no reload): load the dict, then re-translate the page from stored originals.
    async function applyLanguage(lang) {
        state.lang = lang;
        try {
            if (lang === configLang()) localStorage.removeItem(OVERRIDE_KEY);
            else localStorage.setItem(OVERRIDE_KEY, lang);
        } catch (e) {
            console.warn('i18n: cannot persist language choice', e.message);
        }

        if (lang === 'en') {
            state.native = false;
            state.dict = null;
        } else {
            try {
                const response = await fetch(`${LANG_PATH}${encodeURIComponent(lang)}.json`, { cache: 'no-cache' });
                const data = response.ok ? await response.json() : null;
                if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                    state.dict = data;
                    state.native = true;
                } else {
                    state.native = false;
                    state.dict = null;
                }
            } catch (error) {
                console.warn(`i18n: cannot load "${lang}"`, error.message);
                state.native = false;
                state.dict = null;
            }
        }

        translateTree(document.body);
        refreshTooltips();
    }

    function getOverride() {
        try {
            return localStorage.getItem(OVERRIDE_KEY);
        } catch (e) {
            return null;
        }
    }

    // brand is declared with `let` in brand.js (shared global lexical binding, not window.brand).
    function getBrand() {
        try {
            return typeof brand !== 'undefined' && brand ? brand : {};
        } catch (e) {
            return {};
        }
    }

    function configLang() {
        const b = getBrand();
        return (b.app && b.app.language) || 'en';
    }

    // translationMode (via config.brand.app.translationMode): auto | native | google.
    // Backward compatible: if unset/absent, use Google machine translation (pre-native behavior).
    function configMode() {
        const b = getBrand();
        const m = b.app && b.app.translationMode;
        return m === 'native' || m === 'auto' || m === 'google' ? m : 'google';
    }

    // Per-browser override (set via the in-room picker) wins over the server language.
    function resolveLang() {
        const override = getOverride();
        if (override && (override === 'en' || LANG_DISPLAY[override])) return override;
        return configLang();
    }

    // In-room language picker (human-translated languages + English). Switches live without reload.
    function renderLanguageSelect(current) {
        const container = document.getElementById('tabLanguages');
        if (!container || document.getElementById('i18nLanguageSelect')) return;
        const select = document.createElement('select');
        select.id = 'i18nLanguageSelect';
        select.className = 'form-select text-light bg-dark notranslate';
        select.style.cssText = 'max-width:280px;margin-top:4px;';

        let matched = false;
        for (const code of Object.keys(LANG_DISPLAY)) {
            const info = LANG_DISPLAY[code];
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${info.flag} ${info.name}`;
            if (code === current) {
                opt.selected = true;
                matched = true;
            }
            select.appendChild(opt);
        }
        // Reflect a machine-translated (non-native) language if that is the current one.
        if (!matched) {
            const opt = document.createElement('option');
            opt.value = current;
            opt.textContent = `🌐 ${current}`;
            opt.selected = true;
            select.appendChild(opt);
        }
        // Always offer the server default language so a saved override can be reset back to it.
        const cfg = configLang();
        if (cfg !== 'en' && !LANG_DISPLAY[cfg] && cfg !== current) {
            const opt = document.createElement('option');
            opt.value = cfg;
            opt.textContent = `🌐 ${cfg}`;
            select.appendChild(opt);
        }

        select.addEventListener('change', () => {
            const chosen = select.value;
            // Machine-translated (non-native) languages need a page load for Google; native/English switch live.
            const needsGoogle = chosen !== 'en' && !LANG_DISPLAY[chosen];
            if (state.googleActive || needsGoogle) {
                try {
                    if (chosen === configLang()) localStorage.removeItem(OVERRIDE_KEY);
                    else localStorage.setItem(OVERRIDE_KEY, chosen);
                } catch (e) {
                    console.warn('i18n: cannot persist language choice', e.message);
                }
                location.reload();
                return;
            }
            applyLanguage(chosen);
        });

        // Place the select right under the "Language:" title (avoids the empty <br> gap below it).
        const title = container.querySelector('.title');
        if (title) title.insertAdjacentElement('afterend', select);
        else container.appendChild(select);
    }

    // In 'google' mode the Google combo is the switcher, so reveal it in the Language tab
    // (translate.css hides #google_translate_element by default).
    function revealGoogleWidget() {
        const el = document.getElementById('google_translate_element');
        if (el) el.style.setProperty('display', 'block', 'important');
    }

    // ####################################################
    // INIT
    // ####################################################

    function whenBrandReady() {
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };
            document.addEventListener('brand:ready', finish, { once: true });
            // Fallback in case brand is already resolved or brand.js is absent.
            setTimeout(finish, 2000);
        });
    }

    function whenDomReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
            } else {
                resolve();
            }
        });
    }

    window.i18n.ready = (async function init() {
        await whenBrandReady();

        const mode = configMode();
        state.mode = mode;
        const lang = resolveLang();
        state.lang = lang;

        // 'google' forces machine translation; 'auto'/'native' try the human file first.
        if (mode !== 'google' && lang !== 'en') {
            try {
                const response = await fetch(`${LANG_PATH}${encodeURIComponent(lang)}.json`, { cache: 'no-cache' });
                if (response.ok) {
                    const data = await response.json();
                    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                        state.dict = data;
                        state.native = true;
                    }
                }
            } catch (error) {
                console.warn(`i18n: no native language file for "${lang}"`, error.message);
            }
        }

        // Whether translate.js may load the Google widget.
        // English needs no translation, so 'auto' only uses Google for a non-English language
        // that has no native file.
        const googleAllowed = mode === 'google' ? true : mode === 'native' ? false : lang !== 'en' && !state.native;
        window.i18n.googleAllowed = googleAllowed;
        state.googleActive = googleAllowed && lang !== 'en' && !state.native;

        if (state.native) console.log(`i18n: native translation active for "${lang}" (mode: ${mode})`);

        await whenDomReady();

        if (state.native) {
            // Native human translation: hooks, static pass, picker, observer.
            installHooks();
            applyStatic();
            renderLanguageSelect(lang);
            installObserver();
        } else if (mode === 'google' || state.googleActive) {
            // Google machine translation is the switcher (default/backward-compatible) → reveal its combo.
            revealGoogleWidget();
        } else {
            // 'native'/'auto' mode with English (or no native file): native picker only.
            installHooks();
            renderLanguageSelect(lang);
            installObserver();
        }

        return state.native;
    })();
})();
