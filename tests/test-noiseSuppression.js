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
        processor.wasmInitializer.initModule = async () => context.testModule;
    });

    it('reports readiness only after the RNNoise context is created', async () => {
        await processor.port.onmessage({
            data: { type: 'wasm-module', wasmBytes: new ArrayBuffer(8) },
        });
        assert.equal(processor.initialized, true);
        assert.equal(module._rnnoise_create.callCount, 1);
        assert.equal(messages.at(-1).type, 'wasm-ready');
    });

    it('reports context creation failure and frees the allocated buffer', async () => {
        module._rnnoise_create.returns(0);
        await processor.port.onmessage({
            data: { type: 'wasm-module', wasmBytes: new ArrayBuffer(8) },
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
            data: { type: 'wasm-module', wasmBytes: new ArrayBuffer(8) },
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
            data: { type: 'wasm-module', wasmBytes: new ArrayBuffer(8) },
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

describe('RNNoise worklet with the real wasm binary', () => {
    it('instantiates rnnoise.wasm without eval and suppresses background noise', async () => {
        const messages = [];
        class AudioWorkletProcessor {
            constructor() {
                this.port = { postMessage: (message) => messages.push(message) };
            }
        }
        let Processor;
        const context = vm.createContext({
            AudioWorkletProcessor,
            sampleRate: 48000,
            currentTime: 0,
            console: { log() {}, error() {}, warn() {} },
            registerProcessor: (name, implementation) => {
                Processor = implementation;
            },
        });
        vm.runInContext(
            fs.readFileSync(path.join(__dirname, '../public/js/noiseSuppressionProcessor.js'), 'utf8'),
            context
        );
        const processor = new Processor();
        const wasm = fs.readFileSync(path.join(__dirname, '../public/js/rnnoise.wasm'));
        const wasmBytes = wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength);
        await processor.port.onmessage({ data: { type: 'wasm-module', wasmBytes } });
        assert.equal(messages.at(-1).type, 'wasm-ready');
        await processor.port.onmessage({ data: { type: 'enable', enabled: true } });

        let seed = 1;
        const noise = () => (((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1) * 0.05;
        const rms = (values) => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
        const inputRms = [];
        const outputRms = [];
        // 2 seconds of white noise in 128-sample render quanta
        for (let block = 0; block < 750; block++) {
            const input = Float32Array.from({ length: 128 }, noise);
            const output = new Float32Array(128);
            assert.equal(processor.process([[input]], [[output]]), true);
            if (block >= 375) {
                inputRms.push(rms(input));
                outputRms.push(rms(output));
            }
        }
        const avg = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
        assert.ok(avg(outputRms) < avg(inputRms) * 0.1, `noise not suppressed: ${avg(outputRms)} vs ${avg(inputRms)}`);

        await processor.port.onmessage({ data: { type: 'destroy' } });
        assert.equal(processor.contextManager, null);
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
            fetch: sinon.stub().resolves({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
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
        let tracks = [track];
        return {
            getAudioTracks: () => tracks,
            getTracks: () => tracks,
            removeTrack: (t) => {
                tracks = tracks.filter((item) => item !== t);
            },
            addTrack: (t) => {
                tracks = [...tracks, t];
            },
        };
    }

    function micTrack(noiseSuppression) {
        const track = {
            enabled: true,
            readyState: 'live',
            kind: 'audio',
            getConstraints: () => ({}),
            getSettings: () => ({ noiseSuppression, deviceId: 'microphone' }),
            applyConstraints: sinon.stub().resolves(),
        };
        track.stop = sinon.spy(() => {
            track.readyState = 'ended';
        });
        return track;
    }

    // Chromium: applyConstraints resolves but the audio processing does not change
    function ignoreLiveConstraints() {
        rawTrack.getSettings = () => ({ noiseSuppression: nativeSuppression, deviceId: 'microphone' });
        rawTrack.applyConstraints = sinon.stub().resolves();
        rawTrack.stop = sinon.spy(() => {
            rawTrack.readyState = 'ended';
        });
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
                this.isProcessing = false;
                this.noiseSuppressionEnabled = false;
                this.stopProcessing = sinon.spy();
                this.replaceInput = sinon.spy(() => true);
                this.setNoiseSuppression = sinon.spy((enabled) => {
                    this.noiseSuppressionEnabled = enabled;
                });
            }
            startProcessing(input) {
                this.mediaStream = input;
                return new Promise((resolve) =>
                    pending.push({
                        processor: this,
                        input,
                        resolve: (output) => {
                            this.isProcessing = !!output;
                            resolve(output);
                        },
                    })
                );
            }
        }
        context = vm.createContext({
            RNNoiseProcessor,
            noiseProcessor: null,
            noiseSuppressionRequest: 0,
            noiseSuppressionConstraints: Promise.resolve(),
            noiseSuppressionSwitchRequest: 0,
            microphoneRequest: 0,
            isRNNoiseSupported: true,
            localAudioMediaStream: rawStream,
            myAudioStatus: false,
            useAudio: true,
            lsSettings: { mic_noise_suppression: true, mic_noise_suppression_user_set: false },
            lS: { setSettings: sinon.spy() },
            buttons: { settings: { customNoiseSuppression: true, customNoiseSuppressionDefault: true } },
            switchNoiseSuppression: { checked: true },
            getId: () => null,
            getQueryParam: sinon.stub().returns(null),
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
            syncRecordingAudio() {},
            userLog: sinon.spy(),
        });
        for (const name of [
            'enableNoiseSuppression',
            'setMicrophoneNoiseSuppression',
            'recaptureMicrophoneNoiseSuppression',
            'isRNNoiseSuppressionSelected',
            'getRawMicrophoneStream',
            'logNoiseSuppressionState',
            'switchRNNoiseSuppression',
            'fallbackNoiseSuppression',
            'disableNoiseSuppression',
            'stopNoiseSuppressionPipeline',
            'restartNoiseSuppression',
            'applyNoiseSuppression',
            'applyNoiseSuppressionDefault',
            'syncNoiseSuppressionUI',
            'handleAudio',
            'changeLocalMicrophone',
            'stopAudioTracks',
            'getStreamDeviceId',
            'selectDeviceInSelects',
            'selectOptionByValueExist',
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
        sinon.assert.calledOnceWithExactly(context.noiseProcessor.setNoiseSuppression, true);
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
        sinon.assert.notCalled(pending[0].processor.setNoiseSuppression);
        sinon.assert.calledOnceWithExactly(pending[1].processor.setNoiseSuppression, true);
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
        sinon.assert.calledOnceWithExactly(
            context.userLog,
            'switch',
            'Noise suppression disabled',
            undefined,
            undefined,
            false
        );
    });

    it('reports successful noise suppression changes through immediate switch feedback', async () => {
        const operation = context.applyNoiseSuppression(true);
        await new Promise((resolve) => setImmediate(resolve));
        sinon.assert.notCalled(context.userLog);
        pending[0].resolve(stream());
        assert.equal(await operation, true);
        sinon.assert.calledWithExactly(
            context.userLog,
            'switch',
            'Noise suppression enabled',
            undefined,
            undefined,
            true
        );
        assert.equal(context.switchNoiseSuppression.checked, true);
        assert.equal(await context.applyNoiseSuppression(false), false);
        sinon.assert.calledWithExactly(
            context.userLog,
            'switch',
            'Noise suppression disabled',
            undefined,
            undefined,
            false
        );
        assert.equal(context.switchNoiseSuppression.checked, false);
        sinon.assert.notCalled(context.toastMessage);
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
        const changing = context.changeLocalMicrophone('new-microphone');
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(stream());
        assert.equal(await operation, false);
        assert.equal(rawTrack.stop.callCount, 1);
        // The new microphone gets its own pipeline, bypassed because RNNoise is off
        assert.equal(pending[1].input, newMicrophone);
        const processed = stream();
        pending[1].resolve(processed);
        assert.equal(await changing, undefined);
        assert.equal(context.localAudioMediaStream, processed);
        assert.equal(processed.getAudioTracks()[0].enabled, false);
        sinon.assert.calledOnceWithExactly(pending[1].processor.setNoiseSuppression, false);
    });

    it('stops a late microphone acquisition without replacing the newer microphone', async () => {
        let finishFirst;
        context.buttons.settings.customNoiseSuppression = false;
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

    it('applies URL noise suppression preference before local or server defaults', () => {
        context.lsSettings.mic_noise_suppression = true;
        context.lsSettings.mic_noise_suppression_user_set = true;
        context.buttons.settings.customNoiseSuppressionDefault = true;
        context.getQueryParam = sinon.stub().withArgs('noiseSuppression').returns('0');

        context.applyNoiseSuppressionDefault();

        assert.equal(context.lsSettings.mic_noise_suppression, false);
    });

    it('applies the server default only when the user has not explicitly chosen a value', () => {
        context.lsSettings.mic_noise_suppression = true;
        context.lsSettings.mic_noise_suppression_user_set = false;
        context.buttons.settings.customNoiseSuppressionDefault = false;
        context.getQueryParam = sinon.stub().withArgs('noiseSuppression').returns(null);

        context.applyNoiseSuppressionDefault();
        assert.equal(context.lsSettings.mic_noise_suppression, false);

        context.lsSettings.mic_noise_suppression = true;
        context.lsSettings.mic_noise_suppression_user_set = true;
        context.applyNoiseSuppressionDefault();
        assert.equal(context.lsSettings.mic_noise_suppression, true);
    });

    it('captures with browser noise suppression only when RNNoise is not selected', () => {
        Object.assign(context, { isMobileDevice: false, isMobileSafari: false });
        loadFunction('getAudioConstraints');
        context.lsSettings.mic_noise_suppression = true;
        assert.equal(context.getAudioConstraints('microphone').audio.noiseSuppression, false);
        context.lsSettings.mic_noise_suppression = false;
        assert.equal(context.getAudioConstraints('microphone').audio.noiseSuppression, true);
        context.lsSettings.mic_noise_suppression = true;
        context.isRNNoiseSupported = false;
        assert.equal(context.getAudioConstraints('microphone').audio.noiseSuppression, true);
        context.isRNNoiseSupported = true;
        context.buttons.settings.customNoiseSuppression = false;
        assert.equal(context.getAudioConstraints('microphone').audio.noiseSuppression, true);
    });

    async function startPipeline() {
        const operation = context.applyNoiseSuppression(true);
        await new Promise((resolve) => setImmediate(resolve));
        const processed = stream();
        pending[0].resolve(processed);
        assert.equal(await operation, true);
        return processed;
    }

    it('logs the effective RNNoise and browser noise suppression state', async () => {
        context.console.log = sinon.spy();
        await startPipeline();
        sinon.assert.calledWithMatch(context.console.log, 'Noise suppression state', { rnnoise: true, native: false });
        await context.applyNoiseSuppression(false);
        await context.noiseSuppressionConstraints;
        assert.ok(
            context.console.log.lastCall.calledWithMatch('Noise suppression state', { rnnoise: false, native: true })
        );
    });

    it('starts the pipeline bypassed when RNNoise is off so the first toggle is instant', async () => {
        context.lsSettings.mic_noise_suppression = false;
        nativeSuppression = true;
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(stream());
        assert.equal(await operation, true);
        const processor = context.noiseProcessor;
        sinon.assert.calledOnceWithExactly(processor.setNoiseSuppression, false);
        assert.equal(nativeSuppression, true);
        sinon.assert.notCalled(rawTrack.applyConstraints);
        assert.equal(await context.applyNoiseSuppression(true), true);
        sinon.assert.calledWith(processor.setNoiseSuppression.lastCall, true);
        await context.noiseSuppressionConstraints;
        assert.equal(nativeSuppression, false);
        assert.equal(pending.length, 1);
    });

    it('does not warn when the bypassed pipeline fails while RNNoise is off', async () => {
        context.lsSettings.mic_noise_suppression = false;
        nativeSuppression = true;
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(null);
        assert.equal(await operation, false);
        assert.equal(nativeSuppression, true);
        assert.equal(context.localAudioMediaStream, rawStream);
        sinon.assert.notCalled(context.toastMessage);
    });

    it('switches a running pipeline instantly without rebuilding it or swapping peer tracks', async () => {
        const processed = await startPipeline();
        const processor = context.noiseProcessor;
        const published = context.refreshMyStreamToPeers.callCount;
        assert.equal(await context.applyNoiseSuppression(false), false);
        sinon.assert.calledWith(processor.setNoiseSuppression.lastCall, false);
        assert.equal(context.switchNoiseSuppression.checked, false);
        assert.equal(await context.applyNoiseSuppression(true), true);
        sinon.assert.calledWith(processor.setNoiseSuppression.lastCall, true);
        await context.noiseSuppressionConstraints;
        assert.equal(pending.length, 1);
        assert.equal(context.noiseProcessor, processor);
        sinon.assert.notCalled(processor.stopProcessing);
        assert.equal(context.localAudioMediaStream, processed);
        assert.equal(context.refreshMyStreamToPeers.callCount, published);
        assert.equal(context.lsSettings.mic_noise_suppression, true);
    });

    it('switches browser noise suppression back on when RNNoise is switched off', async () => {
        await startPipeline();
        assert.equal(nativeSuppression, false);
        await context.applyNoiseSuppression(false);
        await context.noiseSuppressionConstraints;
        assert.equal(nativeSuppression, true);
        const constraints = rawTrack.applyConstraints.lastCall.args[0];
        assert.equal(constraints.noiseSuppression, true);
        assert.equal(constraints.autoGainControl, true);
        assert.equal(context.noiseProcessor.originalStream, rawStream);
    });

    it('switches browser noise suppression back on when RNNoise is stopped', async () => {
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        pending[0].resolve(stream());
        await operation;
        context.lsSettings.mic_noise_suppression = false;
        await context.disableNoiseSuppression(true);
        assert.equal(nativeSuppression, true);
        assert.equal(context.localAudioMediaStream, rawStream);
        sinon.assert.calledWith(context.refreshMyStreamToPeers, rawStream, true);
    });

    it('re-captures the microphone into the running worklet when the browser ignores live changes', async () => {
        ignoreLiveConstraints();
        const processed = await startPipeline();
        const newTrack = micTrack(true);
        context.navigator.mediaDevices.getUserMedia.resolves(stream(newTrack));
        context.getAudioConstraints = sinon.stub().returns({ audio: { echoCancellation: true } });
        await context.applyNoiseSuppression(false);
        await context.noiseSuppressionConstraints;
        sinon.assert.calledOnce(rawTrack.stop);
        sinon.assert.calledWith(context.getAudioConstraints, 'microphone');
        sinon.assert.calledWithMatch(context.navigator.mediaDevices.getUserMedia, {
            audio: { echoCancellation: true, noiseSuppression: true },
        });
        assert.equal(rawStream.getAudioTracks()[0], newTrack);
        assert.equal(newTrack.enabled, true);
        sinon.assert.calledOnceWithExactly(context.noiseProcessor.replaceInput, rawStream);
        assert.equal(context.localAudioMediaStream, processed);
    });

    it('re-captures without browser noise suppression before starting RNNoise', async () => {
        nativeSuppression = true;
        ignoreLiveConstraints();
        const newTrack = micTrack(false);
        context.navigator.mediaDevices.getUserMedia.resolves(stream(newTrack));
        const operation = context.enableNoiseSuppression();
        await new Promise((resolve) => setImmediate(resolve));
        sinon.assert.calledWithMatch(context.navigator.mediaDevices.getUserMedia, {
            audio: { noiseSuppression: false },
        });
        assert.equal(pending[0].input.getAudioTracks()[0], newTrack);
        pending[0].resolve(stream());
        assert.equal(await operation, true);
        sinon.assert.notCalled(context.noiseProcessor.replaceInput);
    });

    it('settles rapid toggles on the latest state', async () => {
        ignoreLiveConstraints();
        await startPipeline();
        let finishCapture;
        const newTrack = micTrack(true);
        const finalTrack = micTrack(false);
        context.navigator.mediaDevices.getUserMedia.onFirstCall().callsFake(
            () =>
                new Promise((resolve) => {
                    finishCapture = () => resolve(stream(newTrack));
                })
        );
        context.navigator.mediaDevices.getUserMedia.onSecondCall().resolves(stream(finalTrack));
        await context.applyNoiseSuppression(false);
        await new Promise((resolve) => setImmediate(resolve));
        await context.applyNoiseSuppression(true);
        assert.equal(context.noiseProcessor.noiseSuppressionEnabled, true);
        finishCapture();
        await context.noiseSuppressionConstraints;
        sinon.assert.calledOnce(newTrack.stop);
        assert.equal(rawStream.getAudioTracks()[0], finalTrack);
        assert.equal(context.noiseProcessor.replaceInput.callCount, 2);
        assert.equal(pending.length, 1);
        assert.equal(context.lsSettings.mic_noise_suppression, true);
    });

    it('drops a re-captured microphone when another microphone was selected meanwhile', async () => {
        ignoreLiveConstraints();
        nativeSuppression = true;
        let finishCapture;
        const staleTrack = micTrack(false);
        context.navigator.mediaDevices.getUserMedia.callsFake(
            () =>
                new Promise((resolve) => {
                    finishCapture = () => resolve(stream(staleTrack));
                })
        );
        const switching = context.setMicrophoneNoiseSuppression(false, () => true);
        await new Promise((resolve) => setImmediate(resolve));
        context.microphoneRequest++;
        finishCapture();
        assert.equal(await switching, false);
        sinon.assert.calledOnce(staleTrack.stop);
        assert.equal(rawStream.getAudioTracks()[0], rawTrack);
    });
});
