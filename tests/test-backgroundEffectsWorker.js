'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');

const read = (file) => fs.readFileSync(path.join(__dirname, '../public/js', file), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));
// Objects created inside a vm context have other prototypes: compare their structure only
const plain = (value) => JSON.parse(JSON.stringify(value));

function createContext2D() {
    return {
        filter: 'none',
        globalCompositeOperation: 'source-over',
        save: sinon.spy(),
        restore: sinon.spy(),
        clearRect: sinon.spy(),
        drawImage: sinon.spy(),
        putImageData: sinon.spy(),
        getImageData: sinon.spy(),
    };
}

class FakeOffscreenCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.context = createContext2D();
    }
    getContext() {
        return this.context;
    }
    transferToImageBitmap() {
        return { width: this.width, height: this.height, close: sinon.spy(), composited: true };
    }
}

class FakeImageData {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
    }
}

const bitmap = (width = 640, height = 360) => ({ width, height, close: sinon.spy() });

describe('camera background worker script', () => {
    let context;
    let posted;
    let now;
    let segmentCalls;

    function createWorker({ masks = [{ width: 2, height: 1, values: [0, 1] }], labels = [], segmentCost = 5 } = {}) {
        posted = [];
        now = 0;
        segmentCalls = [];
        context = vm.createContext({
            console: { log() {}, warn() {}, error() {} },
            self: { postMessage: (message, transfer) => posted.push({ message, transfer }), close: sinon.spy() },
            OffscreenCanvas: FakeOffscreenCanvas,
            ImageData: FakeImageData,
            createImageBitmap: async (source, options) => ({
                width: options?.resizeWidth || source.width,
                height: options?.resizeHeight || source.height,
                close: sinon.spy(),
                resizedFrom: source,
            }),
            performance: { now: () => now },
            TransformStream,
            AbortController,
            setTimeout,
            clearTimeout,
        });
        vm.runInContext(read('background-effects-compositor.js'), context);
        vm.runInContext(read('background-effects-worker.js'), context);
        context.fakeSegmenter = {
            getLabels: () => labels,
            segmentForVideo: (input, timestamp, callback) => {
                segmentCalls.push({ input, timestamp });
                now += segmentCost;
                callback({
                    confidenceMasks: masks.map(({ width, height, values }) => ({
                        width,
                        height,
                        getAsFloat32Array: () => Float32Array.from(values),
                    })),
                });
            },
        };
        vm.runInContext(
            'segmenter = fakeSegmenter; compositor = BackgroundCompositor; state.blur = compositor.createBlur();',
            context
        );
    }

    function send(message) {
        context.self.onmessage({ data: message });
        return flush();
    }

    const lastReply = () => posted[posted.length - 1].message;
    const state = () => vm.runInContext('state', context);

    async function startFrames(background = { mode: 'blur' }) {
        await send({ type: 'start', id: 1, session: 7, mode: 'frames' });
        assert.deepEqual(plain(lastReply()), { type: 'ack', id: 1 });
        await send({ type: 'background', id: 2, background });
        assert.deepEqual(plain(lastReply()), { type: 'ack', id: 2 });
    }

    it('returns composited frames with the person mask as alpha, segmenting a 256 px short side copy', async () => {
        createWorker({ masks: [{ width: 2, height: 1, values: [0, 0.5] }] });
        await startFrames();

        const first = bitmap(512, 288);
        await send({ type: 'frame', id: 3, session: 7, bitmap: first, timestamp: 10 });
        const reply = lastReply();
        assert.equal(reply.bitmap.composited, true);
        assert.equal(first.close.calledOnce, true);
        assert.deepEqual([...state().maskImage.data], [255, 255, 255, 0, 255, 255, 255, 128]);
        // Short side 256: every row and column of the 256x256 model output is kept
        assert.equal(segmentCalls[0].input.width, 455);
        assert.equal(segmentCalls[0].input.height, 256);
        assert.equal(segmentCalls[0].input.close.calledOnce, true);
    });

    it('passes frames through without segmenting while the background is off', async () => {
        createWorker();
        await send({ type: 'start', id: 1, session: 7, mode: 'frames' });
        const frame = bitmap();
        await send({ type: 'frame', id: 2, session: 7, bitmap: frame, timestamp: 1 });
        assert.equal(lastReply().bitmap, frame);
        assert.equal(posted.at(-1).transfer[0], frame);
        assert.equal(frame.close.called, false);
        assert.equal(segmentCalls.length, 0);
    });

    it('caps the composited output at 1280x720', async () => {
        createWorker();
        await startFrames();
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(1920, 1080), timestamp: 1 });
        assert.equal(lastReply().bitmap.width, 1280);
        assert.equal(lastReply().bitmap.height, 720);
    });

    it('keeps MediaPipe timestamps strictly increasing', async () => {
        createWorker({ segmentCost: 0 });
        await startFrames();
        for (const timestamp of [100, 100, 99.6]) {
            await send({ type: 'frame', id: timestamp, session: 7, bitmap: bitmap(), timestamp });
        }
        assert.deepEqual(
            segmentCalls.map((call) => call.timestamp),
            [100, 101, 102]
        );
    });

    it('skips segmentation adaptively when it takes more than half of the frame budget', async () => {
        createWorker({ segmentCost: 40 });
        await startFrames();
        for (let index = 0; index < 9; index++) {
            await send({ type: 'frame', id: 10 + index, session: 7, bitmap: bitmap(), timestamp: index * 33 });
        }
        assert.equal(state().skipRatio, 3);
        assert.ok(segmentCalls.length <= 4);
        assert.equal(
            posted.filter(({ message }) => message.bitmap?.composited).length,
            9,
            'every frame is still composited with the last mask'
        );
    });

    it('answers frames of a stopped session without processing them', async () => {
        createWorker();
        await startFrames();
        await send({ type: 'stop', id: 4, session: 7 });
        const late = bitmap();
        await send({ type: 'frame', id: 5, session: 7, bitmap: late, timestamp: 1 });
        assert.deepEqual(plain(lastReply()), { type: 'frame', id: 5, bitmap: null });
        assert.equal(late.close.calledOnce, true);
        assert.equal(segmentCalls.length, 0);
    });

    it('uses the sharp mask for blur and one softened mask per segmentation for images', async () => {
        // 256 px mask for a 640 px frame: the 5 px soft edge becomes 2 px at mask resolution
        createWorker({ masks: [{ width: 256, height: 1, values: new Array(256).fill(1) }] });
        const image = bitmap(1920, 1080);
        await startFrames({ mode: 'image', bitmap: image });
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(), timestamp: 1 });
        const { canvas, softMaskCanvas, maskCanvas } = state();
        assert.equal(softMaskCanvas.context.drawImage.callCount, 1);
        assert.equal(softMaskCanvas.context.filter, 'none');
        const drawn = () => canvas.context.drawImage.args.map((args) => args[0]);
        assert.equal(drawn().includes(softMaskCanvas), true);
        assert.equal(drawn().includes(maskCanvas), false);
        assert.equal(drawn().includes(image), true);

        await send({ type: 'background', id: 4, background: { mode: 'blur' } });
        canvas.context.drawImage.resetHistory();
        await send({ type: 'frame', id: 5, session: 7, bitmap: bitmap(), timestamp: 40 });
        assert.equal(drawn().includes(maskCanvas), true);
        assert.equal(drawn().includes(softMaskCanvas), false);
    });

    it('softens the mask in proportion to the frame size', async () => {
        createWorker({ masks: [{ width: 256, height: 1, values: new Array(256).fill(1) }] });
        await startFrames({ mode: 'image', bitmap: bitmap() });
        const filters = [];
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(), timestamp: 1 });
        const softContext = state().softMaskCanvas.context;
        let filter = 'none';
        Object.defineProperty(softContext, 'filter', {
            get: () => filter,
            set: (value) => {
                filters.push(value);
                filter = value;
            },
        });
        await send({ type: 'frame', id: 4, session: 7, bitmap: bitmap(), timestamp: 40 });
        assert.deepEqual(filters, ['blur(2px)', 'none']);
    });

    it('swaps backgrounds and releases the image bitmaps it replaced', async () => {
        createWorker();
        const image = bitmap(1920, 1080);
        await startFrames({ mode: 'image', bitmap: image });
        const next = bitmap(1280, 720);
        await send({ type: 'background', id: 3, background: { mode: 'image', bitmap: next } });
        assert.equal(image.close.calledOnce, true);
        await send({ type: 'background', id: 4, background: { mode: 'blur' } });
        assert.equal(next.close.calledOnce, true);
        assert.equal(state().background.mode, 'blur');
    });

    it('rejects invalid backgrounds and releases their bitmap', async () => {
        createWorker();
        await startFrames();
        const image = bitmap();
        await send({ type: 'background', id: 3, background: { mode: 'gif', bitmap: image } });
        assert.equal(lastReply().type, 'error');
        assert.equal(image.close.calledOnce, true);
        assert.equal(state().background.mode, 'blur');
    });

    it('starts every session without the previous background', async () => {
        createWorker();
        const image = bitmap();
        await startFrames({ mode: 'image', bitmap: image });
        await send({ type: 'start', id: 3, session: 8, mode: 'frames' });
        assert.equal(state().background, null);
        assert.equal(image.close.calledOnce, true);
    });

    it('picks the person mask of multiclass models by label', async () => {
        createWorker({
            labels: ['background', 'person'],
            masks: [
                { width: 1, height: 1, values: [1] },
                { width: 1, height: 1, values: [0.5] },
            ],
        });
        await startFrames();
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(1, 1), timestamp: 1 });
        assert.equal(state().maskImage.data[3], 128);
    });

    it('uses the inverted background of multiclass models without a person label', async () => {
        createWorker({
            labels: ['background', 'hair', 'body-skin'],
            masks: [
                { width: 2, height: 1, values: [1, 0] },
                { width: 2, height: 1, values: [0, 1] },
                { width: 2, height: 1, values: [0, 0] },
            ],
        });
        await startFrames();
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(2, 1), timestamp: 1 });
        const alpha = [...state().maskImage.data].filter((_, index) => index % 4 === 3);
        assert.deepEqual(alpha, [0, 255]);
    });

    function useFakeGl() {
        const canvas = { transferToImageBitmap: () => ({ close: sinon.spy(), fromGl: true }) };
        const gl = {
            canvas,
            lost: false,
            setMask: sinon.spy(),
            render: sinon.stub().returns(true),
            destroy: sinon.spy(),
        };
        context.fakeGl = gl;
        vm.runInContext('state.gl = fakeGl;', context);
        return gl;
    }

    it('composites with the WebGL compositor, feeding it the soft (not edge-tightened) mask', async () => {
        createWorker({ masks: [{ width: 2, height: 1, values: [0.25, 1] }] });
        const gl = useFakeGl();
        const image = bitmap(1920, 1080);
        await startFrames({ mode: 'image', bitmap: image });
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(1920, 1080), timestamp: 1 });

        assert.equal(lastReply().bitmap.fromGl, true);
        assert.equal(gl.setMask.calledOnceWith(state().maskImage), true);
        // 0.25 stays 64: the Canvas2D edge curve would make it 14
        assert.deepEqual(
            [...state().maskImage.data].filter((_, index) => index % 4 === 3),
            [64, 255]
        );
        assert.equal(state().maskCanvas, null, 'no Canvas2D mask work while WebGL composites');
        const [, width, height, view] = gl.render.firstCall.args;
        assert.deepEqual([width, height], [1280, 720], 'the output stays capped at 1280x720');
        assert.equal(view.kind, 'image');
        assert.equal(view.source, image);

        await send({ type: 'background', id: 4, background: { mode: 'blur' } });
        await send({ type: 'frame', id: 5, session: 7, bitmap: bitmap(2, 1), timestamp: 40 });
        assert.deepEqual(plain(gl.render.lastCall.args[3]), { kind: 'blur', blurRadius: 12 });
    });

    it('falls back to Canvas2D with the edge-tightened mask when WebGL fails', async () => {
        createWorker({ masks: [{ width: 2, height: 1, values: [0.25, 1] }] });
        const gl = useFakeGl();
        gl.render.throws(new Error('texImage2D failed'));
        await startFrames();
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(2, 1), timestamp: 1 });

        assert.equal(lastReply().bitmap.composited, true, 'the same frame is composited by Canvas2D');
        assert.equal(gl.destroy.calledOnce, true);
        assert.equal(state().gl, null);
        assert.ok(state().maskCanvas, 'mask canvases are drawn for Canvas2D');

        await send({ type: 'frame', id: 4, session: 7, bitmap: bitmap(2, 1), timestamp: 40 });
        assert.equal(state().maskImage.data[3], 14);

        // A lost context is detected before rendering
        const lost = useFakeGl();
        lost.lost = true;
        await send({ type: 'frame', id: 5, session: 7, bitmap: bitmap(2, 1), timestamp: 80 });
        assert.equal(lost.render.called, false);
        assert.equal(lastReply().bitmap.composited, true);
    });

    function useFakeVision(failures = []) {
        const created = [];
        context.fakeVision = {
            ImageSegmenter: {
                createFromOptions: async (fileset, options) => {
                    const { modelAssetPath, delegate } = options.baseOptions;
                    if (failures.some((failure) => failure(modelAssetPath, delegate))) throw new Error('unsupported');
                    const segmenter = { ...context.fakeSegmenter, close: sinon.spy(), modelAssetPath, delegate };
                    created.push(segmenter);
                    return segmenter;
                },
            },
        };
        vm.runInContext('vision = fakeVision; fileset = {};', context);
        return created;
    }

    const modelConfig = { modelUrl: 'selfie.tflite', multiclassModelUrl: 'multiclass.tflite', delegate: 'CPU' };

    it('runs the multiclass model on the GPU, or the selfie model on the CPU without it', async () => {
        createWorker();
        let created = useFakeVision();
        context.config = modelConfig;
        await vm.runInContext('loadModel(config)', context);
        assert.deepEqual(plain(vm.runInContext('model', context)), {
            name: 'multiclass',
            url: 'multiclass.tflite',
            delegate: 'GPU',
        });

        createWorker();
        created = useFakeVision([(url, delegate) => delegate === 'GPU']);
        context.config = modelConfig;
        await vm.runInContext('loadModel(config)', context);
        assert.equal(vm.runInContext('model.name', context), 'selfie');
        assert.equal(created.length, 1);
        assert.equal(created[0].delegate, 'CPU');
    });

    it('warms each model up while loading and drops a GPU model that cannot run', async () => {
        createWorker();
        let created = useFakeVision();
        context.config = modelConfig;
        await vm.runInContext('loadModel(config)', context);
        assert.equal(segmentCalls.length, 1, 'the first (slow) GPU run happens before any frame');
        assert.equal(segmentCalls[0].input.width, 256);

        createWorker();
        created = useFakeVision();
        const createFromOptions = context.fakeVision.ImageSegmenter.createFromOptions;
        context.fakeVision.ImageSegmenter.createFromOptions = async (fileset, options) => {
            const segmenter = await createFromOptions(fileset, options);
            if (options.baseOptions.delegate === 'GPU') {
                segmenter.segmentForVideo = () => {
                    throw new Error('GPU graph failed');
                };
            }
            return segmenter;
        };
        context.config = modelConfig;
        await vm.runInContext('loadModel(config)', context);
        assert.equal(vm.runInContext('model.name', context), 'selfie');
        assert.equal(created[0].close.calledOnce, true, 'the broken GPU model is released');
        assert.equal(vm.runInContext('segmenter', context), created[1]);
    });

    it('gives the multiclass model up for the selfie model when it is too slow', async () => {
        createWorker({ segmentCost: 60 });
        const created = useFakeVision();
        context.config = modelConfig;
        await vm.runInContext('workerConfig = config; loadModel(config)', context);
        const multiclass = created[0];
        await startFrames();
        vm.runInContext('segmentCount = 20;', context);
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(), timestamp: 1 });
        await flush();

        assert.equal(vm.runInContext('model.name', context), 'selfie');
        assert.equal(created[1].modelAssetPath, 'selfie.tflite');
        assert.equal(created[1].delegate, 'CPU');
        assert.equal(multiclass.close.calledOnce, true);
    });

    it('stabilizes the mask between segmentations and starts fresh for a new session', async () => {
        const values = [0.5, 0];
        createWorker({ masks: [{ width: 2, height: 1, values }], segmentCost: 0 });
        await startFrames();
        const alpha = () => [...state().maskImage.data].filter((_, index) => index % 4 === 3);
        await send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(2, 1), timestamp: 0 });
        assert.deepEqual(alpha(), [128, 0]);

        // A small flicker of an edge pixel is damped (100 unstabilized), a large change is followed at once
        values[0] = 0.45;
        values[1] = 1;
        await send({ type: 'frame', id: 4, session: 7, bitmap: bitmap(2, 1), timestamp: 33 });
        const [flicker, moved] = alpha();
        assert.ok(flicker > 110 && flicker < 128, `flicker damped (${flicker})`);
        assert.equal(moved, 255);

        // Without the reset the previous session's mask would pull this pixel up (114)
        await send({ type: 'start', id: 5, session: 8, mode: 'frames' });
        await send({ type: 'background', id: 6, background: { mode: 'blur' } });
        await send({ type: 'frame', id: 7, session: 8, bitmap: bitmap(2, 1), timestamp: 66 });
        assert.deepEqual(alpha(), [100, 255]);
    });

    class FakeNestedWorker {
        constructor(url, options) {
            this.url = url;
            this.options = options;
            this.sent = [];
            this.terminate = sinon.spy();
            FakeNestedWorker.instances.push(this);
        }
        postMessage(message, transfer) {
            this.sent.push({ message, transfer });
            if (message.type === 'init' && FakeNestedWorker.autoReady) {
                Promise.resolve().then(() =>
                    this.onmessage({ data: { type: 'ready', model: 'multiclass', delegate: 'GPU' } })
                );
            }
        }
        requests() {
            return this.sent.filter(({ message }) => message.type === 'segment').map(({ message }) => message);
        }
        reply(request, values = [0, 1], extra = {}) {
            this.onmessage({
                data: {
                    type: 'mask',
                    generation: request.generation,
                    values: Float32Array.from(values),
                    width: values.length,
                    height: 1,
                    model: 'multiclass',
                    delegate: 'GPU',
                    ...extra,
                },
            });
        }
    }

    async function startNestedSegmenter() {
        FakeNestedWorker.instances = [];
        FakeNestedWorker.autoReady = true;
        context.Worker = FakeNestedWorker;
        context.config = { segmenterUrl: 'https://host/js/background-effects-worker.js' };
        assert.equal(await vm.runInContext('workerConfig = config; startRemoteSegmenter(config)', context), true);
        return FakeNestedWorker.instances[0];
    }

    it('starts this script again as a named nested worker to segment in parallel', async () => {
        createWorker();
        const nested = await startNestedSegmenter();
        assert.equal(nested.url, 'https://host/js/background-effects-worker.js');
        assert.deepEqual(plain(nested.options), { type: 'module', name: 'mirotalk-bg-segmenter' });
        assert.equal(nested.sent[0].message.type, 'init');
        assert.equal(vm.runInContext('model.name', context), 'multiclass');

        createWorker();
        FakeNestedWorker.instances = [];
        FakeNestedWorker.autoReady = false;
        context.Worker = FakeNestedWorker;
        context.config = { segmenterUrl: 'https://host/js/background-effects-worker.js' };
        const started = vm.runInContext('startRemoteSegmenter(config)', context);
        FakeNestedWorker.instances[0].onmessage({ data: { type: 'error', stage: 'init', message: 'no wasm' } });
        assert.equal(await started, false, 'the caller segments in this worker instead');
        assert.equal(FakeNestedWorker.instances[0].terminate.calledOnce, true);
    });

    it('composites every frame with the latest mask without waiting for the segmenter', async () => {
        createWorker();
        const nested = await startNestedSegmenter();
        await startFrames();

        // The first frame waits for its mask: no room is sent before there is a mask
        const firstFrame = send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(512, 288), timestamp: 0 });
        await flush();
        const [first] = nested.requests();
        assert.deepEqual([first.bitmap.width, first.bitmap.height], [455, 256]);
        assert.equal(posted.length, 2, 'not answered before the first mask');
        nested.reply(first, [0, 1]);
        await firstFrame;
        await flush();
        assert.equal(lastReply().bitmap.composited, true);
        assert.equal(segmentCalls.length, 0, 'nothing segmented in the compositor worker');

        // Later frames are composited at once, one segmentation in flight at most
        now += 100;
        await send({ type: 'frame', id: 4, session: 7, bitmap: bitmap(512, 288), timestamp: 33 });
        await send({ type: 'frame', id: 5, session: 7, bitmap: bitmap(512, 288), timestamp: 66 });
        assert.equal(lastReply().bitmap.composited, true);
        assert.equal(nested.requests().length, 2);

        // A mask of the previous camera is dropped after a new session started
        const stale = nested.requests()[1];
        await send({ type: 'start', id: 6, session: 8, mode: 'frames' });
        nested.reply(stale, [1, 1]);
        assert.equal(state().hasMask, false);
    });

    it('does not segment in the nested worker while the background is off', async () => {
        createWorker();
        const nested = await startNestedSegmenter();
        await send({ type: 'start', id: 1, session: 7, mode: 'frames' });
        const frame = bitmap();
        await send({ type: 'frame', id: 2, session: 7, bitmap: frame, timestamp: 1 });
        assert.equal(lastReply().bitmap, frame);
        assert.equal(nested.requests().length, 0);
    });

    it('lets the segmenter rest between masks so the GPU is not saturated', async () => {
        createWorker();
        const nested = await startNestedSegmenter();
        await startFrames();
        const firstFrame = send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(2, 1), timestamp: 0 });
        await flush();
        now += 40;
        nested.reply(nested.requests()[0]);
        await firstFrame;
        await flush();

        // Took 40 ms: the next request waits 20 ms
        now += 10;
        await send({ type: 'frame', id: 4, session: 7, bitmap: bitmap(2, 1), timestamp: 33 });
        assert.equal(nested.requests().length, 1);
        now += 15;
        await send({ type: 'frame', id: 5, session: 7, bitmap: bitmap(2, 1), timestamp: 66 });
        assert.equal(nested.requests().length, 2);
    });

    it('segments in this worker when the nested segmenter crashes or stalls', async () => {
        for (const breakIt of ['crash', 'stall']) {
            createWorker();
            const nested = await startNestedSegmenter();
            vm.runInContext('loadSegmenter = async () => { segmenter = fakeSegmenter; };', context);
            await startFrames();
            const firstFrame = send({ type: 'frame', id: 3, session: 7, bitmap: bitmap(2, 1), timestamp: 0 });
            await flush();
            nested.reply(nested.requests()[0]);
            await firstFrame;
            await flush();
            now += 100;
            await send({ type: 'frame', id: 4, session: 7, bitmap: bitmap(2, 1), timestamp: 33 });

            if (breakIt === 'crash') nested.onerror({ message: 'out of memory', preventDefault() {} });
            else now += 5000;
            await send({ type: 'frame', id: 5, session: 7, bitmap: bitmap(2, 1), timestamp: 66 });
            await flush();
            assert.equal(nested.terminate.calledOnce, true, breakIt);
            assert.equal(vm.runInContext('remote.worker', context), null);

            await send({ type: 'frame', id: 6, session: 7, bitmap: bitmap(2, 1), timestamp: 99 });
            assert.ok(segmentCalls.length >= 1, `${breakIt}: segmented here`);
            assert.equal(lastReply().bitmap.composited, true);
        }
    });

    it('answers every segment request of the compositor in the segmenter role', async () => {
        createWorker({ masks: [{ width: 2, height: 1, values: [0.25, 1] }] });
        const input = bitmap(455, 256);
        vm.runInContext('segmentForCompositor', context)({ bitmap: input, timestamp: 5, generation: 3 });
        const { message, transfer } = posted[posted.length - 1];
        assert.equal(message.type, 'mask');
        assert.equal(message.generation, 3);
        assert.deepEqual([...message.values], [0.25, 1]);
        assert.deepEqual([message.width, message.height], [2, 1]);
        assert.equal(transfer[0], message.values.buffer, 'the mask is transferred, not copied');
        assert.equal(input.close.calledOnce, true);

        context.fakeSegmenter.segmentForVideo = () => {
            throw new Error('graph failed');
        };
        const broken = bitmap(455, 256);
        vm.runInContext('segmentForCompositor', context)({ bitmap: broken, timestamp: 6, generation: 3 });
        assert.equal(posted[posted.length - 1].message.values, null, 'the compositor is never left waiting');
        assert.equal(broken.close.calledOnce, true);
    });

    it('reports control errors to the page and stops a transferred track it could not use', async () => {
        createWorker();
        const track = { stop: sinon.spy() };
        await send({ type: 'start', id: 9, session: 8, mode: 'track', track });
        assert.equal(lastReply().type, 'error');
        assert.equal(lastReply().id, 9);
        assert.equal(track.stop.calledOnce, true);
    });

    describe('streams transport', () => {
        class FakeVideoFrame {
            constructor(source, { timestamp } = {}) {
                this.source = source;
                this.timestamp = timestamp ?? source.timestamp;
                this.displayWidth = source.displayWidth ?? source.width;
                this.displayHeight = source.displayHeight ?? source.height;
                this.close = sinon.spy();
            }
        }
        const cameraFrame = (timestamp) => ({
            timestamp,
            displayWidth: 640,
            displayHeight: 360,
            width: 640,
            height: 360,
            close: sinon.spy(),
        });

        async function runFrames(frames, background) {
            createWorker({ segmentCost: 0 });
            context.VideoFrame = FakeVideoFrame;
            const output = [];
            let open;
            const gate = new Promise((resolve) => (open = resolve));
            // Frames flow once this session's background is set
            const readable = new ReadableStream({
                async start(controller) {
                    await gate;
                    frames.forEach((frame) => controller.enqueue(frame));
                    controller.close();
                },
            });
            const writable = new WritableStream({ write: (frame) => output.push(frame) });
            await send({ type: 'start', id: 1, session: 7, mode: 'streams', readable, writable });
            if (background) await send({ type: 'background', id: 2, background });
            open();
            await vm.runInContext('session.done', context);
            return output;
        }

        it('gives output frames increasing timestamps when the source stamps them all 0 (WebKit)', async () => {
            now = 5;
            const frames = [cameraFrame(0), cameraFrame(0), cameraFrame(0)];
            const output = await runFrames(frames, { mode: 'blur' });
            const timestamps = output.map((frame) => frame.timestamp);
            assert.equal(output.length, 3);
            assert.ok(timestamps.every((timestamp, index) => index === 0 || timestamp > timestamps[index - 1]));
            assert.ok(frames.every((frame) => frame.close.calledOnce));
            assert.equal(posted.at(-1).message.type, 'pipeline-ended');
        });

        it('forwards camera frames untouched while the background is off', async () => {
            const frames = [cameraFrame(10), cameraFrame(20)];
            const output = await runFrames(frames);
            assert.equal(output[0], frames[0]);
            assert.equal(output[1], frames[1]);
            assert.equal(frames[0].close.called, false);
            assert.equal(segmentCalls.length, 0);
        });
    });
});

describe('camera background mask stabilizer', () => {
    let compositor;

    before(() => {
        const context = vm.createContext({});
        vm.runInContext(read('background-effects-compositor.js'), context);
        compositor = context.BackgroundCompositor;
    });

    // edgeLow 0 / edgeHigh 1: plain smoothstep, so expectations are given before the curve
    const noEdgeCurve = { edgeLow: 0, edgeHigh: 1 };
    const curve = (value) => value * value * (3 - 2 * value);
    const linear = (stabilize) => (values) => [...stabilize(Float32Array.from(values))];
    const close = (actual, expected) =>
        actual.forEach((value, index) =>
            assert.ok(Math.abs(value - curve(expected[index])) < 1e-5, `${actual} ≈ ${expected.map(curve)}`)
        );

    it('damps model jitter on static edges but never lags behind real motion', () => {
        const run = linear(compositor.createMaskStabilizer({ ...noEdgeCurve, leak: 0.3 }));
        run([0.5, 0]);
        // 0.02 is below tLo: only the leak share of the change gets through
        close(run([0.52, 1]), [0.506, 1]);
        let jitter = 0;
        for (let frame = 0; frame < 20; frame++) {
            const [value] = run([frame % 2 ? 0.45 : 0.55, 1]);
            if (frame > 4) jitter = Math.max(jitter, Math.abs(value - 0.5));
        }
        assert.ok(jitter < 0.03, `±0.05 raw jitter is reduced to ±${jitter.toFixed(3)}`);
    });

    it('keeps following an edge for a few masks after it moved (peak-hold envelope)', () => {
        const run = linear(compositor.createMaskStabilizer({ ...noEdgeCurve, leak: 0.1, release: 0.8 }));
        run([0]);
        close(run([1]), [1]);
        // envelope 0.8: still above tHi, the small correction is taken in full
        close(run([0.9]), [0.9]);
    });

    it('smoothsteps the edge band and restarts when the mask size changes or on reset', () => {
        const stabilize = compositor.createMaskStabilizer();
        const run = linear(stabilize);
        const { edgeLow, edgeHigh } = compositor.MASK_STABILIZER_DEFAULTS;
        close(run([0, edgeLow, 0.5, edgeHigh, 1]), [0, 0, 0.5, 1, 1]);
        assert.equal(run([0.3]).length, 1, 'a new mask size starts a new state');
        run([0.6]);
        run([0.6]);
        stabilize.reset();
        // Without the reset 0.5 would be blended with the previous 0.6
        close(run([0.5]), [0.5]);
    });

    it('returns the raw stabilized confidence without the edge curve (WebGL)', () => {
        const run = linear(compositor.createMaskStabilizer({ edgeCurve: false }));
        assert.deepEqual(run([0.25, 1]), [0.25, 1]);
    });
});

describe('camera background WebGL compositor', () => {
    let gl;

    before(() => {
        const context = vm.createContext({});
        vm.runInContext(read('background-effects-gl.js'), context);
        gl = context.BackgroundEffectsGL;
    });

    it('fits backgrounds like CSS object-fit: cover', () => {
        // 4:3 image in a 16:9 frame: full width, the middle 75% of the height
        assert.deepEqual(plain(gl.coverTransform(1600, 1200, 1280, 720)), [1, 0.75, 0, 0.125]);
        // portrait image: full width, the middle band of the height
        const [scaleX, scaleY, offsetX, offsetY] = gl.coverTransform(720, 1280, 1280, 720);
        assert.equal(scaleX, 1);
        assert.equal(offsetX, 0);
        assert.ok(Math.abs(scaleY - 0.31640625) < 1e-9);
        assert.ok(Math.abs(offsetY - (1 - scaleY) / 2) < 1e-9);
        assert.deepEqual(plain(gl.coverTransform(0, 0, 1280, 720)), [1, 1, 0, 0]);
    });

    it('sizes the refined mask and the blur targets', () => {
        assert.deepEqual(plain(gl.scaledSize(1280, 720, 1, 640)), [640, 360]);
        assert.deepEqual(plain(gl.scaledSize(320, 180, 1, 640)), [320, 180]);
        assert.deepEqual(plain(gl.scaledSize(1280, 720, 0.25)), [320, 180]);
        // The Canvas2D blur radius (12 px) keeps the same look on the GPU
        assert.deepEqual(plain(gl.blurKernel(12, 0.25)), { sigma: 3, radius: 9 });
        assert.deepEqual(plain(gl.blurKernel(400, 0.25)), { sigma: 100, radius: 32 });
        assert.deepEqual(plain(gl.blurKernel(0, 0.25)), { sigma: 0.5, radius: 2 });
    });

    it('reports no compositor without WebGL2, so the worker keeps Canvas2D', () => {
        assert.equal(gl.createCompositor({ getContext: () => null }), null);
        assert.equal(
            gl.createCompositor({
                getContext: () => {
                    throw new Error('blocked');
                },
            }),
            null
        );
    });
});

function createPageContext(overrides = {}) {
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        document: {
            currentScript: { src: 'https://host/js/background-effects.js' },
            body: { appendChild() {} },
            createElement: (type) =>
                type === 'video'
                    ? {
                          style: {},
                          setAttribute() {},
                          play: async () => {},
                          pause: sinon.spy(),
                          remove: sinon.spy(),
                          videoWidth: 1280,
                          videoHeight: 720,
                          readyState: 2,
                      }
                    : {
                          getContext: () => ({ drawImage: sinon.spy(), clearRect() {}, filter: 'none' }),
                          captureStream: () => ({ getVideoTracks: () => [{ kind: 'canvas', stop: sinon.spy() }] }),
                      },
        },
        TransformStream,
        ReadableStream,
        WritableStream,
        AbortController,
        URL,
        performance,
        setTimeout,
        clearTimeout,
        Worker: class {},
        OffscreenCanvas: FakeOffscreenCanvas,
        createImageBitmap: async (source) => ({ width: source.width, height: source.height, close: sinon.spy() }),
        MediaStream: class {
            constructor(tracks) {
                this.tracks = tracks;
            }
            getVideoTracks() {
                return this.tracks.filter((track) => track.kind !== 'audio');
            }
            getAudioTracks() {
                return this.tracks.filter((track) => track.kind === 'audio');
            }
        },
        ...overrides,
    });
    vm.runInContext(read('background-effects-compositor.js'), context);
    vm.runInContext(read('background-effects.js'), context);
    // Top-level classes are not properties of the context global
    context.BackgroundEffectsWorker = vm.runInContext('BackgroundEffectsWorker', context);
    return context;
}

describe('camera background worker transports', () => {
    function createEngine({
        trackProcessor = false,
        transferableStreams = true,
        failTrackTransfer = false,
        trackTransfer = true,
        trackPipeline = true,
    } = {}) {
        const workers = [];
        const generators = [];
        class Worker {
            constructor(url, options) {
                this.url = String(url);
                this.options = options;
                this.messages = [];
                this.terminate = sinon.spy();
                workers.push(this);
            }
            postMessage(message, transfer = []) {
                if (failTrackTransfer && message.mode === 'track') throw new Error('DataCloneError');
                this.messages.push({ message, transfer });
                const reply = (data) => queueMicrotask(() => this.onmessage({ data }));
                if (message.type === 'init') reply({ type: 'ready', trackProcessor });
                else if (message.mode === 'track') reply({ type: 'ack', id: message.id, track: { kind: 'video' } });
                else if (message.id) reply({ type: 'ack', id: message.id });
            }
        }
        class MessageChannel {
            constructor() {
                const postMessage = () => {
                    if (!transferableStreams) throw new Error('DataCloneError');
                };
                this.port1 = { postMessage, close() {} };
                this.port2 = { close() {} };
            }
        }
        class MediaStreamTrackProcessor {
            constructor({ track }) {
                this.track = track;
                this.readable = { kind: 'readable' };
            }
        }
        class MediaStreamTrackGenerator {
            constructor() {
                this.kind = 'generated';
                this.writable = { kind: 'writable' };
                this.stop = sinon.spy();
                generators.push(this);
            }
        }
        const pipeline = trackPipeline ? { MediaStreamTrackProcessor, MediaStreamTrackGenerator } : {};
        const context = createPageContext({ Worker, MessageChannel, ...pipeline });
        context.trackTransfer = trackTransfer;
        const engine = vm.runInContext(
            'new BackgroundEffectsWorker({ baseUrl: "https://host/js/", trackTransfer })',
            context
        );
        return { engine, workers, generators, context };
    }

    const camera = () => ({ clone: sinon.stub().returns({ stop: sinon.spy() }), stop: sinon.spy() });

    it('loads the module worker and the shared compositor next to background-effects.js', async () => {
        const { engine, workers } = createEngine();
        await engine.init();
        assert.equal(workers[0].url, 'https://host/js/background-effects-worker.js');
        assert.deepEqual(plain(workers[0].options), { type: 'module' });
        const { config } = workers[0].messages[0].message;
        assert.equal(config.compositorUrl, 'https://host/js/background-effects-compositor.js');
        assert.match(config.visionBundleUrl, /tasks-vision@1\.2\.0\/vision_bundle\.mjs$/);
        assert.match(config.wasmBaseUrl, /tasks-vision@1\.2\.0\/wasm$/);
        assert.match(config.modelUrl, /selfie_segmenter\/float16\/1\/selfie_segmenter\.tflite$/);
        assert.match(config.multiclassModelUrl, /selfie_multiclass_256x256\.tflite$/);
        assert.equal(config.glUrl, 'https://host/js/background-effects-gl.js');
        assert.equal(config.segmenterUrl, 'https://host/js/background-effects-worker.js');
        assert.equal(config.delegate, 'CPU');
    });

    it('captures the ImageBitmap transport output without a frame rate cap (Firefox)', async () => {
        const { engine, context } = createEngine({ transferableStreams: false });
        await engine.init();
        const createElement = context.document.createElement;
        const captureStream = sinon.stub().returns({ getVideoTracks: () => [{ kind: 'canvas', stop: sinon.spy() }] });
        context.document.createElement = (type) => {
            const element = createElement(type);
            if (type === 'canvas') element.captureStream = captureStream;
            return element;
        };
        const track = { ...camera(), getSettings: () => ({ frameRate: 30 }) };
        const session = await engine.start(track);
        assert.equal(session.mode, 'frames');
        assert.equal(captureStream.calledOnce, true);
        assert.deepEqual(captureStream.firstCall.args, []);
        await engine.stopSession(session);
    });

    it('transfers a clone of the camera when the worker has track processing (Safari)', async () => {
        const { engine, workers } = createEngine({ trackProcessor: true });
        await engine.init();
        const track = camera();
        const session = await engine.start(track);

        const start = workers[0].messages.find(({ message }) => message.type === 'start');
        assert.equal(session.mode, 'track');
        assert.equal(start.message.track, track.clone.firstCall.returnValue);
        assert.equal(start.transfer.length, 1);
        assert.equal(start.transfer[0], track.clone.firstCall.returnValue);
        assert.deepEqual(plain(session.outputTrack), { kind: 'video' });
        assert.equal(track.stop.called, false);
    });

    it('falls back to transferred streams when the track cannot be transferred (Chromium)', async () => {
        const { engine, workers, generators } = createEngine({ trackProcessor: true, failTrackTransfer: true });
        await engine.init();
        const track = camera();
        const session = await engine.start(track);

        assert.equal(track.clone.firstCall.returnValue.stop.calledOnce, true);
        assert.equal(session.mode, 'streams');
        assert.equal(session.outputTrack, generators[0]);
        const start = workers[0].messages.find(({ message }) => message.type === 'start');
        assert.equal(start.transfer.length, 2);
        assert.equal(start.transfer[0], start.message.readable);
        assert.equal(start.transfer[1], generators[0].writable);
    });

    it('does not transfer the camera track unless enabled', async () => {
        const { engine } = createEngine({ trackProcessor: true, transferableStreams: false, trackTransfer: false });
        await engine.init();
        engine.startFrames = sinon.stub().callsFake(async (session) => Object.assign(session, { mode: 'frames' }));
        const track = camera();
        const session = await engine.start(track);
        assert.equal(session.mode, 'frames');
        assert.equal(track.clone.called, false);
    });

    it('uses ImageBitmap frames when streams cannot be transferred or processed (Firefox)', async () => {
        for (const options of [{ transferableStreams: false }, { trackPipeline: false }]) {
            const { engine } = createEngine(options);
            await engine.init();
            engine.startFrames = sinon.stub().callsFake(async (session) => Object.assign(session, { mode: 'frames' }));
            const session = await engine.start(camera());
            assert.equal(session.mode, 'frames');
        }
    });

    it('stops the output track before the worker ends it, so the camera does not look lost', async () => {
        const { engine, workers, generators } = createEngine();
        await engine.init();
        const session = await engine.start(camera());
        let stoppedBeforeRequest = null;
        const post = workers[0].postMessage.bind(workers[0]);
        workers[0].postMessage = (message, transfer) => {
            if (message.type === 'stop') stoppedBeforeRequest = generators[0].stop.called;
            post(message, transfer);
        };
        await engine.stopSession(session);
        assert.equal(stoppedBeforeRequest, true);
        assert.equal(generators[0].stop.calledOnce, true);
    });

    it('sends the image background as a transferred bitmap', async () => {
        const { engine, workers } = createEngine();
        await engine.init();
        const image = bitmap();
        await engine.setBackground({ mode: 'image', bitmap: image });
        const message = workers[0].messages.at(-1);
        assert.equal(message.message.type, 'background');
        assert.equal(message.transfer[0], image);
    });

    it('rejects pending requests and ends sessions when the worker dies', async () => {
        const { engine, workers } = createEngine();
        await engine.init();
        const onEnded = sinon.spy();
        await engine.start(camera(), { onEnded });
        workers[0].postMessage = () => {};
        const pending = engine.setBackground({ mode: 'blur' });
        workers[0].onerror({ message: 'boom', preventDefault() {} });

        await assert.rejects(pending, /boom/);
        assert.equal(onEnded.calledOnce, true);
        assert.match(onEnded.firstCall.args[1].message, /boom/);
        assert.equal(workers[0].terminate.calledOnce, true);
        assert.equal(engine.failed, true);
    });

    it('reports pipeline errors of the running session only', async () => {
        const { engine, workers } = createEngine();
        await engine.init();
        const onEnded = sinon.spy();
        const session = await engine.start(camera(), { onEnded });
        workers[0].onmessage({ data: { type: 'pipeline-error', session: 999, message: 'other' } });
        assert.equal(onEnded.called, false);
        workers[0].onmessage({ data: { type: 'pipeline-error', session: session.id, message: 'decode failed' } });
        assert.equal(onEnded.calledOnce, true);
        assert.match(onEnded.firstCall.args[1].message, /decode failed/);
        await engine.stopSession(session);
        workers[0].onmessage({ data: { type: 'pipeline-ended', session: session.id } });
        assert.equal(onEnded.calledOnce, true);
    });

    it('does not log the pipeline closing while the page stops its session', async () => {
        const { engine, workers, context } = createEngine();
        context.console.error = sinon.spy();
        await engine.init();
        const onEnded = sinon.spy();
        const session = await engine.start(camera(), { onEnded });
        // The output track is stopped first, so the worker reports the closed stream before the stop ack
        const stopping = engine.stopSession(session);
        workers[0].onmessage({ data: { type: 'pipeline-error', session: session.id, message: 'Stream closed' } });
        workers[0].onmessage({ data: { type: 'pipeline-ended', session: session.id } });
        await stopping;
        assert.equal(context.console.error.called, false);
        assert.equal(onEnded.called, false);

        const running = await engine.start(camera(), { onEnded });
        workers[0].onmessage({ data: { type: 'pipeline-error', session: running.id, message: 'decode failed' } });
        assert.equal(context.console.error.calledOnce, true);
        assert.equal(onEnded.calledOnce, true);
    });

    it('reports the end of a session once, even when its frame request fails too', async () => {
        const { engine, workers } = createEngine();
        await engine.init();
        const onEnded = sinon.spy();
        const session = await engine.start(camera(), { onEnded });
        workers[0].onmessage({ data: { type: 'pipeline-error', session: session.id, message: 'first' } });
        session.onEnded(new Error('second'));
        engine.terminate(new Error('third'));
        assert.equal(onEnded.calledOnce, true);
        assert.match(onEnded.firstCall.args[1].message, /first/);
    });

    it('fails init when the worker reports a model load error', async () => {
        const { engine, workers } = createEngine();
        const init = engine.init();
        workers[0].onmessage({ data: { type: 'error', stage: 'init', message: 'model 404' } });
        await assert.rejects(init, /model 404/);
        assert.equal(workers[0].terminate.calledOnce, true);
    });

    it('fails init when the worker script cannot load', async () => {
        const { engine, workers } = createEngine();
        const init = engine.init();
        workers[0].onerror({ message: 'module script failed', preventDefault() {} });
        await assert.rejects(init, /module script failed/);
        assert.equal(engine.failed, true);
    });
});

describe('camera background engine selection', () => {
    let context;
    let camera;
    let audio;
    let engine;
    let outputTrack;
    let onError;

    function createEffects({ worker = true } = {}) {
        camera = {
            kind: 'video',
            readyState: 'live',
            stop: sinon.spy(),
            getSettings: () => ({ frameRate: 30 }),
            addEventListener: sinon.spy(),
            removeEventListener: sinon.spy(),
        };
        audio = { kind: 'audio', stop: sinon.spy() };
        outputTrack = { kind: 'worker', readyState: 'live', stop: sinon.spy() };
        engine = {
            failed: false,
            setBackground: sinon.stub().resolves(),
            start: sinon.stub().callsFake(async (track, { onEnded }) => {
                const session = { id: 1, mode: 'streams', outputTrack };
                engine.end = (error) => onEnded(session, error);
                return session;
            }),
            stopSession: sinon.stub().resolves(),
        };
        context = createPageContext();
        context.BackgroundEffectsWorker.shared = sinon.stub().resolves(worker ? engine : null);
        context.BackgroundEffectsWorker.disable = sinon.spy();
        onError = sinon.spy();
        context.onError = onError;
        return vm.runInContext('new BackgroundEffects(onError)', context);
    }

    const input = () => new context.MediaStream([camera, audio]);

    it('runs in the worker and swaps backgrounds there without restarting it', async () => {
        const effects = createEffects();
        effects.loadModel = sinon.spy();
        const stream = await effects.start(input());
        assert.equal(stream.getVideoTracks()[0], outputTrack);
        assert.equal(stream.getAudioTracks()[0], audio);
        assert.equal(engine.start.firstCall.args[0], camera);

        await effects.setMode('blur');
        const image = { naturalWidth: 4000, naturalHeight: 2000 };
        assert.equal(await effects.setBackground('image', image), true);
        assert.equal(await effects.setBackground('blur'), true);

        assert.equal(engine.start.calledOnce, true);
        assert.equal(effects.loadModel.called, false);
        assert.deepEqual(plain(engine.setBackground.firstCall.args[0]), { mode: 'blur' });
        const sent = engine.setBackground.secondCall.args[0];
        assert.equal(sent.mode, 'image');
        assert.equal(sent.bitmap.width, 1920);
        assert.equal(sent.bitmap.height, 960);
        assert.equal(effects.mode, 'blur');
        assert.equal(effects.outputTrack, outputTrack);
    });

    it('stops the output before ending the worker session and keeps the camera when asked', async () => {
        const effects = createEffects();
        await effects.start(input());
        engine.stopSession.callsFake(async () => assert.equal(outputTrack.stop.calledOnce, true));
        effects.stop(false);
        assert.equal(engine.stopSession.calledOnce, true);
        assert.equal(camera.stop.called, false);
        effects.stop();
        assert.equal(engine.stopSession.calledOnce, true);
    });

    it('falls back to the main-thread engine when the worker is unavailable', async () => {
        const effects = createEffects({ worker: false });
        const stream = await effects.start(input());
        assert.equal(stream.getVideoTracks()[0].kind, 'canvas');
        assert.equal(effects.session, undefined);
        effects.loadModel = sinon.stub().resolves();
        await effects.setMode('blur');
        assert.equal(effects.loadModel.calledOnce, true);
        assert.equal(engine.setBackground.called, false);
        effects.stop(false);
    });

    it('falls back to the main-thread engine and disables the worker when its session cannot start', async () => {
        const effects = createEffects();
        engine.start.rejects(new Error('transport failed'));
        const stream = await effects.start(input());
        assert.equal(stream.getVideoTracks()[0].kind, 'canvas');
        assert.equal(context.BackgroundEffectsWorker.disable.calledOnce, true);
        effects.stop(false);
    });

    it('reports a worker crash so the camera is restored', async () => {
        const effects = createEffects();
        await effects.start(input());
        engine.end(new Error('worker crashed'));
        assert.equal(onError.calledOnce, true);
        assert.match(onError.firstCall.args[0].message, /worker crashed/);
    });

    it('stops quietly when the worker pipeline ends with the camera', async () => {
        const effects = createEffects();
        await effects.start(input());
        camera.readyState = 'ended';
        engine.end();
        assert.equal(onError.called, false);
        assert.equal(effects.stopped, true);
        assert.equal(outputTrack.stop.calledOnce, true);
    });

    it('ignores the end of a pipeline it already stopped', async () => {
        const effects = createEffects();
        await effects.start(input());
        effects.stop(false);
        engine.end(new Error('aborted'));
        assert.equal(onError.called, false);
    });

    it('does not start when stopped while the worker is loading', async () => {
        const effects = createEffects();
        let resolveShared;
        context.BackgroundEffectsWorker.shared = () => new Promise((resolve) => (resolveShared = resolve));
        const started = effects.start(input());
        effects.stop(false);
        resolveShared(engine);
        await assert.rejects(started, /Camera processing stopped/);
        assert.equal(engine.start.called, false);
    });
});

describe('shared camera background worker', () => {
    function createContext({ worker = true } = {}) {
        const workers = [];
        class Worker {
            constructor() {
                this.terminate = sinon.spy();
                workers.push(this);
            }
            postMessage(message) {
                if (message.type !== 'init') return;
                queueMicrotask(() =>
                    this.onmessage({
                        data: worker ? { type: 'ready' } : { type: 'error', stage: 'init', message: 'no WASM' },
                    })
                );
            }
        }
        const context = createPageContext({ Worker });
        return { context, workers };
    }

    it('loads one worker for every effect on the page', async () => {
        const { context, workers } = createContext();
        const first = await context.BackgroundEffectsWorker.shared();
        const second = await context.BackgroundEffectsWorker.shared();
        assert.ok(first);
        assert.equal(first, second);
        assert.equal(workers.length, 1);
    });

    it('stays on the main thread after the worker failed to load or crashed', async () => {
        const failing = createContext({ worker: false });
        assert.equal(await failing.context.BackgroundEffectsWorker.shared(), null);
        assert.equal(failing.context.BackgroundEffectsWorker.disabled, true);
        assert.equal(await failing.context.BackgroundEffectsWorker.shared(), null);
        assert.equal(failing.workers.length, 1);

        const crashing = createContext();
        const engine = await crashing.context.BackgroundEffectsWorker.shared();
        engine.terminate(new Error('crashed'));
        assert.equal(await crashing.context.BackgroundEffectsWorker.shared(), null);
        assert.equal(crashing.context.BackgroundEffectsWorker.disabled, true);
    });

    it('is not used without module worker support', () => {
        const { context } = createContext();
        assert.equal(context.BackgroundEffectsWorker.isSupported(null), false);
        context.OffscreenCanvas = undefined;
        assert.equal(context.BackgroundEffectsWorker.isSupported('https://host/js/'), false);
    });
});
