'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

// Small blur canvas for the shared compositor: no canvas filter, records what was drawn
function fallbackBlurCanvas() {
    const canvas = { width: 0, height: 0, contextOptions: null };
    const filters = [];
    canvas.context = {
        filters,
        set filter(value) {
            filters.push(value);
            this.currentFilter = value;
        },
        get filter() {
            return this.currentFilter;
        },
        clearRect() {},
        drawImage: sinon.spy(),
        putImageData: sinon.spy(),
        getImageData: sinon.spy((x, y, width, height) => {
            const data = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < width * height; i++) {
                const value = i % width < width / 2 ? 0 : 255;
                data.set([value, value, value, 255], i * 4);
            }
            return { data, width, height };
        }),
    };
    canvas.getContext = (type, options) => {
        canvas.contextOptions = options;
        return canvas.context;
    };
    return canvas;
}

describe('camera background effects', () => {
    let effects;
    let camera;
    let output;
    let audio;
    let clock;
    let onError;
    let compositor;

    beforeEach(() => {
        clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        camera = {
            kind: 'video',
            stop: sinon.spy(),
            getSettings: () => ({ frameRate: 30 }),
            addEventListener: sinon.spy(),
            removeEventListener: sinon.spy(),
        };
        output = { kind: 'video', stop: sinon.spy(), requestFrame: sinon.spy() };
        audio = { kind: 'audio', stop: sinon.spy() };
        class MediaStream {
            constructor(tracks) {
                this.tracks = tracks;
            }
            getVideoTracks() {
                return this.tracks.filter((track) => track.kind === 'video');
            }
            getAudioTracks() {
                return this.tracks.filter((track) => track.kind === 'audio');
            }
        }
        const context = vm.createContext({
            MediaStream,
            performance,
            setTimeout,
            clearTimeout,
            document: {
                body: { appendChild() {} },
                createElement: (type) =>
                    type === 'video'
                        ? {
                              style: {},
                              setAttribute() {},
                              play: async () => {},
                              pause: sinon.spy(),
                              remove: sinon.spy(),
                              videoWidth: 1920,
                              videoHeight: 1080,
                              readyState: 2,
                          }
                        : {
                              getContext: () => ({ drawImage: sinon.spy(), clearRect() {}, filter: 'none' }),
                              captureStream: () => new MediaStream([output]),
                          },
            },
        });
        vm.runInContext(
            fs.readFileSync(path.join(__dirname, '../public/js/background-effects-compositor.js'), 'utf8'),
            context
        );
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/background-effects.js'), 'utf8'), context);
        compositor = context.BackgroundCompositor;
        onError = sinon.spy();
        effects = vm.runInContext('new BackgroundEffects(() => {})', context);
        effects.onError = onError;
        effects.input = new MediaStream([camera, audio]);
    });

    afterEach(() => {
        effects.stop(false);
        clock.restore();
    });

    it('preserves audio and caps only effect output resolution', async () => {
        const stream = await effects.start(effects.input);
        assert.equal(stream.getVideoTracks()[0], output);
        assert.equal(stream.getAudioTracks()[0], audio);
        assert.equal(effects.canvas.width, 1920);
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        effects.resize();
        assert.equal(effects.canvas.width, 1280);
        assert.equal(effects.canvas.height, 720);
    });

    it('blurs without canvas filters using a downscaled box blur fallback', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage: sinon.spy(), clearRect() {} };
        const small = fallbackBlurCanvas();
        effects.blur = compositor.createBlur(() => small);
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };

        await effects.setMode('blur');
        effects.render((effects.lastFrame || 0) + 1000);

        assert.equal(onError.callCount, 0);
        assert.equal(effects.mode, 'blur');
        assert.equal(small.width, 160);
        assert.equal(small.height, 90);
        assert.equal(small.contextOptions.willReadFrequently, true);
        const pixels = small.context.putImageData.firstCall.args[0].data;
        const center = (45 * 160 + 80) * 4;
        assert.ok(pixels[center] > 0 && pixels[center] < 255);
        assert.equal(effects.backgroundContext.drawImage.calledOnce, true);
        assert.equal(effects.backgroundContext.drawImage.firstCall.args[0], small);
    });

    it('requires an image and rejects unknown modes', async () => {
        await assert.rejects(effects.setMode('image'), /Choose a background image/);
        await assert.rejects(effects.setMode('invalid'), /Invalid background mode/);
    });

    it('swaps the background on the running pipeline without a new output track', async () => {
        const stream = await effects.start(effects.input);
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        const image = { naturalWidth: 640, naturalHeight: 480 };

        assert.equal(await effects.setBackground('image', image), true);
        assert.equal(effects.mode, 'image');
        assert.equal(effects.image, image);
        assert.equal(effects.outputTrack, output);
        assert.equal(stream.getVideoTracks()[0], output);
        assert.equal(await effects.setBackground('blur'), true);
        assert.equal(effects.mode, 'blur');
        assert.equal(output.stop.callCount, 0);
        assert.equal(camera.stop.callCount, 0);
    });

    it('does not swap when turning the effect off or when nothing is running', async () => {
        effects.loadModel = async () => {};
        assert.equal(await effects.setBackground('blur'), false);
        await effects.start(effects.input);
        assert.equal(await effects.setBackground('blur'), false, 'effect still off');
        await effects.setMode('blur');
        assert.equal(await effects.setBackground('off'), false);
        assert.equal(effects.mode, 'blur');
        output.readyState = 'ended';
        assert.equal(await effects.setBackground('blur'), false);
        output.readyState = 'live';
        camera.readyState = 'ended';
        assert.equal(await effects.setBackground('blur'), false);
        camera.readyState = 'live';
        effects.stop(false);
        assert.equal(await effects.setBackground('blur'), false);
    });

    it('keeps the current background when a swap is invalid', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        effects.image = null;
        await assert.rejects(effects.setBackground('image'), /Choose a background image/);
        assert.equal(effects.mode, 'blur');
    });

    it('reuses the fallback blur canvas and buffer across frames', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage() {}, clearRect() {} };
        const newCanvas = sinon.spy(() => fallbackBlurCanvas());
        effects.blur = compositor.createBlur(newCanvas);
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };
        await effects.setMode('blur');

        effects.render((effects.lastFrame || 0) + 1000);
        const buffer = effects.blur.scratch();
        effects.render(effects.lastFrame + 1000);
        assert.equal(onError.callCount, 0);
        assert.equal(newCanvas.callCount, 1);
        assert.equal(buffer?.constructor.name, 'Uint8ClampedArray');
        assert.equal(buffer.length, 160 * 90 * 4);
        assert.equal(effects.blur.scratch(), buffer);
    });

    it('blurs a quarter-size copy when canvas filters are supported', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage: sinon.spy(), clearRect() {}, filter: 'none' };
        const small = fallbackBlurCanvas();
        small.context.filter = 'none';
        small.context.filters.length = 0;
        effects.blur = compositor.createBlur(() => small);
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };
        await effects.setMode('blur');
        effects.render((effects.lastFrame || 0) + 1000);

        assert.equal(onError.callCount, 0);
        assert.equal(small.width, 320);
        assert.equal(small.height, 180);
        assert.equal(small.contextOptions, undefined);
        assert.equal(small.context.getImageData.callCount, 0);
        assert.equal(small.context.filters[0], 'blur(3px)');
        assert.equal(small.context.filter, 'none');
        assert.deepEqual(effects.backgroundContext.drawImage.firstCall.args.slice(1), [0, 0, 1280, 720]);
    });

    it('scales and centre-crops image backgrounds to fill the frame', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage: sinon.spy(), clearRect() {} };
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };
        const image = { naturalWidth: 1000, naturalHeight: 1000 };
        await effects.setMode('image', image);
        effects.render((effects.lastFrame || 0) + 1000);

        assert.equal(onError.callCount, 0);
        assert.deepEqual(effects.backgroundContext.drawImage.firstCall.args, [
            image,
            0,
            218.75,
            1000,
            562.5,
            0,
            0,
            1280,
            720,
        ]);
    });

    it('uses the general (square) selfie segmenter model', () => {
        const source = fs.readFileSync(path.join(__dirname, '../public/js/background-effects.js'), 'utf8');
        assert.match(source, /image_segmenter\/selfie_segmenter\/float16\/1\/selfie_segmenter\.tflite/);
        assert.doesNotMatch(source, /selfie_segmenter_landscape/);
        assert.match(source, /BG_TASKS_VISION_VERSION = '\d+\.\d+\.\d+'/);
        assert.match(source, /tasks-vision@\$\{BG_TASKS_VISION_VERSION\}\/vision_bundle\.mjs/);
    });

    it('falls back to camera frames on segmentation failure', async () => {
        await effects.start(effects.input);
        effects.mode = 'blur';
        effects.segmenter = {
            close() {},
            segmentForVideo() {
                throw new Error('GPU failed');
            },
        };
        effects.render((effects.lastFrame || 0) + 1000);
        assert.equal(effects.mode, 'off');
        assert.equal(onError.callCount, 1);
    });

    it('does not request a frame when the error handler stops processing', async () => {
        await effects.start(effects.input);
        output.requestFrame.resetHistory();
        effects.mode = 'blur';
        effects.segmenter = {
            close() {},
            segmentForVideo() {
                throw new Error('GPU failed');
            },
        };
        effects.onError = () => effects.stop(false);
        effects.render((effects.lastFrame || 0) + 1000);
        assert.equal(effects.stopped, true);
        assert.equal(output.stop.callCount, 1);
        assert.equal(output.requestFrame.callCount, 0);
        assert.equal(clock.countTimers(), 0);
    });

    it('cleans up output without stopping the camera when switching off', async () => {
        await effects.start(effects.input);
        effects.stop(false);
        effects.stop();
        assert.equal(output.stop.callCount, 1);
        assert.equal(camera.stop.callCount, 0);
        assert.equal(audio.stop.callCount, 0);
        assert.equal(clock.countTimers(), 0);
    });

    it('stops the raw camera on shutdown', async () => {
        await effects.start(effects.input);
        effects.stop();
        assert.equal(camera.stop.callCount, 1);
        assert.equal(output.stop.callCount, 1);
    });
});

describe('client camera background integration', () => {
    let context;
    let camera;
    let output;
    let originalStream;
    let processors;

    beforeEach(() => {
        camera = { kind: 'video', readyState: 'live', stop: sinon.spy(), applyConstraints: sinon.stub().resolves() };
        output = { kind: 'video', readyState: 'live', stop: sinon.spy() };
        processors = [];
        class MediaStream {
            constructor(tracks) {
                this.tracks = tracks;
            }
            getVideoTracks() {
                return this.tracks.filter((track) => track.kind === 'video');
            }
            getTracks() {
                return this.tracks;
            }
        }
        class BackgroundEffects {
            static supported() {
                return true;
            }
            constructor(onError) {
                this.onError = onError;
                this.stop = sinon.spy((stopCamera = true) => {
                    this.stopped = true;
                    if (stopCamera) this.cameraTrack?.stop();
                });
                this.setMode = sinon.stub().resolves();
                this.setBackground = sinon.spy(async (mode, image) => {
                    if (this.stopped || !this.outputTrack) return false;
                    await this.setMode(mode, image);
                    return true;
                });
                processors.push(this);
            }
            async start(stream) {
                this.cameraTrack = stream.getVideoTracks()[0];
                this.outputTrack = output;
                return new MediaStream([output]);
            }
        }
        originalStream = new MediaStream([camera]);
        const { document } = new JSDOM('<!doctype html><body></body>').window;
        const grid = (id) => Object.assign(document.createElement('div'), { id, hidden: true });
        context = vm.createContext({
            MediaStream,
            BackgroundEffects,
            document,
            Event,
            cameraEffects: null,
            backgroundImage: {},
            backgroundImageSource: null,
            backgroundCustomImageUrl: null,
            backgroundCustomIsVideo: false,
            backgroundCustomPosterUrl: null,
            backgroundEffectsBusy: false,
            lsSettings: { camera_background: { mode: 'off', image: null } },
            lS: { setSettings: sinon.spy() },
            cameraBackgroundDB: null,
            CAMERA_BG_CUSTOM_KEY: 'custom',
            backgroundEffectSelect: { value: 'off', dispatchEvent: sinon.spy() },
            backgroundImageInput: { files: [], click: sinon.spy() },
            backgroundImageGrid: grid('backgroundImageGrid'),
            backgroundEffectLoading: {},
            backgroundEffectsSection: { setAttribute() {} },
            initBackgroundEffectSelect: { value: 'off' },
            initBackgroundImageInput: { files: [], click: sinon.spy() },
            initBackgroundImageGrid: grid('initBackgroundImageGrid'),
            initBackgroundEffectLoading: {},
            initBackgroundEffectsSection: { setAttribute() {} },
            initBackgroundError: { textContent: '', hidden: true, firstChild: {} },
            window: {},
            initUser: {},
            Swal: { getPopup: sinon.stub().returns(null) },
            buttons: { main: { showVideoBtn: true } },
            myVideoStatus: true,
            localVideoMediaStream: originalStream,
            localScreenMediaStream: new MediaStream([{ kind: 'video', id: 'screen' }]),
            initStream: originalStream,
            myVideo: {},
            initVideo: {},
            userLog: sinon.spy(),
            console: { error() {}, warn() {} },
            refreshMyStreamToPeers: sinon.stub().resolves(),
            getVideoTrack: (stream) => stream?.getVideoTracks()[0],
            useVideo: true,
            isFirefox: false,
            isScreenStreaming: true,
            videoFpsSelect: { selectedIndex: 0 },
            screenFpsSelect: { selectedIndex: 0 },
            logStreamSettingsInfo() {},
            setTimeout,
            clearTimeout,
        });
        const source = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');
        for (const name of [
            'setupBackgroundControls',
            'getCameraBackgroundPresets',
            'getCameraBackgroundVideoPresets',
            'isCameraBackgroundVideoPreset',
            'isCameraBackgroundVideoFile',
            'createCameraBackgroundGrid',
            'updateCameraBackgroundGrid',
            'updateBackgroundControls',
            'setBackgroundError',
            'attachCameraBackgroundStream',
            'prepareCameraBackground',
            'swapCameraBackground',
            'applyCameraBackground',
            'changeCameraBackground',
            'loadCameraBackgroundImageElement',
            'createCameraBackgroundVideoElement',
            'loadCameraBackgroundVideoElement',
            'loadCameraBackgroundMedia',
            'releaseCameraBackgroundMedia',
            'createCameraBackgroundPoster',
            'setCameraBackgroundCustom',
            'selectCameraBackgroundImage',
            'useCameraBackgroundFile',
            'saveCameraBackground',
            'restoreCameraBackground',
            'storeCameraBackgroundFile',
            'loadCameraBackgroundImage',
            'stopVideoTracks',
            'setLocalMaxFps',
        ]) {
            const declaration = source.indexOf(`function ${name}(`);
            const start = source.slice(declaration - 6, declaration) === 'async ' ? declaration - 6 : declaration;
            const end = source.indexOf('\n}', declaration) + 2;
            vm.runInContext(source.slice(start, end), context);
        }
    });

    it('keeps Off on the original camera without constructing a processor', async () => {
        const stream = await context.prepareCameraBackground(originalStream);
        assert.equal(stream, originalStream);
        assert.equal(processors.length, 0);
    });

    it('notifies quick controls when mode and loading state change', () => {
        context.backgroundEffectSelect.value = 'image';
        context.backgroundEffectsBusy = true;
        context.updateBackgroundControls();
        assert.equal(context.backgroundEffectSelect.disabled, true);
        assert.equal(context.backgroundImageGrid.hidden, false);
        assert.equal(context.backgroundEffectLoading.hidden, false);
        assert.equal(context.backgroundEffectSelect.dispatchEvent.lastCall.args[0].type, 'background-effects-change');
        context.backgroundEffectsBusy = false;
        context.updateBackgroundControls();
        assert.equal(context.backgroundEffectSelect.disabled, false);
        assert.equal(context.backgroundEffectSelect.dispatchEvent.callCount, 2);
    });

    it('connects pre-join controls and hides them when effects are unsupported', () => {
        context.setupBackgroundControls();
        assert.equal(context.initBackgroundEffectsSection.hidden, false);
        assert.equal(context.initBackgroundEffectSelect.onchange, context.changeCameraBackground);
        assert.equal(context.initBackgroundImageInput.onchange, context.loadCameraBackgroundImage);
        context.BackgroundEffects.supported = () => false;
        context.setupBackgroundControls();
        assert.equal(context.initBackgroundEffectsSection.hidden, true);
        assert.equal(context.backgroundEffectsSection.hidden, true);
    });

    it('applies the pre-join selection to both previews and retains it for the room', async () => {
        context.initBackgroundEffectSelect.value = 'blur';
        await context.changeCameraBackground({ target: context.initBackgroundEffectSelect });
        assert.equal(context.backgroundEffectSelect.value, 'blur');
        assert.equal(context.initStream.getVideoTracks()[0], output);
        assert.equal(context.initVideo.srcObject, context.localVideoMediaStream);
        assert.equal(context.myVideo.srcObject, context.localVideoMediaStream);
        assert.equal(processors[0].setMode.firstCall.args[0], 'blur');
        assert.equal(context.backgroundEffectsBusy, false);
        context.setupBackgroundControls();
        assert.equal(context.initBackgroundEffectSelect.value, 'blur');
        assert.equal(processors.length, 1);
    });

    it('syncs room selection, loading and camera-off states to pre-join controls', () => {
        context.backgroundEffectSelect.value = 'image';
        context.backgroundEffectsBusy = true;
        context.updateBackgroundControls();
        assert.equal(context.initBackgroundEffectSelect.value, 'image');
        assert.equal(context.initBackgroundImageGrid.hidden, false);
        assert.equal(context.initBackgroundEffectSelect.disabled, true);
        assert.equal(context.initBackgroundEffectLoading.hidden, false);
        context.backgroundEffectsBusy = false;
        context.myVideoStatus = false;
        context.updateBackgroundControls();
        assert.equal(context.initBackgroundEffectSelect.disabled, true);
        assert.equal(context.initBackgroundImageInput.disabled, true);
        context.myVideoStatus = true;
        context.updateBackgroundControls();
        assert.equal(context.initBackgroundEffectSelect.disabled, false);
        assert.equal(context.initBackgroundEffectLoading.hidden, true);
    });

    for (const select of ['initBackgroundEffectSelect', 'backgroundEffectSelect']) {
        it(`shows the image picker from ${select} without opening a dialog when no presets exist`, async () => {
            context.backgroundImage = null;
            context[select].value = 'image';
            await context.changeCameraBackground({ target: context[select] });

            assert.equal(context.backgroundImageInput.click.callCount, 0);
            assert.equal(context.initBackgroundImageInput.click.callCount, 0);
            assert.equal(context.backgroundImageGrid.hidden, false);
            assert.equal(context.initBackgroundImageGrid.hidden, false);
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.initBackgroundEffectSelect.value, 'image');
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
            assert.equal(processors.length, 0);
        });
    }

    describe('preset and uploaded image picker', () => {
        const presets = ['../images/room-background/forest.webp', '../images/room-background/beach.webp'];
        const cards = (grid, type) => [...grid.querySelectorAll(`.camera-bg-card[data-bg-type="${type}"]`)];
        const loadedImages = [];

        beforeEach(() => {
            loadedImages.length = 0;
            context.ROOM_BG_PRESETS = presets;
            context.backgroundImage = null;
            context.Image = class {
                set src(value) {
                    this.url = value;
                    loadedImages.push(value);
                    this.onload();
                }
            };
            context.setupBackgroundControls();
        });

        it('renders None, Upload, a hidden custom slot and the room presets in both static pickers', () => {
            for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                assert.equal(grid.querySelector('.camera-bg-card').dataset.bgType, 'none');
                assert.equal(cards(grid, 'none').length, 1);
                assert.equal(cards(grid, 'upload').length, 1);
                assert.equal(cards(grid, 'custom').length, 1);
                assert.equal(cards(grid, 'custom')[0].hidden, true);
                assert.deepEqual(
                    cards(grid, 'preset').map((card) => card.dataset.bgValue),
                    presets
                );
                assert.equal(grid.hidden, true);
            }
        });

        it('opens the matching file input from each Upload tile', () => {
            cards(context.initBackgroundImageGrid, 'upload')[0].click();
            assert.equal(context.initBackgroundImageInput.click.callCount, 1);
            cards(context.backgroundImageGrid, 'upload')[0].click();
            assert.equal(context.backgroundImageInput.click.callCount, 1);
        });

        for (const grid of ['initBackgroundImageGrid', 'backgroundImageGrid']) {
            it(`turns the background Off from the None tile in ${grid}`, async () => {
                await context.selectCameraBackgroundImage({ type: 'preset', url: presets[0] });
                assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
                assert.equal(cards(context[grid], 'none')[0].classList.contains('active'), false);

                cards(context[grid], 'none')[0].click();
                await new Promise((resolve) => setImmediate(resolve));

                assert.equal(context.backgroundEffectSelect.value, 'off');
                assert.equal(context.initBackgroundEffectSelect.value, 'off');
                assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
                assert.equal(context.lsSettings.camera_background.mode, 'off');
                for (const picker of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                    assert.equal(picker.hidden, true);
                    assert.equal(cards(picker, 'none')[0].getAttribute('aria-pressed'), 'true');
                    assert.ok(cards(picker, 'preset').every((card) => !card.classList.contains('active')));
                }
                assert.equal(context.backgroundEffectsBusy, false);
            });
        }

        for (const select of ['initBackgroundEffectSelect', 'backgroundEffectSelect']) {
            it(`opens the picker without applying an image when Image is chosen from ${select}`, async () => {
                context.backgroundEffectSelect.value = 'blur';
                await context.changeCameraBackground();
                context[select].value = 'image';
                await context.changeCameraBackground({ target: context[select] });

                assert.equal(context.backgroundImage, null);
                assert.deepEqual(loadedImages, []);
                assert.equal(context.backgroundEffectSelect.value, 'image');
                assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
                for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                    assert.equal(grid.hidden, false);
                    assert.ok(grid.querySelectorAll('.camera-bg-card').length > 0);
                    assert.equal(grid.querySelector('.camera-bg-card.active'), null);
                }
                assert.equal(context.lsSettings.camera_background.mode, 'off');
                assert.equal(context.backgroundEffectsBusy, false);
            });
        }

        it('does not reapply the last image when switching back to Image', async () => {
            cards(context.backgroundImageGrid, 'preset')[1].click();
            await new Promise((resolve) => setImmediate(resolve));
            context.backgroundEffectSelect.value = 'blur';
            await context.changeCameraBackground();
            context.backgroundEffectSelect.value = 'image';
            await context.changeCameraBackground();

            assert.equal(context.backgroundImage, null);
            assert.deepEqual(loadedImages, [presets[1]]);
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
            assert.equal(context.initBackgroundImageGrid.querySelector('.camera-bg-card.active'), null);

            cards(context.initBackgroundImageGrid, 'preset')[1].click();
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(context.backgroundImage.url, presets[1]);
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
            assert.equal(cards(context.initBackgroundImageGrid, 'preset')[1].classList.contains('active'), true);
        });

        it('switches to Image mode from a preset tile and syncs the active tile to both pickers', async () => {
            context.backgroundEffectSelect.value = 'blur';
            await context.selectCameraBackgroundImage({ type: 'preset', url: presets[1] });

            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.initBackgroundEffectSelect.value, 'image');
            assert.equal(processors.at(-1).setMode.firstCall.args[0], 'image');
            for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                assert.deepEqual(
                    cards(grid, 'preset').map((card) => card.classList.contains('active')),
                    [false, true]
                );
            }
        });

        it('disables tiles while busy or when the camera is off', () => {
            context.backgroundEffectSelect.value = 'image';
            context.myVideoStatus = false;
            context.updateBackgroundControls();
            const tiles = context.initBackgroundImageGrid.querySelectorAll('.camera-bg-card');
            assert.ok([...tiles].every((tile) => tile.disabled));
            context.myVideoStatus = true;
            context.updateBackgroundControls();
            assert.ok([...tiles].every((tile) => !tile.disabled));
        });

        it('falls back to the plain camera and keeps the picker open when the preset cannot load', async () => {
            context.Image = class {
                set src(value) {
                    this.onerror();
                }
            };
            context.backgroundEffectSelect.value = 'image';
            await context.changeCameraBackground();
            await context.selectCameraBackgroundImage({ type: 'preset', url: presets[0] });

            assert.equal(context.backgroundImage, null);
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.backgroundImageGrid.hidden, false);
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
            assert.equal(context.userLog.callCount, 1);
            assert.equal(context.backgroundEffectsBusy, false);
        });

        it('shows an upload as the active custom tile and keeps it selectable after picking a preset', async () => {
            context.URL = { createObjectURL: () => 'blob:landscape', revokeObjectURL: sinon.spy() };
            context.initBackgroundImageInput.files = [{ name: 'landscape.png', type: 'image/png', size: 100 }];
            context.initBackgroundImageInput.value = 'landscape.png';
            await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });

            assert.equal(context.initBackgroundImageInput.value, '');
            assert.equal(context.backgroundImage.url, 'blob:landscape');
            for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                const [custom] = cards(grid, 'custom');
                assert.equal(custom.hidden, false);
                assert.equal(custom.querySelector('img').getAttribute('src'), 'blob:landscape');
                assert.equal(custom.getAttribute('aria-pressed'), 'true');
            }

            await context.selectCameraBackgroundImage({ type: 'preset', url: presets[0] });
            const [custom] = cards(context.backgroundImageGrid, 'custom');
            assert.equal(custom.hidden, false);
            assert.equal(custom.getAttribute('aria-pressed'), 'false');
            assert.equal(context.URL.revokeObjectURL.callCount, 0);

            custom.click();
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(context.backgroundImage.url, 'blob:landscape');
            assert.equal(custom.getAttribute('aria-pressed'), 'true');
        });

        it('releases the previous upload when a new image is uploaded', async () => {
            const urls = ['blob:first', 'blob:second'];
            context.URL = { createObjectURL: () => urls.shift(), revokeObjectURL: sinon.spy() };
            for (const name of ['first.png', 'second.png']) {
                context.backgroundImageInput.files = [{ name, type: 'image/png', size: 100 }];
                await context.loadCameraBackgroundImage({ target: context.backgroundImageInput });
            }
            assert.equal(context.backgroundCustomImageUrl, 'blob:second');
            assert.deepEqual(context.URL.revokeObjectURL.args, [['blob:first']]);
        });

        it('accepts images dropped on the picker', async () => {
            context.URL = { createObjectURL: () => 'blob:dropped', revokeObjectURL: sinon.spy() };
            context.backgroundEffectSelect.value = 'image';
            context.updateBackgroundControls();
            const drop = new context.document.defaultView.Event('drop', { cancelable: true });
            drop.dataTransfer = { files: [{ name: 'dropped.webp', type: 'image/webp', size: 100 }] };
            context.initBackgroundImageGrid.dispatchEvent(drop);
            await new Promise((resolve) => setImmediate(resolve));

            assert.equal(drop.defaultPrevented, true);
            assert.equal(context.backgroundImage.url, 'blob:dropped');
            assert.equal(context.backgroundImageSource.type, 'custom');
        });
    });

    describe('video backgrounds', () => {
        const images = ['../images/room-background/forest.webp'];
        const videos = [
            { src: '../images/camera-background/aquarium.mp4', poster: '../images/camera-background/aquarium.jpg' },
            { src: '../images/camera-background/milky-way.mp4', poster: '../images/camera-background/milky-way.jpg' },
        ];
        const cards = (grid, type) => [...grid.querySelectorAll(`.camera-bg-card[data-bg-type="${type}"]`)];
        const hiddenVideos = () => [...context.document.body.querySelectorAll('video')];
        let db;

        beforeEach(() => {
            const { HTMLMediaElement, Event: DomEvent } = context.document.defaultView;
            // jsdom does not play media: playing decodes the first frame at once
            HTMLMediaElement.prototype.play = function () {
                setImmediate(() => this.dispatchEvent(new DomEvent(this.failLoad ? 'error' : 'loadeddata')));
                return Promise.resolve();
            };
            HTMLMediaElement.prototype.pause = sinon.spy();
            HTMLMediaElement.prototype.load = sinon.spy();
            db = { get: sinon.stub().resolves(undefined), put: sinon.stub().resolves() };
            context.cameraBackgroundDB = db;
            context.ROOM_BG_PRESETS = images;
            context.CAMERA_BG_VIDEO_PRESETS = videos;
            context.backgroundImage = null;
            context.URL = { createObjectURL: () => 'blob:clip', revokeObjectURL: sinon.spy() };
            context.createCameraBackgroundPoster = sinon.stub().resolves('data:image/jpeg;base64,poster');
            context.Image = class {
                set src(value) {
                    this.url = value;
                    this.onload();
                }
            };
            context.setupBackgroundControls();
        });

        it('lists the video presets after the images, as posters with a play mark', () => {
            for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                const presets = cards(grid, 'preset');
                assert.deepEqual(
                    presets.map((card) => card.dataset.bgValue),
                    [images[0], ...videos.map((video) => video.src)]
                );
                assert.equal(presets[0].querySelector('.camera-bg-play'), null);
                assert.equal(presets[1].getAttribute('aria-label'), 'Background video');
                assert.equal(presets[1].querySelector('img').getAttribute('src'), videos[0].poster);
                assert.ok(presets[1].querySelector('.camera-bg-play'));
            }
        });

        it('applies a video preset as a hidden muted looping video and remembers it', async () => {
            cards(context.backgroundImageGrid, 'preset')[1].click();
            await new Promise((resolve) => setTimeout(resolve, 10));

            const video = context.backgroundImage;
            assert.equal(video.nodeName, 'VIDEO');
            assert.equal(video.getAttribute('src'), videos[0].src);
            assert.equal(video.muted, true);
            assert.equal(video.loop, true);
            assert.equal(video.parentNode, context.document.body);
            assert.deepEqual(processors.at(-1).setMode.firstCall.args, ['image', video]);
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
            assert.deepEqual(JSON.parse(JSON.stringify(context.lsSettings.camera_background)), {
                mode: 'image',
                image: { type: 'preset', url: videos[0].src },
            });
            assert.equal(cards(context.initBackgroundImageGrid, 'preset')[1].getAttribute('aria-pressed'), 'true');
        });

        it('keeps the playing video when it is picked again and frees it once replaced', async () => {
            const source = { type: 'preset', url: videos[0].src, video: true };
            await context.selectCameraBackgroundImage(source);
            const video = context.backgroundImage;
            await context.selectCameraBackgroundImage(source);
            assert.equal(context.backgroundImage, video);
            assert.deepEqual(hiddenVideos(), [video]);

            await context.selectCameraBackgroundImage({ type: 'preset', url: images[0] });
            assert.equal(context.backgroundImage.url, images[0]);
            assert.deepEqual(hiddenVideos(), []);
            assert.equal(video.hasAttribute('src'), false);
        });

        it('frees the video when Image is chosen again, and keeps it while blurring', async () => {
            await context.selectCameraBackgroundImage({ type: 'preset', url: videos[1].src, video: true });
            context.backgroundEffectSelect.value = 'blur';
            await context.changeCameraBackground();
            assert.equal(hiddenVideos().length, 1);

            context.backgroundEffectSelect.value = 'image';
            await context.changeCameraBackground();
            assert.equal(context.backgroundImage, null);
            assert.deepEqual(hiddenVideos(), []);
        });

        it('keeps the current background when a video cannot load', async () => {
            await context.selectCameraBackgroundImage({ type: 'preset', url: images[0] });
            const image = context.backgroundImage;
            context.document.defaultView.HTMLMediaElement.prototype.failLoad = true;
            assert.equal(
                await context.selectCameraBackgroundImage({ type: 'preset', url: videos[0].src, video: true }),
                false
            );
            assert.equal(context.backgroundImage, image);
            assert.deepEqual(hiddenVideos(), []);
            assert.match(context.userLog.lastCall.args[1], /Unable to load background video/);
        });

        it('uploads an MP4 or WebM video, stores it and shows its poster in the custom tile', async () => {
            const file = { name: 'clip.mp4', type: 'video/mp4', size: 40 * 1024 * 1024 };
            context.backgroundImageInput.files = [file];
            await context.loadCameraBackgroundImage({ target: context.backgroundImageInput });
            await new Promise((resolve) => setImmediate(resolve));

            assert.equal(context.backgroundImage.nodeName, 'VIDEO');
            assert.deepEqual({ ...context.backgroundImageSource }, { type: 'custom', url: 'blob:clip', video: true });
            assert.equal(context.backgroundCustomIsVideo, true);
            assert.deepEqual(db.put.firstCall.args, ['custom', file]);
            const [custom] = cards(context.initBackgroundImageGrid, 'custom');
            assert.equal(custom.hidden, false);
            assert.equal(custom.getAttribute('aria-label'), 'Background video');
            assert.equal(custom.querySelector('img').getAttribute('src'), 'data:image/jpeg;base64,poster');
            assert.equal(custom.querySelector('.camera-bg-play').hidden, false);
        });

        it('rejects videos over 50 MB and other video formats', async () => {
            for (const file of [
                { name: 'big.mp4', type: 'video/mp4', size: 51 * 1024 * 1024 },
                { name: 'clip.mov', type: 'video/quicktime', size: 100 },
            ]) {
                context.backgroundImageInput.files = [file];
                await context.loadCameraBackgroundImage({ target: context.backgroundImageInput });
            }
            assert.equal(context.backgroundImage, null);
            assert.equal(context.userLog.callCount, 2);
            assert.match(context.userLog.firstCall.args[1], /MP4 or WebM video up to 50 MB/);
        });

        it('restores a saved video preset and a saved uploaded video', async () => {
            context.lsSettings.camera_background = { mode: 'image', image: { type: 'preset', url: videos[1].src } };
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.backgroundImage.getAttribute('src'), videos[1].src);
            assert.equal(context.backgroundImageSource.video, true);

            context.backgroundImage = null;
            context.backgroundImageSource = null;
            db.get.withArgs('custom').resolves({ type: 'video/webm' });
            context.lsSettings.camera_background = { mode: 'image', image: { type: 'custom' } };
            await context.restoreCameraBackground();
            assert.equal(context.backgroundCustomIsVideo, true);
            assert.equal(context.backgroundImage.getAttribute('src'), 'blob:clip');
            assert.deepEqual({ ...context.backgroundImageSource }, { type: 'custom', url: 'blob:clip', video: true });
        });
    });

    describe('remembered background', () => {
        const forest = '../images/room-background/forest.webp';
        const beach = '../images/room-background/beach.webp';
        let db;

        beforeEach(() => {
            db = { get: sinon.stub().resolves(undefined), put: sinon.stub().resolves() };
            context.cameraBackgroundDB = db;
            context.ROOM_BG_PRESETS = [forest, beach];
            context.backgroundImage = null;
            context.URL = { createObjectURL: sinon.stub().returns('blob:saved'), revokeObjectURL: sinon.spy() };
            context.Image = class {
                set src(value) {
                    this.url = value;
                    this.onload();
                }
            };
            context.setupBackgroundControls();
        });

        const saved = () => JSON.parse(JSON.stringify(context.lsSettings.camera_background));

        it('remembers Blur, and Off chosen in the pre-join to start without it', async () => {
            context.initBackgroundEffectSelect.value = 'blur';
            await context.changeCameraBackground({ target: context.initBackgroundEffectSelect });
            assert.deepEqual(saved(), { mode: 'blur', image: null });

            context.initBackgroundEffectSelect.value = 'off';
            await context.changeCameraBackground({ target: context.initBackgroundEffectSelect });
            assert.deepEqual(saved(), { mode: 'off', image: null });
            assert.equal(context.lS.setSettings.lastCall.args[0], context.lsSettings);
        });

        it('remembers the chosen preset, and keeps it as the last image after switching Off', async () => {
            await context.selectCameraBackgroundImage({ type: 'preset', url: beach });
            assert.deepEqual(saved().image, { type: 'preset', url: beach });
            assert.equal(saved().mode, 'image');

            context.backgroundEffectSelect.value = 'off';
            await context.changeCameraBackground();
            assert.equal(saved().mode, 'off');
            assert.equal(saved().image.url, beach);
        });

        it('stores an uploaded image in this browser and remembers it as custom', async () => {
            const file = { name: 'me.png', type: 'image/png', size: 100 };
            context.backgroundImageInput.files = [file];
            await context.loadCameraBackgroundImage({ target: context.backgroundImageInput });

            assert.deepEqual(db.put.firstCall.args, ['custom', file]);
            assert.deepEqual(saved(), { mode: 'image', image: { type: 'custom' } });
        });

        it('keeps the requested mode when effects fail temporarily', async () => {
            context.BackgroundEffects.prototype.start = async () => {
                throw new Error('Model unavailable');
            };
            context.backgroundEffectSelect.value = 'blur';
            await context.changeCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
            assert.equal(saved().mode, 'blur');
        });

        it('restores Blur before the camera starts so the first stream is processed', async () => {
            context.lsSettings.camera_background = { mode: 'blur', image: null };
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'blur');
            assert.equal(context.initBackgroundEffectSelect.value, 'blur');

            const stream = await context.prepareCameraBackground(originalStream);
            assert.equal(stream.getVideoTracks()[0], output);
            assert.equal(processors[0].setMode.firstCall.args[0], 'blur');
            assert.equal(context.lS.setSettings.callCount, 0);
        });

        it('restores a saved preset image and marks it in the picker', async () => {
            context.lsSettings.camera_background = { mode: 'image', image: { type: 'preset', url: beach } };
            await context.restoreCameraBackground();

            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.backgroundImage.url, beach);
            const active = context.initBackgroundImageGrid.querySelector('.camera-bg-card.active');
            assert.equal(active.dataset.bgValue, beach);
            await context.prepareCameraBackground(originalStream);
            assert.deepEqual(processors[0].setMode.firstCall.args, ['image', context.backgroundImage]);
        });

        it('restores a saved upload from IndexedDB, including its picker tile', async () => {
            db.get.withArgs('custom').resolves({ type: 'image/png' });
            context.lsSettings.camera_background = { mode: 'image', image: { type: 'custom' } };
            await context.restoreCameraBackground();

            assert.equal(context.backgroundCustomImageUrl, 'blob:saved');
            assert.equal(context.backgroundImage.url, 'blob:saved');
            const custom = context.backgroundImageGrid.querySelector('[data-bg-type="custom"]');
            assert.equal(custom.hidden, false);
            assert.equal(custom.getAttribute('aria-pressed'), 'true');
        });

        it('keeps the last image ready when the saved mode is Off', async () => {
            context.lsSettings.camera_background = { mode: 'off', image: { type: 'preset', url: beach } };
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
            assert.equal(context.backgroundImage, null);
            assert.equal(processors.length, 0);

            context.backgroundEffectSelect.value = 'image';
            await context.changeCameraBackground();
            assert.equal(context.backgroundImage, null);
            assert.equal(context.backgroundImageSource.url, beach);
            assert.equal(processors.length, 0);
        });

        for (const [name, setting] of [
            ['a missing upload', { mode: 'image', image: { type: 'custom' } }],
            ['an unknown preset', { mode: 'image', image: { type: 'preset', url: 'https://evil.test/x.png' } }],
            ['an invalid mode', { mode: 'sparkles', image: null }],
        ]) {
            it(`starts without effects for ${name}`, async () => {
                context.lsSettings.camera_background = setting;
                await context.restoreCameraBackground();
                assert.equal(context.backgroundEffectSelect.value, 'off');
                assert.equal(context.backgroundImage, null);
            });
        }

        it('starts without effects when the saved image cannot load', async () => {
            context.Image = class {
                set src(value) {
                    this.onerror();
                }
            };
            context.lsSettings.camera_background = { mode: 'image', image: { type: 'preset', url: forest } };
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
            assert.equal(context.userLog.callCount, 0);
        });

        it('does nothing when effects are unsupported or the camera is unavailable', async () => {
            context.lsSettings.camera_background = { mode: 'blur', image: null };
            context.BackgroundEffects.supported = () => false;
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
            context.BackgroundEffects.supported = () => true;
            context.useVideo = false;
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
            assert.equal(db.get.callCount, 0);
        });

        it('ignores IndexedDB failures', async () => {
            db.get.rejects(new Error('blocked'));
            context.lsSettings.camera_background = { mode: 'blur', image: { type: 'custom' } };
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'blur');
            assert.equal(context.backgroundImageSource, null);
        });
    });

    it('validates images selected from the pre-join picker', async () => {
        context.initBackgroundImageInput.files = [{ type: 'text/plain', size: 1 }];
        context.initBackgroundImageInput.value = 'invalid.txt';
        await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });
        assert.equal(context.initBackgroundImageInput.value, '');
        assert.equal(context.userLog.callCount, 1);
        assert.equal(processors.length, 0);
    });

    for (const picker of ['initBackgroundImageInput', 'backgroundImageInput']) {
        it(`applies an uploaded image from ${picker} to both previews`, async () => {
            context[picker].files = [{ name: 'landscape.png', type: 'image/png', size: 100 }];
            context.backgroundEffectSelect.value = 'off';
            context.URL = { createObjectURL: () => 'blob:landscape', revokeObjectURL: sinon.spy() };
            context.Image = class {
                set src(value) {
                    this.onload();
                }
            };

            await context.loadCameraBackgroundImage({ target: context[picker] });

            assert.equal(context.backgroundCustomImageUrl, 'blob:landscape');
            assert.deepEqual({ ...context.backgroundImageSource }, { type: 'custom', url: 'blob:landscape' });
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.initBackgroundEffectSelect.value, 'image');
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
            assert.equal(context.URL.revokeObjectURL.callCount, 0);
        });
    }

    it('keeps the current image when a replacement is invalid', async () => {
        const image = context.backgroundImage;
        context.backgroundImageSource = { type: 'preset', url: '../images/room-background/forest.webp' };
        context.backgroundEffectSelect.value = 'image';
        context.initBackgroundImageInput.files = [{ name: 'invalid.txt', type: 'text/plain', size: 1 }];

        await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });

        assert.equal(context.backgroundImage, image);
        assert.equal(context.backgroundImageSource.type, 'preset');
        assert.equal(context.backgroundCustomImageUrl, null);
        assert.equal(context.userLog.callCount, 1);
    });

    it('keeps the current image when a replacement cannot decode', async () => {
        const image = context.backgroundImage;
        context.backgroundCustomImageUrl = 'blob:landscape';
        context.backgroundImageSource = { type: 'custom', url: 'blob:landscape' };
        context.backgroundEffectSelect.value = 'image';
        context.backgroundImageInput.files = [{ name: 'broken.png', type: 'image/png', size: 100 }];
        context.URL = { createObjectURL: () => 'blob:broken', revokeObjectURL: sinon.spy() };
        context.Image = class {
            set src(value) {
                this.onerror();
            }
        };

        await context.loadCameraBackgroundImage({ target: context.backgroundImageInput });

        assert.equal(context.backgroundImage, image);
        assert.equal(context.backgroundCustomImageUrl, 'blob:landscape');
        assert.equal(context.backgroundImageSource.url, 'blob:landscape');
        assert.equal(context.backgroundEffectsBusy, false);
        assert.equal(context.userLog.callCount, 1);
        assert.deepEqual(context.URL.revokeObjectURL.args, [['blob:broken']]);
    });

    it('shows invalid image warnings inline without replacing the pre-join popup', async () => {
        const popup = { contains: sinon.stub().withArgs(context.initUser).returns(true) };
        context.Swal.getPopup.returns(popup);
        context.initBackgroundImageInput.files = [{ type: 'text/plain', size: 1 }];
        await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });
        assert.equal(context.initBackgroundError.hidden, false);
        assert.match(context.initBackgroundError.textContent, /Choose a PNG/);
        assert.equal(context.userLog.callCount, 0);
        assert.equal(context.Swal.getPopup(), popup);
    });

    it('keeps model startup failures inline and clears the warning on retry', async () => {
        context.Swal.getPopup.returns({ contains: () => true });
        context.BackgroundEffects.prototype.start = async () => {
            throw new Error('Model unavailable');
        };
        context.backgroundEffectSelect.value = 'blur';
        const stream = await context.prepareCameraBackground(originalStream);
        assert.equal(stream, originalStream);
        assert.equal(context.backgroundEffectSelect.value, 'off');
        assert.equal(context.initBackgroundError.hidden, false);
        assert.match(context.initBackgroundError.textContent, /Continuing without effects/);
        assert.equal(context.userLog.callCount, 0);
        await context.changeCameraBackground();
        assert.equal(context.initBackgroundError.hidden, true);
        assert.equal(context.initBackgroundError.textContent, '');
    });

    it('shows pre-join segmentation failures inline while restoring the camera', async () => {
        context.Swal.getPopup.returns({ contains: () => true });
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        await processors[0].onError(new Error('GPU failed'));
        assert.equal(context.initBackgroundError.hidden, false);
        assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
        assert.equal(context.userLog.callCount, 0);
    });

    it('shows image decoding errors inline and releases loading state', async () => {
        context.Swal.getPopup.returns({ contains: () => true });
        context.initBackgroundImageInput.files = [{ type: 'image/png', size: 100 }];
        context.URL = { createObjectURL: () => 'blob:invalid', revokeObjectURL: sinon.spy() };
        context.Image = class {
            set src(value) {
                this.onerror();
            }
        };
        await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });
        assert.equal(context.initBackgroundError.textContent, 'Unable to load background image.');
        assert.equal(context.initBackgroundError.hidden, false);
        assert.equal(context.backgroundEffectsBusy, false);
        assert.equal(context.userLog.callCount, 0);
        assert.equal(context.URL.revokeObjectURL.callCount, 1);
    });

    it('replaces preview and peer camera tracks without touching the screen', async () => {
        const screen = context.localScreenMediaStream;
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
        assert.equal(context.myVideo.srcObject, context.localVideoMediaStream);
        assert.equal(context.initVideo.srcObject, context.localVideoMediaStream);
        assert.equal(context.refreshMyStreamToPeers.firstCall.args[0], context.localVideoMediaStream);
        assert.equal(context.localScreenMediaStream, screen);
    });

    it('restores the raw camera and releases processing when switched Off', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        context.backgroundEffectSelect.value = 'off';
        await context.applyCameraBackground();
        assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
        assert.equal(processors[0].stop.firstCall.args[0], false);
        assert.equal(camera.stop.callCount, 0);
        assert.equal(context.cameraEffects, null);
    });

    describe('swapping on the running pipeline', () => {
        let assignments;

        beforeEach(async () => {
            assignments = { myVideo: 0, initVideo: 0 };
            for (const name of ['myVideo', 'initVideo']) {
                let srcObject;
                context[name] = {
                    get srcObject() {
                        return srcObject;
                    },
                    set srcObject(value) {
                        assignments[name]++;
                        srcObject = value;
                    },
                };
            }
            context.backgroundEffectSelect.value = 'blur';
            await context.applyCameraBackground();
            context.refreshMyStreamToPeers.resetHistory();
            assignments.myVideo = assignments.initVideo = 0;
        });

        it('swaps blur and image without restarting the camera, previews or peer tracks', async () => {
            const stream = context.localVideoMediaStream;
            const image = { naturalWidth: 640, naturalHeight: 480 };
            context.backgroundImage = image;
            context.backgroundEffectSelect.value = 'image';
            await context.applyCameraBackground();
            context.backgroundEffectSelect.value = 'blur';
            await context.applyCameraBackground();

            assert.equal(processors.length, 1);
            assert.deepEqual(
                processors[0].setBackground.args.map(([mode, bg]) => [mode, bg]),
                [
                    ['image', image],
                    ['blur', image],
                ]
            );
            assert.equal(processors[0].stop.callCount, 0);
            assert.equal(context.cameraEffects, processors[0]);
            assert.equal(context.localVideoMediaStream, stream);
            assert.equal(context.initStream, stream);
            assert.equal(context.refreshMyStreamToPeers.callCount, 0);
            assert.deepEqual(assignments, { myVideo: 0, initVideo: 0 });
            assert.equal(camera.stop.callCount, 0);
        });

        it('swaps from a preset tile while blur is running', async () => {
            context.Image = class {
                set src(value) {
                    this.url = value;
                    this.onload();
                }
            };
            await context.selectCameraBackgroundImage({ type: 'preset', url: '/images/bg.jpg' });
            assert.equal(processors.length, 1);
            assert.equal(processors[0].setBackground.lastCall.args[0], 'image');
            assert.equal(processors[0].setBackground.lastCall.args[1].url, '/images/bg.jpg');
            assert.equal(context.refreshMyStreamToPeers.callCount, 0);
            assert.equal(context.backgroundEffectsBusy, false);
        });

        it('restarts when turning the effect off and back on', async () => {
            context.backgroundEffectSelect.value = 'off';
            await context.applyCameraBackground();
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
            context.backgroundEffectSelect.value = 'blur';
            await context.applyCameraBackground();
            assert.equal(processors.length, 2);
            assert.equal(processors[0].setBackground.callCount, 0);
            assert.equal(context.refreshMyStreamToPeers.callCount, 2);
        });

        it('restarts on the plain camera when Image is chosen without an image', async () => {
            context.backgroundImage = null;
            context.backgroundEffectSelect.value = 'image';
            await context.applyCameraBackground();
            assert.equal(processors[0].setBackground.callCount, 0);
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
            assert.equal(context.cameraEffects, null);
        });

        it('falls back to a restart when the swap fails', async () => {
            processors[0].setMode.rejects(new Error('Model unavailable'));
            context.backgroundImage = { naturalWidth: 640, naturalHeight: 480 };
            context.backgroundEffectSelect.value = 'image';
            await context.applyCameraBackground();
            assert.equal(processors.length, 2);
            assert.equal(processors[0].stop.firstCall.args[0], false);
            assert.equal(context.cameraEffects, processors[1]);
            assert.equal(processors[1].setMode.firstCall.args[0], 'image');
            assert.equal(context.refreshMyStreamToPeers.callCount, 1);
            assert.equal(camera.stop.callCount, 0);
        });

        it('falls back to a restart when the processor is no longer attached', async () => {
            processors[0].setBackground.resetHistory();
            context.localVideoMediaStream = new context.MediaStream([camera]);
            context.backgroundImage = { naturalWidth: 640, naturalHeight: 480 };
            context.backgroundEffectSelect.value = 'image';
            await context.applyCameraBackground();
            assert.equal(processors[0].setBackground.callCount, 0);
            assert.equal(processors.length, 2);
        });
    });

    it('does not reload previews when the stream is unchanged', () => {
        let assigned = 0;
        const video = {
            srcObject: originalStream,
        };
        context.myVideo = new Proxy(video, {
            set(target, key, value) {
                if (key === 'srcObject') assigned++;
                target[key] = value;
                return true;
            },
        });
        context.initVideo = context.myVideo;
        context.attachCameraBackgroundStream(originalStream, originalStream);
        assert.equal(assigned, 0);
    });

    it('restores the raw camera to peers on processing failure', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        await processors[0].onError(new Error('GPU failed'));
        assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
        assert.equal(context.backgroundEffectSelect.value, 'off');
        assert.equal(context.cameraEffects, null);
        assert.equal(context.userLog.callCount, 1);
        assert.equal(context.refreshMyStreamToPeers.lastCall.args[0], context.localVideoMediaStream);
    });

    it('stops the underlying camera when its processed stream is stopped', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        await context.stopVideoTracks(context.localVideoMediaStream);
        assert.equal(camera.stop.callCount, 1);
        assert.equal(context.cameraEffects, null);
    });

    it('applies camera FPS to the raw camera while sharing the screen', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        await context.setLocalMaxFps(30);
        assert.equal(camera.applyConstraints.firstCall.args[0].frameRate, 30);
    });
});
