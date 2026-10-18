'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

function extractFunction(name) {
    const start = client.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

const source = [
    'playRemoteAudio',
    'unlockBlockedAudio',
    'resumeInterruptedAudio',
    'setAudioUnlockListeners',
    'updateAudioUnlockPrompt',
]
    .map(extractFunction)
    .join('\n');

function domError(name) {
    const err = new Error(name);
    err.name = name;
    return err;
}

describe('remote audio autoplay unlock (Safari autoplay policy)', () => {
    let dom;
    let window;
    let document;
    let context;

    beforeEach(() => {
        dom = new JSDOM('<!doctype html><html><body><div id="audioMediaContainer"></div></body></html>');
        window = dom.window;
        document = window.document;
        context = vm.createContext({
            window,
            document,
            console: { log() {}, info() {}, warn() {}, error() {} },
        });
        vm.runInContext(
            `const blockedAudioElements = new Set();
            let audioUnlockPrompt = null;
            let audioUnlockListening = false;
            let outputAudioContext = null;
            const audioMediaContainer = document.getElementById('audioMediaContainer');
            ${source}
            globalThis.api = {
                playRemoteAudio,
                unlockBlockedAudio,
                resumeInterruptedAudio,
                updateAudioUnlockPrompt,
                blocked: blockedAudioElements,
                isListening: () => audioUnlockListening,
                setOutputAudioContext: (ctx) => (outputAudioContext = ctx),
            };`,
            context
        );
    });

    afterEach(() => dom.window.close());

    function createAudio(peerName, play) {
        const elem = document.createElement('audio');
        elem._peerName = peerName;
        elem.play = sinon.stub().callsFake(play);
        document.getElementById('audioMediaContainer').appendChild(elem);
        return elem;
    }

    const blocked = () => Promise.reject(domError('NotAllowedError'));
    const allowed = () => Promise.resolve();
    const prompt = () => document.getElementById('audioUnlockPrompt');

    it('shows a contextual prompt when playback is blocked and recovers on the next user gesture', async () => {
        const { api } = context;
        const elem = createAudio('Bob', blocked);

        assert.equal(await api.playRemoteAudio(elem), false);
        assert.ok(api.blocked.has(elem));
        assert.ok(prompt().classList.contains('is-visible'));
        assert.equal(prompt().textContent, 'Enable audio to hear Bob');
        assert.equal(prompt().getAttribute('aria-label'), 'Enable audio to hear Bob');

        elem.play.callsFake(allowed);
        window.dispatchEvent(new window.MouseEvent('click'));
        assert.equal(elem.play.callCount, 2, 'play() must run synchronously inside the gesture');
        await new Promise(setImmediate);

        assert.equal(api.blocked.size, 0);
        assert.equal(prompt().classList.contains('is-visible'), false);
        assert.equal(api.isListening(), false);

        window.dispatchEvent(new window.MouseEvent('click'));
        assert.equal(elem.play.callCount, 2, 'gesture listeners are removed once audio plays');
    });

    it('uses a generic label when several participants are blocked and unlocks them with one tap', async () => {
        const { api } = context;
        const bob = createAudio('Bob', blocked);
        const alice = createAudio('Alice', blocked);

        await Promise.all([api.playRemoteAudio(bob), api.playRemoteAudio(alice)]);
        assert.equal(prompt().textContent, 'Enable audio to hear participants');

        bob.play.callsFake(allowed);
        alice.play.callsFake(allowed);
        prompt().click();
        await new Promise(setImmediate);

        assert.equal(api.blocked.size, 0);
        assert.equal(prompt().classList.contains('is-visible'), false);
    });

    it('keeps the prompt while the gesture still cannot start playback', async () => {
        const { api } = context;
        const elem = createAudio('Bob', blocked);
        await api.playRemoteAudio(elem);

        window.dispatchEvent(new window.Event('touchend'));
        await new Promise(setImmediate);

        assert.equal(elem.play.callCount, 2);
        assert.ok(api.blocked.has(elem));
        assert.ok(prompt().classList.contains('is-visible'));
        assert.equal(api.isListening(), true);
    });

    it('resumes a suspended output AudioContext on the unlock gesture', async () => {
        const { api } = context;
        const audioContext = { state: 'suspended', resume: sinon.stub().resolves() };
        api.setOutputAudioContext(audioContext);
        const elem = createAudio('Bob', blocked);
        await api.playRemoteAudio(elem);

        elem.play.callsFake(allowed);
        window.dispatchEvent(new window.KeyboardEvent('keydown'));
        await new Promise(setImmediate);

        assert.equal(audioContext.resume.callCount, 1);
    });

    it('ignores non-policy errors and detached elements', async () => {
        const { api } = context;
        const aborted = createAudio('Bob', () => Promise.reject(domError('AbortError')));
        assert.equal(await api.playRemoteAudio(aborted), false);
        assert.equal(api.blocked.size, 0);
        assert.equal(prompt(), null);

        const detached = createAudio('Carol', blocked);
        detached.remove();
        assert.equal(await api.playRemoteAudio(detached), false);
        assert.equal(detached.play.callCount, 0);
        assert.equal(api.blocked.size, 0);
    });

    it('hides the prompt when the blocked participant leaves', async () => {
        const { api } = context;
        const elem = createAudio('Bob', blocked);
        await api.playRemoteAudio(elem);

        elem.remove();
        api.updateAudioUnlockPrompt();

        assert.equal(api.blocked.size, 0);
        assert.equal(prompt().classList.contains('is-visible'), false);
        assert.equal(api.isListening(), false);
    });

    it('resumes audio interrupted while the page was hidden', async () => {
        const { api } = context;
        const elem = createAudio('Bob', allowed);
        elem.srcObject = {};
        sinon.stub(elem, 'paused').get(() => true);

        api.resumeInterruptedAudio();
        await new Promise(setImmediate);

        assert.equal(elem.play.callCount, 1);
    });

    it('translates the prompt label', async () => {
        const { api } = context;
        window.i18n = { t: (key) => (key === 'Enable audio to hear {name}' ? 'Attiva audio per {name}' : key) };
        const elem = createAudio('Bob', blocked);
        await api.playRemoteAudio(elem);
        assert.equal(prompt().textContent, 'Attiva audio per Bob');
    });

    it('no longer relies on the one-shot handleAudioFallback listeners', () => {
        assert.equal(client.includes('handleAudioFallback'), false);
    });
});
