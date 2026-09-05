'use strict';

/**
 * Dev helper: generate the in-room UI translation template (public/lang/en.json).
 *
 * Scans the in-room source for user-facing English strings and groups them by
 * namespace (tooltips / buttons / labels / dialogs / toasts). Values are the English
 * source itself so translators can copy en.json -> <lang>.json and fill in.
 *
 * Usage: node app/src/scripts/extract-ui-lang.js
 *
 * The output is a starting point and should be reviewed by hand before shipping.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const HTML_FILE = path.join(ROOT, 'public/views/client.html');
const LANG_DIR = path.join(ROOT, 'public/lang');
const OUT_FILE = path.join(LANG_DIR, 'en.json');

const ATTR_KEYS = ['title', 'placeholder', 'aria-label', 'data-tippy-content'];
const DIALOG_FIELDS = [
    'title',
    'titleText',
    'text',
    'confirmButtonText',
    'cancelButtonText',
    'denyButtonText',
    'inputPlaceholder',
    'footer',
];

const buckets = {
    tooltips: new Set(),
    buttons: new Set(),
    labels: new Set(),
    dialogs: new Set(),
    toasts: new Set(),
};

function decodeEntities(str) {
    return str
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&copy;/g, '\u00a9')
        .replace(/&times;/g, '\u00d7')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function normalize(str) {
    return decodeEntities(str).replace(/\s+/g, ' ').trim();
}

const STOPLIST = new Set([
    'in',
    'or',
    'on',
    'off',
    'none',
    'fill',
    'true',
    'false',
    'the',
    'polls',
    'recording',
    'screen',
    'settings',
    'microphone',
    'whiteboard',
    'the file',
    'nameTitle',
    'UserName',
    'scale-down',
]);

function isTranslatable(str) {
    if (!str || str.length < 2) return false;
    if (str.includes('{{') || str.includes('${') || str.includes('<')) return false;
    if (!/[a-zA-Z]/.test(str)) return false; // must contain letters
    if (/:\/\//.test(str)) return false; // any URL/scheme
    if (/^[A-Za-z]$/.test(str)) return false; // single letter (shortcut keys)
    if (/x{4,}/.test(str)) return false; // placeholder patterns
    if (/^MiroTalk\b/.test(str)) return false; // brand-managed titles
    if (STOPLIST.has(str)) return false;
    if (str.length > 220) return false;
    return true;
}

function add(bucket, raw) {
    const value = normalize(raw);
    if (isTranslatable(value)) buckets[bucket].add(value);
}

function unescapeJs(str) {
    return str.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, ' ');
}

function getRoomJsFiles() {
    const html = fs.readFileSync(HTML_FILE, 'utf8');
    const files = new Set();
    const scriptRe = /<script[^>]+src\s*=\s*['"]\.\.\/js\/([^'"?#]+\.js)['"]/gi;
    let match;
    while ((match = scriptRe.exec(html))) files.add(path.join(ROOT, 'public/js', match[1]));
    return [...files];
}

function seedCuratedKeys() {
    if (!fs.existsSync(OUT_FILE)) return;
    const english = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    for (const [namespace, entries] of Object.entries(english)) {
        if (!buckets[namespace] || !entries || typeof entries !== 'object') continue;
        for (const key of Object.keys(entries)) add(namespace, key);
    }
}

function scanCallbackReturns(src, property, bucket) {
    const callbackRe = new RegExp(`\\b${property}\\s*:\\s*\\([^)]*\\)\\s*=>\\s*\\{`, 'g');
    let callback;
    while ((callback = callbackRe.exec(src))) {
        const start = callbackRe.lastIndex;
        let depth = 1;
        let index = start;
        let quote = null;
        let escaped = false;

        for (; index < src.length && depth > 0; index++) {
            const char = src[index];
            if (quote) {
                if (escaped) escaped = false;
                else if (char === '\\') escaped = true;
                else if (char === quote) quote = null;
                continue;
            }
            if (char === "'" || char === '"' || char === '`') quote = char;
            else if (char === '{') depth++;
            else if (char === '}') depth--;
        }

        const body = src.slice(start, index - 1);
        const returnRe = /return\s+(?:[^;?\n]+\?\s*)?(['"])((?:\\.|(?!\1).)*)\1(?:\s*:\s*(['"])((?:\\.|(?!\3).)*)\3)?/g;
        let returned;
        while ((returned = returnRe.exec(body))) {
            add(bucket, unescapeJs(returned[2]));
            if (returned[4]) add(bucket, unescapeJs(returned[4]));
        }
    }
}

// ####################################################
// JS scan
// ####################################################

function scanJs(file) {
    const src = fs.readFileSync(file, 'utf8');
    let m;

    // Tooltips: setTippy(<id>, '<text>', ...)
    const tippyRe = /setTippy\(\s*[^,]+?,\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = tippyRe.exec(src))) add('tooltips', unescapeJs(m[2]));

    // Tooltips written as ternaries: setTippy(<id>, cond ? '<a>' : '<b>', ...)
    const tippyTernRe = /setTippy\([^,]+,\s*[^,?'"]*\?\s*(['"])((?:\\.|(?!\1).)*)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g;
    while ((m = tippyTernRe.exec(src))) {
        add('tooltips', unescapeJs(m[2]));
        add('tooltips', unescapeJs(m[4]));
    }

    // Toasts: userLog(<type>, '<text>', ...) / toastMessage(<icon>, '<title>', ...) / msgPopup(<icon>, '<text>', ...)
    const logRe = /(?:userLog|toastMessage|msgPopup)\(\s*[^,]+?,\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = logRe.exec(src))) add('toasts', unescapeJs(m[2]));

    // Dialogs: Swal.fire fields (string literals)
    const fieldRe = new RegExp(`\\b(${DIALOG_FIELDS.join('|')})\\s*:\\s*(['"])((?:\\\\.|(?!\\2).)*)\\2`, 'g');
    while ((m = fieldRe.exec(src))) add('dialogs', unescapeJs(m[3]));

    // Dialogs: Swal.fire fields using backtick literals without interpolation
    const fieldTplRe = new RegExp(`\\b(${DIALOG_FIELDS.join('|')})\\s*:\\s*\`([^\`$]*)\``, 'g');
    while ((m = fieldTplRe.exec(src))) add('dialogs', unescapeJs(m[2]));

    const conditionalFieldRe = new RegExp(
        `\\b(${DIALOG_FIELDS.join('|')})\\s*:\\s*[^,?]+\\?\\s*(['"])((?:\\\\.|(?!\\2).)*)\\2\\s*:\\s*(['"])((?:\\\\.|(?!\\4).)*)\\4`,
        'g'
    );
    while ((m = conditionalFieldRe.exec(src))) {
        add('dialogs', unescapeJs(m[3]));
        add('dialogs', unescapeJs(m[5]));
    }

    // Dialog strings passed through the runtime translation helper.
    const dialogTextRe = /translateDialogText\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
    while ((m = dialogTextRe.exec(src))) add('dialogs', unescapeJs(m[2]));

    const validationRe = /Swal\.showValidationMessage\(\s*(?:t\(\s*)?(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = validationRe.exec(src))) add('dialogs', unescapeJs(m[2]));

    scanCallbackReturns(src, 'inputValidator', 'dialogs');

    // Explicit translation calls mark dynamically-built labels that a DOM scan cannot infer.
    const translateRe = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
    while ((m = translateRe.exec(src))) add('labels', unescapeJs(m[2]));

    // Dynamically-built UI text: text nodes and textContent/innerText assignments.
    const textNodeRe = /createTextNode\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = textNodeRe.exec(src))) add('labels', unescapeJs(m[2]));
    const textContentRe = /\.(?:textContent|innerText)\s*=\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = textContentRe.exec(src))) add('labels', unescapeJs(m[2]));

    // Device menu headers/options: appendMenuHeader(el, icon, '<text>') / appendSelectOptions(el, sel, '<text>', ...)
    const helperRe = /(?:appendMenuHeader|appendSelectOptions)\([^,]*,[^,]*,\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = helperRe.exec(src))) add('labels', unescapeJs(m[2]));

    // Participant dropdown menu items: getMsgerParticipantDropdownActionMarkup(id, icon, '<label>', ...)
    const dropdownRe = /getMsgerParticipantDropdownActionMarkup\([^,]*,[^,]*,\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = dropdownRe.exec(src))) add('buttons', unescapeJs(m[2]));

    // Video-tile menu items: createDropdownItem(btn, '<label>', ...)
    const dropdownItemRe = /createDropdownItem\([^,]+,\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = dropdownItemRe.exec(src))) add('buttons', unescapeJs(m[2]));

    // Dynamic UI labels passed as object props or default params (participant subtitles, file picker copy).
    const subtitleRe =
        /(?:participantSubtitle|emptyStateTitle|emptyStateSubtitle|helperText)\s*[:=]\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = subtitleRe.exec(src))) add('labels', unescapeJs(m[2]));

    // helperText assigned via a short ternary: capture the plain-string branch.
    const helperTernRe = /helperText:[^,{}]{0,160}?\?\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    while ((m = helperTernRe.exec(src))) add('labels', unescapeJs(m[2]));
}

// ####################################################
// HTML scan (button-aware state machine)
// ####################################################

function scanHtml(file) {
    let html = fs.readFileSync(file, 'utf8');
    // Drop comments and script/style blocks entirely.
    html = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '');

    const tagRe = /<(\/?)([a-zA-Z0-9-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
    let lastIndex = 0;
    let buttonDepth = 0;
    let match;

    const handleText = (text) => {
        const bucket = buttonDepth > 0 ? 'buttons' : 'labels';
        // A run of text may contain multiple entities/newlines; treat as one label.
        add(bucket, text);
    };

    const handleAttrs = (tagName, attrStr) => {
        const isButton = tagName === 'button';
        const bucket = isButton || buttonDepth > 0 ? 'buttons' : 'labels';
        for (const key of ATTR_KEYS) {
            const re = new RegExp(`(?:^|\\s)${key}\\s*=\\s*(['"])(.*?)\\1`, 'i');
            const am = re.exec(attrStr);
            if (am) add(bucket, am[2]);
        }
    };

    while ((match = tagRe.exec(html))) {
        const text = html.slice(lastIndex, match.index);
        if (text.trim()) handleText(text);
        lastIndex = tagRe.lastIndex;

        const closing = match[1] === '/';
        const tagName = match[2].toLowerCase();
        const attrStr = match[3] || '';

        if (tagName === 'button') {
            if (closing) buttonDepth = Math.max(0, buttonDepth - 1);
            else if (!attrStr.trim().endsWith('/')) buttonDepth++;
        }
        if (!closing) handleAttrs(tagName, attrStr);
    }
}

// ####################################################
// Build output
// ####################################################

seedCuratedKeys();
getRoomJsFiles().forEach(scanJs);
scanHtml(HTML_FILE);

const output = {};
for (const [ns, set] of Object.entries(buckets)) {
    const sorted = [...set].sort((a, b) => a.localeCompare(b));
    output[ns] = {};
    for (const key of sorted) output[ns][key] = key;
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 4) + '\n', 'utf8');

const localeFiles = fs.readdirSync(LANG_DIR).filter((file) => file.endsWith('.json') && file !== 'en.json');
for (const file of localeFiles) {
    const filePath = path.join(LANG_DIR, file);
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const synced = {};
    for (const [namespace, englishEntries] of Object.entries(output)) {
        synced[namespace] = {};
        for (const [key, translated] of Object.entries(existing[namespace] || {})) {
            if (Object.hasOwn(englishEntries, key)) synced[namespace][key] = translated;
        }
        for (const key of Object.keys(englishEntries)) {
            if (!Object.hasOwn(synced[namespace], key)) synced[namespace][key] = key;
        }
    }
    fs.writeFileSync(filePath, JSON.stringify(synced, null, 4) + '\n', 'utf8');
}

const counts = Object.entries(buckets)
    .map(([ns, set]) => `${ns}: ${set.size}`)
    .join(', ');
console.log(`Wrote ${OUT_FILE}`);
console.log(`Strings -> ${counts}`);
console.log(`Synchronized ${localeFiles.length} locale files`);
