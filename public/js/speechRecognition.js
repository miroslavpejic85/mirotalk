'use strict';

const langs = [
    ['Afrikaans', ['af-ZA']],
    ['Bahasa Indonesia', ['id-ID']],
    ['Bahasa Melayu', ['ms-MY']],
    ['Català', ['ca-ES']],
    ['Čeština', ['cs-CZ']],
    ['Deutsch', ['de-DE']],
    [
        'English',
        ['en-AU', 'Australia'],
        ['en-CA', 'Canada'],
        ['en-IN', 'India'],
        ['en-NZ', 'New Zealand'],
        ['en-ZA', 'South Africa'],
        ['en-GB', 'United Kingdom'],
        ['en-US', 'United States'],
    ],
    [
        'Español',
        ['es-AR', 'Argentina'],
        ['es-BO', 'Bolivia'],
        ['es-CL', 'Chile'],
        ['es-CO', 'Colombia'],
        ['es-CR', 'Costa Rica'],
        ['es-EC', 'Ecuador'],
        ['es-SV', 'El Salvador'],
        ['es-ES', 'España'],
        ['es-US', 'Estados Unidos'],
        ['es-GT', 'Guatemala'],
        ['es-HN', 'Honduras'],
        ['es-MX', 'México'],
        ['es-NI', 'Nicaragua'],
        ['es-PA', 'Panamá'],
        ['es-PY', 'Paraguay'],
        ['es-PE', 'Perú'],
        ['es-PR', 'Puerto Rico'],
        ['es-DO', 'República Dominicana'],
        ['es-UY', 'Uruguay'],
        ['es-VE', 'Venezuela'],
    ],
    ['Euskara', ['eu-ES']],
    ['Français', ['fr-FR']],
    ['Galego', ['gl-ES']],
    ['Hrvatski', ['hr_HR']],
    ['IsiZulu', ['zu-ZA']],
    ['Íslenska', ['is-IS']],
    ['Italiano', ['it-IT', 'Italia'], ['it-CH', 'Svizzera']],
    ['Magyar', ['hu-HU']],
    ['Nederlands', ['nl-NL']],
    ['Norsk bokmål', ['nb-NO']],
    ['Polski', ['pl-PL']],
    ['Português', ['pt-BR', 'Brasil'], ['pt-PT', 'Portugal']],
    ['Română', ['ro-RO']],
    ['Slovenčina', ['sk-SK']],
    ['Suomi', ['fi-FI']],
    ['Svenska', ['sv-SE']],
    ['Türkçe', ['tr-TR']],
    ['български', ['bg-BG']],
    ['Pусский', ['ru-RU']],
    ['Српски', ['sr-RS']],
    ['한국어', ['ko-KR']],
    [
        '中文',
        ['cmn-Hans-CN', '普通话 (中国大陆)'],
        ['cmn-Hans-HK', '普通话 (香港)'],
        ['cmn-Hant-TW', '中文 (台灣)'],
        ['yue-Hant-HK', '粵語 (香港)'],
    ],
    ['日本語', ['ja-JP']],
    ['Lingua latīna', ['la']],
];

const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognitionLanguage = getId('recognitionLanguage');
const recognitionDialect = getId('recognitionDialect');

let isWebkitSpeechRecognitionSupported = false;
let recognitionRunning = false;
let recognition;

if (speechRecognition) {
    handleRecognitionLanguages();
    // init webkitSpeechRecognition...
    recognition = new speechRecognition();
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognition.lang = recognitionDialect.value;

    recognition.onstart = function () {
        console.log('Speech recognition started');
        elemDisplay(speechRecognitionStart, false);
        elemDisplay(speechRecognitionStop, true, 'block');
        setColor(speechRecognitionIcon, 'lime');
        userLog('toast', 'Speech recognition started');
    };

    // Detect the said words
    recognition.onresult = (e) => {
        let current = e.resultIndex;
        // Get a transcript of what was said.
        let transcript = e.results[current][0].transcript;
        if (transcript) {
            let config = {
                type: 'speech',
                room_id: roomId,
                peer_name: myPeerName,
                text_data: transcript,
                time_stamp: new Date(),
            };
            // save also my speech to text
            handleSpeechTranscript(config);
            sendToDataChannel(config);
        }
    };

    recognition.onaudiostart = () => {
        console.log('Speech recognition start to capture your voice');
    };

    recognition.onaudioend = () => {
        console.log('Speech recognition stop to capture your voice');
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error', event.error);
    };

    recognition.onend = function () {
        console.log('Speech recognition stopped');
        // if (recognitionRunning) recognition.start();
        elemDisplay(speechRecognitionStop, false);
        elemDisplay(speechRecognitionStart, true, 'block');
        setColor(speechRecognitionIcon, 'white');
        userLog('toast', 'Speech recognition stopped');
    };

    isWebkitSpeechRecognitionSupported = true;
    console.info('00. Browser supports webkitSpeechRecognition');
} else {
    console.warn(
        'This browser not supports webkitSpeechRecognition, check out supported browsers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API#browser_compatibility',
    );
}

/**
 * Update speech recognition country
 */
function updateCountry() {
    for (let i = recognitionDialect.options.length - 1; i >= 0; i--) {
        recognitionDialect.remove(i);
    }
    let list = langs[recognitionLanguage.selectedIndex];
    for (let i = 1; i < list.length; i++) {
        recognitionDialect.options.add(new Option(list[i][1], list[i][0]));
    }
    recognitionDialect.style.visibility = list[1].length == 1 ? 'hidden' : 'visible';
}

/**
 * Handle recognition languages
 */
function handleRecognitionLanguages() {
    for (let i = 0; i < langs.length; i++) {
        recognitionLanguage.options[i] = new Option(langs[i][0], i);
    }
    recognitionLanguage.selectedIndex = 6;
    updateCountry();
    recognitionDialect.selectedIndex = 6;
    recognitionLanguage.addEventListener('change', () => {
        updateCountry();
    });
}

/**
 * Start speech recognition
 */
function startSpeech() {
    try {
        recognitionRunning = true;
        recognition.lang = recognitionDialect.value;
        recognitionSelectDisabled(true);
        recognition.start();
    } catch (error) {
        console.error('Speech recognition start error', error);
    }
}

/**
 * Stop speech recognition
 */
function stopSpeech() {
    recognitionRunning = false;
    recognitionSelectDisabled(false);
    recognition.stop();
}

/**
 * Disable recognition select options
 * @param {boolean} disabled
 */
function recognitionSelectDisabled(disabled = false) {
    recognitionLanguage.disabled = disabled;
    recognitionDialect.disabled = disabled;
}
