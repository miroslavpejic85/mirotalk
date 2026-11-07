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
        ['en-NG', 'Nigeria'],
        ['en-GH', 'Ghana'],
        ['en-KE', 'Kenya'],
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
    ['Tiếng Việt', ['vi-VN']],
    ['বাংলা', ['bn-BD', 'বাংলাদেশ'], ['bn-IN', 'ভারত']],
    ['العربية', ['ar-SA', 'السعودية'], ['ar-EG', 'مصر'], ['ar-AE', 'الإمارات']],
];

const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognitionLanguage = getId('recognitionLanguage');
const recognitionDialect = getId('recognitionDialect');

// Errors that will not recover by restarting the recognition
const recognitionFatalErrors = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'];

let isWebkitSpeechRecognitionSupported = false;
let recognitionRunning = false; // Captions on
let isVoiceCommandsActive = false; // Voice commands on (see voiceCommands.js)
let isRecognitionEngineActive = false;
let recognitionRestartTimer = null;
let recognitionRestartDelay = null;
let recognition;

/*
 * A single SpeechRecognition instance is shared by captions and voice commands:
 * browsers abort a session when another one starts on the same page.
 */
if (speechRecognition) {
    handleRecognitionLanguages();
    // init webkitSpeechRecognition...
    recognition = new speechRecognition();
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognition.lang = recognitionDialect.value;

    recognition.onstart = function () {
        console.log('Speech recognition started', { lang: recognition.lang });
    };

    // Detect the said words
    recognition.onresult = (e) => {
        let current = e.resultIndex;
        // Get a transcript of what was said.
        let transcript = e.results[current][0].transcript;
        if (!transcript) return;
        // Voice commands are executed locally and never shared as captions.
        if (isVoiceCommandsActive && handleVoiceCommandTranscript(transcript)) return;
        // Skip capturing while the microphone is off.
        if (!recognitionRunning || !myAudioStatus) return;
        let config = {
            type: 'speech',
            room_id: roomId,
            peer_name: myPeerName,
            peer_avatar: myPeerAvatar,
            text_data: transcript,
            time_stamp: new Date(),
        };
        // save also my speech to text
        handleSpeechTranscript(config);
        if (transcriptSendToAll) sendToDataChannel(config);
    };

    recognition.onaudiostart = () => {
        console.log('Speech recognition start to capture your voice');
    };

    recognition.onaudioend = () => {
        console.log('Speech recognition stop to capture your voice');
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error', event.error);
        if (!recognitionFatalErrors.includes(event.error)) return;
        userLog('toast', `Transcription error ${event.error}`, 6000);
        stopAllRecognition();
    };

    recognition.onend = function () {
        console.log('Speech recognition stopped');
        isRecognitionEngineActive = false;
        // Prevent stopping in the absence of speech...
        if (isRecognitionNeeded()) {
            const delay = recognitionRestartDelay ?? 1000;
            recognitionRestartDelay = null;
            recognitionRestartTimer = setTimeout(startRecognitionEngine, delay);
        }
    };

    isWebkitSpeechRecognitionSupported = true;
    console.info('00. Browser supports webkitSpeechRecognition');
} else {
    console.warn(
        'This browser not supports webkitSpeechRecognition, check out supported browsers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API#browser_compatibility'
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
    recognitionDialect.style.display = list[1].length == 1 ? 'none' : '';
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
        handleRecognitionDialectChange();
    });
    recognitionDialect.addEventListener('change', handleRecognitionDialectChange);
}

/**
 * Select the recognition language and dialect by its code (e.g. it-IT)
 * @param {string} code dialect code
 * @returns {boolean} true if the dialect exists
 */
function setRecognitionDialect(code) {
    const index = langs.findIndex((lang) => lang.slice(1).some(([dialect]) => dialect === code));
    if (index < 0) return false;
    recognitionLanguage.selectedIndex = index;
    updateCountry();
    recognitionDialect.value = code;
    return true;
}

/**
 * Apply a new dialect while only the voice commands are listening (the selects are locked during captions)
 */
function handleRecognitionDialectChange() {
    if (isRecognitionEngineActive && !recognitionRunning && recognition.lang !== recognitionDialect.value) {
        restartRecognitionEngine();
    }
}

/**
 * Start speech recognition (captions)
 */
function startSpeech() {
    recognitionRunning = true;
    recognitionSelectDisabled(true);
    setCaptionRecognitionUI(true);
    if (isRecognitionEngineActive && recognition.lang !== recognitionDialect.value) {
        return restartRecognitionEngine();
    }
    startRecognitionEngine();
}

/**
 * Stop speech recognition (captions)
 */
function stopSpeech() {
    recognitionRunning = false;
    recognitionSelectDisabled(false);
    setCaptionRecognitionUI(false);
    stopRecognitionEngine();
    userLog('toast', 'Speech recognition stopped');
}

/**
 * Is the recognition needed by captions or voice commands
 * @returns {boolean}
 */
function isRecognitionNeeded() {
    return recognitionRunning || isVoiceCommandsActive;
}

/**
 * Start the shared recognition engine if needed and not already running
 */
function startRecognitionEngine() {
    clearTimeout(recognitionRestartTimer);
    if (!recognition || isRecognitionEngineActive || !isRecognitionNeeded()) return;
    try {
        recognition.lang = recognitionDialect.value;
        recognition.start();
        isRecognitionEngineActive = true;
    } catch (error) {
        console.error('Speech recognition start error', error);
    }
}

/**
 * Stop the shared recognition engine when nobody needs it anymore
 */
function stopRecognitionEngine() {
    if (isRecognitionNeeded()) return;
    clearTimeout(recognitionRestartTimer);
    if (isRecognitionEngineActive) recognition.stop();
}

/**
 * Restart the shared recognition engine (e.g. to apply a new language)
 */
function restartRecognitionEngine() {
    if (!isRecognitionEngineActive) return startRecognitionEngine();
    recognitionRestartDelay = 300;
    recognition.stop();
}

/**
 * Stop captions and voice commands
 */
function stopAllRecognition() {
    recognitionRunning = false;
    recognitionSelectDisabled(false);
    setCaptionRecognitionUI(false);
    if (isVoiceCommandsActive && typeof resetVoiceCommands === 'function') resetVoiceCommands();
    isVoiceCommandsActive = false;
    clearTimeout(recognitionRestartTimer);
    if (isRecognitionEngineActive) recognition.abort();
}

/**
 * Update the caption start/stop buttons
 * @param {boolean} active
 */
function setCaptionRecognitionUI(active) {
    elemDisplay(speechRecognitionStart, !active, 'block');
    elemDisplay(speechRecognitionStop, active, 'block');
    setColor(speechRecognitionIcon, active ? 'lime' : 'white');
}

/**
 * Disable recognition select options
 * @param {boolean} disabled
 */
function recognitionSelectDisabled(disabled = false) {
    recognitionLanguage.disabled = disabled;
    recognitionDialect.disabled = disabled;
}
