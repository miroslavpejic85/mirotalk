'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const clientSource = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');
function section(start, end) {
    const startIndex = clientSource.indexOf(start);
    const endIndex = clientSource.indexOf(end, startIndex);
    assert.ok(startIndex >= 0 && endIndex > startIndex, `Missing client section: ${start}`);
    return clientSource.slice(startIndex, endIndex);
}
const source = [
    section('let mediaRecorder;', '// whiteboard'),
    section('function checkRecording()', '/**\n * Get time to string HH:MM:SS'),
    section('function startStreamRecording()', '/**\n * Starts mobile recording'),
    section('function handleMediaRecorder(mediaRecorder)', '/**\n * Create Chat Room Data Channel'),
    section('function saveBlobToFile(blob, file)', '/**\n * Prefill the settings media URL'),
    section('function initExitMeeting()', 'function redirectOnLeave()'),
].join('\n');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('saving recordings before room exit', () => {
    let context;
    let recorder;
    let events;
    let popups;
    let errors;
    let cleanup;
    let survey;
    let processing;
    let downloadedBlob;
    let downloadError;

    beforeEach(() => {
        events = [];
        popups = [];
        errors = [];
        cleanup = [];
        survey = deferred();
        processing = deferred();
        downloadedBlob = null;
        downloadError = null;
        const listeners = {};
        recorder = {
            state: 'inactive',
            stopCount: 0,
            start(timeslice) {
                assert.equal(timeslice, 1000);
                this.state = 'recording';
            },
            stop() {
                assert.notEqual(this.state, 'inactive');
                this.stopCount++;
                this.state = 'inactive';
                events.push('stop-requested');
            },
            addEventListener(type, listener) {
                listeners[type] = listener;
            },
            emit(type, event = {}) {
                return listeners[type](event);
            },
        };
        context = vm.createContext({
            Blob,
            console: { log() {}, warn() {}, error() {} },
            recorder,
            surveyActive: true,
            surveyURL: 'https://survey.example/rate',
            swBg: '#000',
            images: { feedback: 'feedback.svg' },
            isMobileDevice: false,
            myPeerName: 'Guest',
            myVideoPeerName: { innerText: 'Guest' },
            recordingTime: { innerText: '10s' },
            lastRecordingInfo: { innerHTML: '' },
            recordStreamBtn: { querySelector: () => ({ style: { setProperty() {} } }) },
            audioMixer: { stopMixedAudioStream: () => events.push('mixer-stopped') },
            performance: { now: () => 10000 },
            toggleVideoAudioTabs() {},
            startRecordingTimer() {},
            stopRecordingTimer() {},
            emitPeersAction() {},
            emitPeerStatus() {},
            setRecordStreamBtnLabel() {},
            playSound() {},
            screenReaderAccessibility: { announceMessage() {} },
            elemDisplay() {},
            getDataTimeString: () => '2026-10-04',
            bytesToSize: (size) => `${size} bytes`,
            renderRoomTemplate: (_id, { html }) => html.recordingInfo,
            msgHTML: () => events.push('recording-info'),
            userLog: (type, message) => errors.push({ type, message }),
            redirectOnLeave: () => events.push('redirect'),
            openURL: (url) => events.push(url),
            Swal: {
                fire(options) {
                    popups.push(options);
                    if (options.didOpen) options.didOpen();
                    return options.title === 'Leave the meeting?' ? survey.promise : Promise.resolve({});
                },
                showLoading: () => events.push('loading'),
                close: () => events.push('close-progress'),
            },
            document: {
                createElement: () => ({
                    click() {
                        if (downloadError) throw downloadError;
                        events.push('download');
                    },
                }),
                body: {
                    appendChild() {},
                    removeChild: () => events.push('anchor-removed'),
                },
            },
            window: {
                FixWebmDuration(blob) {
                    events.push('processing');
                    return processing.promise.then(() => blob);
                },
                URL: {
                    createObjectURL(blob) {
                        downloadedBlob = blob;
                        return 'blob:recording';
                    },
                    revokeObjectURL: () => events.push('url-revoked'),
                },
            },
            setTimeout(callback, delay) {
                assert.equal(delay, 100);
                cleanup.push(callback);
            },
        });
        vm.runInContext(source, context);
        vm.runInContext('mediaRecorder = recorder; audioRecorder = audioMixer; recordedBlobs = [];', context);
    });

    function start(type = 'video/webm') {
        context.handleMediaRecorder(recorder);
        recorder.emit('start');
        recorder.emit('dataavailable', { data: new Blob(['initial'], { type }) });
    }

    function finish(type = 'video/webm') {
        recorder.state = 'inactive';
        recorder.emit('dataavailable', { data: new Blob(['final'], { type }) });
        return recorder.emit('stop');
    }

    async function completeDownload() {
        processing.resolve();
        await flush();
        cleanup.splice(0).forEach((callback) => callback());
        await flush();
    }

    for (const [label, surveyActive, result, destination] of [
        ['leaving without rating', true, { isConfirmed: true }, 'redirect'],
        ['leaving to rate', true, { isDenied: true }, 'https://survey.example/rate'],
        ['leaving with surveys disabled', false, null, 'redirect'],
    ]) {
        it(`waits for final data, processing, and download before ${label}`, async () => {
            start();
            context.surveyActive = surveyActive;
            const leaving = context.leaveRoom();
            if (result) {
                assert.equal(recorder.stopCount, 0);
                survey.resolve(result);
                await flush();
            }
            assert.equal(recorder.stopCount, 1);
            const progress = popups.at(-1);
            assert.equal(progress.position, 'center');
            assert.equal(progress.showConfirmButton, false);
            assert.equal(progress.allowOutsideClick, false);
            assert.equal(progress.allowEscapeKey, false);
            assert.equal(progress.text, 'Please wait while your recording is prepared for download.');
            assert.ok(!events.includes(destination));

            finish();
            await flush();
            assert.ok(events.includes('processing'));
            assert.ok(!events.includes('download'));
            assert.ok(!events.includes(destination));

            processing.resolve();
            await flush();
            assert.equal(await downloadedBlob.text(), 'initialfinal');
            assert.ok(events.includes('download'));
            assert.ok(!events.includes(destination));
            assert.ok(!events.includes('recording-info'));

            await completeDownload();
            await leaving;
            assert.deepEqual(events.slice(-4), ['anchor-removed', 'url-revoked', 'close-progress', destination]);
            assert.deepEqual(errors, []);
        });
    }

    it('leaves paused recordings only after saving them', async () => {
        start('video/mp4');
        recorder.state = 'paused';
        const leaving = context.exitRoom();
        finish('video/mp4');
        await flush();
        assert.equal(recorder.stopCount, 1);
        assert.ok(!events.includes('redirect'));
        await completeDownload();
        await leaving;
        assert.ok(events.includes('redirect'));
    });

    it('does not stop or save when choosing to stay in the meeting', async () => {
        start();
        const leaving = context.leaveRoom();
        survey.resolve({ isDismissed: true, dismiss: 'cancel' });
        await leaving;
        assert.equal(recorder.state, 'recording');
        assert.equal(recorder.stopCount, 0);
        assert.deepEqual(events, []);
    });

    it('waits for a manual stop already in progress without stopping twice', async () => {
        start();
        context.stopStreamRecording();
        const leaving = context.exitRoom();
        assert.equal(recorder.stopCount, 1);
        finish();
        await completeDownload();
        await leaving;
        assert.equal(recorder.stopCount, 1);
        assert.ok(events.includes('redirect'));
    });

    it('waits when the recorder has already stopped but processing is unfinished', async () => {
        start();
        finish();
        const leaving = context.exitRoom();
        assert.equal(recorder.stopCount, 0);
        assert.ok(!events.includes('redirect'));
        await completeDownload();
        await leaving;
        assert.ok(events.includes('redirect'));
    });

    it('ignores repeated leave requests while saving', async () => {
        start();
        const leaving = context.exitRoom();
        await context.exitRoom();
        context.leaveRoom();
        assert.equal(recorder.stopCount, 1);
        assert.equal(popups.length, 1);
        finish();
        await completeDownload();
        await leaving;
        assert.equal(events.filter((event) => event === 'redirect').length, 1);
    });

    it('shows an error and keeps the page open when no data was recorded', async () => {
        context.handleMediaRecorder(recorder);
        recorder.emit('start');
        const leaving = context.exitRoom();
        recorder.emit('stop');
        await leaving;
        assert.ok(!events.includes('redirect'));
        assert.ok(!events.includes('download'));
        assert.equal(errors.length, 1);
        assert.equal(errors[0].type, 'error');
        assert.match(errors[0].message, /No data was recorded/);
        await context.exitRoom();
        assert.ok(!events.includes('redirect'));
        assert.equal(vm.runInContext('isLeavingRoom', context), false);
    });

    it('shows an error and preserves recording data when downloading fails', async () => {
        start();
        downloadError = new Error('Download blocked');
        const leaving = context.exitRoom('https://survey.example/rate');
        finish();
        processing.resolve();
        await leaving;
        assert.ok(!events.includes('https://survey.example/rate'));
        assert.match(errors[0].message, /Download blocked/);
        assert.equal(vm.runInContext('recordedBlobs.length', context), 2);
    });

    it('preserves the original WebM download fallback when duration repair fails', async () => {
        start();
        const leaving = context.exitRoom();
        finish();
        processing.reject(new Error('Duration repair failed'));
        await flush();
        cleanup.splice(0).forEach((callback) => callback());
        await leaving;
        assert.equal(await downloadedBlob.text(), 'initialfinal');
        assert.ok(events.includes('redirect'));
        assert.deepEqual(errors, []);
    });

    it('keeps the recording-info popup when stopping manually', async () => {
        start();
        const saving = context.stopStreamRecording();
        finish();
        await completeDownload();
        await saving;
        assert.ok(events.includes('recording-info'));
        assert.ok(events.includes('download'));
        assert.ok(!events.includes('redirect'));
    });

    it('reports manual save failures even when nobody awaits the recording', async () => {
        context.handleMediaRecorder(recorder);
        recorder.emit('start');
        context.stopStreamRecording();
        recorder.emit('stop');
        await flush();
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /No data was recorded/);
    });

    it('does not overwrite recording data while a save is pending', () => {
        start();
        context.startStreamRecording();
        assert.equal(vm.runInContext('recordedBlobs.length', context), 1);
        assert.equal(errors[0].type, 'warning');
    });

    it('preserves exits without a recording and does not show progress', async () => {
        await context.exitRoom();
        assert.deepEqual(events, ['redirect']);
        assert.deepEqual(popups, []);
    });

    it('routes explicit exit destinations through the same recording save flow', async () => {
        start();
        const leaving = context.initExitMeeting();
        finish();
        await completeDownload();
        await leaving;
        assert.ok(events.includes('/newcall'));
        assert.ok(!events.includes('redirect'));
    });
});
