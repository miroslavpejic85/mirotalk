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
        'google_translate_element',
    );

    const language = brand?.app?.language || 'en';
    if (language === 'en') return; // No need to switch if default is 'en'

    // Use MutationObserver to detect the dropdown
    const observer = new MutationObserver(() => {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = language;
            select.dispatchEvent(new Event('change'));
            observer.disconnect(); // Stop observing once the dropdown is found
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Load Google Translate and initialize.
 */
(async function initGoogleTranslate() {
    try {
        await loadScript('https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
    } catch (error) {
        console.error('Failed to load Google Translate script:', error);
    }
})();
