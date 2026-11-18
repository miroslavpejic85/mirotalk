/**
 * MiroTalk camera background worker (module worker).
 *
 * Runs the MediaPipe Image Segmenter (selfie model, Apache-2.0) and the background compositing off the
 * main thread. The page picks the frame transport the browser supports:
 *   - 'streams': Chromium transfers the MediaStreamTrackProcessor / Generator streams
 *   - 'track':   Safari 18+ transfers the camera track (MediaStreamTrackProcessor and
 *                VideoTrackGenerator only exist in workers there)
 *   - 'frames':  everything else sends ImageBitmaps and gets the composited ImageBitmaps back
 */

// Segmentation input width: the model runs at 256x256 and the mask comes back at the input size,
// so a wider input only costs more mask pixels for the same edges
const SEGMENT_WIDTH = 256;
const MAX_FRAME_SKIP = 3;
// Soft edge for image backgrounds, in frame pixels
const SOFT_EDGE_PX = 5;

let segmenter = null;
let compositor = null;
let maskIndex = null;
let lastSegmentTimestamp = -1;
let controlQueue = Promise.resolve();

const session = {
    id: 0,
    abort: null,
    done: null,
    track: null,
    lastTimestamp: -1,
};

const state = {
    canvas: null,
    ctx: null,
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

async function init(config) {
    await import(config.compositorUrl);
    compositor = globalThis.BackgroundCompositor;
    const vision = await import(config.visionBundleUrl);
    // true: load the ES module build of the WASM loader, module workers have no importScripts()
    const fileset = await vision.FilesetResolver.forVisionTasks(config.wasmBaseUrl, true);
    segmenter = await vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: config.modelUrl, delegate: config.delegate },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
    });
    state.blur = compositor.createBlur();
    return {
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

function pickMaskIndex(masks) {
    if (masks.length < 2) return 0;
    const labels = segmenter.getLabels?.() || [];
    const person = labels.findIndex((label) => /person|foreground/i.test(label));
    return person >= 0 ? person : masks.length - 1;
}

// The mask canvas alpha is the person confidence
function writeMask(result) {
    const masks = result?.confidenceMasks;
    if (!masks?.length) return;
    if (maskIndex === null) maskIndex = pickMaskIndex(masks);
    const mask = masks[maskIndex] || masks[0];
    const { width, height } = mask;
    if (!state.maskCanvas) {
        state.maskCanvas = new OffscreenCanvas(width, height);
        state.maskCtx = state.maskCanvas.getContext('2d');
    }
    if (!state.maskImage || state.maskImage.width !== width || state.maskImage.height !== height) {
        state.maskCanvas.width = width;
        state.maskCanvas.height = height;
        state.maskImage = new ImageData(width, height);
        state.maskImage.data.fill(255);
    }
    const confidence = mask.getAsFloat32Array();
    const pixels = state.maskImage.data;
    for (let i = 0, alpha = 3; i < confidence.length; i++, alpha += 4) {
        pixels[alpha] = confidence[i] * 255;
    }
    state.maskCtx.putImageData(state.maskImage, 0, 0);
    softenMask(width, height);
    state.hasMask = true;
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
    let resized = null;
    const segmentWidth = Math.min(width, SEGMENT_WIDTH);
    if (segmentWidth < width) {
        try {
            resized = await createImageBitmap(source, {
                resizeWidth: segmentWidth,
                resizeHeight: Math.max(1, Math.round((height * segmentWidth) / width)),
                resizeQuality: 'low',
            });
            input = resized;
        } catch (error) {
            // Resize options unsupported: segment the full frame
        }
    }
    state.maskFrameWidth = compositor.fitSize(width, height).width;
    try {
        // MediaPipe requires strictly increasing timestamps in VIDEO mode
        const ts = Math.max(Math.round(timestamp), lastSegmentTimestamp + 1);
        lastSegmentTimestamp = ts;
        segmenter.segmentForVideo(input, ts, writeMask);
    } finally {
        resized?.close();
    }
    const elapsed = performance.now() - started;
    state.segmentMs = state.segmentMs ? state.segmentMs * 0.8 + elapsed * 0.2 : elapsed;
    // Keep segmentation within half of the frame budget, reusing the last mask in between
    const budget = state.frameIntervalMs / 2;
    state.skipRatio = Math.min(MAX_FRAME_SKIP, Math.max(1, Math.ceil(state.segmentMs / budget)));
}

function shouldSegment(timeMs) {
    if (!state.background) return false;
    const interval = timeMs - state.lastFrameAt;
    if (state.lastFrameAt && interval > 0 && interval < 1000) {
        state.frameIntervalMs = state.frameIntervalMs * 0.9 + interval * 0.1;
    }
    state.lastFrameAt = timeMs;
    const due = !state.hasMask || state.frameCounter % state.skipRatio === 0;
    state.frameCounter++;
    return due;
}

function ready() {
    return Boolean(state.background && state.hasMask);
}

// Draws the person over the background, capped at 1280x720
function composite(frame, frameWidth, frameHeight) {
    const { width, height } = compositor.fitSize(frameWidth, frameHeight);
    const ctx = ensureCanvas(width, height);
    const background = state.background;
    ctx.save();
    try {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(frame, 0, 0, width, height);
        // Blur keeps the sharp mask, images use the softened one
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(background.mode === 'blur' ? state.maskCanvas : state.softMaskCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-over';
        if (background.mode === 'blur') state.blur(ctx, frame, width, height);
        else compositor.drawCover(ctx, background.bitmap, width, height);
    } finally {
        ctx.restore();
    }
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
        if (shouldSegment(timeMs)) await segment(frame, width, height, timeMs);
        if (!ready()) {
            if (timestamp === frame.timestamp) {
                controller.enqueue(frame);
                enqueued = true;
            } else {
                controller.enqueue(new VideoFrame(frame, { timestamp }));
            }
            return;
        }
        composite(frame, width, height);
        controller.enqueue(new VideoFrame(state.canvas, { timestamp }));
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
        if (shouldSegment(timestamp)) await segment(bitmap, width, height, timestamp);
        if (!ready()) {
            self.postMessage({ type: 'frame', id, bitmap }, [bitmap]);
            return;
        }
        composite(bitmap, width, height);
        bitmap.close();
        const output = state.canvas.transferToImageBitmap();
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

function closeBitmap(bitmap) {
    try {
        bitmap?.close();
    } catch (error) {
        // already closed
    }
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
                self.close();
            });
            break;
        default:
            // start / background / stop run in order, a start waits for the previous session to stop
            controlQueue = controlQueue.then(() => handleControl(message));
            break;
    }
};
