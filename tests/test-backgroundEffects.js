'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

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
        context = vm.createContext({
            MediaStream,
            BackgroundEffects,
            DataTransfer: class {
                constructor() {
                    this.files = [];
                    this.items = { add: (file) => this.files.push(file) };
                }
            },
            Event,
            cameraEffects: null,
            backgroundImage: {},
            backgroundImageFile: null,
            backgroundEffectsBusy: false,
            backgroundEffectSelect: { value: 'off', dispatchEvent: sinon.spy() },
            backgroundImageInput: { files: [], click: sinon.spy() },
            backgroundEffectLoading: {},
            backgroundEffectsSection: { setAttribute() {} },
            initBackgroundEffectSelect: { value: 'off' },
            initBackgroundImageInput: { files: [], click: sinon.spy() },
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
            'updateBackgroundControls',
            'setBackgroundError',
            'attachCameraBackgroundStream',
            'prepareCameraBackground',
            'applyCameraBackground',
            'changeCameraBackground',
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
        assert.equal(context.backgroundImageInput.hidden, false);
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
        assert.equal(context.initBackgroundImageInput.hidden, false);
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
        it(`shows the manual image picker from ${select} without opening a dialog`, async () => {
            context.backgroundImage = null;
            context[select].value = 'image';
            await context.changeCameraBackground({ target: context[select] });

            assert.equal(context.backgroundImageInput.click.callCount, 0);
            assert.equal(context.initBackgroundImageInput.click.callCount, 0);
            assert.equal(context.backgroundImageInput.hidden, false);
            assert.equal(context.initBackgroundImageInput.hidden, false);
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.initBackgroundEffectSelect.value, 'image');
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], camera);
            assert.equal(processors.length, 0);
        });
    }

    it('validates images selected from the pre-join picker', async () => {
        context.initBackgroundImageInput.files = [{ type: 'text/plain', size: 1 }];
        context.initBackgroundImageInput.value = 'invalid.txt';
        await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });
        assert.equal(context.initBackgroundImageInput.value, '');
        assert.equal(context.userLog.callCount, 1);
        assert.equal(processors.length, 0);
    });

    for (const picker of ['initBackgroundImageInput', 'backgroundImageInput']) {
        it(`shares the accepted image filename from ${picker} with both pickers`, async () => {
            const files = [{ name: 'landscape.png', type: 'image/png', size: 100 }];
            context[picker].files = files;
            context.backgroundEffectSelect.value = 'image';
            context.URL = { createObjectURL: () => 'blob:landscape', revokeObjectURL: sinon.spy() };
            context.Image = class {
                set src(value) {
                    this.onload();
                }
            };

            await context.loadCameraBackgroundImage({ target: context[picker] });

            assert.equal(context.backgroundImageFile, files[0]);
            assert.equal(context.backgroundImageInput.files[0], files[0]);
            assert.equal(context.initBackgroundImageInput.files[0], files[0]);
            assert.notEqual(context.backgroundImageInput.files, context.initBackgroundImageInput.files);
            assert.equal(context.backgroundImageInput.files[0].name, 'landscape.png');
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.initBackgroundEffectSelect.value, 'image');
            assert.equal(context.localVideoMediaStream.getVideoTracks()[0], output);
            context.setupBackgroundControls();
            assert.equal(context.backgroundImageInput.files[0], files[0]);
            assert.equal(context.initBackgroundImageInput.files[0], files[0]);
        });
    }

    it('preserves the accepted filename when a replacement is invalid', async () => {
        const files = [{ name: 'landscape.png', type: 'image/png', size: 100 }];
        context.backgroundImageFile = files[0];
        context.backgroundEffectSelect.value = 'image';
        context.initBackgroundImageInput.files = [{ name: 'invalid.txt', type: 'text/plain', size: 1 }];

        await context.loadCameraBackgroundImage({ target: context.initBackgroundImageInput });

        assert.equal(context.backgroundImageInput.files[0], files[0]);
        assert.equal(context.initBackgroundImageInput.files[0], files[0]);
        assert.equal(context.userLog.callCount, 1);
    });

    it('preserves the accepted image and filename when a replacement cannot decode', async () => {
        const image = context.backgroundImage;
        const files = [{ name: 'landscape.png', type: 'image/png', size: 100 }];
        context.backgroundImageFile = files[0];
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
        assert.equal(context.backgroundImageInput.files[0], files[0]);
        assert.equal(context.initBackgroundImageInput.files[0], files[0]);
        assert.equal(context.backgroundEffectsBusy, false);
        assert.equal(context.userLog.callCount, 1);
        assert.equal(context.URL.revokeObjectURL.callCount, 1);
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
