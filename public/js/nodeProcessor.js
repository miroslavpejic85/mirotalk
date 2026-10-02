'use strict';

// Handle UI updates and interactions
class UIManager {
    constructor(elements) {
        this.elements = elements;
    }

    updateStatus(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const printMessage = `[${timestamp}] ${message}`;
        switch (type) {
            case 'error':
                console.error(printMessage);
                break;
            case 'success':
                console.info(printMessage);
                break;
            case 'warning':
                console.warn(printMessage);
                break;
            default:
                console.log(printMessage);
                break;
        }
    }

    updateUI(isProcessing, noiseSuppressionEnabled) {
        this.updateStatus(
            `Audio processing ${isProcessing ? 'started' : 'stopped'}`,
            isProcessing ? 'success' : 'info'
        );

        this.elements.labelNoiseSuppression.style.color = noiseSuppressionEnabled ? 'lime' : 'white';
    }
}

// Handle audio worklet message processing
class MessageHandler {
    constructor(uiManager, wasmLoader) {
        this.uiManager = uiManager;
        this.wasmLoader = wasmLoader;
    }

    handleMessage(event) {
        if (event.data.type === 'request-wasm') {
            return this.wasmLoader.loadWasmBuffer();
        } else if (event.data.type === 'wasm-ready') {
            this.uiManager.updateStatus('✅ RNNoise WASM initialized successfully', 'success');
        } else if (event.data.type === 'wasm-error') {
            this.uiManager.updateStatus('❌ RNNoise WASM error: ' + event.data.error, 'error');
        } else if (event.data.type === 'vad') {
            if (event.data.isSpeech) {
                //this.uiManager.updateStatus(`🗣️ Speech detected (VAD: ${event.data.probability.toFixed(2)})`, 'info');
            }
        }
    }
}

// Handle only WASM module loading
class WasmLoader {
    constructor(uiManager, getWorkletNode) {
        this.uiManager = uiManager;
        this.getWorkletNode = getWorkletNode;
    }

    async loadWasmBuffer() {
        try {
            const workletNode = this.getWorkletNode();
            if (!workletNode) {
                this.uiManager.updateStatus('⚠️ Worklet node not available, skipping WASM load', 'warning');
                throw new Error('Worklet node is not available');
            }

            this.uiManager.updateStatus('📦 Loading RNNoise sync module...', 'info');

            const jsResponse = await fetch('../js/rnnoiseSync.js');

            if (!jsResponse.ok) {
                throw new Error('Failed to load rnnoiseSync.js');
            }

            const jsContent = await jsResponse.text();
            this.uiManager.updateStatus('📦 Sending sync module to worklet...', 'info');

            const node = this.getWorkletNode();
            if (node !== workletNode) {
                this.uiManager.updateStatus('⚠️ Worklet node disconnected before WASM could be sent', 'warning');
                throw new Error('Worklet node changed during WASM loading');
            }

            node.port.postMessage({
                type: 'sync-module',
                jsContent: jsContent,
            });

            this.uiManager.updateStatus('📦 Sync module sent to worklet', 'info');
        } catch (error) {
            this.uiManager.updateStatus('❌ Failed to load sync module: ' + error.message, 'error');
            console.error('Sync module loading error:', error);
            throw error;
        }
    }
}

// Handle RNNoise processing
class RNNoiseProcessor {
    constructor() {
        this.audioContext = null;
        this.workletNode = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.destinationNode = null;
        this.isProcessing = false;
        this.noiseSuppressionEnabled = false;
        this.cancelInitialization = null;

        this.initializeUI();
        this.initializeDependencies();
    }

    /**
     * Check if AudioWorklet and WebAssembly are supported.
     * Mobile browsers may lack AudioWorklet or restrict synchronous WASM compilation.
     * @returns {boolean}
     */
    static isSupported() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const hasAudioWorklet = AudioCtx && 'audioWorklet' in AudioCtx.prototype;
            const hasWebAssembly =
                typeof WebAssembly === 'object' &&
                typeof WebAssembly.Module === 'function' &&
                typeof WebAssembly.Instance === 'function';
            return !!(hasAudioWorklet && hasWebAssembly);
        } catch (e) {
            return false;
        }
    }

    /**
     * Probe whether the device actually supports a 48 kHz sample rate.
     * Creates a temporary AudioContext, checks the real rate, then closes it.
     * @returns {Promise<boolean>}
     */
    static async isSampleRateSupported() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx({ sampleRate: 48000 });
            const actual = ctx.sampleRate;
            await ctx.close();
            return actual === 48000;
        } catch (e) {
            return false;
        }
    }

    initializeUI() {
        this.elements = {
            labelNoiseSuppression: document.getElementById('labelNoiseSuppression'),
            switchNoiseSuppression: document.getElementById('switchNoiseSuppression'),
        };
    }

    initializeDependencies() {
        this.uiManager = new UIManager(this.elements);
        this.wasmLoader = new WasmLoader(this.uiManager, () => this.workletNode);
        this.messageHandler = new MessageHandler(this.uiManager, this.wasmLoader);
    }

    async toggleProcessing(mediaStream = null) {
        this.isProcessing ? this.stopProcessing() : await this.startProcessing(mediaStream);
    }

    async startProcessing(mediaStream = null) {
        if (!mediaStream) {
            throw new Error('No media stream provided to startProcessing');
        }
        let audioContext;
        let initializationTimer;
        try {
            this.uiManager.updateStatus('🎤 Starting audio processing...', 'info');

            if (!RNNoiseProcessor.isSupported()) {
                this.uiManager.updateStatus(
                    '⚠️ AudioWorklet or WebAssembly not supported, skipping RNNoise',
                    'warning'
                );
                return null;
            }

            // 48 kHz support is verified by isSampleRateSupported() at init.
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
            this.audioContext = audioContext;
            if (audioContext.sampleRate !== 48000) throw new Error('RNNoise requires a 48 kHz audio context');
            this.uiManager.updateStatus(
                `🎵 Audio context created with sample rate: ${this.audioContext.sampleRate}Hz`,
                'info'
            );

            if (audioContext.state === 'suspended') await audioContext.resume();
            if (this.audioContext !== audioContext) return null;
            if (audioContext.state !== 'running') throw new Error('Audio context is not running');

            this.mediaStream = mediaStream;
            if (!this.mediaStream.getAudioTracks().length) {
                throw new Error('No audio tracks found in the provided media stream');
            }

            await audioContext.audioWorklet.addModule('../js/noiseSuppressionProcessor.js');
            if (this.audioContext !== audioContext) return null;

            const workletNode = new AudioWorkletNode(audioContext, 'noiseSuppressionProcessor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
            });
            this.workletNode = workletNode;

            await new Promise((resolve, reject) => {
                this.cancelInitialization = () => reject(new Error('Audio processing stopped during initialization'));
                initializationTimer = setTimeout(() => reject(new Error('RNNoise initialization timed out')), 10000);
                workletNode.port.onmessage = (event) => {
                    if (this.workletNode !== workletNode) return;
                    if (event.data.type === 'wasm-ready') resolve();
                    if (event.data.type === 'wasm-error') {
                        const error = new Error(event.data.error || 'RNNoise initialization failed');
                        reject(error);
                        if (this.isProcessing) this.onError?.(error);
                    }
                    const handling = this.messageHandler.handleMessage(event);
                    handling?.catch(reject);
                };
                workletNode.onprocessorerror = () => {
                    const error = new Error('RNNoise audio worklet failed');
                    reject(error);
                    if (this.isProcessing) this.onError?.(error);
                };
            });
            if (this.audioContext !== audioContext || this.workletNode !== workletNode) return null;
            this.cancelInitialization = null;

            this.sourceNode = audioContext.createMediaStreamSource(this.mediaStream);
            this.destinationNode = audioContext.createMediaStreamDestination();

            this.sourceNode.connect(this.workletNode);
            this.workletNode.connect(this.destinationNode);

            this.isProcessing = true;
            this.uiManager.updateUI(this.isProcessing, this.noiseSuppressionEnabled);
            this.uiManager.updateStatus('🎤 Audio processing started', 'success');

            // Return the processed MediaStream (with noise suppression)
            return this.destinationNode.stream;
        } catch (error) {
            if (audioContext && this.audioContext !== audioContext) return null;
            this.uiManager.updateStatus('❌ Error: ' + error.message, 'error');
            console.error('RNNoise startProcessing error:', error);
            this.stopProcessing();
            return null;
        } finally {
            clearTimeout(initializationTimer);
        }
    }

    stopProcessing() {
        if (
            !this.audioContext &&
            !this.workletNode &&
            !this.sourceNode &&
            !this.destinationNode &&
            !this.cancelInitialization
        )
            return;
        this.cancelInitialization?.();
        this.cancelInitialization = null;
        this.mediaStream = null;

        // Signal the worklet to free WASM memory before disconnecting
        try {
            this.workletNode?.port?.postMessage({ type: 'destroy' });
        } catch (e) {}

        try {
            this.sourceNode?.disconnect();
        } catch (e) {}
        try {
            this.workletNode?.disconnect();
        } catch (e) {}
        try {
            this.destinationNode?.stream?.getTracks?.().forEach((t) => t.stop());
        } catch (e) {}

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch((error) => console.warn('Audio context cleanup failed:', error));
        }
        this.audioContext = null;

        this.workletNode = null;
        this.sourceNode = null;
        this.destinationNode = null;
        this.isProcessing = false;
        this.noiseSuppressionEnabled = false;

        this.uiManager.updateUI(this.isProcessing, this.noiseSuppressionEnabled);
        this.uiManager.updateStatus('🛑 Audio processing stopped', 'info');
    }

    toggleNoiseSuppression() {
        this.noiseSuppressionEnabled = !this.noiseSuppressionEnabled;

        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: 'enable',
                enabled: this.noiseSuppressionEnabled,
            });
        }

        this.noiseSuppressionEnabled
            ? this.uiManager.updateStatus('🔊 RNNoise enabled - background noise will be suppressed', 'success')
            : this.uiManager.updateStatus('🔇 RNNoise disabled - audio passes through unchanged', 'info');

        this.uiManager.updateUI(this.isProcessing, this.noiseSuppressionEnabled);
    }
}
