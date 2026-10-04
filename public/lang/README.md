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
node app/src/scripts/extract-ui-lang.js
```

The script regenerates `en.json` and synchronizes other language files,
preserving existing translations, adding missing keys with English values, and
removing stale keys. Review the changes before committing.
