'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

const source = fs.readFileSync(path.join(__dirname, '../public/js/wakeLock.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

function eventTarget(properties = {}) {
    const listeners = {};
    return {
        ...properties,
        addEventListener(type, listener) {
            (listeners[type] ||= []).push(listener);
        },
        emit(type) {
            for (const listener of listeners[type] || []) listener();
        },
    };
}

function sentinel() {
    const lock = eventTarget({ released: false });
    lock.release = sinon.stub().callsFake(async () => {
        lock.released = true;
        lock.emit('release');
    });
    return lock;
}

describe('mobile screen wake lock', () => {
    let clock;
    let context;
    let request;
    let logs;
    let errors;
    let locks;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        logs = [];
        errors = [];
        locks = [];
        request = sinon.stub().callsFake(async () => {
            const lock = sentinel();
            locks.push(lock);
            return lock;
        });
        context = vm.createContext({
            navigator: { wakeLock: { request } },
            document: eventTarget({ visibilityState: 'visible', pictureInPictureElement: null }),
            window: eventTarget(),
            isDesktopDevice: false,
            myAudioStatus: true,
            myVideoStatus: false,
            myScreenStatus: false,
            switchKeepAwake: { checked: false },
            console: { info() {}, error: (...args) => errors.push(args), log() {} },
            userLog: (...args) => logs.push(args),
            setTimeout,
            clearTimeout,
        });
        vm.runInContext(source, context);
    });

    afterEach(() => clock.restore());

    const sync = async () => {
        context.syncWakeLockDebounced();
        await clock.tickAsync(50);
    };

    it('automatically locks only for audio without video or screen sharing', async () => {
        await sync();
        assert.equal(request.callCount, 1);
        assert.equal(request.firstCall.args[0], 'screen');
        assert.equal(context.switchKeepAwake.checked, true);
        context.myVideoStatus = true;
        await sync();
        assert.equal(locks[0].release.callCount, 1);
        assert.equal(context.switchKeepAwake.checked, false);
        context.myVideoStatus = false;
        context.myScreenStatus = true;
        await sync();
        assert.equal(request.callCount, 1);
        context.myScreenStatus = false;
        context.myAudioStatus = false;
        await sync();
        assert.equal(request.callCount, 1);
        assert.deepEqual(logs, []);
    });

    it('keeps manual intent independent of microphone, camera, and screen changes', async () => {
        context.applyKeepAwake(true, true);
        await clock.tickAsync(50);
        context.myVideoStatus = true;
        context.myScreenStatus = true;
        context.myAudioStatus = false;
        await sync();
        assert.equal(request.callCount, 1);
        assert.equal(locks[0].release.callCount, 0);
        assert.equal(logs[0][0], 'success');
        context.applyKeepAwake(false, true);
        assert.equal(logs.length, 1);
        await clock.tickAsync(50);
        assert.equal(locks[0].release.callCount, 1);
        assert.equal(logs[1][1], 'Device wake lock released');
    });

    it('reports that audio-only lock remains when manual keep-awake is disabled', async () => {
        context.applyKeepAwake(true);
        await clock.tickAsync(50);
        context.applyKeepAwake(false, true);
        await clock.tickAsync(50);
        assert.equal(locks[0].release.callCount, 0);
        assert.equal(logs[0][1], 'Manual keep-awake disabled; audio-only wake lock remains active');
    });

    it('does not request on desktop or unsupported browsers', async () => {
        context.isDesktopDevice = true;
        context.applyKeepAwake(true, true);
        await sync();
        assert.equal(request.callCount, 0);
        context.isDesktopDevice = false;
        context.navigator = {};
        assert.equal(context.isWakeLockSupported(), false);
        await sync();
        assert.equal(request.callCount, 0);
    });

    it('serializes overlapping requests and delays manual success until acquisition', async () => {
        const pending = deferred();
        request.returns(pending.promise);
        context.applyKeepAwake(true, true);
        await clock.tickAsync(50);
        await sync();
        await sync();
        assert.equal(request.callCount, 1);
        assert.deepEqual(logs, []);
        pending.resolve(sentinel());
        await clock.tickAsync(0);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][0], 'success');
    });

    it('releases a request that resolves after manual disable', async () => {
        context.myAudioStatus = false;
        const pending = deferred();
        request.returns(pending.promise);
        context.applyKeepAwake(true, true);
        await clock.tickAsync(50);
        context.applyKeepAwake(false, true);
        await clock.tickAsync(50);
        const lock = sentinel();
        pending.resolve(lock);
        await clock.tickAsync(0);
        assert.equal(lock.release.callCount, 1);
        assert.equal(context.switchKeepAwake.checked, false);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][1], 'Device wake lock released');
    });

    it('invalidates in-flight requests across pagehide and restores on pageshow', async () => {
        const pending = deferred();
        request.onFirstCall().returns(pending.promise);
        await sync();
        context.window.emit('pagehide');
        context.window.emit('pageshow');
        await clock.tickAsync(50);
        assert.equal(request.callCount, 1);
        const stale = sentinel();
        pending.resolve(stale);
        await clock.tickAsync(50);
        assert.equal(stale.release.callCount, 1);
        assert.equal(request.callCount, 2);
        assert.equal(context.switchKeepAwake.checked, true);
    });

    it('stays released after pagehide even while the document is still visible', async () => {
        await sync();
        context.window.emit('pagehide');
        await clock.tickAsync(200);
        assert.equal(locks[0].release.callCount, 1);
        assert.equal(request.callCount, 1);
        context.window.emit('pageshow');
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
    });

    it('releases while hidden or in Picture-in-Picture and restores when returning', async () => {
        await sync();
        context.document.visibilityState = 'hidden';
        context.document.emit('visibilitychange');
        await clock.tickAsync(50);
        assert.equal(locks[0].release.callCount, 1);
        context.document.visibilityState = 'visible';
        context.document.emit('visibilitychange');
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
        context.document.pictureInPictureElement = {};
        context.document.emit('enterpictureinpicture');
        await clock.tickAsync(50);
        assert.equal(locks[1].release.callCount, 1);
        context.document.pictureInPictureElement = null;
        context.document.emit('leavepictureinpicture');
        await clock.tickAsync(50);
        assert.equal(request.callCount, 3);
    });

    it('reacquires browser-released locks and ignores old sentinel events', async () => {
        await sync();
        locks[0].released = true;
        locks[0].emit('release');
        assert.equal(context.switchKeepAwake.checked, false);
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
        locks[0].emit('release');
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
        assert.equal(context.switchKeepAwake.checked, true);
    });

    it('serializes slow release and acquisition when keep-awake is re-enabled', async () => {
        context.myAudioStatus = false;
        context.applyKeepAwake(true);
        await clock.tickAsync(50);
        const pending = deferred();
        locks[0].release.callsFake(async () => {
            await pending.promise;
            locks[0].released = true;
            locks[0].emit('release');
        });
        context.applyKeepAwake(false, true);
        await clock.tickAsync(50);
        context.applyKeepAwake(true, true);
        await clock.tickAsync(100);
        assert.equal(locks[0].release.callCount, 1);
        assert.equal(request.callCount, 1);
        assert.deepEqual(logs, []);
        pending.resolve();
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][0], 'success');
    });

    it('reports acquisition failure without success or an automatic retry loop', async () => {
        request.rejects(new Error('Permission denied'));
        context.applyKeepAwake(true, true);
        await clock.tickAsync(500);
        assert.equal(request.callCount, 1);
        assert.equal(context.switchKeepAwake.checked, false);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][0], 'error');
        assert.match(logs[0][1], /Permission denied/);
        assert.equal(logs[0][2], 'top-end');
    });

    it('preserves actual lock state and reports manual release failure', async () => {
        context.myAudioStatus = false;
        context.applyKeepAwake(true);
        await clock.tickAsync(50);
        locks[0].release.rejects(new Error('Release failed'));
        context.switchKeepAwake.checked = false;
        context.applyKeepAwake(false, true);
        await clock.tickAsync(500);
        assert.equal(errors.length, 1);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][0], 'error');
        assert.equal(context.switchKeepAwake.checked, true);
        assert.equal(locks[0].release.callCount, 1);
    });

    it('logs automatic release failures without presenting successful release feedback', async () => {
        await sync();
        locks[0].release.rejects(new Error('Release failed'));
        context.document.visibilityState = 'hidden';
        context.document.emit('visibilitychange');
        await clock.tickAsync(500);
        assert.equal(errors.length, 1);
        assert.deepEqual(logs, []);
    });

    it('synchronizes track refreshes without changing manual intent', async () => {
        const start = client.indexOf('function refreshMyVideoStatus(');
        const end = client.indexOf('function manageButtons()', start);
        vm.runInContext(client.slice(start, end), context);
        context.myAudioStatus = false;
        context.applyKeepAwake(true);
        await clock.tickAsync(50);
        context.refreshMyVideoStatus({ getTracks: () => [{ kind: 'video', enabled: true }] });
        context.refreshMyAudioStatus({ getTracks: () => [{ kind: 'audio', enabled: false }] });
        await clock.tickAsync(50);
        assert.equal(context.myVideoStatus, true);
        assert.equal(context.myAudioStatus, false);
        assert.equal(locks[0].release.callCount, 0);
        context.applyKeepAwake(false);
        await clock.tickAsync(50);
        assert.equal(locks[0].release.callCount, 1);
        context.refreshMyVideoStatus({ getTracks: () => [{ kind: 'video', enabled: false }] });
        context.refreshMyAudioStatus({ getTracks: () => [{ kind: 'audio', enabled: true }] });
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
    });

    it('preserves manual intent through real audio and video handlers, including moderator changes', async () => {
        Object.assign(context, {
            useAudio: true,
            useVideo: true,
            audioBtn: {},
            videoBtn: {},
            myAudioStatusIcon: {},
            myVideoStatusIcon: {},
            myVideoAvatarImage: null,
            myVideo: {},
            initVideo: {},
            localAudioMediaStream: {},
            localVideoMediaStream: {},
            videoSelect: { value: 'camera' },
            isMobileDevice: true,
            bottomButtonsPlacement: 'top',
            className: { audioOn: 'audio-on', audioOff: 'audio-off', videoOff: 'video-off' },
            icons: { user: '' },
            getAudioTrack: () => ({ enabled: true }),
            getVideoTrack: () => ({ enabled: true }),
            getId: () => null,
            setMediaButtonsClass() {},
            setTippy() {},
            updateBackgroundControls() {},
            stopVideoTracks: async () => {},
            changeLocalCamera: async () => {},
            emitPeerStatus() {},
            playSound() {},
            displayElements() {},
            screenReaderAccessibility: { announceMessage() {} },
        });
        for (const name of [
            'handleAudio',
            'handleVideo',
            'setMyAudioStatus',
            'setMyVideoStatus',
            'setMyAudioOff',
            'setMyAudioOn',
            'setMyVideoOff',
        ]) {
            const start = client.indexOf(`function ${name}(`);
            const end = client.indexOf('\n/**', start);
            assert.ok(start >= 0 && end > start);
            const prefix = name === 'handleVideo' ? 'async ' : '';
            vm.runInContext(prefix + client.slice(start, end), context);
        }
        context.myAudioStatus = false;
        context.applyKeepAwake(true);
        await clock.tickAsync(50);
        context.handleAudio({}, false, true);
        context.handleAudio({}, false, false);
        await context.handleVideo({}, false, true);
        await context.handleVideo({}, false, false);
        context.setMyAudioOn('Moderator');
        context.setMyAudioOff('Moderator');
        await clock.tickAsync(50);
        assert.equal(locks[0].release.callCount, 0);
        context.applyKeepAwake(false);
        await clock.tickAsync(50);
        assert.equal(locks[0].release.callCount, 1);
        context.handleAudio({}, false, true);
        await clock.tickAsync(50);
        assert.equal(request.callCount, 2);
        await context.handleVideo({}, false, true);
        await clock.tickAsync(50);
        assert.equal(locks[1].release.callCount, 1);
        context.setMyVideoOff('Moderator');
        await clock.tickAsync(50);
        assert.equal(request.callCount, 3);
        context.setMyAudioOff('Moderator');
        await clock.tickAsync(50);
        assert.equal(locks[2].release.callCount, 1);
    });

    it('synchronizes automatic wake lock when screen sharing starts and stops', async () => {
        const track = { stop() {} };
        const stream = { getTracks: () => [track] };
        Object.assign(context, {
            localScreenDisplayStream: null,
            localScreenMediaStream: null,
            screenShareAudioContext: null,
            isScreenStreaming: false,
            localAudioMediaStream: null,
            useAudio: false,
            getVideoTrack: () => track,
            getAudioTrack: () => null,
            hasAudioTrack: () => false,
            mixScreenAndMicAudio: async () => null,
            getLocalScreenExtras: () => undefined,
            emitPeersAction() {},
            emitPeerStatus: async () => {},
            loadScreenMedia: async () => {},
            refreshMyStreamToPeers: async () => {},
            getId: () => null,
            adaptAspectRatio() {},
            peerInfo: {},
            screenReaderAccessibility: { announceMessage() {} },
            MediaStream: function () {
                return stream;
            },
        });
        context.navigator.mediaDevices = { getDisplayMedia: async () => stream };
        for (const name of ['startScreenSharing', 'stopScreenSharing']) {
            const start = client.indexOf(`async function ${name}(`);
            const end = client.indexOf('\n/**', start);
            assert.ok(start >= 0 && end > start);
            vm.runInContext(client.slice(start, end), context);
        }
        await sync();
        await context.startScreenSharing({}, false);
        await clock.tickAsync(50);
        assert.equal(context.myScreenStatus, true);
        assert.equal(locks[0].release.callCount, 1);
        await context.stopScreenSharing(false);
        await clock.tickAsync(50);
        assert.equal(context.myScreenStatus, false);
        assert.equal(request.callCount, 2);
    });
});
