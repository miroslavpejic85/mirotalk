'use strict';

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
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
        this.video.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.video);
    }

    async start(stream) {
        this.cameraTrack = stream.getVideoTracks()[0];
        this.video.srcObject = new MediaStream([this.cameraTrack]);
        await this.video.play();
        if (this.stopped) throw new Error('Camera processing stopped');
        this.resize();
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.output = this.canvas.captureStream(60);
        this.outputTrack = this.output.getVideoTracks()[0];
        this.cameraEnded = () => this.stop();
        this.cameraTrack.addEventListener('ended', this.cameraEnded, { once: true });
        this.render(performance.now());
        return new MediaStream([this.outputTrack, ...stream.getAudioTracks()]);
    }

    async setMode(mode, image = this.image) {
        if (!['off', 'blur', 'image'].includes(mode)) throw new Error('Invalid background mode');
        if (mode === 'blur' && !('filter' in this.backgroundContext)) {
            throw new Error('Background blur is not supported by this browser');
        }
        if (mode !== 'off') {
            if (mode === 'image' && !image) throw new Error('Choose a background image first');
            await this.loadModel();
        }
        if (this.stopped) return;
        this.image = image;
        this.mode = mode;
    }

    loadModel() {
        if (!this.modelPromise) {
            this.modelPromise = (async () => {
                const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
                const { FilesetResolver, ImageSegmenter, DrawingUtils } = await import(`${base}/vision_bundle.mjs`);
                const files = await FilesetResolver.forVisionTasks(`${base}/wasm`);
                const segmenter = await ImageSegmenter.createFromOptions(files, {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite',
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
        const scale = this.mode === 'off' ? 1 : Math.min(1, 1280 / this.video.videoWidth, 720 / this.video.videoHeight);
        const width = Math.max(1, Math.round(this.video.videoWidth * scale));
        const height = Math.max(1, Math.round(this.video.videoHeight * scale));
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
                    if (this.mode === 'blur') {
                        background.filter = 'blur(12px)';
                        background.drawImage(this.video, -24, -24, width + 48, height + 48);
                        background.filter = 'none';
                    } else {
                        const scale = Math.max(width / this.image.naturalWidth, height / this.image.naturalHeight);
                        const imageWidth = this.image.naturalWidth * scale;
                        const imageHeight = this.image.naturalHeight * scale;
                        background.drawImage(
                            this.image,
                            (width - imageWidth) / 2,
                            (height - imageHeight) / 2,
                            imageWidth,
                            imageHeight
                        );
                    }
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
        this.outputTrack?.stop();
        if (stopCamera) this.cameraTrack?.stop();
        this.video.pause();
        this.video.srcObject = null;
        this.video.remove();
        this.drawing?.close();
        this.segmenter?.close();
    }
}
