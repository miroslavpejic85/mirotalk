'use strict';

const RNNOISE_FRAME_SIZE = 480;
const SHIFT_16_BIT_NR = 32768;

// Handle WASM module initialization (standalone wasm, no Emscripten JS glue or eval)
class WasmModuleInitializer {
    constructor(messagePort) {
        this.messagePort = messagePort;
        this.Module = null;
    }

    async initModule(wasmBytes) {
        try {
            if (!wasmBytes) throw new Error('Missing RNNoise wasm binary');

            // Synchronous compile: async WebAssembly APIs are unreliable inside some AudioWorklet scopes
            const instance = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {
                env: { emscripten_notify_memory_growth() {} },
            });
            const exports = instance.exports;
            exports._initialize?.();

            let heapF32 = new Float32Array(exports.memory.buffer);
            this.Module = {
                _malloc: exports.malloc,
                _free: exports.free,
                _rnnoise_create: exports.rnnoise_create,
                _rnnoise_destroy: exports.rnnoise_destroy,
                _rnnoise_process_frame: exports.rnnoise_process_frame,
                // Memory growth detaches the old buffer, so refresh the view when it changes
                get HEAPF32() {
                    if (heapF32.buffer !== exports.memory.buffer) heapF32 = new Float32Array(exports.memory.buffer);
                    return heapF32;
                },
            };
            return this.Module;
        } catch (error) {
            console.error('WASM module initialization error:', error);
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

        this.rnnoiseContext = this.module._rnnoise_create(0);
        if (!this.rnnoiseContext) throw new Error('Failed to create RNNoise context');

        console.log('WASM setup complete:', {
            wasmPcmInput: this.wasmPcmInput,
            rnnoiseContext: this.rnnoiseContext,
            heapF32Available: !!this.module.HEAPF32,
        });
    }

    processFrame(frameBuffer, processedBuffer, messagePort) {
        if (!this.rnnoiseContext || !this.module || !this.module.HEAPF32) return;

        try {
            let heap = this.module.HEAPF32;
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                heap[this.wasmPcmInputF32Index + i] = frameBuffer[i] * SHIFT_16_BIT_NR;
            }

            this.module._rnnoise_process_frame(this.rnnoiseContext, this.wasmPcmInput, this.wasmPcmInput);

            heap = this.module.HEAPF32;
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                processedBuffer[i] = heap[this.wasmPcmInputF32Index + i] / SHIFT_16_BIT_NR;
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

        this.setupMessageHandler();
        this.port.postMessage({ type: 'request-wasm' });
    }

    setupMessageHandler() {
        this.port.onmessage = async (event) => {
            if (this._destroyed) return;
            const { type, wasmBytes, enabled } = event.data;
            switch (type) {
                case 'wasm-module':
                    try {
                        const module = await this.wasmInitializer.initModule(wasmBytes);
                        if (this._destroyed) return;
                        this.contextManager = new RNNoiseContextManager(module);
                        this.initialized = true;
                        this.port.postMessage({ type: 'wasm-ready' });
                    } catch (error) {
                        console.error('Failed to initialize RNNoise wasm:', error);
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
                this.contextManager.processFrame(
                    this.frameBuffer.getFrameBuffer(),
                    this.frameBuffer.getProcessedBuffer(),
                    this.port
                );
                this.frameBuffer.resetBuffer();
            }

            // Output processed sample if available, else fallback to input (with safety)
            let sample = this.frameBuffer.hasProcessed() ? this.frameBuffer.getProcessedSample() : input[i];
            output[i] = Number.isFinite(sample) ? sample : 0;
        }

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
