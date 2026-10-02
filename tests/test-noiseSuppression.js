'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

describe('RNNoise worklet initialization', () => {
    let processor;
    let context;
    let module;
    let messages;

    beforeEach(() => {
        messages = [];
        module = {
            HEAPF32: new Float32Array(1024),
            _malloc: sinon.stub().returns(4),
            _free: sinon.spy(),
            _rnnoise_create: sinon.stub().returns(8),
            _rnnoise_destroy: sinon.spy(),
        };
        class AudioWorkletProcessor {
            constructor() {
                this.port = { postMessage: (message) => messages.push(message) };
            }
        }
        let Processor;
        context = vm.createContext({
            AudioWorkletProcessor,
            sampleRate: 48000,
            currentTime: 0,
            testModule: module,
            console: { log() {}, error() {}, warn() {} },
            registerProcessor: (name, implementation) => {
                Processor = implementation;
            },
        });
        vm.runInContext(
            fs.readFileSync(path.join(__dirname, '../public/js/noiseSuppressionProcessor.js'), 'utf8'),
            context
        );
        processor = new Processor();
    });

    it('reports readiness only after the RNNoise context is created', async () => {
        await processor.port.onmessage({
            data: { type: 'sync-module', jsContent: 'function createRNNWasmModuleSync() { return testModule; }' },
        });
        assert.equal(processor.initialized, true);
        assert.equal(module._rnnoise_create.callCount, 1);
        assert.equal(messages.at(-1).type, 'wasm-ready');
    });

    it('reports context creation failure and frees the allocated buffer', async () => {
        module._rnnoise_create.returns(0);
        await processor.port.onmessage({
            data: { type: 'sync-module', jsContent: 'function createRNNWasmModuleSync() { return testModule; }' },
        });
        assert.equal(processor.initialized, false);
        assert.equal(
            messages.some((message) => message.type === 'wasm-ready'),
            false
        );
        assert.equal(messages.at(-1).type, 'wasm-error');
        assert.equal(module._free.callCount, 1);
    });

    it('does not initialize after shutdown while the module is loading', async () => {
        let resolveModule;
        context.testModule = new Promise((resolve) => {
            resolveModule = resolve;
        });
        const initialization = processor.port.onmessage({
            data: { type: 'sync-module', jsContent: 'function createRNNWasmModuleSync() { return testModule; }' },
        });
        processor.destroy();
        resolveModule(module);
        await initialization;
        assert.equal(module._rnnoise_create.callCount, 0);
        assert.equal(processor.initialized, false);
        assert.equal(
            messages.some((message) => message.type === 'wasm-ready'),
            false
        );
        assert.equal(processor.process([], [], {}), false);
    });

    it('reports a DSP failure so the main thread can switch to native suppression', async () => {
        module._rnnoise_process_frame = sinon.stub().throws(new Error('WASM processing failed'));
        await processor.port.onmessage({
            data: { type: 'sync-module', jsContent: 'function createRNNWasmModuleSync() { return testModule; }' },
        });
        processor.enabled = true;
        const input = new Float32Array(480).fill(0.25);
        const output = new Float32Array(480);
        processor.process([[input]], [[output]], {});
        assert.equal(messages.at(-1).type, 'wasm-error');
        assert.match(messages.at(-1).error, /WASM processing failed/);
        assert.equal(output[479], 0.25);
    });
});

describe('RNNoise main-thread startup', () => {
    let processor;
    let worklet;
    let audioContext;
    let clock;
    let context;
    let rawStream;

    beforeEach(() => {
        clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        rawStream = { getAudioTracks: () => [{ kind: 'audio' }] };
        class AudioContext {
            constructor() {
                audioContext = this;
                this.sampleRate = 48000;
                this.state = 'running';
                this.createMediaStreamSource = sinon.stub().returns({ connect: sinon.spy(), disconnect() {} });
                this.createMediaStreamDestination = sinon.stub().returns({
                    stream: { getTracks: () => [{ stop: sinon.spy() }] },
                });
                this.close = sinon.stub().callsFake(async () => {
                    this.state = 'closed';
                });
            }
        }
        AudioContext.prototype.audioWorklet = { addModule: sinon.stub().resolves() };
        class AudioWorkletNode {
            constructor() {
                worklet = this;
                this.port = { postMessage: sinon.spy() };
                this.connect = sinon.spy();
                this.disconnect = sinon.spy();
            }
        }
        context = vm.createContext({
            window: { AudioContext },
            WebAssembly,
            AudioWorkletNode,
            setTimeout,
            clearTimeout,
            document: { getElementById: () => ({ style: {} }) },
            console: { log() {}, info() {}, warn() {}, error() {} },
            fetch: sinon.stub().resolves({ ok: true, text: async () => 'module' }),
        });
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/nodeProcessor.js'), 'utf8'), context);
        processor = vm.runInContext('new RNNoiseProcessor()', context);
    });

    afterEach(() => {
        processor.stopProcessing();
        clock.restore();
    });

    it('does not connect or return processed audio before WASM is ready', async () => {
        const startup = processor.startProcessing(rawStream);
        await clock.tickAsync(0);
        assert.equal(audioContext.createMediaStreamSource.callCount, 0);
        assert.equal(processor.isProcessing, false);
        worklet.port.onmessage({ data: { type: 'wasm-ready' } });
        const stream = await startup;
        assert.equal(stream, processor.destinationNode.stream);
        assert.equal(processor.isProcessing, true);
        assert.equal(clock.countTimers(), 0);
    });

    it('fails startup on a WASM error and closes the audio context', async () => {
        const startup = processor.startProcessing(rawStream);
        await clock.tickAsync(0);
        worklet.port.onmessage({ data: { type: 'wasm-error', error: 'WASM failed' } });
        assert.equal(await startup, null);
        assert.equal(audioContext.close.callCount, 1);
        assert.equal(processor.isProcessing, false);
    });

    it('fails startup when the WASM module cannot be fetched', async () => {
        context.fetch.resolves({ ok: false });
        const startup = processor.startProcessing(rawStream);
        await clock.tickAsync(0);
        worklet.port.onmessage({ data: { type: 'request-wasm' } });
        assert.equal(await startup, null);
        assert.equal(processor.workletNode, null);
    });

    it('times out without WASM acknowledgement instead of reporting success', async () => {
        const startup = processor.startProcessing(rawStream);
        await clock.tickAsync(0);
        await clock.tickAsync(10000);
        assert.equal(await startup, null);
        assert.equal(processor.isProcessing, false);
    });

    it('cancels startup when stopped while waiting for WASM', async () => {
        const startup = processor.startProcessing(rawStream);
        await clock.tickAsync(0);
        processor.stopProcessing();
        assert.equal(await startup, null);
        assert.equal(audioContext.createMediaStreamSource.callCount, 0);
        assert.equal(clock.countTimers(), 0);
    });

    it('does not recreate the graph when stopped during worklet module loading', async () => {
        let finishLoading;
        context.window.AudioContext.prototype.audioWorklet.addModule.callsFake(
            () =>
                new Promise((resolve) => {
                    finishLoading = resolve;
                })
        );
        const startup = processor.startProcessing(rawStream);
        processor.stopProcessing();
        finishLoading();
        assert.equal(await startup, null);
        assert.equal(audioContext.createMediaStreamSource.callCount, 0);
    });
});

describe('RNNoise client lifecycle', () => {
    let context;
    let rawStream;
    let rawTrack;
    let pending;
    let nativeSuppression;
    const source = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');

    function stream(track = { enabled: true, readyState: 'live', kind: 'audio', stop: sinon.spy() }) {
        return { getAudioTracks: () => [track], getTracks: () => [track] };
    }

    function loadFunction(name) {
        const declaration = source.indexOf(`function ${name}(`);
        const start = source.slice(declaration - 6, declaration) === 'async ' ? declaration - 6 : declaration;
        const end = source.indexOf('\n}', declaration) + 2;
        vm.runInContext(source.slice(start, end), context);
    }

    beforeEach(() => {
        pending = [];
        nativeSuppression = false;
        rawTrack = {
            enabled: false,
            readyState: 'live',
            kind: 'audio',
            stop: sinon.spy(),
            getConstraints: () => ({ deviceId: { exact: 'microphone' }, autoGainControl: true }),
            getSettings: () => ({ noiseSuppression: nativeSuppression }),
            applyConstraints: sinon.stub().callsFake(async (constraints) => {
                nativeSuppression = constraints.noiseSuppression;
            }),
        };
        rawStream = stream(rawTrack);
        class RNNoiseProcessor {
            static isSupported() {
                return true;
            }
            constructor() {
                this.stopProcessing = sinon.spy();
                this.toggleNoiseSuppression = sinon.spy();
            }
            startProcessing(input) {
                this.mediaStream = input;
                return new Promise((resolve) => pending.push({ processor: this, resolve, input }));
            }
        }
        context = vm.createContext({
            RNNoiseProcessor,
            noiseProcessor: null,
            noiseSuppressionRequest: 0,
            noiseSuppressionConstraints: Promise.resolve(),
            microphoneRequest: 0,
            localAudioMediaStream: rawStream,
            myAudioStatus: false,
            useAudio: true,
            lsSettings: { mic_noise_suppression: true },
            lS: { setSettings: sinon.spy() },
            buttons: { settings: { customNoiseSuppression: true } },
            switchNoiseSuppression: { checked: true },
            getId: () => null,
            getAudioTrack: (input) => input?.getAudioTracks()[0],
            refreshMyStreamToPeers: sinon.stub().resolves(),
            toastMessage: sinon.spy(),
            handleRNNoiseNotSupported: sinon.spy(),
            console: { log() {}, warn() {}, error() {} },
            audioBtn: {},
            setMediaButtonsClass() {},
            applyKeepAwake() {},
            setMyAudioStatus() {},
            screenReaderAccessibility: { announceMessage() {} },
            navigator: { mediaDevices: { getUserMedia: sinon.stub() } },
            getAudioConstraints: () => ({ audio: true }),
            myAudio: {},
            logStreamSettingsInfo() {},
            getMicrophoneVolumeIndicator() {},
            userLog() {},
        });
        for (const name of [
            'enableNoiseSuppression',
            'setMicrophoneNoiseSuppression',
            'fallbackNoiseSuppression',
            'disableNoiseSuppression',
            'stopNoiseSuppressionPipeline',
            'restartNoiseSuppression',
            'applyNoiseSuppression',
            'syncNoiseSuppressionUI',
            'handleAudio',
            'changeLocalMicrophone',
            'stopAudioTracks',
        ])
            loadFunction(name);
    });

    it('keeps processed audio muted while allowing the raw input to work after unmute', async () => {
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        const output = stream();
        pending[0].resolve(output);
        assert.equal(await operation, true);
        assert.equal(rawTrack.enabled, true);
        assert.equal(output.getAudioTracks()[0].enabled, false);
        context.handleAudio({}, false, true, false);
        assert.equal(rawTrack.enabled, true);
        assert.equal(output.getAudioTracks()[0].enabled, true);
        assert.equal(context.noiseProcessor.toggleNoiseSuppression.callCount, 1);
    });

    it('restores a correctly muted raw microphone on disable', async () => {
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(stream());
        await operation;
        const processor = context.noiseProcessor;
        await context.disableNoiseSuppression();
        assert.equal(context.localAudioMediaStream, rawStream);
        assert.equal(rawTrack.enabled, false);
        assert.equal(processor.stopProcessing.callCount, 1);
    });

    it('does not publish or toggle an older overlapping enable request', async () => {
        const first = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        const second = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        const currentOutput = stream();
        pending[1].resolve(currentOutput);
        assert.equal(await second, true);
        pending[0].resolve(stream());
        assert.equal(await first, false);
        assert.equal(context.localAudioMediaStream, currentOutput);
        assert.equal(context.noiseProcessor, pending[1].processor);
        assert.equal(pending[0].processor.toggleNoiseSuppression.callCount, 0);
        assert.equal(pending[1].processor.toggleNoiseSuppression.callCount, 1);
        assert.equal(context.refreshMyStreamToPeers.callCount, 1);
    });

    it('does not re-enable audio or change preferences after a newer disable request', async () => {
        const first = context.applyNoiseSuppression(true);
        await new Promise((resolve) => setImmediate(resolve));
        await context.applyNoiseSuppression(false);
        pending[0].resolve(stream());
        assert.equal(await first, false);
        assert.equal(context.localAudioMediaStream, rawStream);
        assert.equal(rawTrack.enabled, false);
        assert.equal(context.noiseProcessor, null);
        assert.equal(context.lsSettings.mic_noise_suppression, false);
        assert.equal(context.toastMessage.calledWith('success'), false);
    });

    it('applies native suppression and preserves other constraints after startup failure', async () => {
        const operation = context.applyNoiseSuppression(true);
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(null);
        assert.equal(await operation, false);
        const constraints = rawTrack.applyConstraints.firstCall.args[0];
        assert.equal(constraints.noiseSuppression, true);
        assert.equal(constraints.deviceId.exact, 'microphone');
        assert.equal(constraints.autoGainControl, true);
        assert.equal(nativeSuppression, true);
        assert.equal(rawTrack.enabled, false);
        assert.equal(context.localAudioMediaStream, rawStream);
        assert.match(context.toastMessage.lastCall.args[1], /Using default WebRTC/);
        assert.equal(context.switchNoiseSuppression.checked, false);
    });

    it('keeps the raw microphone available without claiming native fallback when constraints fail', async () => {
        rawTrack.applyConstraints.rejects(new Error('Unsupported constraint'));
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(null);
        assert.equal(await operation, false);
        assert.equal(context.localAudioMediaStream, rawStream);
        assert.equal(context.noiseProcessor, null);
        assert.match(context.toastMessage.lastCall.args[1], /without noise suppression/);
    });

    it('does not claim native suppression when the browser silently ignores the constraint', async () => {
        rawTrack.applyConstraints.resolves();
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(null);
        assert.equal(await operation, false);
        assert.match(context.toastMessage.lastCall.args[1], /without noise suppression/);
    });

    it('orders a retry after pending native fallback and does not reset the newer preference', async () => {
        let finishFallback;
        rawTrack.applyConstraints.callsFake(async (constraints) => {
            if (constraints.noiseSuppression) {
                await new Promise((resolve) => {
                    finishFallback = resolve;
                });
            }
            nativeSuppression = constraints.noiseSuppression;
        });
        const first = context.applyNoiseSuppression(true);
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(null);
        await new Promise((resolve) => setImmediate(resolve));
        const second = context.applyNoiseSuppression(true);
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(pending.length, 1);
        finishFallback();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(nativeSuppression, false);
        assert.equal(pending.length, 2);
        pending[1].resolve(stream());
        assert.equal(await second, true);
        await first;
        assert.equal(context.lsSettings.mic_noise_suppression, true);
        assert.equal(context.toastMessage.calledWith('warning'), false);
    });

    it('falls back after a running worklet fails', async () => {
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(stream());
        await operation;
        context.noiseProcessor.onError(new Error('Worklet failed'));
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(context.localAudioMediaStream, rawStream);
        assert.equal(nativeSuppression, true);
        assert.equal(context.lsSettings.mic_noise_suppression, false);
    });

    it('restarts from the original microphone rather than the stopped output', async () => {
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(stream());
        await operation;
        const restarting = context.restartNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(pending[1].input, rawStream);
        pending[1].resolve(stream());
        await restarting;
    });

    it('ignores pending startup when a different microphone is selected', async () => {
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        const newMicrophone = stream();
        context.navigator.mediaDevices.getUserMedia.resolves(newMicrophone);
        context.lsSettings.mic_noise_suppression = false;
        await context.changeLocalMicrophone('new-microphone');
        pending[0].resolve(stream());
        assert.equal(await operation, false);
        assert.equal(context.localAudioMediaStream, newMicrophone);
        assert.equal(newMicrophone.getAudioTracks()[0].enabled, false);
        assert.equal(rawTrack.stop.callCount, 1);
    });

    it('stops a late microphone acquisition without replacing the newer microphone', async () => {
        let finishFirst;
        context.lsSettings.mic_noise_suppression = false;
        context.navigator.mediaDevices.getUserMedia.onFirstCall().callsFake(
            () =>
                new Promise((resolve) => {
                    finishFirst = resolve;
                })
        );
        const first = context.changeLocalMicrophone('first');
        await new Promise((resolve) => setImmediate(resolve));
        const currentMicrophone = stream();
        context.navigator.mediaDevices.getUserMedia.onSecondCall().resolves(currentMicrophone);
        await context.changeLocalMicrophone('second');
        const staleMicrophone = stream();
        finishFirst(staleMicrophone);
        await first;
        assert.equal(context.localAudioMediaStream, currentMicrophone);
        assert.equal(staleMicrophone.getAudioTracks()[0].stop.callCount, 1);
        assert.equal(context.refreshMyStreamToPeers.callCount, 1);
    });

    it('rejects audio replacement from a stale request after an asynchronous camera replacement', async () => {
        loadFunction('refreshMyStreamToPeers');
        let finishCamera;
        const audioSender = { track: { kind: 'audio' }, replaceTrack: sinon.stub().resolves() };
        const videoSender = {
            track: { kind: 'video' },
            replaceTrack: () =>
                new Promise((resolve) => {
                    finishCamera = resolve;
                }),
        };
        Object.assign(context, {
            thereArePeerConnections: () => true,
            localVideoMediaStream: {},
            localScreenMediaStream: null,
            getVideoTrack: (input) => (input ? { kind: 'video' } : null),
            isScreenStreaming: false,
            peerConnections: { peer: { getSenders: () => [videoSender, audioSender] } },
            allPeers: { peer: { peer_name: 'Peer' } },
        });
        let current = true;
        const refreshing = context.refreshMyStreamToPeers(rawStream, true, () => current);
        current = false;
        finishCamera();
        await refreshing;
        assert.equal(audioSender.replaceTrack.callCount, 0);
    });
});
