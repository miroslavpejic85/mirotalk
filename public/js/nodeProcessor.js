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
            this.wasmLoader.loadWasmBuffer();
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
            this.uiManager.updateStatus('📦 Loading RNNoise sync module...', 'info');

            const jsResponse = await fetch('../js/rnnoiseSync.js');

            if (!jsResponse.ok) {
                throw new Error('Failed to load rnnoiseSync.js');
            }

            const jsContent = await jsResponse.text();
            this.uiManager.updateStatus('📦 Sending sync module to worklet...', 'info');

            this.getWorkletNode().port.postMessage({
                type: 'sync-module',
                jsContent: jsContent,
            });

            this.uiManager.updateStatus('📦 Sync module sent to worklet', 'info');
        } catch (error) {
            this.uiManager.updateStatus('❌ Failed to load sync module: ' + error.message, 'error');
            console.error('Sync module loading error:', error);
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

        this.initializeUI();
        this.initializeDependencies();
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
        try {
            this.uiManager.updateStatus('🎤 Starting audio processing...', 'info');

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = this.audioContext.sampleRate;
            this.uiManager.updateStatus(`🎵 Audio context created with sample rate: ${sampleRate}Hz`, 'info');

            if (this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                } catch (e) {
                    // ignore
                }
            }

            this.mediaStream = mediaStream;
            if (!this.mediaStream.getAudioTracks().length) {
                throw new Error('No audio tracks found in the provided media stream');
            }

            await this.audioContext.audioWorklet.addModule('../js/noiseSuppressionProcessor.js');

            this.workletNode = new AudioWorkletNode(this.audioContext, 'noiseSuppressionProcessor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
            });

            this.workletNode.port.onmessage = (event) => this.messageHandler.handleMessage(event);

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.destinationNode = this.audioContext.createMediaStreamDestination();

            this.sourceNode.connect(this.workletNode);
            this.workletNode.connect(this.destinationNode);

            this.isProcessing = true;
            this.uiManager.updateUI(this.isProcessing, this.noiseSuppressionEnabled);
            this.uiManager.updateStatus('🎤 Audio processing started', 'success');

            // Return the processed MediaStream (with noise suppression)
            return this.destinationNode.stream;
        } catch (error) {
            this.uiManager.updateStatus('❌ Error: ' + error.message, 'error');
            console.error('RNNoise startProcessing error:', error);
            this.stopProcessing();
            return null;
        }
    }

    stopProcessing() {
        this.mediaStream = null;

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
            this.audioContext.close();
            this.audioContext = null;
        }

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
