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
    new google.translate.TranslateElement({ pageLanguage: 'en' }, 'google_translate_element');
}
