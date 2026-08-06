'use strict';

/**
 * Dynamically load an external script and return a Promise.
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Initialize Google Translate.
 */
function googleTranslateElementInit() {
    new google.translate.TranslateElement(
        {
            pageLanguage: 'en',
            autoDisplay: false, // Prevent default popup
        },
        'google_translate_element'
    );

    // Remember a language the user picks from the Google combo (per-browser), so it survives reloads
    // instead of always reverting to the server default.
    const GOOGLE_LANG_KEY = 'googleTransLang';
    let stored = null;
    try {
        stored = localStorage.getItem(GOOGLE_LANG_KEY);
    } catch (e) {}

    const language = stored || brand?.app?.language || 'en';

    // Store only real selections; ignore Google's post-translation reset to "" (Select Language),
    // which would otherwise wipe the saved language on reload.
    const rememberChoice = (select) => {
        select.addEventListener('change', () => {
            const value = select.value;
            if (!value) return;
            try {
                localStorage.setItem(GOOGLE_LANG_KEY, value);
            } catch (e) {}
        });
    };

    // Use MutationObserver to detect the dropdown
    const observer = new MutationObserver(() => {
        const select = document.querySelector('.goog-te-combo');
        if (!select) return;
        observer.disconnect(); // Stop observing once the dropdown is found
        if (language !== 'en') {
            select.value = language;
            select.dispatchEvent(new Event('change'));
        }
        rememberChoice(select);
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Load Google Translate and initialize.
 */
(async function initGoogleTranslate() {
    // Skip the runtime machine translation when a native (human) language file is active
    // or when disabled via config.brand.app.translationMode (see i18n.js).
    try {
        const native = window.i18n && window.i18n.ready ? await window.i18n.ready : false;
        const googleAllowed = !window.i18n || window.i18n.googleAllowed !== false;
        if (native || !googleAllowed) {
            console.log('Google Translate skipped: native file active or disabled by translationMode');
            return;
        }
    } catch (error) {
        console.warn('i18n readiness check failed, falling back to Google Translate:', error.message);
    }
    try {
        await loadScript('https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
    } catch (error) {
        console.error('Failed to load Google Translate script:', error);
    }
})();
