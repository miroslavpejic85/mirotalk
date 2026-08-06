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
const JS_FILES = [path.join(ROOT, 'public/js/client.js')];
const OUT_FILE = path.join(ROOT, 'public/lang/en.json');

const ATTR_KEYS = ['title', 'placeholder', 'aria-label'];
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
            const re = new RegExp(`${key}\\s*=\\s*(['"])(.*?)\\1`, 'i');
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

JS_FILES.forEach(scanJs);
scanHtml(HTML_FILE);

const output = {};
for (const [ns, set] of Object.entries(buckets)) {
    const sorted = [...set].sort((a, b) => a.localeCompare(b));
    output[ns] = {};
    for (const key of sorted) output[ns][key] = key;
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 4) + '\n', 'utf8');

const counts = Object.entries(buckets)
    .map(([ns, set]) => `${ns}: ${set.size}`)
    .join(', ');
console.log(`Wrote ${OUT_FILE}`);
console.log(`Strings -> ${counts}`);
