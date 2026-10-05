'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const langPath = path.join(__dirname, '../public/lang');
const source = fs.readFileSync(path.join(__dirname, '../public/js/i18n.js'), 'utf8');
const english = JSON.parse(fs.readFileSync(path.join(langPath, 'en.json'), 'utf8'));
const languageCodes = fs
    .readdirSync(langPath)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
    .sort();
const expectedNames = {
    en: 'English',
    hu: 'Magyar',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    it: 'Italiano',
    pl: 'Polski',
    ru: 'Русский',
    uk: 'Українська',
    zh: '中文',
    ja: '日本語',
    th: 'ไทย',
    ar: 'العربية',
    hi: 'हिन्दी',
    sr: 'Српски',
    id: 'Bahasa Indonesia',
    ko: '한국어',
    tr: 'Türkçe',
    bn: 'বাংলা',
    ur: 'اردو',
    vi: 'Tiếng Việt',
    te: 'తెలుగు',
    mr: 'मराठी',
    ta: 'தமிழ்',
    sw: 'Kiswahili',
    fa: 'فارسی',
};

const readLanguage = (lang) => JSON.parse(fs.readFileSync(path.join(langPath, `${lang}.json`), 'utf8'));
const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort();
const entities = (text) => (text.match(/&[a-z]+;/gi) || []).sort();

describe('native translation dictionaries', () => {
    for (const lang of languageCodes) {
        it(`${lang} preserves all English namespaces, keys, and placeholders`, () => {
            const dict = readLanguage(lang);
            assert.deepEqual(Object.keys(dict).sort(), Object.keys(english).sort());
            for (const [namespace, entries] of Object.entries(english)) {
                assert.deepEqual(Object.keys(dict[namespace]).sort(), Object.keys(entries).sort());
                for (const key of Object.keys(entries)) {
                    const value = dict[namespace][key];
                    assert.equal(typeof value, 'string', `${lang}/${namespace}/${key}`);
                    assert.ok(value.trim().length > 0, `${lang}/${namespace}/${key} is empty`);
                    assert.deepEqual(placeholders(value), placeholders(key), `${lang}/${namespace}/${key}`);
                    assert.deepEqual(entities(value), entities(key), `${lang}/${namespace}/${key}`);
                }
            }
        });
    }

    // Older dictionaries localize some shortcut letters; keep their existing behavior.
    for (const lang of ['bn', 'ur', 'vi', 'te', 'mr', 'ta', 'sw', 'fa']) {
        it(`${lang} preserves the original keyboard shortcut letters`, () => {
            const dict = readLanguage(lang);
            for (const [namespace, entries] of Object.entries(english)) {
                for (const key of Object.keys(entries)) {
                    const shortcut = key.match(/ \(([A-Z])\)$/);
                    if (shortcut) assert.ok(dict[namespace][key].endsWith(shortcut[0]), `${lang}/${namespace}/${key}`);
                }
            }
        });
    }
});

describe('native language picker', () => {
    let dom;
    let window;
    let fetched;
    let popups;

    async function load(language = 'en', mode = 'native', override) {
        dom = new JSDOM(
            `<!doctype html><html lang="en" dir="ltr"><body>
                <div id="tabLanguages"><p class="title">Language:</p></div>
                <div id="google_translate_element" style="display:none"></div>
                <button id="close" title="Close">Close</button>
                <input id="message" placeholder="Write a message...">
                <div id="excluded" class="notranslate">Close</div>
            </body></html>`,
            { url: 'https://example.test/join/test', runScripts: 'outside-only' }
        );
        window = dom.window;
        fetched = [];
        popups = [];
        window.console.log = () => {};
        window.fetch = async (url) => {
            fetched.push(url);
            const lang = path.basename(url, '.json');
            const exists = fs.existsSync(path.join(langPath, `${lang}.json`));
            return { ok: exists, json: async () => readLanguage(lang) };
        };
        window.tippy = () => [];
        window.Swal = { fire: (options) => popups.push(options) };
        window.userLog = () => {};
        if (override) window.localStorage.setItem('uiLanguageOverride', override);
        const context = dom.getInternalVMContext();
        vm.runInContext(`let brand = ${JSON.stringify({ app: { language, translationMode: mode } })};`, context);
        vm.runInContext(source, context);
        window.document.dispatchEvent(new window.Event('brand:ready'));
        await window.i18n.ready;
    }

    async function choose(lang) {
        const select = window.document.getElementById('i18nLanguageSelect');
        select.value = lang;
        select.dispatchEvent(new window.Event('change'));
        // The change handler loads the dictionary asynchronously.
        await new Promise((resolve) => setImmediate(resolve));
    }

    afterEach(() => {
        if (dom) dom.window.close();
    });

    it('registers exactly the languages that have native dictionaries, including English', async () => {
        await load();
        const select = window.document.getElementById('i18nLanguageSelect');
        assert.deepEqual([...select.options].map((option) => option.value).sort(), languageCodes);
        assert.deepEqual(Object.keys(expectedNames).sort(), languageCodes);
        for (const option of select.options) {
            assert.ok(option.textContent.endsWith(expectedNames[option.value]), `Native name for ${option.value}`);
        }
        assert.equal(select.value, 'en');
        assert.equal(window.i18n.isNative(), false);
        assert.equal(window.i18n.googleAllowed, false);
        assert.deepEqual(fetched, []);
    });

    for (const lang of languageCodes.filter((code) => code !== 'en')) {
        it(`offers ${lang} in the picker and switches live`, async () => {
            await load();
            const select = window.document.getElementById('i18nLanguageSelect');
            const option = [...select.options].find((item) => item.value === lang);
            assert.ok(option);
            assert.ok(option.textContent.trim().length > 0);
            assert.ok(option.textContent.endsWith(expectedNames[lang]));
            await choose(lang);
            const dict = readLanguage(lang);
            assert.equal(window.i18n.getLang(), lang);
            assert.equal(window.i18n.isNative(), true);
            assert.equal(window.i18n.googleAllowed, false);
            assert.equal(window.document.getElementById('close').textContent, dict.tooltips.Close);
            assert.equal(window.document.getElementById('close').title, dict.tooltips.Close);
            assert.equal(window.document.getElementById('message').placeholder, dict.labels['Write a message...']);
            assert.equal(window.document.getElementById('excluded').textContent, 'Close');
            assert.equal(window.document.documentElement.lang, lang);
            assert.equal(window.localStorage.getItem('uiLanguageOverride'), lang);
            assert.deepEqual(fetched, [`../lang/${lang}.json`]);
        });

        it(`loads ${lang} directly in auto mode without Google`, async () => {
            await load(lang, 'auto');
            assert.equal(window.i18n.isNative(), true);
            assert.equal(window.i18n.googleAllowed, false);
            assert.equal(window.document.getElementById('i18nLanguageSelect').value, lang);
        });

        it(`translates both whiteboard lock states with source line breaks in ${lang}`, async () => {
            await load(lang);
            const dict = readLanguage(lang);
            for (const key of [
                'The whiteboard is locked. The participants cannot interact with it.',
                'The whiteboard is unlocked. The participants can interact with it.',
                'Noise suppression could not be enabled. Using the microphone without noise suppression.',
            ]) {
                assert.notEqual(dict.toasts[key], key);
                const message = `  ${key.replace('. ', '. \n ')}  `;
                assert.equal(window.i18n.t(message, 'toasts'), `  ${dict.toasts[key]}  `);
            }
        });
    }

    for (const lang of ['ar', 'ur', 'fa']) {
        it(`switches ${lang} RTL text, attributes, and dialogs back to LTR`, async () => {
            await load(lang);
            assert.equal(window.document.documentElement.dir, 'rtl');
            window.Swal.fire({ title: 'Success', confirmButtonText: 'Cancel' });
            assert.equal(popups[0].title, readLanguage(lang).dialogs.Success);
            assert.equal(popups[0].confirmButtonText, readLanguage(lang).dialogs.Cancel);
            const popup = window.document.createElement('div');
            popup.textContent = 'Reason (optional)';
            window.document.body.appendChild(popup);
            popups[0].didOpen(popup);
            assert.equal(popup.textContent, readLanguage(lang).dialogs['Reason (optional)']);
            await choose('bn');
            assert.equal(window.document.documentElement.dir, 'ltr');
            await choose(lang);
            assert.equal(window.document.documentElement.dir, 'rtl');
            assert.equal(window.localStorage.getItem('uiLanguageOverride'), null);
            await choose('en');
            assert.equal(window.document.documentElement.lang, 'en');
            assert.equal(window.document.documentElement.dir, 'ltr');
            assert.equal(window.document.getElementById('close').textContent, 'Close');
            assert.equal(window.document.getElementById('close').title, 'Close');
            assert.equal(window.document.getElementById('message').placeholder, 'Write a message...');
        });
    }

    it('honors a saved native override on startup', async () => {
        await load('en', 'auto', 'ur');
        assert.equal(window.i18n.getLang(), 'ur');
        assert.equal(window.document.getElementById('i18nLanguageSelect').value, 'ur');
        assert.equal(window.document.documentElement.dir, 'rtl');
    });

    it('keeps Google mode unchanged for a newly supported language', async () => {
        await load('fa', 'google');
        assert.equal(window.i18n.isNative(), false);
        assert.equal(window.i18n.googleAllowed, true);
        assert.equal(window.document.getElementById('i18nLanguageSelect'), null);
        assert.equal(window.document.getElementById('google_translate_element').style.display, 'block');
        assert.equal(window.document.documentElement.dir, 'ltr');
        assert.deepEqual(fetched, []);
    });

    it('keeps auto mode Google fallback for an unsupported language', async () => {
        await load('xx', 'auto');
        assert.equal(window.i18n.isNative(), false);
        assert.equal(window.i18n.googleAllowed, true);
        assert.equal(window.document.getElementById('i18nLanguageSelect'), null);
    });

    it('keeps English text and direction for a missing native dictionary', async () => {
        await load('xx', 'native');
        assert.equal(window.i18n.isNative(), false);
        assert.equal(window.i18n.googleAllowed, false);
        assert.equal(window.document.documentElement.lang, 'en');
        assert.equal(window.document.documentElement.dir, 'ltr');
        assert.equal(window.document.getElementById('close').textContent, 'Close');
    });
});
