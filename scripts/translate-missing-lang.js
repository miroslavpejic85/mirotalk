'use strict';

/**
 * Dev helper: machine-translate missing UI locale values from public/lang/en.json.
 *
 * A value is considered missing when it is empty or still equal to the English source
 * (which is what `npm run lang` writes for newly added keys). en.json is never modified.
 * Progress is saved after each batch, so reruns resume where the previous run stopped.
 *
 * Usage:
 *   node scripts/translate-missing-lang.js
 *   node scripts/translate-missing-lang.js --locale it --locale de   (or --locale it,de)
 *   node scripts/translate-missing-lang.js --max-batches 0          (0 = unlimited)
 *   node scripts/translate-missing-lang.js --stop-on-error
 *
 * Machine translations are a starting point and should be reviewed before shipping.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'public/lang');
const ENGLISH_FILE = path.join(LANG_DIR, 'en.json');

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
// Locale file names that differ from Google Translate language codes
const GOOGLE_LANGUAGE_CODES = { zh: 'zh-CN' };

const BATCH_SIZE = 5;
const DEFAULT_MAX_BATCHES_PER_LOCALE = 30;
const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 2500;
const MIN_REQUEST_INTERVAL_MS = 300;
const REQUEST_TIMEOUT_MS = 15000;

const PLACEHOLDER_RE = /\{[^}]+\}/g;
const LATIN_LETTER_RE = /[A-Za-z]/;
// Short all-caps values (ID, OK, URL, RTMP, FULL HD, 4K...) are acronyms; translating them does more harm than good
const ACRONYM_ONLY_RE = /^(?!.*[a-z])(?!.*[A-Z]{5}).*$/s;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RetryableError extends Error {}

let lastRequestAt = 0;

function parseArgs(argv) {
    const args = { locales: new Set(), maxBatches: DEFAULT_MAX_BATCHES_PER_LOCALE, stopOnError: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const [flag, inlineValue] = arg.split(/=(.*)/s);
        const nextValue = () => (inlineValue !== undefined ? inlineValue : argv[++i]);
        if (flag === '--locale') {
            const value = nextValue() || '';
            value
                .split(',')
                .map((locale) => locale.trim().toLowerCase())
                .filter(Boolean)
                .forEach((locale) => args.locales.add(locale));
        } else if (flag === '--max-batches') {
            const value = Number.parseInt(nextValue(), 10);
            if (!Number.isInteger(value) || value < 0) throw new Error('--max-batches must be a non-negative integer');
            args.maxBatches = value;
        } else if (flag === '--stop-on-error') {
            args.stopOnError = true;
        } else if (flag === '--help' || flag === '-h') {
            args.help = true;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return args;
}

function printHelp() {
    console.log(`Translate missing locale values from en.json.

Usage: npm run lang:translate -- [options]

Options:
  --locale <codes>       Locale(s) to process, repeat or comma-separate (e.g. --locale it,de). Default: all.
  --max-batches <n>      Max batches of ${BATCH_SIZE} values per locale per run (default: ${DEFAULT_MAX_BATCHES_PER_LOCALE}). 0 = unlimited.
  --stop-on-error        Stop the whole run on the first locale error.
  -h, --help             Show this help.`);
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
}

function shouldTranslate(english, localized) {
    return typeof localized !== 'string' || !localized.trim() || localized === english;
}

function protectPlaceholders(text) {
    const tokens = [];
    // [n] survives machine translation in all tested scripts, unlike {name} or __PH_n__
    const protectedText = text.replace(PLACEHOLDER_RE, (match) => {
        tokens.push(match);
        return `[${tokens.length - 1}]`;
    });
    return { protectedText, tokens };
}

function restorePlaceholders(text, tokens) {
    return tokens.reduce((result, original, index) => result.split(`[${index}]`).join(original), text);
}

async function requestTranslation(text, target) {
    const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    const query = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't', q: text });
    let response;
    try {
        response = await fetch(`${GOOGLE_TRANSLATE_URL}?${query}`, {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (error) {
        throw new RetryableError(`Network error (${target}): ${error.message}`);
    }

    if (response.status === 429 || response.status >= 500) {
        throw new RetryableError(`HTTP ${response.status} (${target})`);
    }
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} rejected request (${target})`);
    }

    // Response shape: [[["translated part", "source part", ...], ...], ...]
    const data = await response.json();
    const segments = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
    return segments
        .filter((segment) => Array.isArray(segment) && typeof segment[0] === 'string')
        .map((segment) => segment[0])
        .join('');
}

async function translateWithRetry(text, target) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await requestTranslation(text, target);
        } catch (error) {
            if (!(error instanceof RetryableError) || attempt >= MAX_RETRIES) throw error;
            const delay = RETRY_DELAY_MS * attempt;
            console.error(`${target}: retrying in ${delay / 1000}s after transient error: ${error.message}`);
            await sleep(delay);
        }
    }
}

async function translateValue(english, target) {
    if (!LATIN_LETTER_RE.test(english) || ACRONYM_ONLY_RE.test(english)) return english;
    const { protectedText, tokens } = protectPlaceholders(english);
    const translated = (await translateWithRetry(protectedText, target)).trim();
    if (!translated) return english;
    const restored = restorePlaceholders(translated, tokens);
    // Never ship a translation that lost or mangled a placeholder
    const placeholdersIntact = tokens.every((token) => restored.includes(token)) && !/\[\d+\]/.test(restored);
    return placeholdersIntact ? restored : english;
}

async function translateLocale(localeFile, englishCatalog, maxBatches) {
    const locale = loadJson(localeFile);
    const localeCode = path.basename(localeFile, '.json');
    const target = GOOGLE_LANGUAGE_CODES[localeCode] || localeCode;

    const pending = [];
    for (const [namespace, englishEntries] of Object.entries(englishCatalog)) {
        if (!locale[namespace] || typeof locale[namespace] !== 'object') locale[namespace] = {};
        for (const [key, english] of Object.entries(englishEntries)) {
            if (shouldTranslate(english, locale[namespace][key])) pending.push({ namespace, key, english });
        }
    }

    const cache = new Map();
    let translated = 0;
    let completed = true;
    let error = null;

    for (let start = 0, batches = 0; start < pending.length; start += BATCH_SIZE, batches++) {
        if (maxBatches > 0 && batches >= maxBatches) {
            completed = false;
            break;
        }
        try {
            for (const { namespace, key, english } of pending.slice(start, start + BATCH_SIZE)) {
                if (!cache.has(english)) cache.set(english, await translateValue(english, target));
                locale[namespace][key] = cache.get(english);
                translated++;
            }
        } catch (err) {
            completed = false;
            error = err;
        }
        saveJson(localeFile, locale);
        if (error) break;
    }

    return { translated, remaining: pending.length - translated, completed, error };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) return printHelp();

    if (!fs.existsSync(ENGLISH_FILE)) throw new Error(`English catalog not found: ${ENGLISH_FILE}`);
    const englishCatalog = loadJson(ENGLISH_FILE);

    const localeFiles = fs
        .readdirSync(LANG_DIR)
        .filter((file) => file.endsWith('.json') && file !== 'en.json')
        .filter((file) => !args.locales.size || args.locales.has(path.basename(file, '.json').toLowerCase()))
        .sort()
        .map((file) => path.join(LANG_DIR, file));

    if (!localeFiles.length) {
        console.log('No matching locale files found to translate.');
        return;
    }

    let totalTranslated = 0;
    let totalRemaining = 0;
    let hadErrors = false;

    for (const localeFile of localeFiles) {
        const name = path.basename(localeFile);
        let result;
        try {
            result = await translateLocale(localeFile, englishCatalog, args.maxBatches);
        } catch (err) {
            result = { translated: 0, remaining: 0, completed: false, error: err };
        }
        totalTranslated += result.translated;
        totalRemaining += result.remaining;
        if (result.error) {
            hadErrors = true;
            console.error(`${name}: stopped early: ${result.error.message}`);
        }
        console.log(
            `${name}: translated ${result.translated} values${result.remaining ? `, remaining ${result.remaining}` : ''}`
        );
        if (args.stopOnError && result.error) {
            console.error('Stopped on first locale error (--stop-on-error).');
            break;
        }
    }

    console.log(`Done. Total translated values: ${totalTranslated}`);
    if (totalRemaining > 0) {
        console.log(
            `Remaining untranslated values: ${totalRemaining}. Re-run the same command to continue from saved progress.`
        );
    }
    if (hadErrors) process.exitCode = 1;
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
