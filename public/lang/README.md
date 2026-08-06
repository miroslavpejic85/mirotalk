# In-room UI translations (native / human)

Optional, hand-editable translation files for the **in-room video conference UI**.

When a file `public/lang/<lang>.json` exists for the configured UI language and native
translation is enabled, MiroTalk uses it to translate the in-room UI **and disables the
Google Translate widget** for that page. When no such file exists (or the mode forces
Google), the runtime machine translation (Google, 133+ languages) is used exactly as before.
This is fully opt-in and non-breaking.

The configured language comes from `config.brand.app.language` (default `en`).
See [app/src/config.template.js](../../app/src/config.template.js).

## Translation mode (`translationMode`)

`config.brand.app.translationMode` controls the strategy.
**The default is `google`** — if the value is unset, empty, or invalid, MiroTalk behaves
exactly as before native translation existed (backward compatible). Native translation is
opt-in via `auto` or `native`.

| Mode               | Behavior                                                            | In-room language switcher                      |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------- |
| `google` (default) | Always use Google machine translation; native files are ignored     | Google Translate combo                         |
| `auto`             | Use the native file if it exists for the language, otherwise Google | Native picker (native/English) or Google combo |
| `native`           | Human files only — never load Google (missing strings stay English) | Native picker                                  |

Notes on behavior:

- In `auto`/`native`, an in-room **Language** picker (Settings → Language) lists English
  plus every language that has a native file, and switches **live without a page reload**.
- In `google`, the switcher is the Google Translate combo (English needs no translation, so
  the native picker is not shown).
- The chosen language is remembered per browser (`localStorage`): `uiLanguageOverride` for
  the native picker, `googleTransLang` for the Google combo. It overrides the server default
  on the next load until reset back to it.

## How to add a language

1. Copy the English template to a new file named after the language code used in
   `config.brand.app.language`, e.g. Hungarian:

    ```bash
    cp public/lang/en.json public/lang/hu.json
    ```

2. Open `hu.json` and replace each **value** with the human translation. Leave the **key**
   (the English source string) unchanged.

    ```json
    {
        "tooltips": {
            "Mute": "Némítás"
        },
        "dialogs": {
            "Cancel": "Mégse"
        }
    }
    ```

3. Enable native translation and select the language, then open a room:

    ```js
    // app/src/config.js
    brand.app.language = 'hu';
    brand.app.translationMode = 'auto'; // or 'native'
    ```

    With the default `google` mode the native file is ignored, so `auto` or `native` is
    required to activate it.

Missing or empty values fall back to the original English text — you can translate
incrementally and ship a partial file.

## Namespaces

Keys are grouped by UI context so the same English word can be translated differently
depending on where it appears (e.g. "Cancel" as a dialog button vs. a tooltip):

| Namespace  | Covers                                                                |
| ---------- | --------------------------------------------------------------------- |
| `tooltips` | Tippy tooltips (hover hints on controls)                              |
| `buttons`  | Text and `title`/`placeholder`/`aria-label` on `<button>` elements    |
| `labels`   | All other static UI text, headings, placeholders and label attributes |
| `dialogs`  | SweetAlert popups: titles, buttons, input placeholders, body text     |
| `toasts`   | Snackbar / toast notifications                                        |

## Notes

- Keys must match the English source **exactly** (including punctuation and casing).
  Surrounding whitespace is ignored.
- Strings with inline dynamic values (counts, arbitrary names) are not translated and remain
  in English.
- To exclude an element from translation, add `class="notranslate"`, `translate="no"`, or
  `data-i18n-skip` in the HTML.
- Out of scope: the marketing/landing site, documentation, and user-generated content
  (chat messages, transcriptions).

## Regenerating the English template

`en.json` is generated from the in-room source strings:

```bash
node app/src/scripts/extract-ui-lang.js
```

The output is a starting point, review it by hand before committing. Existing per-language
files are never touched by the script.
