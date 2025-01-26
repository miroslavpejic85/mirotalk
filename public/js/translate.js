'use strict';

const script = document.createElement('script');
script.setAttribute('async', '');
script.setAttribute('src', 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
document.head.appendChild(script);

/**
 * Start Google Translate
 * https://www.w3schools.com/howto/howto_google_translate.asp
 */
function googleTranslateElementInit() {
    new google.translate.TranslateElement({ 
        pageLanguage: 'en',
        autoDisplay: false // Prevent the popup from showing by default
    }, 'google_translate_element');

    const interval = setInterval(() => {
        const language = brand.app.language ? brand.app.language : 'en';

        if (language === 'en') {
            clearInterval(interval);
        }

        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = language;
            select.dispatchEvent(new Event('change'));
            clearInterval(interval);
        }
    }, 500);
}
