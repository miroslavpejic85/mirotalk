/**
 * MiroTalk camera background worker (module worker).
 *
 * Runs the MediaPipe Image Segmenter (Apache-2.0) and the background compositing off the main thread:
 *   - model: selfie multiclass (person = not background, hair included) on the GPU delegate when it
 *            works and is fast enough, otherwise the selfie model on the CPU
 *   - compositing: background-effects-gl.js (WebGL2: bilateral edge refinement, light wrapping), or
 *                  Canvas2D with the shared background-effects-compositor.js helpers without WebGL2
 * Segmentation runs in a nested worker (this script again, named SEGMENTER_NAME) so frames never wait
 * for it: each frame is composited at once with the latest mask, while the next mask is computed in
 * parallel. Without nested workers the segmentation runs here, on every few frames.
 * The page picks the frame transport the browser supports:
 *   - 'streams': Chromium transfers the MediaStreamTrackProcessor / Generator streams
 *   - 'track':   Safari 18+ transfers the camera track (MediaStreamTrackProcessor and
 *                VideoTrackGenerator only exist in workers there)
 *   - 'frames':  everything else sends ImageBitmaps and gets the composited ImageBitmaps back
 */

// Segmentation input: the models run at 256x256 and the mask comes back at the input size. A short side
// of 256 keeps every model row and column (a 256 px wide landscape input squashes 256 rows into 144)
const SEGMENT_SIZE = 256;
// Slower than this on average, the multiclass model gives way to the selfie model on the CPU
const MAX_MULTICLASS_SEGMENT_MS = 50;
const MODEL_WARMUP_SEGMENTS = 20;
const MAX_FRAME_SKIP = 3;
const SEGMENTER_NAME = 'mirotalk-bg-segmenter';
const SEGMENTER_INIT_TIMEOUT_MS = 30000;
// No mask back in this time: the segmenter worker is considered dead and segmentation moves here
const SEGMENTER_STALL_MS = 3000;
const FIRST_MASK_TIMEOUT_MS = 1000;
// The segmenter rests at least this share of its segmentation time between masks: a GPU model run
// back to back competes with the compositor and the video encoder for the GPU
const SEGMENTER_REST_RATIO = 0.5;
// Soft edge for image backgrounds, in frame pixels
const SOFT_EDGE_PX = 5;

let segmenter = null;
let compositor = null;
let vision = null;
let fileset = null;
let workerConfig = null;
let model = null;
let downgrading = false;
let segmentCount = 0;
let stabilizeMask = null;
let maskSource = null;
let lastSegmentTimestamp = -1;
let controlQueue = Promise.resolve();

const session = {
    id: 0,
    abort: null,
    done: null,
    track: null,
    lastTimestamp: -1,
};

// The nested segmenter worker, as seen from the compositor
const remote = {
    worker: null,
    busy: false,
    sentAt: 0,
    doneAt: 0,
    segmentMs: 0,
    generation: 0,
    firstMask: null,
};

const state = {
    canvas: null,
    ctx: null,
    gl: null,
    invertBuffer: null,
    maskCanvas: null,
    maskCtx: null,
    maskImage: null,
    softMaskCanvas: null,
    softMaskCtx: null,
    maskFrameWidth: 0,
    hasMask: false,
    background: null,
    blur: null,
    frameCounter: 0,
    skipRatio: 1,
    segmentMs: 0,
    frameIntervalMs: 1000 / 30,
    lastFrameAt: 0,
};

function errorMessage(error) {
    return String(error?.message || error);
}

function closeBitmap(bitmap) {
    try {
        bitmap?.close();
    } catch (error) {
        // already closed
    }
}

// ####################################################
// SEGMENTATION (model, shared by both roles)
// ####################################################

async function createSegmenter(modelUrl, delegate) {
    return vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelUrl, delegate },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
    });
}

// The first run of a model compiles the GPU delegate shaders, which takes seconds: run it while the model
// loads, so no frame waits for it and it is not mistaken for a stalled segmenter. A model that fails
// to run is dropped here too, while the next candidate can still be tried.
function warmUp(next) {
    const ts = lastSegmentTimestamp + 1;
    lastSegmentTimestamp = ts;
    next.segmentForVideo(new ImageData(SEGMENT_SIZE, SEGMENT_SIZE), ts, () => {});
}

async function loadCandidate(candidate) {
    const next = await createSegmenter(candidate.url, candidate.delegate);
    try {
        warmUp(next);
    } catch (error) {
        closeSegmenter(next);
        throw error;
    }
    useSegmenter(next, candidate);
}

function closeSegmenter(target) {
    try {
        target?.close();
    } catch (error) {
        // already closed
    }
}

function useSegmenter(next, candidate) {
    const previous = segmenter;
    segmenter = next;
    model = candidate;
    maskSource = null;
    segmentCount = 0;
    state.segmentMs = 0;
    stabilizeMask?.reset();
    closeSegmenter(previous);
}

// The multiclass model needs the GPU delegate to be fast enough: without it, use the selfie model
async function loadModel(config) {
    const candidates = [];
    if (config.multiclassModelUrl) {
        candidates.push({ name: 'multiclass', url: config.multiclassModelUrl, delegate: 'GPU' });
    }
    candidates.push({ name: 'selfie', url: config.modelUrl, delegate: config.delegate });
    if (config.delegate === 'GPU') candidates.push({ name: 'selfie', url: config.modelUrl, delegate: 'CPU' });
    let lastError;
    for (const candidate of candidates) {
        try {
            await loadCandidate(candidate);
            return;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

async function downgradeModel() {
    downgrading = true;
    try {
        await loadCandidate({ name: 'selfie', url: workerConfig.modelUrl, delegate: 'CPU' });
        console.warn('Camera background: multiclass segmentation too slow, using the selfie model');
    } catch (error) {
        console.warn('Camera background: selfie model fallback failed', error);
    } finally {
        downgrading = false;
    }
}

async function loadSegmenter(config) {
    vision = await import(config.visionBundleUrl);
    // true: load the ES module build of the WASM loader, module workers have no importScripts()
    fileset = await vision.FilesetResolver.forVisionTasks(config.wasmBaseUrl, true);
    await loadModel(config);
}

// Person confidence: the person / foreground mask, or the inverted background of multiclass models
function pickMaskSource(masks) {
    if (masks.length < 2) return { index: 0, invert: false };
    const labels = segmenter.getLabels?.() || [];
    const person = labels.findIndex((label) => /person|foreground/i.test(label));
    if (person >= 0) return { index: person, invert: false };
    const background = labels.findIndex((label) => /background/i.test(label));
    if (background >= 0) return { index: background, invert: true };
    return { index: masks.length - 1, invert: false };
}

function invert(values) {
    if (state.invertBuffer?.length !== values.length) state.invertBuffer = new Float32Array(values.length);
    const inverted = state.invertBuffer;
    for (let i = 0; i < values.length; i++) inverted[i] = 1 - values[i];
    return inverted;
}

// Runs the model and hands the person confidence (0..1, row-major) to onMask
function segmentInput(input, timestamp, onMask) {
    // MediaPipe requires strictly increasing timestamps in VIDEO mode
    const ts = Math.max(Math.round(timestamp), lastSegmentTimestamp + 1);
    lastSegmentTimestamp = ts;
    segmenter.segmentForVideo(input, ts, (result) => {
        const masks = result?.confidenceMasks;
        if (!masks?.length) return;
        maskSource ??= pickMaskSource(masks);
        const mask = masks[maskSource.index] || masks[0];
        const values = mask.getAsFloat32Array();
        onMask(maskSource.invert ? invert(values) : values, mask.width, mask.height);
    });
}

function recordSegmentMs(elapsed) {
    state.segmentMs = state.segmentMs ? state.segmentMs * 0.8 + elapsed * 0.2 : elapsed;
    // Keep segmentation within half of the frame budget, reusing the last mask in between
    const budget = state.frameIntervalMs / 2;
    state.skipRatio = Math.min(MAX_FRAME_SKIP, Math.max(1, Math.ceil(state.segmentMs / budget)));
    segmentCount++;
    if (
        model?.name === 'multiclass' &&
        !downgrading &&
        segmentCount > MODEL_WARMUP_SEGMENTS &&
        state.segmentMs > MAX_MULTICLASS_SEGMENT_MS
    ) {
        void downgradeModel();
    }
}

function segmentSize(width, height) {
    const scale = Math.min(1, SEGMENT_SIZE / Math.min(width, height));
    return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

function resizeForSegmentation(source, width, height) {
    const [resizeWidth, resizeHeight] = segmentSize(width, height);
    if (resizeWidth >= width) return createImageBitmap(source);
    return createImageBitmap(source, { resizeWidth, resizeHeight, resizeQuality: 'low' }).catch(() =>
        // Resize options unsupported: segment the full frame
        createImageBitmap(source)
    );
}

// ####################################################
// NESTED SEGMENTER WORKER (compositor side)
// ####################################################

function startRemoteSegmenter(config) {
    if (typeof Worker !== 'function' || !config.segmenterUrl) return Promise.resolve(false);
    return new Promise((resolve) => {
        let worker;
        const timer = setTimeout(() => finish(new Error('segmenter init timed out')), SEGMENTER_INIT_TIMEOUT_MS);
        const finish = (error, info) => {
            clearTimeout(timer);
            if (error) {
                console.warn('Camera background segmenter worker unavailable, segmenting in this worker', error);
                worker?.terminate();
                resolve(false);
                return;
            }
            remote.worker = worker;
            worker.onmessage = (event) => onRemoteMessage(event.data || {});
            worker.onerror = (event) => {
                event.preventDefault?.();
                void failRemote(new Error(event.message || 'segmenter worker failed'));
            };
            model = { name: info.model, delegate: info.delegate };
            resolve(true);
        };
        try {
            worker = new Worker(config.segmenterUrl, { type: 'module', name: SEGMENTER_NAME });
        } catch (error) {
            finish(error);
            return;
        }
        worker.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === 'ready') finish(null, message);
            else if (message.type === 'error') finish(new Error(message.message));
        };
        worker.onerror = (event) => {
            event.preventDefault?.();
            finish(new Error(event.message || 'segmenter worker failed to load'));
        };
        worker.postMessage({ type: 'init', config });
    });
}

function onRemoteMessage(message) {
    if (message.type !== 'mask') return;
    remote.busy = false;
    remote.doneAt = performance.now();
    const elapsed = remote.doneAt - remote.sentAt;
    remote.segmentMs = remote.segmentMs ? remote.segmentMs * 0.8 + elapsed * 0.2 : elapsed;
    if (message.model) model = { name: message.model, delegate: message.delegate };
    if (message.generation === remote.generation && message.values) {
        applyMask(message.values, message.width, message.height);
    }
    remote.firstMask?.resolve();
    remote.firstMask = null;
}

// The segmenter worker died or hangs: segment in this worker from now on
async function failRemote(error) {
    if (!remote.worker) return;
    console.warn('Camera background segmenter worker failed, segmenting in this worker', error);
    remote.worker.terminate();
    remote.worker = null;
    remote.busy = false;
    remote.firstMask?.resolve();
    remote.firstMask = null;
    try {
        await loadSegmenter(workerConfig);
    } catch (loadError) {
        console.error('Camera background segmentation unavailable', loadError);
    }
}

// Sends a downscaled copy of the frame when the segmenter is free; never waits for the mask
async function requestRemoteMask(source, width, height, timestamp) {
    if (remote.busy) {
        if (performance.now() - remote.sentAt > SEGMENTER_STALL_MS) void failRemote(new Error('segmenter stalled'));
        return;
    }
    if (state.hasMask && performance.now() - remote.doneAt < remote.segmentMs * SEGMENTER_REST_RATIO) return;
    remote.busy = true;
    remote.sentAt = performance.now();
    let bitmap;
    try {
        bitmap = await resizeForSegmentation(source, width, height);
    } catch (error) {
        remote.busy = false;
        return;
    }
    if (!remote.worker) {
        bitmap.close();
        return;
    }
    state.maskFrameWidth = compositor.fitSize(width, height).width;
    if (!state.hasMask && !remote.firstMask) {
        let resolve;
        const promise = new Promise((done) => (resolve = done));
        remote.firstMask = { promise, resolve };
    }
    remote.worker.postMessage({ type: 'segment', bitmap, timestamp, generation: remote.generation }, [bitmap]);
}

// Before the first mask there is nothing to composite with: wait for it rather than send the room
async function waitFirstMask() {
    if (state.hasMask || !remote.firstMask) return;
    let timer;
    await Promise.race([
        remote.firstMask.promise,
        new Promise((resolve) => (timer = setTimeout(resolve, FIRST_MASK_TIMEOUT_MS))),
    ]);
    clearTimeout(timer);
}

// One mask per frame at most, as long as the segmenter keeps up
async function updateMask(source, width, height, timeMs) {
    if (!state.background) return;
    if (remote.worker) {
        trackFrameInterval(timeMs);
        await requestRemoteMask(source, width, height, timeMs);
        await waitFirstMask();
        return;
    }
    if (segmenter && shouldSegment(timeMs)) await segment(source, width, height, timeMs);
}

// ####################################################
// SEGMENTER ROLE (nested worker)
// ####################################################

function segmentForCompositor({ bitmap, timestamp, generation }) {
    const started = performance.now();
    let reply = { type: 'mask', generation, values: null };
    try {
        segmentInput(bitmap, timestamp, (values, width, height) => {
            reply = { type: 'mask', generation, values: values.slice(), width, height };
        });
    } catch (error) {
        console.warn('Camera background segmentation failed', error);
    } finally {
        closeBitmap(bitmap);
    }
    recordSegmentMs(performance.now() - started);
    reply.model = model?.name;
    reply.delegate = model?.delegate;
    self.postMessage(reply, reply.values ? [reply.values.buffer] : []);
}

function runSegmenterRole() {
    self.onmessage = (event) => {
        const message = event.data || {};
        switch (message.type) {
            case 'init':
                workerConfig = message.config;
                loadSegmenter(message.config).then(
                    () => self.postMessage({ type: 'ready', model: model.name, delegate: model.delegate }),
                    (error) => self.postMessage({ type: 'error', stage: 'init', message: errorMessage(error) })
                );
                break;
            case 'segment':
                segmentForCompositor(message);
                break;
            default:
                break;
        }
    };
}

// ####################################################
// COMPOSITOR ROLE
// ####################################################

async function loadGl(url) {
    try {
        await import(url);
        state.gl = globalThis.BackgroundEffectsGL.createCompositor(new OffscreenCanvas(1, 1));
    } catch (error) {
        console.warn('Camera background WebGL compositor unavailable, using Canvas2D', error);
        state.gl = null;
    }
}

// Canvas2D takes over: it wants the edge-tightened mask in canvases
function disableGl() {
    try {
        state.gl?.destroy();
    } catch (error) {
        // the context is gone anyway
    }
    state.gl = null;
    stabilizeMask = null;
    if (state.maskImage) drawMaskCanvases(state.maskImage.width, state.maskImage.height);
}

async function init(config) {
    workerConfig = config;
    await import(config.compositorUrl);
    compositor = globalThis.BackgroundCompositor;
    state.blur = compositor.createBlur();
    if (config.glUrl) await loadGl(config.glUrl);
    if (!(await startRemoteSegmenter(config))) await loadSegmenter(config);
    return {
        model: model.name,
        delegate: model.delegate,
        gl: Boolean(state.gl),
        segmenter: remote.worker ? 'worker' : 'inline',
        trackProcessor: typeof MediaStreamTrackProcessor === 'function' && typeof VideoTrackGenerator === 'function',
    };
}

function ensureCanvas(width, height) {
    if (!state.canvas) {
        state.canvas = new OffscreenCanvas(width, height);
        state.ctx = state.canvas.getContext('2d');
    } else if (state.canvas.width !== width || state.canvas.height !== height) {
        state.canvas.width = width;
        state.canvas.height = height;
    }
    return state.ctx;
}

// The mask image alpha is the person confidence, as the WebGL compositor and the Canvas2D path expect
function applyMask(values, width, height) {
    if (!state.maskImage || state.maskImage.width !== width || state.maskImage.height !== height) {
        state.maskImage = new ImageData(width, height);
        state.maskImage.data.fill(255);
    }
    // Temporally stabilized person confidence, edge-tightened for Canvas2D
    stabilizeMask ??= compositor.createMaskStabilizer({ edgeCurve: !state.gl });
    const confidence = stabilizeMask(values);
    const pixels = state.maskImage.data;
    for (let i = 0, alpha = 3; i < confidence.length; i++, alpha += 4) {
        pixels[alpha] = confidence[i] * 255;
    }
    if (state.gl) state.gl.setMask(state.maskImage);
    else drawMaskCanvases(width, height);
    state.hasMask = true;
}

function drawMaskCanvases(width, height) {
    if (!state.maskCanvas) {
        state.maskCanvas = new OffscreenCanvas(width, height);
        state.maskCtx = state.maskCanvas.getContext('2d');
    } else if (state.maskCanvas.width !== width || state.maskCanvas.height !== height) {
        state.maskCanvas.width = width;
        state.maskCanvas.height = height;
    }
    state.maskCtx.putImageData(state.maskImage, 0, 0);
    softenMask(width, height);
}

// Blur the mask once per segmentation, at mask resolution, instead of at frame size on every frame
function softenMask(width, height) {
    if (!state.softMaskCanvas) {
        state.softMaskCanvas = new OffscreenCanvas(width, height);
        state.softMaskCtx = state.softMaskCanvas.getContext('2d');
    } else if (state.softMaskCanvas.width !== width || state.softMaskCanvas.height !== height) {
        state.softMaskCanvas.width = width;
        state.softMaskCanvas.height = height;
    }
    const ctx = state.softMaskCtx;
    const radius = Math.max(1, (SOFT_EDGE_PX * width) / (state.maskFrameWidth || width));
    ctx.clearRect(0, 0, width, height);
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(state.maskCanvas, 0, 0);
    ctx.filter = 'none';
}

async function segment(source, width, height, timestamp) {
    const started = performance.now();
    let input = source;
    if (segmentSize(width, height)[0] < width) {
        try {
            input = await resizeForSegmentation(source, width, height);
        } catch (error) {
            input = source;
        }
    }
    state.maskFrameWidth = compositor.fitSize(width, height).width;
    try {
        segmentInput(input, timestamp, applyMask);
    } finally {
        if (input !== source) input.close();
    }
    recordSegmentMs(performance.now() - started);
}

function trackFrameInterval(timeMs) {
    const interval = timeMs - state.lastFrameAt;
    if (state.lastFrameAt && interval > 0 && interval < 1000) {
        state.frameIntervalMs = state.frameIntervalMs * 0.9 + interval * 0.1;
    }
    state.lastFrameAt = timeMs;
}

function shouldSegment(timeMs) {
    trackFrameInterval(timeMs);
    const due = !state.hasMask || state.frameCounter % state.skipRatio === 0;
    state.frameCounter++;
    return due;
}

function ready() {
    return Boolean(state.background && state.hasMask);
}

function glView() {
    const background = state.background;
    if (background.mode === 'blur') return { kind: 'blur', blurRadius: compositor.BLUR_RADIUS };
    return { kind: 'image', source: background.bitmap };
}

// Draws the person over the background, capped at 1280x720. Returns the canvas holding the frame.
function composite(frame, frameWidth, frameHeight) {
    const { width, height } = compositor.fitSize(frameWidth, frameHeight);
    const gl = state.gl;
    if (gl) {
        try {
            if (gl.lost) throw new Error('WebGL context lost');
            if (gl.render(frame, width, height, glView())) return gl.canvas;
        } catch (error) {
            console.warn('Camera background WebGL compositor failed, using Canvas2D', error);
            disableGl();
        }
    }
    const ctx = ensureCanvas(width, height);
    const background = state.background;
    ctx.save();
    try {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frame, 0, 0, width, height);
        // Blur keeps the sharp mask, images use the softened one
        ctx.globalCompositeOperation = 'destination-in';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(background.mode === 'blur' ? state.maskCanvas : state.softMaskCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-over';
        if (background.mode === 'blur') state.blur(ctx, frame, width, height);
        else compositor.drawCover(ctx, background.bitmap, width, height);
    } finally {
        ctx.restore();
    }
    return state.canvas;
}

// Output timestamps must increase: some sources (WebKit canvas capture) stamp every frame 0, and a
// generator fed equal timestamps shows the first frame forever
function outputTimestamp(frame) {
    const timestamp =
        frame.timestamp > session.lastTimestamp
            ? frame.timestamp
            : Math.max(session.lastTimestamp + 1, Math.round(performance.now() * 1000));
    session.lastTimestamp = timestamp;
    return timestamp;
}

async function transformFrame(frame, controller) {
    let enqueued = false;
    try {
        const width = frame.displayWidth;
        const height = frame.displayHeight;
        const timestamp = outputTimestamp(frame);
        const timeMs = timestamp / 1000;
        await updateMask(frame, width, height, timeMs);
        if (!ready()) {
            if (timestamp === frame.timestamp) {
                controller.enqueue(frame);
                enqueued = true;
            } else {
                controller.enqueue(new VideoFrame(frame, { timestamp }));
            }
            return;
        }
        const output = composite(frame, width, height);
        controller.enqueue(new VideoFrame(output, { timestamp }));
    } finally {
        if (!enqueued) frame.close();
    }
}

async function processBitmap({ id, session: sessionId, bitmap, timestamp }) {
    if (sessionId !== session.id) {
        bitmap.close();
        self.postMessage({ type: 'frame', id, bitmap: null });
        return;
    }
    try {
        const { width, height } = bitmap;
        await updateMask(bitmap, width, height, timestamp);
        if (!ready()) {
            self.postMessage({ type: 'frame', id, bitmap }, [bitmap]);
            return;
        }
        const canvas = composite(bitmap, width, height);
        bitmap.close();
        const output = canvas.transferToImageBitmap();
        self.postMessage({ type: 'frame', id, bitmap: output }, [output]);
    } catch (error) {
        bitmap.close();
        self.postMessage({ type: 'error', id, message: errorMessage(error) });
    }
}

function runPipeline(readable, writable, id) {
    const abort = new AbortController();
    session.abort = abort;
    const transformer = new TransformStream({ transform: transformFrame });
    session.done = readable
        .pipeThrough(transformer, { signal: abort.signal })
        .pipeTo(writable, { signal: abort.signal })
        .then(() => {
            if (session.id === id) self.postMessage({ type: 'pipeline-ended', session: id });
        })
        .catch((error) => {
            if (!abort.signal.aborted && session.id === id) {
                self.postMessage({ type: 'pipeline-error', session: id, message: errorMessage(error) });
            }
        });
}

// background: { mode: 'off' } (frames pass through), { mode: 'blur' } or { mode: 'image', bitmap }
function setBackground(background) {
    const previous = state.background;
    if (!['off', 'blur', 'image'].includes(background?.mode)) {
        throw new Error(`Unknown background: ${background?.mode}`);
    }
    if (background.mode === 'image' && !background.bitmap) throw new Error('Background image missing');
    state.background = background.mode === 'off' ? null : background;
    if (previous?.bitmap && previous.bitmap !== background.bitmap) closeBitmap(previous.bitmap);
}

async function stopSession() {
    session.abort?.abort('Processing stopped');
    try {
        await session.done;
    } catch (error) {
        // the pipeline reports its own errors
    }
    try {
        session.track?.stop();
    } catch (error) {
        // ignore
    }
    session.abort = null;
    session.done = null;
    session.track = null;
}

async function startSession(message) {
    await stopSession();
    session.id = message.session;
    session.lastTimestamp = -1;
    // Frames pass through until the page sends this session's background
    setBackground({ mode: 'off' });
    state.hasMask = false;
    stabilizeMask?.reset();
    // Masks still on their way belong to the previous camera
    remote.generation++;
    remote.firstMask?.resolve();
    remote.firstMask = null;
    state.frameCounter = 0;
    state.lastFrameAt = 0;
    if (message.mode === 'streams') {
        runPipeline(message.readable, message.writable, message.session);
        return {};
    }
    if (message.mode === 'track') {
        const processor = new MediaStreamTrackProcessor({ track: message.track });
        const generator = new VideoTrackGenerator();
        session.track = message.track;
        runPipeline(processor.readable, generator.writable, message.session);
        return { track: generator.track, transfer: [generator.track] };
    }
    return {};
}

async function handleControl(message) {
    const { id } = message;
    try {
        switch (message.type) {
            case 'start': {
                const { transfer = [], ...result } = await startSession(message);
                self.postMessage({ type: 'ack', id, ...result }, transfer);
                break;
            }
            case 'background':
                setBackground(message.background);
                self.postMessage({ type: 'ack', id });
                break;
            case 'stop':
                if (message.session === session.id) {
                    await stopSession();
                    session.id = 0;
                    setBackground({ mode: 'off' });
                }
                self.postMessage({ type: 'ack', id });
                break;
            default:
                break;
        }
    } catch (error) {
        if (message.type === 'start') {
            message.track?.stop();
            session.id = 0;
        }
        if (message.type === 'background') closeBitmap(message.background?.bitmap);
        self.postMessage({ type: 'error', id, message: errorMessage(error) });
    }
}

function runCompositorRole() {
    self.onmessage = (event) => {
        const message = event.data || {};
        switch (message.type) {
            case 'init':
                init(message.config).then(
                    (info) => self.postMessage({ type: 'ready', ...info }),
                    (error) => self.postMessage({ type: 'error', stage: 'init', message: errorMessage(error) })
                );
                break;
            case 'frame':
                // The page sends the next frame only after receiving the previous one
                void processBitmap(message);
                break;
            case 'close':
                controlQueue = controlQueue.then(async () => {
                    await stopSession();
                    try {
                        segmenter?.close();
                    } catch (error) {
                        // ignore, the worker is going away
                    }
                    segmenter = null;
                    remote.worker?.terminate();
                    remote.worker = null;
                    self.close();
                });
                break;
            default:
                // start / background / stop run in order, a start waits for the previous session to stop
                controlQueue = controlQueue.then(() => handleControl(message));
                break;
        }
    };
}

if (self.name === SEGMENTER_NAME) runSegmenterRole();
else runCompositorRole();
