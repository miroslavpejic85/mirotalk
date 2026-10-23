# In-room UI translations

## Configuration

Set `brand.app.language` and `brand.app.translationMode` in your app
configuration; see [config.template.js](../../app/src/config.template.js). The
default language is `en`; the default translation mode is `google`.

| Mode     | Behavior                                                          |
| -------- | ----------------------------------------------------------------- |
| `google` | Use Google Translate; ignore native translation files.            |
| `auto`   | Use a native file when available; otherwise use Google Translate. |
| `native` | Use native files only; untranslated text remains English.         |

In a room, users can override the translation mode from **Settings > Language**.
The mode override is persisted in browser local storage and reused in
subsequent rooms on the same browser.
When users change translation mode, the app shows a short notice and reloads
the page so the selected mode can be fully applied.

Mode override precedence is: `browser override` → server config default.

## Adding a language

1. Copy [en.json](./en.json) to a file named for the language code, such as
   `hu.json`.
2. Translate the values, keeping the English keys unchanged.
3. Add the language code, flag, and native name to `LANG_DISPLAY` in
   [i18n.js](../js/i18n.js). For right-to-left languages, also add the code to
   `RTL_LANGS`.
4. Set `brand.app.language` to the language code and
   `brand.app.translationMode` to `auto` or `native`.

## Namespaces

| Namespace  | Content                                     |
| ---------- | ------------------------------------------- |
| `tooltips` | Hover hints                                 |
| `buttons`  | Button text and attributes                  |
| `labels`   | Static text, headings, and label attributes |
| `dialogs`  | Popup titles, text, buttons, and inputs     |
| `toasts`   | Notifications                               |

## Fallback behavior

Missing namespaces, keys, or empty values use the original English text, so
translations can be added incrementally. Keep keys, including their punctuation
and casing, identical to the English source. Preserve placeholders such as
`{name}` in translated values.

In `auto` mode, Google Translate is used if the language file is unavailable.
When a native file is loaded, missing entries remain English; they do not fall
back individually to Google Translate.

## Synchronize translation keys

After changing in-room UI strings, run this from the repository root:

```bash
npm run lang
```

The script regenerates `en.json` and synchronizes other language files,
preserving existing translations, keeping keys in the same order as `en.json`,
adding missing keys with English values, and removing stale keys. Review the
changes before committing.

## Auto-translate missing values

Use machine translation to fill only missing/untranslated locale values
(`""` or values still equal to the English key), while skipping `en.json`.
No extra dependencies are needed (plain Node `fetch` against the public Google Translate endpoint).

Run translation:

```bash
npm run lang:translate
```

Requests are paced and retried with backoff on rate limits. If a run still stops due to temporary
limits, wait a bit and run `npm run lang:translate` again. Progress is saved after each batch,
so reruns resume from the already translated values.

`{placeholders}` are protected during translation (a value whose placeholders would not survive
keeps its English text), and short all-caps acronyms such as `ID`, `OK`, `URL` or `FULL HD` are left untouched.

Optional targeted run:

```bash
npm run lang:translate -- --locale it          # single locale (or --locale it,de)
npm run lang:translate -- --max-batches 0      # no per-locale batch limit (default: 30 batches of 5 values)
npm run lang:translate -- --help
```

Or run both extraction/sync + translation:

```bash
npm run lang:auto
```

Machine translations are a starting point; review them before committing.
