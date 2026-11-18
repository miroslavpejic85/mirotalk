'use strict';

// The main-thread engine and the worker load the same MediaPipe Tasks Vision release
const BG_TASKS_VISION_VERSION = '1.2.0';
const BG_TASKS_VISION = Object.freeze({
    visionBundleUrl: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${BG_TASKS_VISION_VERSION}/vision_bundle.mjs`,
    wasmBaseUrl: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${BG_TASKS_VISION_VERSION}/wasm`,
    // General (256x256) model: more accurate edges than the landscape one
    modelUrl:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
});

// The worker and the shared compositor are resolved from this script location
const BG_BASE_URL =
    typeof document !== 'undefined' && document.currentScript?.src
        ? new URL('.', document.currentScript.src).href
        : null;

/**
 * Runs segmentation + compositing in a module worker (background-effects-worker.js) and moves the camera
 * frames there with the best transport of the browser: transferred track processor streams (Chromium),
 * ImageBitmap round trips (Firefox, Safari, others) or, opt-in, track transfer (Safari 18+).
 * One worker is shared by every BackgroundEffects instance, so the model loads once per page.
 */
class BackgroundEffectsWorker {
    static promise = null;
    static disabled = false;

    static isSupported(baseUrl = BG_BASE_URL) {
        return Boolean(
            baseUrl &&
            typeof Worker !== 'undefined' &&
            typeof OffscreenCanvas !== 'undefined' &&
            typeof createImageBitmap === 'function'
        );
    }

    // Resolves the shared engine, or null when the main-thread engine must be used
    static shared() {
        if (BackgroundEffectsWorker.disabled || !BackgroundEffectsWorker.isSupported()) return Promise.resolve(null);
        if (!BackgroundEffectsWorker.promise) {
            const engine = new BackgroundEffectsWorker();
            BackgroundEffectsWorker.promise = engine.init().then(
                () => engine,
                (error) => {
                    console.warn('Background worker unavailable, using the main thread', error);
                    BackgroundEffectsWorker.disable();
                    return null;
                }
            );
        }
        return BackgroundEffectsWorker.promise.then((engine) => {
            // The worker crashed earlier: stay on the main thread
            if (!engine?.failed) return engine;
            BackgroundEffectsWorker.disable();
            return null;
        });
    }

    static disable() {
        BackgroundEffectsWorker.disabled = true;
        const promise = BackgroundEffectsWorker.promise;
        BackgroundEffectsWorker.promise = null;
        promise?.then((engine) => {
            if (engine && !engine.failed) engine.terminate();
        });
    }

    static supportsTrackPipeline() {
        return (
            typeof MediaStreamTrackProcessor === 'function' &&
            typeof TransformStream === 'function' &&
            (typeof MediaStreamTrackGenerator === 'function' || typeof VideoTrackGenerator === 'function')
        );
    }

    static createGenerator() {
        // MediaStreamTrackGenerator (Chromium, main thread) is itself the track
        if (typeof MediaStreamTrackGenerator === 'function') {
            const generator = new MediaStreamTrackGenerator({ kind: 'video' });
            return { generator, track: generator };
        }
        const generator = new VideoTrackGenerator();
        return { generator, track: generator.track };
    }

    // trackTransfer: Safari 18+ worker-side track processing. Off by default: in WebKit testing
    // VideoTrackGenerator output froze on screen even for untouched frames, while the ImageBitmap
    // transport stayed live. Enable once verified on a real Safari camera.
    constructor({
        baseUrl = BG_BASE_URL,
        initTimeoutMs = 30000,
        requestTimeoutMs = 10000,
        trackTransfer = false,
    } = {}) {
        this.baseUrl = baseUrl;
        this.trackTransfer = trackTransfer;
        this.initTimeoutMs = initTimeoutMs;
        this.requestTimeoutMs = requestTimeoutMs;
        this.worker = null;
        this.capabilities = {};
        this.pending = new Map();
        this.sequence = 0;
        this.sessions = new Map();
        this.failed = false;
    }

    init() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const error = new Error('Background worker init timed out');
                this.terminate(error);
                reject(error);
            }, this.initTimeoutMs);
            const done = (error, info) => {
                clearTimeout(timer);
                this.initHandlers = null;
                if (error) {
                    this.terminate(error);
                    reject(error);
                } else {
                    this.capabilities = info;
                    resolve(this);
                }
            };
            this.initHandlers = done;
            try {
                this.worker = new Worker(new URL('background-effects-worker.js', this.baseUrl), { type: 'module' });
            } catch (error) {
                done(error);
                return;
            }
            this.worker.onmessage = (event) => this.onMessage(event.data || {});
            this.worker.onerror = (event) => {
                event.preventDefault?.();
                const error = new Error(event.message || 'Background worker failed');
                if (this.initHandlers) this.initHandlers(error);
                else this.terminate(error);
            };
            this.worker.postMessage({
                type: 'init',
                config: {
                    ...BG_TASKS_VISION,
                    compositorUrl: new URL('background-effects-compositor.js', this.baseUrl).href,
                    // CPU (XNNPACK, WASM SIMD) is reliable everywhere and keeps the GPU for encoding
                    delegate: 'CPU',
                },
            });
        });
    }

    onMessage(message) {
        if (message.type === 'ready') {
            const { type, ...info } = message;
            this.initHandlers?.(null, info);
            return;
        }
        if (message.type === 'error' && message.stage === 'init') {
            this.initHandlers?.(new Error(message.message));
            return;
        }
        if (message.type === 'pipeline-ended' || message.type === 'pipeline-error') {
            const session = this.sessions.get(message.session);
            // Stopping a session closes its pipeline: only a running session has anything to report
            if (!session || session.stopped || session.ended) return;
            const error = message.type === 'pipeline-error' ? new Error(message.message) : null;
            if (error) console.error('Background worker pipeline error', message.message);
            session.onEnded(error);
            return;
        }
        const request = this.pending.get(message.id);
        if (!request) {
            message.bitmap?.close?.();
            return;
        }
        this.pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.type === 'error') request.reject(new Error(message.message));
        else request.resolve(message);
    }

    request(message, transfer = [], timeoutMs = this.requestTimeoutMs) {
        if (!this.worker) return Promise.reject(new Error('Background worker is not running'));
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Background worker ${message.type} timed out`));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.worker.postMessage({ ...message, id }, transfer);
            } catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(error);
            }
        });
    }

    // background: { mode: 'off' }, { mode: 'blur' } or { mode: 'image', bitmap } (the bitmap is transferred)
    setBackground(background) {
        const transfer = background.bitmap ? [background.bitmap] : [];
        return this.request({ type: 'background', background }, transfer);
    }

    canTransferStreams() {
        try {
            const stream = new ReadableStream();
            const channel = new MessageChannel();
            channel.port1.postMessage(stream, [stream]);
            channel.port1.close();
            channel.port2.close();
            return true;
        } catch (error) {
            return false;
        }
    }

    // Resolves the session ({ id, mode, outputTrack }); onEnded(error) fires when the pipeline ends on its own
    async start(videoTrack, { onEnded } = {}) {
        const session = { id: ++this.sequence, stopped: false, ended: false };
        // Reported once: a crash ends the session and fails its pending frame request
        session.onEnded = (error) => {
            if (session.stopped || session.ended) return;
            session.ended = true;
            clearTimeout(session.timer);
            onEnded?.(session, error);
        };
        this.sessions.set(session.id, session);
        try {
            if (this.trackTransfer && this.capabilities.trackProcessor) {
                try {
                    return await this.startTrack(session, videoTrack);
                } catch (error) {
                    if (!this.worker) throw error;
                    console.warn('Camera track transfer unavailable, trying another transport', error);
                }
            }
            if (BackgroundEffectsWorker.supportsTrackPipeline() && this.canTransferStreams()) {
                return await this.startStreams(session, videoTrack);
            }
            return await this.startFrames(session, videoTrack);
        } catch (error) {
            this.sessions.delete(session.id);
            throw error;
        }
    }

    async startTrack(session, videoTrack) {
        // Transfer a clone: the page keeps the original camera track to release it later
        const clone = videoTrack.clone();
        let reply;
        try {
            reply = await this.request({ type: 'start', session: session.id, mode: 'track', track: clone }, [clone]);
        } catch (error) {
            clone.stop();
            throw error;
        }
        return Object.assign(session, { mode: 'track', outputTrack: reply.track });
    }

    async startStreams(session, videoTrack) {
        const processor = new MediaStreamTrackProcessor({ track: videoTrack });
        const { generator, track } = BackgroundEffectsWorker.createGenerator();
        await this.request(
            {
                type: 'start',
                session: session.id,
                mode: 'streams',
                readable: processor.readable,
                writable: generator.writable,
            },
            [processor.readable, generator.writable]
        );
        return Object.assign(session, { mode: 'streams', outputTrack: track });
    }

    async startFrames(session, videoTrack) {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('aria-hidden', 'true');
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
        video.srcObject = new MediaStream([videoTrack]);
        document.body.appendChild(video);
        const canvas = document.createElement('canvas');
        Object.assign(session, { mode: 'frames', video, canvas, timer: null });
        try {
            await video.play();
            await this.request({ type: 'start', session: session.id, mode: 'frames' });
            const renderer = canvas.getContext('bitmaprenderer');
            if (!renderer) throw new Error('bitmaprenderer canvas context is not supported');
            const fps = Math.min(30, videoTrack.getSettings?.().frameRate || 30);
            const pump = async () => {
                const started = performance.now();
                if (session.stopped) return;
                if (video.videoWidth) {
                    const bitmap = await createImageBitmap(video);
                    if (session.stopped) return bitmap.close();
                    const reply = await this.request(
                        { type: 'frame', session: session.id, bitmap, timestamp: started },
                        [bitmap]
                    );
                    if (!reply.bitmap) return;
                    if (session.stopped) return reply.bitmap.close();
                    if (canvas.width !== reply.bitmap.width || canvas.height !== reply.bitmap.height) {
                        canvas.width = reply.bitmap.width;
                        canvas.height = reply.bitmap.height;
                    }
                    renderer.transferFromImageBitmap(reply.bitmap);
                }
                if (session.stopped) return;
                session.timer = setTimeout(
                    () => {
                        session.pump = pump().catch((error) => {
                            if (session.stopped) return;
                            console.error('Background frame failed', error);
                            session.onEnded(error);
                        });
                    },
                    Math.max(0, 1000 / fps - (performance.now() - started))
                );
            };
            // Return once the first frame is drawn, so the output never starts empty
            session.pump = pump();
            await session.pump;
            if (session.stopped) throw new Error('Camera processing stopped');
            return Object.assign(session, { outputTrack: canvas.captureStream(fps).getVideoTracks()[0] });
        } catch (error) {
            await this.stopSession(session);
            throw error;
        }
    }

    async stopSession(session) {
        if (!session || session.stopped) return;
        session.stopped = true;
        this.sessions.delete(session.id);
        // Stop the output first: if the worker ended it (generator closed) it would fire 'ended',
        // and the camera would look lost
        session.outputTrack?.stop();
        clearTimeout(session.timer);
        try {
            await session.pump;
        } catch (error) {
            // reported by the pump
        }
        try {
            await this.request({ type: 'stop', session: session.id }, [], 3000);
        } catch (error) {
            console.warn('Background worker stop failed', error);
        }
        if (session.mode === 'frames') {
            session.video.pause();
            session.video.srcObject = null;
            session.video.remove();
        }
    }

    terminate(error = new Error('Background worker stopped')) {
        this.failed = true;
        const worker = this.worker;
        this.worker = null;
        this.pending.forEach((request) => {
            clearTimeout(request.timer);
            request.reject(error);
        });
        this.pending.clear();
        this.sessions.forEach((session) => session.onEnded(error));
        worker?.terminate();
    }
}

class BackgroundEffects {
    static supported() {
        const canvas = document.createElement('canvas');
        return typeof canvas.captureStream === 'function' && !!canvas.getContext('webgl2');
    }

    constructor(onError) {
        this.onError = onError;
        this.mode = 'off';
        this.stopped = false;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.background = document.createElement('canvas');
        this.backgroundContext = this.background.getContext('2d');
        this.maskCanvas = document.createElement('canvas');
        this.blur = BackgroundCompositor.createBlur();
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
        this.video.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.video);
    }

    async start(stream) {
        this.cameraTrack = stream.getVideoTracks()[0];
        const outputTrack = (await this.startWorker()) || (await this.startMainThread());
        this.cameraEnded = () => this.stop();
        this.cameraTrack.addEventListener('ended', this.cameraEnded, { once: true });
        return new MediaStream([outputTrack, ...stream.getAudioTracks()]);
    }

    // Resolves the worker output track, or null when the main-thread engine must be used
    async startWorker() {
        const engine = await BackgroundEffectsWorker.shared();
        if (this.stopped) throw new Error('Camera processing stopped');
        if (!engine) return null;
        let session;
        try {
            session = await engine.start(this.cameraTrack, {
                onEnded: (ended, error) => this.workerEnded(ended, error),
            });
        } catch (error) {
            if (this.stopped) throw error;
            console.warn('Background worker failed, using the main thread', error);
            BackgroundEffectsWorker.disable();
            return null;
        }
        if (this.stopped) {
            await engine.stopSession(session);
            throw new Error('Camera processing stopped');
        }
        this.worker = engine;
        this.session = session;
        this.outputTrack = session.outputTrack;
        console.log(`Background effects running in a worker (${session.mode})`);
        return this.outputTrack;
    }

    // The worker pipeline ended on its own or the worker crashed: later effects use the main thread
    workerEnded(session, error) {
        if (this.session !== session || this.stopped) return;
        if (this.cameraTrack?.readyState === 'ended') {
            this.stop();
            return;
        }
        this.onError(error || new Error('Background worker stopped'));
    }

    async startMainThread() {
        this.video.srcObject = new MediaStream([this.cameraTrack]);
        await this.video.play();
        if (this.stopped) throw new Error('Camera processing stopped');
        this.resize();
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.output = this.canvas.captureStream(60);
        this.outputTrack = this.output.getVideoTracks()[0];
        this.render(performance.now());
        return this.outputTrack;
    }

    async setMode(mode, image = this.image) {
        if (!['off', 'blur', 'image'].includes(mode)) throw new Error('Invalid background mode');
        if (mode === 'image' && !image) throw new Error('Choose a background image first');
        if (this.session) {
            await this.worker.setBackground(await this.createWorkerBackground(mode, image));
        } else if (mode !== 'off') {
            await this.loadModel();
        }
        if (this.stopped) return;
        this.image = image;
        this.mode = mode;
    }

    // The worker gets a serializable background: the image as a transferable ImageBitmap
    async createWorkerBackground(mode, image) {
        if (mode !== 'image') return { mode };
        // Rasterize through a canvas: works for any decoded image and caps huge pictures
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const scale = Math.min(1, 1920 / Math.max(width, height));
        const canvas = BackgroundCompositor.createCanvas(
            Math.max(1, Math.round(width * scale)),
            Math.max(1, Math.round(height * scale))
        );
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return { mode, bitmap: await createImageBitmap(canvas) };
    }

    canSwapBackground() {
        return Boolean(
            !this.stopped &&
            this.mode !== 'off' &&
            this.outputTrack &&
            this.cameraTrack?.readyState !== 'ended' &&
            this.outputTrack.readyState !== 'ended'
        );
    }

    // Swap the effect on the running pipeline: same output track, so previews and peers keep their stream.
    // Resolves false when no effect is running (the caller must start one).
    async setBackground(mode, image) {
        if (mode === 'off' || !this.canSwapBackground()) return false;
        await this.setMode(mode, image);
        return this.canSwapBackground();
    }

    loadModel() {
        if (!this.modelPromise) {
            this.modelPromise = (async () => {
                const { visionBundleUrl, wasmBaseUrl, modelUrl } = BG_TASKS_VISION;
                const { FilesetResolver, ImageSegmenter, DrawingUtils } = await import(visionBundleUrl);
                const files = await FilesetResolver.forVisionTasks(wasmBaseUrl);
                const segmenter = await ImageSegmenter.createFromOptions(files, {
                    baseOptions: {
                        modelAssetPath: modelUrl,
                        delegate: 'GPU',
                    },
                    canvas: this.maskCanvas,
                    runningMode: 'VIDEO',
                    outputCategoryMask: false,
                    outputConfidenceMasks: true,
                });
                if (this.stopped) {
                    segmenter.close();
                    return;
                }
                this.segmenter = segmenter;
                this.drawing = new DrawingUtils(this.maskCanvas.getContext('webgl2'));
            })().catch((error) => {
                this.modelPromise = null;
                throw error;
            });
        }
        return this.modelPromise;
    }

    resize() {
        const videoWidth = Math.max(1, this.video.videoWidth);
        const videoHeight = Math.max(1, this.video.videoHeight);
        const { width, height } =
            this.mode === 'off'
                ? { width: videoWidth, height: videoHeight }
                : BackgroundCompositor.fitSize(videoWidth, videoHeight);
        if (this.canvas.width === width && this.canvas.height === height) return;
        for (const canvas of [this.canvas, this.background, this.maskCanvas]) {
            canvas.width = width;
            canvas.height = height;
        }
    }

    render(timestamp) {
        if (this.stopped) return;
        const fps = Math.min(60, this.cameraTrack.getSettings().frameRate || 30);
        const interval = 1000 / (this.mode === 'off' ? fps : Math.min(fps, 15));
        if (this.video.readyState >= 2 && timestamp - (this.lastFrame || 0) >= interval) {
            this.lastFrame = timestamp;
            this.resize();
            const { width, height } = this.canvas;
            try {
                if (this.mode === 'off') {
                    this.context.drawImage(this.video, 0, 0, width, height);
                } else {
                    const background = this.backgroundContext;
                    background.clearRect(0, 0, width, height);
                    if (this.mode === 'blur') this.blur(background, this.video, width, height);
                    else BackgroundCompositor.drawCover(background, this.image, width, height);
                    this.segmenter.segmentForVideo(this.video, timestamp, (result) => {
                        this.drawing.drawConfidenceMask(result.confidenceMasks[0], this.background, this.video);
                        this.context.drawImage(this.maskCanvas, 0, 0, width, height);
                    });
                }
            } catch (error) {
                this.mode = 'off';
                this.context.drawImage(this.video, 0, 0, width, height);
                this.onError(error);
            }
            if (!this.stopped) this.outputTrack.requestFrame?.();
        }
        if (!this.stopped) this.frame = setTimeout(() => this.render(performance.now()), 1000 / 60);
    }

    stop(stopCamera = true) {
        if (this.stopped) return;
        this.stopped = true;
        clearTimeout(this.frame);
        this.cameraTrack?.removeEventListener('ended', this.cameraEnded);
        // Stop the output before the worker ends its pipeline, so it never fires 'ended' on its own
        this.outputTrack?.stop();
        if (this.session) void this.worker.stopSession(this.session);
        if (stopCamera) this.cameraTrack?.stop();
        this.video.pause();
        this.video.srcObject = null;
        this.video.remove();
        this.drawing?.close();
        this.segmenter?.close();
    }
}
