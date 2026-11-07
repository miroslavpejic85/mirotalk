'use strict';

// npx mocha tests/test-voiceCommands.js

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const speechSource = read('public/js/speechRecognition.js');
const voiceSource = read('public/js/voiceCommands.js');

class FakeSpeechRecognition {
    constructor() {
        FakeSpeechRecognition.instances.push(this);
        this.running = false;
        this.starts = [];
        this.stops = 0;
        this.aborts = 0;
    }
    start() {
        if (this.running) throw new Error('InvalidStateError');
        this.running = true;
        this.starts.push(this.lang);
    }
    stop() {
        this.stops++;
        this.running = false;
    }
    abort() {
        this.aborts++;
        this.running = false;
    }
    // Simulate a final recognition result
    say(transcript) {
        this.onresult({ resultIndex: 0, results: [[{ transcript }]] });
    }
}
FakeSpeechRecognition.instances = [];

function createRoom({ withSpeech = true } = {}) {
    FakeSpeechRecognition.instances = [];
    const dom = new JSDOM(`<!doctype html><body>
        <select id="recognitionLanguage"></select><select id="recognitionDialect"></select>
        <button id="speechRecognitionStart"></button><button id="speechRecognitionStop"></button>
        <button id="speechRecognitionIcon"></button>
        <button id="voiceCommandsBtn"><i id="voiceCommandsIcon" class="fas fa-microphone-slash"></i></button>
        <button id="videoBtn"></button><button id="audioBtn"></button>
    </body>`);
    const { window } = dom;
    const calls = { transcripts: [], sent: [], logs: [], clicks: [] };
    const getId = (id) => window.document.getElementById(id);
    getId('videoBtn').addEventListener('click', () => calls.clicks.push('videoBtn'));
    getId('audioBtn').addEventListener('click', () => calls.clicks.push('audioBtn'));

    const context = vm.createContext({
        window: withSpeech ? { webkitSpeechRecognition: FakeSpeechRecognition } : {},
        document: window.document,
        Option: window.Option,
        console: { log() {}, info() {}, warn() {}, error() {} },
        setTimeout,
        clearTimeout,
        getId,
        elemDisplay: (el, display) => el && (el.style.display = display ? 'block' : 'none'),
        setColor: (el, color) => el && (el.style.color = color),
        userLog: (type, message) => calls.logs.push({ type, message }),
        handleSpeechTranscript: (config) => calls.transcripts.push(config.text_data),
        sendToDataChannel: (config) => calls.sent.push(config.text_data),
        transcriptSendToAll: true,
        myAudioStatus: true,
        myVideoStatus: true,
        isMobileDevice: false,
        roomId: 'room',
        myPeerName: 'me',
        myPeerAvatar: '',
        videoBtn: getId('videoBtn'),
        audioBtn: getId('audioBtn'),
        speechRecognitionStart: getId('speechRecognitionStart'),
        speechRecognitionStop: getId('speechRecognitionStop'),
        speechRecognitionIcon: getId('speechRecognitionIcon'),
    });
    vm.runInContext(speechSource, context, { filename: 'speechRecognition.js' });
    vm.runInContext(voiceSource, context, { filename: 'voiceCommands.js' });
    const state = () =>
        vm.runInContext(
            '({ recognitionRunning, isVoiceCommandsActive, isRecognitionEngineActive, lang: recognitionDialect.value })',
            context
        );
    const expose = vm.runInContext('({ voiceCommandHandlers, voiceCommandActions, langs })', context);
    return { context, calls, getId, state, rec: FakeSpeechRecognition.instances[0], ...expose };
}

describe('voice commands', () => {
    describe('dictionaries', () => {
        const { voiceCommandHandlers, voiceCommandActions, langs } = createRoom();
        const englishKeys = Object.keys(voiceCommandHandlers.en.commands);

        it('supports the same languages as MiroTalk SFU', () => {
            assert.deepEqual(Object.keys(voiceCommandHandlers), [
                'en',
                'bn',
                'es',
                'fr',
                'it',
                'de',
                'pt',
                'ja',
                'zh',
                'ar',
            ]);
        });

        it('has an action for every command and a command for every action', () => {
            assert.deepEqual([...englishKeys].sort(), Object.keys(voiceCommandActions).sort());
        });

        it('keeps the same commands in every language with unique lowercase phrases', () => {
            for (const [lang, handler] of Object.entries(voiceCommandHandlers)) {
                const keys = Object.keys(handler.commands);
                // Bangla has no "recognize bangla" phrase: it is already the active language
                const expected = englishKeys.filter((key) => !(lang === 'bn' && key === 'recognizeBangla'));
                assert.deepEqual(keys, expected, `${lang} keys`);
                const phrases = Object.values(handler.commands);
                assert.equal(new Set(phrases).size, phrases.length, `${lang} has duplicated phrases`);
                phrases.forEach((phrase) => assert.equal(phrase, phrase.toLowerCase().trim(), `${lang}: ${phrase}`));
            }
        });

        it('maps every command language to a selectable recognition dialect', () => {
            const dialects = langs.flatMap((lang) => lang.slice(1).map(([code]) => code));
            for (const [lang, handler] of Object.entries(voiceCommandHandlers)) {
                assert.ok(dialects.includes(handler.langCode), `${lang}: ${handler.langCode}`);
            }
        });

        it('does not include commands that need a real user gesture', () => {
            for (const key of ['screenOn', 'snapshotRoom', 'fullScreen', 'pictureInPicture', 'fileShareOn', 'google']) {
                assert.equal(key in voiceCommandActions, false, key);
            }
        });
    });

    describe('matching', () => {
        const { context } = createRoom();

        it('resolves the commands language from the recognition dialect', () => {
            const lang = (code) => context.getVoiceCommandLanguage(code);
            assert.equal(lang('en-GB'), 'en');
            assert.equal(lang('it-CH'), 'it');
            assert.equal(lang('cmn-Hant-TW'), 'zh');
            assert.equal(lang('yue-Hant-HK'), 'zh');
            assert.equal(lang('bn-IN'), 'bn');
            assert.equal(lang('ar-EG'), 'ar');
            assert.equal(lang('pl-PL'), null);
        });

        it('matches whole normalized phrases only', () => {
            assert.equal(context.findVoiceCommand('  Stop the Video. ', 'en-US'), 'videoOff');
            assert.equal(context.findVoiceCommand("Activer l'audio", 'fr-FR'), 'audioOn');
            assert.equal(context.findVoiceCommand('please stop the video now', 'en-US'), null);
            assert.equal(context.findVoiceCommand('stop the video', 'pl-PL'), null);
        });
    });

    describe('shared recognition engine', () => {
        it('executes commands locally and never shares them as captions', () => {
            const { context, calls, rec, getId, state } = createRoom();
            context.startSpeech();
            context.startVoiceCommands();
            assert.equal(rec.starts.length, 1, 'captions and voice commands share one session');

            rec.say('stop the video');
            assert.deepEqual(calls.clicks, ['videoBtn']);
            assert.deepEqual(calls.sent, []);
            assert.deepEqual(calls.transcripts, []);
            assert.ok(context.document.querySelector('.voice-caption.is-visible.is-matched'));
            assert.deepEqual(
                calls.logs.map((log) => log.message),
                ['Voice commands started'],
                'the banner is the only feedback for a command'
            );

            rec.say('hello everyone');
            assert.deepEqual(calls.sent, ['hello everyone']);
            assert.equal(context.document.querySelector('.voice-caption').classList.contains('is-matched'), false);

            assert.equal(getId('voiceCommandsIcon').classList.contains('fa-microphone'), true);
            assert.equal(state().isVoiceCommandsActive, true);
        });

        it('runs commands while muted but keeps captions muted', () => {
            const { context, calls, rec } = createRoom();
            context.myAudioStatus = false;
            context.startSpeech();
            context.startVoiceCommands();
            rec.say('start the audio');
            rec.say('a private thought');
            assert.deepEqual(calls.clicks, ['audioBtn']);
            assert.deepEqual(calls.sent, []);
        });

        it('keeps listening for commands when captions stop, and stops when both are off', () => {
            const { context, rec, state } = createRoom();
            context.startVoiceCommands();
            context.startSpeech();
            context.stopSpeech();
            assert.equal(rec.stops, 0);
            assert.equal(state().isRecognitionEngineActive, true);

            context.stopVoiceCommands();
            assert.equal(rec.stops, 1);
            rec.onend();
            assert.equal(state().isRecognitionEngineActive, false);
        });

        it('ignores the transcript as command when only captions are on', () => {
            const { context, calls, rec } = createRoom();
            context.startSpeech();
            rec.say('stop the video');
            assert.deepEqual(calls.clicks, []);
            assert.deepEqual(calls.sent, ['stop the video']);
            assert.equal(context.document.querySelector('.voice-caption'), null);
        });

        it('switches the recognition language by voice', async () => {
            const { context, rec, state, voiceCommandHandlers } = createRoom();
            context.startVoiceCommands();
            rec.say('recognize italian');
            assert.equal(state().lang, 'it-IT');
            assert.equal(rec.stops, 1);
            rec.onend();
            await new Promise((resolve) => setTimeout(resolve, 350));
            assert.deepEqual(rec.starts, ['en-US', 'it-IT']);
            rec.say(voiceCommandHandlers.it.commands.stopRecognition);
            assert.equal(state().isVoiceCommandsActive, false);
        });

        it('stops captions and voice commands on fatal errors instead of restarting forever', () => {
            const { context, rec, state, getId } = createRoom();
            context.startSpeech();
            context.startVoiceCommands();
            rec.onerror({ error: 'not-allowed' });
            rec.onend();
            const current = state();
            assert.equal(current.recognitionRunning, false);
            assert.equal(current.isVoiceCommandsActive, false);
            assert.equal(current.isRecognitionEngineActive, false);
            assert.equal(rec.aborts, 1);
            assert.equal(getId('voiceCommandsIcon').classList.contains('fa-microphone-slash'), true);
        });

        it('stays inert when the browser has no Web Speech API', () => {
            const { context } = createRoom({ withSpeech: false });
            assert.doesNotThrow(() => context.startVoiceCommands());
            assert.equal(vm.runInContext('isVoiceCommandsActive', context), false);
        });
    });

    describe('wiring', () => {
        const html = read('public/views/client.html');

        it('adds the button to the settings extra menu TOOLS group', () => {
            const menu = html.slice(html.indexOf('id="settingsExtraMenu"'), html.indexOf('id="exitDropdown"'));
            assert.match(menu, /<button id="voiceCommandsBtn" class="app-dropdown-action"/);
            assert.match(menu, /data-buttons="voiceCommandsBtn,captionBtn,/);
            assert.ok(html.indexOf('../js/speechRecognition.js') < html.indexOf('../js/voiceCommands.js'));
        });

        it('can be hidden from config', () => {
            assert.match(read('public/js/buttons.js'), /showVoiceCommandsBtn: true/);
            assert.match(
                read('app/src/config.template.js'),
                /showVoiceCommandsBtn: getEnvBoolean\(process\.env\.SHOW_VOICE_COMMANDS_BUTTON, true\)/
            );
            assert.match(read('.env.template'), /^SHOW_VOICE_COMMANDS_BUTTON=true/m);
            assert.match(
                read('public/js/client.js'),
                /element: getId\('voiceCommandsBtn'\), display: buttons\.main\.showVoiceCommandsBtn && !!speechRecognition/
            );
        });
    });
});
