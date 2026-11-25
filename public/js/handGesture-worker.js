'use strict';

/**
 * MiroTalk P2P - Hand Gesture Detection Worker (module worker)
 *
 * Runs MediaPipe GestureRecognizer off the main thread so that model loading,
 * GPU shader compilation/warmup, and image classification never block or freeze
 * the main UI or video tracks.
 */

let recognizer = null;
let vision = null;

function installWasmLoaderImport() {
    self.import = async (url) => {
        const loader = await import(url);
        if (typeof loader?.default === 'function') self.ModuleFactory = loader.default;
        return loader;
    };
}

self.onmessage = async (event) => {
    const { type, id, config, bitmap } = event.data || {};

    if (type === 'init') {
        try {
            vision = await import(config.visionBundleUrl);
            installWasmLoaderImport();
            const fileset = await vision.FilesetResolver.forVisionTasks(config.wasmBaseUrl, true);
            recognizer = await vision.GestureRecognizer.createFromOptions(fileset, {
                baseOptions: {
                    modelAssetPath: config.modelUrl,
                    delegate: 'GPU',
                },
                runningMode: 'IMAGE',
                numHands: 1,
            });

            // Warm up recognizer on an offscreen canvas inside the worker to avoid freezing during the call
            try {
                if (typeof OffscreenCanvas !== 'undefined') {
                    const canvas = new OffscreenCanvas(160, 120);
                    recognizer.recognize(canvas);
                }
            } catch (wErr) {
                // Ignore warmup error
            }

            self.postMessage({ type: 'init_done', id });
        } catch (err) {
            self.postMessage({ type: 'init_error', id, error: err?.message || String(err) });
        }
    } else if (type === 'recognize') {
        if (!recognizer || !bitmap) {
            if (bitmap) bitmap.close();
            self.postMessage({ type: 'recognize_result', id, isOpenPalm: false, score: 0 });
            return;
        }

        try {
            const results = recognizer.recognize(bitmap);
            bitmap.close();

            let isOpenPalm = false;
            let score = 0;
            if (results?.gestures && results.gestures.length > 0) {
                for (const gestureList of results.gestures) {
                    const top = gestureList?.[0];
                    if (top && top.categoryName === 'Open_Palm' && top.score >= (config?.minConfidence || 0.5)) {
                        isOpenPalm = true;
                        score = top.score;
                        break;
                    }
                }
            }
            self.postMessage({ type: 'recognize_result', id, isOpenPalm, score });
        } catch (err) {
            if (bitmap) bitmap.close();
            self.postMessage({ type: 'recognize_result', id, isOpenPalm: false, score: 0 });
        }
    }
};
