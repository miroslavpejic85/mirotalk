'use strict';

/**
 * Camera background compositing shared by the page (background-effects.js) and the module worker
 * (background-effects-worker.js). DOM-free: works on HTMLCanvasElement and OffscreenCanvas.
 */
(function (root) {
    const BLUR_RADIUS = 12;
    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 720;

    function createCanvas(width, height) {
        if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // Effect output size: the camera size, capped at 1280x720
    function fitSize(width, height) {
        const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
        return {
            width: Math.max(1, Math.round(width * scale)),
            height: Math.max(1, Math.round(height * scale)),
        };
    }

    // Scale and center-crop the source to fill the frame without distorting it (CSS object-fit: cover)
    function drawCover(ctx, source, width, height) {
        const sourceWidth = source.naturalWidth || source.videoWidth || source.displayWidth || source.width;
        const sourceHeight = source.naturalHeight || source.videoHeight || source.displayHeight || source.height;
        if (!sourceWidth || !sourceHeight) {
            ctx.drawImage(source, 0, 0, width, height);
            return;
        }
        const scale = Math.max(width / sourceWidth, height / sourceHeight);
        const cropWidth = width / scale;
        const cropHeight = height / scale;
        ctx.drawImage(
            source,
            (sourceWidth - cropWidth) / 2,
            (sourceHeight - cropHeight) / 2,
            cropWidth,
            cropHeight,
            0,
            0,
            width,
            height
        );
    }

    // Defaults for createMaskStabilizer, in person-confidence units [0, 1]
    const MASK_STABILIZER_DEFAULTS = Object.freeze({
        // Change below tLo counts as model jitter, above tHi as real motion
        tLo: 0.03,
        tHi: 0.15,
        // Minimum weight of the new mask, bounds the lag of static regions
        leak: 0.3,
        // Decay of the per-pixel motion envelope: keeps following a moving edge for a few masks
        release: 0.8,
        // Smoothstep remap that narrows the soft band MediaPipe leaves around the person. Off for the
        // WebGL compositor, whose bilateral filter needs the soft band and applies its own coverage.
        edgeCurve: true,
        edgeLow: 0.15,
        edgeHigh: 0.85,
    });

    // Temporal stabilizer for segmentation masks (after Longpipe's flow-gated stabilizer, MIT, with the
    // per-pixel mask change as the motion signal since there is no optical flow here):
    //   env = max(|mask - prev|, release * envPrev)
    //   g   = max(clamp((env - tLo) / (tHi - tLo), 0, 1), leak)
    //   out = prev + g * (mask - prev)
    // Static edges are averaged over a few masks (no flicker), moving edges follow the new mask at once.
    // With edgeCurve, the result is then remapped with smoothstep(edgeLow, edgeHigh) for a tighter edge.
    function createMaskStabilizer(options = {}) {
        const { tLo, tHi, leak, release, edgeCurve, edgeLow, edgeHigh } = {
            ...MASK_STABILIZER_DEFAULTS,
            ...options,
        };
        const gateRange = Math.max(tHi - tLo, 1e-3);
        const edgeRange = Math.max(edgeHigh - edgeLow, 1e-3);
        let state = null;
        let envelope = null;
        let output = null;

        const stabilize = (confidence) => {
            const length = confidence.length;
            if (!state || state.length !== length) {
                state = Float32Array.from(confidence);
                envelope = new Float32Array(length);
                output = new Float32Array(length);
            } else {
                for (let i = 0; i < length; i++) {
                    const previous = state[i];
                    const delta = confidence[i] - previous;
                    const env = Math.max(Math.abs(delta), release * envelope[i]);
                    envelope[i] = env;
                    const gate = Math.max(Math.min(Math.max((env - tLo) / gateRange, 0), 1), leak);
                    state[i] = previous + gate * delta;
                }
            }
            if (!edgeCurve) return state;
            for (let i = 0; i < length; i++) {
                const t = Math.min(Math.max((state[i] - edgeLow) / edgeRange, 0), 1);
                output[i] = t * t * (3 - 2 * t);
            }
            return output;
        };
        stabilize.reset = () => {
            state = null;
            envelope = null;
            output = null;
        };
        return stabilize;
    }

    // Three box blur passes approximate a Gaussian blur without canvas filters (Safari).
    // Blurs pixels in place; scratch (same length) is reused across frames by the caller.
    function boxBlurPixels(pixels, width, height, radius, scratch = new Uint8ClampedArray(pixels.length)) {
        const divisor = radius * 2 + 1;
        const boxBlur = (source, blurred, horizontal) => {
            const outerLength = horizontal ? height : width;
            const innerLength = horizontal ? width : height;
            const indexOf = (outer, inner) => (horizontal ? outer * width + inner : inner * width + outer) * 4;
            for (let outer = 0; outer < outerLength; outer++) {
                let red = 0;
                let green = 0;
                let blue = 0;
                for (let offset = -radius; offset <= radius; offset++) {
                    const index = indexOf(outer, Math.min(innerLength - 1, Math.max(0, offset)));
                    red += source[index];
                    green += source[index + 1];
                    blue += source[index + 2];
                }
                for (let inner = 0; inner < innerLength; inner++) {
                    const index = indexOf(outer, inner);
                    blurred[index] = Math.round(red / divisor);
                    blurred[index + 1] = Math.round(green / divisor);
                    blurred[index + 2] = Math.round(blue / divisor);
                    blurred[index + 3] = source[index + 3];
                    const removeIndex = indexOf(outer, Math.max(0, inner - radius));
                    const addIndex = indexOf(outer, Math.min(innerLength - 1, inner + radius + 1));
                    red += source[addIndex] - source[removeIndex];
                    green += source[addIndex + 1] - source[removeIndex + 1];
                    blue += source[addIndex + 2] - source[removeIndex + 2];
                }
            }
        };
        for (let pass = 0; pass < 3; pass++) {
            boxBlur(pixels, scratch, true);
            boxBlur(scratch, pixels, false);
        }
        return pixels;
    }

    // Returns blur(ctx, frame, width, height): draws the blurred frame on ctx, reusing one small canvas
    function createBlur(newCanvas = createCanvas) {
        let canvas;
        let context;
        let readBack;
        let scratch;
        const getContext = (width, height, willReadFrequently) => {
            if (!canvas || readBack !== willReadFrequently) {
                canvas = newCanvas(width, height);
                context = canvas.getContext('2d', willReadFrequently ? { willReadFrequently: true } : undefined);
                if (!context) throw new Error('Unable to create a canvas context for background blur');
                readBack = willReadFrequently;
            }
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            context.clearRect(0, 0, width, height);
            context.imageSmoothingEnabled = true;
            return context;
        };
        const blur = (ctx, frame, width, height) => {
            if ('filter' in ctx) {
                // Blur a quarter-size copy: the same look once upscaled, a fraction of the cost.
                // The frame is drawn slightly larger so the blur does not fade in from the edges.
                const scale = 4;
                const smallWidth = Math.max(1, Math.round(width / scale));
                const smallHeight = Math.max(1, Math.round(height / scale));
                const overscan = (BLUR_RADIUS * 2) / scale;
                const small = getContext(smallWidth, smallHeight, false);
                small.filter = `blur(${BLUR_RADIUS / scale}px)`;
                small.drawImage(frame, -overscan, -overscan, smallWidth + overscan * 2, smallHeight + overscan * 2);
                small.filter = 'none';
            } else {
                const scale = 8;
                const smallWidth = Math.max(1, Math.round(width / scale));
                const smallHeight = Math.max(1, Math.round(height / scale));
                const small = getContext(smallWidth, smallHeight, true);
                small.drawImage(frame, 0, 0, smallWidth, smallHeight);
                const imageData = small.getImageData(0, 0, smallWidth, smallHeight);
                if (scratch?.length !== imageData.data.length) scratch = new Uint8ClampedArray(imageData.data.length);
                const radius = Math.max(1, Math.round(BLUR_RADIUS / scale));
                boxBlurPixels(imageData.data, smallWidth, smallHeight, radius, scratch);
                small.putImageData(imageData, 0, 0);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(canvas, 0, 0, width, height);
        };
        blur.canvas = () => canvas;
        blur.scratch = () => scratch;
        return blur;
    }

    root.BackgroundCompositor = Object.freeze({
        BLUR_RADIUS,
        createCanvas,
        fitSize,
        drawCover,
        MASK_STABILIZER_DEFAULTS,
        createMaskStabilizer,
        boxBlurPixels,
        createBlur,
    });
})(typeof globalThis !== 'undefined' ? globalThis : self);
