'use strict';

const RNNOISE_FRAME_SIZE = 480;
const SHIFT_16_BIT_NR = 32768;

// Handle WASM module initialization
class WasmModuleInitializer {
    constructor(messagePort) {
        this.messagePort = messagePort;
        this.Module = null;
    }

    async initSyncModule(jsContent) {
        try {
            if (!jsContent) throw new Error('Missing sync module JS content');

            const createFunction = new Function(jsContent + '; return createRNNWasmModuleSync;')();
            this.Module = await createFunction();

            if (this.Module.ready) {
                await this.Module.ready;
            }
            return this.Module;
        } catch (error) {
            console.error('Sync module initialization error:', error);
            throw error;
        }
    }

    getModule() {
        return this.Module;
    }
}

// Handle RNNoise context and buffer management
class RNNoiseContextManager {
    constructor(module) {
        this.module = module;
        this.rnnoiseContext = null;
        this.wasmPcmInput = null;
        this.wasmPcmInputF32Index = null;
        try {
            this.setupWasm();
        } catch (error) {
            this.destroy();
            throw error;
        }
    }

    setupWasm() {
        this.wasmPcmInput = this.module._malloc(RNNOISE_FRAME_SIZE * 4);
        this.wasmPcmInputF32Index = this.wasmPcmInput >> 2;
        if (!this.wasmPcmInput) throw new Error('Failed to allocate WASM buffer');

        this.rnnoiseContext = this.module._rnnoise_create();
        if (!this.rnnoiseContext) throw new Error('Failed to create RNNoise context');

        console.log('WASM setup complete:', {
            wasmPcmInput: this.wasmPcmInput,
            rnnoiseContext: this.rnnoiseContext,
            heapF32Available: !!this.module.HEAPF32,
        });
    }

    processFrame(frameBuffer, processedBuffer, messagePort, throttledVadSend) {
        if (!this.rnnoiseContext || !this.module || !this.module.HEAPF32) return;

        try {
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                this.module.HEAPF32[this.wasmPcmInputF32Index + i] = frameBuffer[i] * SHIFT_16_BIT_NR;
            }

            const vadScore = this.module._rnnoise_process_frame(
                this.rnnoiseContext,
                this.wasmPcmInput,
                this.wasmPcmInput
            );

            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                processedBuffer[i] = this.module.HEAPF32[this.wasmPcmInputF32Index + i] / SHIFT_16_BIT_NR;
            }

            // Throttle VAD messages to reduce postMessage overhead (mobile perf)
            if (throttledVadSend) {
                messagePort.postMessage({
                    type: 'vad',
                    probability: vadScore,
                    isSpeech: vadScore > 0.5,
                });
            }
        } catch (error) {
            console.error('Frame processing failed:', error);
            messagePort.postMessage({ type: 'wasm-error', error: error.message });
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                processedBuffer[i] = frameBuffer[i];
            }
        }
    }

    destroy() {
        if (this.wasmPcmInput && this.module?._free) {
            this.module._free(this.wasmPcmInput);
            this.wasmPcmInput = null;
        }
        if (this.rnnoiseContext && this.module?._rnnoise_destroy) {
            this.module._rnnoise_destroy(this.rnnoiseContext);
            this.rnnoiseContext = null;
        }
    }
}

// Handle audio frame buffering
class AudioFrameBuffer {
    constructor() {
        this.frameBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
        this.bufferIndex = 0;
        this.hasProcessedFrame = false;
        this.processedBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
        this.processedIndex = 0;
    }

    addSample(sample) {
        this.frameBuffer[this.bufferIndex++] = sample;
        return this.bufferIndex === RNNOISE_FRAME_SIZE;
    }

    resetBuffer() {
        this.bufferIndex = 0;
        this.hasProcessedFrame = true;
        this.processedIndex = 0;
    }

    getProcessedSample() {
        return this.processedBuffer[this.processedIndex++];
    }

    getFrameBuffer() {
        return this.frameBuffer;
    }

    getProcessedBuffer() {
        return this.processedBuffer;
    }

    hasProcessed() {
        return this.hasProcessedFrame;
    }
}

// Handle volume analysis (throttled to reduce postMessage overhead on mobile)
class VolumeAnalyzer {
    constructor() {
        this.lastSendTime = 0;
        this.throttleMs = 100; // Send at most every 100ms
    }

    calculateVolume(input, output, messagePort) {
        const now = currentTime * 1000; // AudioWorklet currentTime is in seconds
        if (now - this.lastSendTime < this.throttleMs) return;
        this.lastSendTime = now;

        const originalVolume = Math.sqrt(input.reduce((sum, v) => sum + v * v, 0) / input.length);
        const processedVolume = Math.sqrt(output.reduce((sum, v) => sum + v * v, 0) / output.length);

        messagePort.postMessage({
            type: 'volume',
            original: originalVolume,
            processed: processedVolume,
        });
    }
}

// Handle audio worklet processing
class RNNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.initialized = false;
        this.enabled = false;
        this._destroyed = false;
        this.sampleRate = sampleRate || 48000;

        console.log('AudioWorklet processor initialized with sample rate:', this.sampleRate);

        this.wasmInitializer = new WasmModuleInitializer(this.port);
        this.contextManager = null;
        this.frameBuffer = new AudioFrameBuffer();
        this.volumeAnalyzer = new VolumeAnalyzer();
        this.lastVadSendTime = 0;
        this.vadThrottleMs = 100; // Send VAD at most every 100ms

        this.setupMessageHandler();
        this.port.postMessage({ type: 'request-wasm' });
    }

    setupMessageHandler() {
        this.port.onmessage = async (event) => {
            if (this._destroyed) return;
            const { type, jsContent, enabled } = event.data;
            switch (type) {
                case 'sync-module':
                    try {
                        const module = await this.wasmInitializer.initSyncModule(jsContent);
                        if (this._destroyed) return;
                        this.contextManager = new RNNoiseContextManager(module);
                        this.initialized = true;
                        this.port.postMessage({ type: 'wasm-ready' });
                    } catch (error) {
                        console.error('Failed to initialize sync module:', error);
                        if (!this._destroyed) this.port.postMessage({ type: 'wasm-error', error: error.message });
                    }
                    break;
                case 'enable':
                    this.enabled = enabled;
                    break;
                case 'destroy':
                    this.destroy();
                    break;
                default:
                    console.warn('Unknown message type:', type);
                    break;
            }
        };
    }

    process(inputs, outputs, parameters) {
        if (this._destroyed) return false;
        const input = inputs[0]?.[0];
        const output = outputs[0]?.[0];
        if (!output) return true;

        // Always fill output with something valid
        if (!input || input.length === 0) {
            output.fill(0); // Silence if no input
            return true;
        }

        // If not initialized or not enabled, just pass through input safely
        if (!this.initialized || !this.enabled) {
            for (let i = 0; i < output.length; i++) {
                output[i] = Number.isFinite(input[i]) ? input[i] : 0;
            }
            return true;
        }

        for (let i = 0; i < input.length; i++) {
            const isFrameReady = this.frameBuffer.addSample(input[i]);

            if (isFrameReady) {
                const now = currentTime * 1000;
                const shouldSendVad = now - this.lastVadSendTime >= this.vadThrottleMs;
                this.contextManager.processFrame(
                    this.frameBuffer.getFrameBuffer(),
                    this.frameBuffer.getProcessedBuffer(),
                    this.port,
                    shouldSendVad
                );
                if (shouldSendVad) this.lastVadSendTime = now;
                this.frameBuffer.resetBuffer();
            }

            // Output processed sample if available, else fallback to input (with safety)
            let sample = this.frameBuffer.hasProcessed() ? this.frameBuffer.getProcessedSample() : input[i];
            output[i] = Number.isFinite(sample) ? sample : 0;
        }

        this.volumeAnalyzer.calculateVolume(input, output, this.port);
        return true;
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.initialized = false;
        this.enabled = false;

        if (this.contextManager) {
            this.contextManager.destroy();
            this.contextManager = null;
        }
    }
}

registerProcessor('noiseSuppressionProcessor', RNNoiseProcessor);
