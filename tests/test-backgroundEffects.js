'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

describe('camera background effects', () => {
    let effects;
    let camera;
    let output;
    let audio;
    let clock;
    let onError;

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
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/background-effects.js'), 'utf8'), context);
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

    it('requires an image and rejects unknown modes', async () => {
        await assert.rejects(effects.setMode('image'), /Choose a background image/);
        await assert.rejects(effects.setMode('invalid'), /Invalid background mode/);
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
            backgroundEffectsBusy: false,
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
            console: { error() {} },
            refreshMyStreamToPeers: sinon.stub().resolves(),
            getVideoTrack: (stream) => stream?.getVideoTracks()[0],
            useVideo: true,
            isFirefox: false,
            isScreenStreaming: true,
            videoFpsSelect: { selectedIndex: 0 },
            screenFpsSelect: { selectedIndex: 0 },
            logStreamSettingsInfo() {},
        });
        const source = fs.readFileSync(path.join(__dirname, '../public/js/client.js'), 'utf8');
        for (const name of [
            'setupBackgroundControls',
            'getCameraBackgroundPresets',
            'createCameraBackgroundGrid',
            'updateCameraBackgroundGrid',
            'updateBackgroundControls',
            'setBackgroundError',
            'attachCameraBackgroundStream',
            'prepareCameraBackground',
            'applyCameraBackground',
            'changeCameraBackground',
            'loadCameraBackgroundImageElement',
            'selectCameraBackgroundImage',
            'useCameraBackgroundFile',
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

        it('renders Upload, a hidden custom slot and the room presets in both static pickers', () => {
            for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
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

        for (const select of ['initBackgroundEffectSelect', 'backgroundEffectSelect']) {
            it(`applies the first preset right away when Image is chosen from ${select}`, async () => {
                context[select].value = 'image';
                await context.changeCameraBackground({ target: context[select] });

                assert.equal(context.backgroundImage.url, presets[0]);
                assert.equal(processors[0].setMode.firstCall.args[0], 'image');
                assert.equal(processors[0].setMode.firstCall.args[1], context.backgroundImage);
                assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
                for (const grid of [context.backgroundImageGrid, context.initBackgroundImageGrid]) {
                    assert.equal(grid.hidden, false);
                    assert.equal(cards(grid, 'preset')[0].getAttribute('aria-pressed'), 'true');
                    assert.equal(cards(grid, 'preset')[1].getAttribute('aria-pressed'), 'false');
                }
                assert.equal(context.backgroundEffectsBusy, false);
            });
        }

        it('reuses the last image instead of the first preset when switching back to Image', async () => {
            context.backgroundEffectSelect.value = 'image';
            await context.changeCameraBackground();
            cards(context.backgroundImageGrid, 'preset')[1].click();
            await new Promise((resolve) => setImmediate(resolve));
            context.backgroundEffectSelect.value = 'blur';
            await context.changeCameraBackground();
            context.backgroundEffectSelect.value = 'image';
            await context.changeCameraBackground();

            assert.equal(context.backgroundImage.url, presets[1]);
            assert.deepEqual(loadedImages, [presets[0], presets[1]]);
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
