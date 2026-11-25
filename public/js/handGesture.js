'use strict';

/**
 * MiroTalk P2P - Hand Gesture Raise-Hand Detection
 *
 * Uses MediaPipe Tasks Vision GestureRecognizer to detect an Open_Palm
 * gesture held for 2 seconds, triggering raise/lower hand automatically.
 *
 * @link    GitHub: https://github.com/miroslavpejic85/mirotalk
 * @license Open source: AGPLv3
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.HandGesture = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    // Reuse BG_TASKS_VISION_VERSION from background-effects.js when available
    const tasksVisionVersion =
        typeof BG_TASKS_VISION_VERSION !== 'undefined' && BG_TASKS_VISION_VERSION ? BG_TASKS_VISION_VERSION : '1.2.0';

    const GESTURE_BASE_URL =
        typeof document !== 'undefined' && document.currentScript?.src
            ? new URL('.', document.currentScript.src).href
            : null;

    const DEFAULT_CONFIG = Object.freeze({
        holdDurationMs: 2000,
        sampleIntervalMs: 250,
        cooldownMs: 4000,
        minConfidence: 0.5,
        visionBundleUrl: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${tasksVisionVersion}/vision_bundle.mjs`,
        wasmBaseUrl: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${tasksVisionVersion}/wasm`,
        modelUrl:
            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        baseUrl: GESTURE_BASE_URL,
    });

    /**
     * Pure gesture state tracker (easy to test without webcam or GPU)
     */
    class GestureTracker {
        constructor(options = {}) {
            this.config = { ...DEFAULT_CONFIG, ...options };
            this.holdingSince = null;
            this.lastTriggerTime = -Infinity;
            this.progress = 0;
            this.triggered = false;
        }

        reset() {
            this.holdingSince = null;
            this.progress = 0;
            this.triggered = false;
        }

        /**
         * Update state based on whether an open palm was detected at `now`
         * @param {boolean} isOpenPalm
         * @param {number} now (timestamp in ms)
         * @returns {{ status: 'idle'|'holding'|'triggered'|'cooldown', progress: number }}
         */
        update(isOpenPalm, now = Date.now()) {
            if (now - this.lastTriggerTime < this.config.cooldownMs) {
                this.reset();
                return { status: 'cooldown', progress: 0 };
            }

            if (!isOpenPalm) {
                this.reset();
                return { status: 'idle', progress: 0 };
            }

            if (this.holdingSince === null) {
                this.holdingSince = now;
            }

            const elapsed = now - this.holdingSince;
            this.progress = Math.min(1.0, elapsed / this.config.holdDurationMs);

            if (elapsed >= this.config.holdDurationMs && !this.triggered) {
                this.triggered = true;
                this.lastTriggerTime = now;
                return { status: 'triggered', progress: 1.0 };
            }

            return { status: 'holding', progress: this.progress };
        }
    }

    /**
     * HandGestureManager coordinates video frame sampling, MediaPipe GestureRecognizer,
     * UI progress animation, and room action invocation.
     */
    class HandGestureManager {
        static isWorkerSupported(baseUrl = GESTURE_BASE_URL) {
            return Boolean(
                baseUrl &&
                typeof Worker !== 'undefined' &&
                typeof OffscreenCanvas !== 'undefined' &&
                typeof createImageBitmap === 'function'
            );
        }

        constructor(options = {}) {
            this.config = { ...DEFAULT_CONFIG, ...options };
            this.tracker = new GestureTracker(this.config);
            this.videoElement = null;
            this.progressElement = null;
            this.progressFillElement = null;
            this.recognizer = null;
            this.recognizerPromise = null;
            this.worker = null;
            this.workerReady = false;
            this.busy = false;
            this.enabled = false;
            this.running = false;
            this.runToken = 0;
            this.timerId = null;
            this.onTrigger = null;
            this.requestId = 0;
            this.pendingRequests = {};
            this.workerFailed = false;
            this.initGeneration = 0;
            this.cancelWorkerInit = null;
        }

        async initRecognizer() {
            if (this.workerReady || this.recognizer) return true;
            if (this.recognizerPromise) return this.recognizerPromise;

            // Bumped by dispose(): a load still in flight from before must not install its result
            const generation = this.initGeneration;
            const isStale = () => generation !== this.initGeneration;

            const promise = (async () => {
                if (!this.workerFailed && HandGestureManager.isWorkerSupported(this.config.baseUrl)) {
                    const workerUrl = new URL('handGesture-worker.js', this.config.baseUrl);
                    const worker = new Worker(workerUrl, { type: 'module' });
                    this.worker = worker;
                    try {
                        await new Promise((resolve, reject) => {
                            this.cancelWorkerInit = () => reject(new Error('disposed'));
                            const onInit = (e) => {
                                const data = e.data || {};
                                if (data.type === 'init_done') {
                                    resolve();
                                } else if (data.type === 'init_error') {
                                    reject(new Error(data.error));
                                }
                            };
                            worker.addEventListener('message', onInit, { once: true });
                            worker.addEventListener('error', (err) => reject(err), { once: true });
                            worker.postMessage({ type: 'init', config: this.config });
                        });
                        this.cancelWorkerInit = null;
                        if (isStale()) {
                            worker.terminate();
                            return false;
                        }

                        this.workerReady = true;
                        worker.onmessage = (event) => {
                            const { type, id, isOpenPalm } = event.data || {};
                            if (type === 'recognize_result' && this.pendingRequests[id]) {
                                const callback = this.pendingRequests[id];
                                delete this.pendingRequests[id];
                                callback(isOpenPalm);
                            }
                        };
                        worker.onerror = (err) => this.handleWorkerCrash(worker, err);
                        return true;
                    } catch (workerErr) {
                        this.cancelWorkerInit = null;
                        try {
                            worker.terminate();
                        } catch (_) {}
                        if (this.worker === worker) this.worker = null;
                        this.workerReady = false;
                        if (isStale()) return false;
                        console.warn('[HandGesture] Worker init failed, falling back to main thread:', workerErr);
                    }
                }

                // Main thread fallback
                const { FilesetResolver, GestureRecognizer } = await import(this.config.visionBundleUrl);
                const fileset = await FilesetResolver.forVisionTasks(this.config.wasmBaseUrl);
                const recognizer = await GestureRecognizer.createFromOptions(fileset, {
                    baseOptions: {
                        modelAssetPath: this.config.modelUrl,
                        delegate: 'GPU',
                    },
                    runningMode: 'IMAGE',
                    numHands: 1,
                });
                if (isStale()) {
                    recognizer.close?.();
                    return false;
                }
                this.recognizer = recognizer;

                // Warm up off the critical rendering path
                try {
                    if (typeof OffscreenCanvas !== 'undefined') {
                        const canvas = new OffscreenCanvas(160, 120);
                        this.recognizer.recognize(canvas);
                    } else if (typeof document !== 'undefined') {
                        const canvas = document.createElement('canvas');
                        canvas.width = 160;
                        canvas.height = 120;
                        this.recognizer.recognize(canvas);
                    }
                } catch (warmupErr) {
                    // Ignore warmup errors
                }

                return true;
            })().catch((err) => {
                if (isStale()) return false;
                if (this.recognizerPromise === promise) this.recognizerPromise = null;
                console.warn('[HandGesture] Could not load MediaPipe GestureRecognizer:', err.message || err);
                return false;
            });

            this.recognizerPromise = promise;
            return promise;
        }

        /**
         * The worker died after it was ready: drop it, unblock sampling, and reload on the main thread
         */
        handleWorkerCrash(worker, err) {
            if (this.worker !== worker) return;
            console.warn('[HandGesture] Worker crashed, falling back to main thread:', err?.message || err);
            try {
                worker.terminate();
            } catch (_) {}
            this.worker = null;
            this.workerReady = false;
            this.workerFailed = true;
            this.busy = false;
            this.pendingRequests = {};
            this.recognizerPromise = null;
            if (this.running && this.enabled) this.initRecognizer();
        }

        /**
         * Stop detection and release the worker / recognizer (and its model). start() loads it again.
         */
        dispose() {
            this.stop();
            this.initGeneration++;
            if (this.cancelWorkerInit) {
                this.cancelWorkerInit();
                this.cancelWorkerInit = null;
            }
            if (this.worker) {
                try {
                    this.worker.terminate();
                } catch (_) {}
                this.worker = null;
            }
            this.workerReady = false;
            if (this.recognizer) {
                try {
                    this.recognizer.close?.();
                } catch (_) {}
                this.recognizer = null;
            }
            this.recognizerPromise = null;
        }

        attachElements({ video, progressContainer, progressFill, onTrigger }) {
            this.videoElement = video;
            this.progressElement = progressContainer;
            this.progressFillElement = progressFill;
            if (onTrigger) this.onTrigger = onTrigger;
        }

        updateUI(progress, isHolding) {
            if (!this.progressElement) return;

            if (isHolding && progress > 0) {
                this.progressElement.removeAttribute('hidden');
                this.progressElement.classList.add('visible');
                if (this.progressFillElement) {
                    const offset = Math.max(0, 100 - progress * 100);
                    this.progressFillElement.style.setProperty('--gesture-progress', `${progress * 100}%`);
                    this.progressFillElement.style.strokeDashoffset = `${offset}`;
                }
            } else {
                this.progressElement.setAttribute('hidden', '');
                this.progressElement.classList.remove('visible');
                if (this.progressFillElement) {
                    this.progressFillElement.style.setProperty('--gesture-progress', '0%');
                    this.progressFillElement.style.strokeDashoffset = '100';
                }
            }
        }

        detectFrame(now = Date.now()) {
            if (!this.videoElement || this.videoElement.readyState < 2 || !this.recognizer) {
                return false;
            }

            try {
                const results = this.recognizer.recognize(this.videoElement);
                if (results?.gestures && results.gestures.length > 0) {
                    for (const gestureList of results.gestures) {
                        const top = gestureList?.[0];
                        if (top && top.categoryName === 'Open_Palm' && top.score >= this.config.minConfidence) {
                            return true;
                        }
                    }
                }
            } catch (err) {
                // Ignore transient frame read errors
            }
            return false;
        }

        tick(now = Date.now()) {
            if (!this.running || !this.enabled) return;
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }

            const currentToken = this.runToken;
            const handleResult = (isOpenPalm, timestamp = now) => {
                if (this.runToken !== currentToken || !this.running || !this.enabled) return;
                const result = this.tracker.update(isOpenPalm, timestamp);

                if (result.status === 'triggered') {
                    this.updateUI(1.0, true);
                    if (typeof this.onTrigger === 'function') {
                        this.onTrigger();
                    }
                    setTimeout(() => this.updateUI(0, false), 600);
                } else if (result.status === 'holding') {
                    this.updateUI(result.progress, true);
                } else {
                    this.updateUI(0, false);
                }
            };

            if (this.worker && this.workerReady) {
                if (!this.busy && this.videoElement && this.videoElement.readyState >= 2) {
                    const worker = this.worker;
                    this.busy = true;
                    createImageBitmap(this.videoElement)
                        .then((bitmap) => {
                            if (
                                this.runToken !== currentToken ||
                                !this.running ||
                                !this.enabled ||
                                this.worker !== worker
                            ) {
                                bitmap.close();
                                this.busy = false;
                                return;
                            }
                            const reqId = ++this.requestId;
                            this.pendingRequests[reqId] = (isOpenPalm) => {
                                this.busy = false;
                                handleResult(isOpenPalm, Date.now());
                            };
                            worker.postMessage({ type: 'recognize', id: reqId, bitmap, config: this.config }, [bitmap]);
                        })
                        .catch(() => {
                            this.busy = false;
                        });
                }
            } else {
                const isOpenPalm = this.detectFrame(now);
                handleResult(isOpenPalm, now);
            }

            if (this.running && this.enabled) {
                this.timerId = setTimeout(() => this.tick(), this.config.sampleIntervalMs);
            }
        }

        async start(videoElement) {
            if (videoElement) this.videoElement = videoElement;
            this.enabled = true;
            if (this.running) return;

            const token = ++this.runToken;
            this.running = true;
            this.tracker.reset();
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }

            await this.initRecognizer();
            if (this.runToken !== token || !this.running || !this.enabled) {
                return;
            }
            this.tick();
        }

        stop() {
            this.runToken++;
            this.enabled = false;
            this.running = false;
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            this.busy = false;
            this.pendingRequests = {};
            this.tracker.reset();
            this.updateUI(0, false);
        }
    }

    return {
        DEFAULT_CONFIG,
        GestureTracker,
        HandGestureManager,
    };
});
