'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

function extractFunction(name) {
    const start = client.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
    assert.notEqual(start, -1, `${name} not found`);
    const end = client.indexOf('\n}\n', start);
    return client.slice(start, end + 3);
}

const source = [
    'initEnumerateAudioDevices',
    'initEnumerateVideoDevices',
    'getUserMediaWithDeviceFallback',
    'getStreamDeviceId',
    'selectDeviceInSelects',
    'selectOptionByValueExist',
    'notifyBusyDevice',
    'handleMediaError',
    'getMediaUnavailableInfo',
    'addChild',
    'enumerateAudioDevices',
    'enumerateVideoDevices',
    'stopTracks',
]
    .map(extractFunction)
    .join('\n');

function domError(name) {
    const err = new Error(name);
    err.name = name;
    return err;
}

function createSelect() {
    return {
        options: [],
        selectedIndex: 0,
        appendChild(option) {
            this.options.push(option);
        },
        get length() {
            return this.options.length;
        },
        get value() {
            return this.options[this.selectedIndex]?.value ?? '';
        },
        set value(v) {
            this.selectedIndex = this.options.findIndex((o) => o.value === v);
        },
    };
}

function createStream(deviceId) {
    const track = { stop: sinon.spy(), getSettings: () => ({ deviceId }) };
    return { getTracks: () => [track], getVideoTracks: () => [track], track };
}

describe('busy or broken default media devices', () => {
    let context;
    let getUserMedia;
    let userLog;

    function setup({ devices, getUserMediaImpl }) {
        getUserMedia = sinon.spy(getUserMediaImpl);
        userLog = sinon.spy();
        context = vm.createContext({
            navigator: {
                mediaDevices: {
                    getUserMedia,
                    enumerateDevices: async () => devices,
                },
            },
            document: { createElement: () => ({ value: '', innerText: '' }) },
            console: { log() {}, warn() {}, error() {} },
            lS: { DEVICES_COUNT: { video: 0, audio: 0, speaker: 0 } },
            videoSelect: createSelect(),
            initVideoSelect: createSelect(),
            audioInputSelect: createSelect(),
            initMicrophoneSelect: createSelect(),
            audioOutputSelect: createSelect(),
            initSpeakerSelect: createSelect(),
            audioOutputDiv: {},
            sinkId: true,
            useAudio: true,
            useVideo: true,
            isEnumerateVideoDevices: false,
            isEnumerateAudioDevices: false,
            mediaErrors: { audio: null, video: null },
            cameraEffects: null,
            displayElements() {},
            userLog,
        });
        vm.runInContext(source, context);
    }

    const devices = [
        { kind: 'videoinput', deviceId: 'cam-busy', label: 'OBS Virtual Camera' },
        { kind: 'videoinput', deviceId: 'cam-ok', label: 'FaceTime HD' },
        { kind: 'audioinput', deviceId: 'default', label: 'Default' },
        { kind: 'audioinput', deviceId: 'mic-busy', label: 'OBS Mic' },
        { kind: 'audioinput', deviceId: 'mic-ok', label: 'Built-in Mic' },
    ];

    function busyDefault(okVideo, okAudio) {
        return async (constraints) => {
            const video = constraints.video;
            const audio = constraints.audio;
            const id = (video || audio)?.deviceId?.exact;
            if (!id) throw domError('NotReadableError');
            if (id === okVideo || id === okAudio) return createStream(id);
            throw domError('NotReadableError');
        };
    }

    it('falls back to another camera and keeps the lists populated', async () => {
        setup({ devices, getUserMediaImpl: busyDefault('cam-ok', 'mic-ok') });
        await context.initEnumerateVideoDevices();
        assert.equal(context.useVideo, true);
        assert.equal(context.videoSelect.length, 2);
        assert.equal(context.videoSelect.value, 'cam-ok');
        assert.equal(context.initVideoSelect.value, 'cam-ok');
        assert.equal(context.isEnumerateVideoDevices, true);
    });

    it('falls back to another microphone, skipping the default alias', async () => {
        setup({ devices, getUserMediaImpl: busyDefault('cam-ok', 'mic-ok') });
        await context.initEnumerateAudioDevices();
        assert.equal(context.useAudio, true);
        assert.equal(context.audioInputSelect.value, 'mic-ok');
        const tried = getUserMedia.args.map(([c]) => c.audio?.deviceId?.exact).filter(Boolean);
        assert.deepEqual(tried, ['mic-busy', 'mic-ok']);
    });

    it('disables the device and warns when every device is busy', async () => {
        setup({ devices, getUserMediaImpl: busyDefault(null, null) });
        await context.initEnumerateVideoDevices();
        assert.equal(context.useVideo, false);
        sinon.assert.calledWithMatch(userLog, 'warning', sinon.match(/camera is busy/));
    });

    it('does not try other devices when the permission is denied', async () => {
        setup({
            devices,
            getUserMediaImpl: async () => {
                throw domError('NotAllowedError');
            },
        });
        await context.initEnumerateAudioDevices();
        assert.equal(context.useAudio, false);
        assert.equal(getUserMedia.callCount, 1);
        sinon.assert.notCalled(userLog);
    });

    it('keeps the default device when it works', async () => {
        setup({ devices, getUserMediaImpl: async () => createStream('cam-busy') });
        await context.initEnumerateVideoDevices();
        assert.equal(getUserMedia.callCount, 1);
        assert.equal(context.videoSelect.value, 'cam-busy');
    });

    it('handleMediaError informs the user without redirecting or throwing', () => {
        setup({ devices, getUserMediaImpl: async () => createStream('x') });
        assert.doesNotThrow(() => context.handleMediaError('audio', domError('NotReadableError')));
        sinon.assert.calledWithMatch(userLog, 'warning', sinon.match(/Already in use/));
    });

    it('remembers why a device is unavailable and clears it once it works', async () => {
        setup({
            devices,
            getUserMediaImpl: async () => {
                throw domError('NotAllowedError');
            },
        });
        await context.initEnumerateAudioDevices();
        assert.equal(context.mediaErrors.audio, 'NotAllowedError');
        assert.equal(context.getMediaUnavailableInfo('audio').type, 'blocked');

        context.navigator.mediaDevices.getUserMedia = async () => createStream('mic-ok');
        context.isEnumerateAudioDevices = false;
        await context.initEnumerateAudioDevices();
        assert.equal(context.useAudio, true);
        assert.equal(context.mediaErrors.audio, null);
    });

    it('describes the unavailable device by error type', () => {
        setup({ devices, getUserMediaImpl: async () => createStream('x') });
        const cases = [
            ['video', 'NotFoundError', 'missing'],
            ['audio', 'NotReadableError', 'busy'],
            ['video', 'NotAllowedError', 'blocked'],
            ['audio', 'TypeError', 'error'],
        ];
        for (const [kind, name, type] of cases) {
            context.mediaErrors[kind] = name;
            assert.equal(context.getMediaUnavailableInfo(kind).type, type, `${kind} ${name}`);
        }
    });

    it('addChild shows the fallback name for devices without a label', async () => {
        setup({ devices, getUserMediaImpl: async () => createStream('x') });
        const el = createSelect();
        await context.addChild({ kind: 'audioinput', deviceId: 'a', label: '' }, [el]);
        await context.addChild({ kind: 'videoinput', deviceId: 'b', label: '' }, [el]);
        await context.addChild({ kind: 'audiooutput', deviceId: 'c', label: 'Speakers' }, [el]);
        assert.deepEqual(
            el.options.map((o) => o.innerText),
            ['🎤 microphone 1', '📹 camera 2', '🔈 Speakers']
        );
    });
});
