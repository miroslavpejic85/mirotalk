'use strict';

/**
 * Camera auto framing ("keep me centered"), shared by the page (background-effects.js) and the module
 * worker (background-effects-worker.js). DOM-free.
 *
 * From the detected faces, AutoFramer picks a crop of the camera frame with the same aspect ratio (so
 * the output size does not change) that keeps the person, or everyone in view, centered with a
 * head-and-shoulders zoom. Everything is in normalized frame units (0..1):
 *
 * - faces are remembered for a short while, so a missed detection does not make the frame jump
 * - several people: the crop grows to keep every face inside it
 * - a dead zone keeps the frame still while people only move a little
 * - moves are eased with a critically damped spring (no overshoot, no jumps, frame-rate independent)
 * - after nobody is seen for `holdMs` the frame slowly zooms back out to the whole camera
 */
(function (root) {
    const FULL_FRAME = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    // Unity-style SmoothDamp: critically damped spring towards target, stable for any time step
    function smoothDamp(current, target, velocity, smoothTime, dt) {
        const omega = 2 / Math.max(0.0001, smoothTime);
        const x = omega * dt;
        const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = current - target;
        const temp = (velocity + omega * change) * dt;
        return {
            value: target + (change + temp) * decay,
            velocity: (velocity - omega * temp) * decay,
        };
    }

    function isMobile() {
        if (typeof navigator === 'undefined') return false;
        if (typeof navigator.userAgentData?.mobile === 'boolean') return navigator.userAgentData.mobile;
        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    }

    function isFullFrame(crop) {
        return !crop || (crop.width >= 0.9999 && crop.height >= 0.9999);
    }

    /**
     * MediaPipe Face Detector result -> faces in normalized units of the analysed image:
     * [{ x, y, width, height }] (top-left corner and size of each face box).
     */
    function normalizeDetections(result, imageWidth, imageHeight, minScore = 0.5) {
        const faces = [];
        if (!(imageWidth > 0) || !(imageHeight > 0)) return faces;
        for (const detection of result?.detections || []) {
            const box = detection.boundingBox;
            const score = detection.categories?.[0]?.score ?? 1;
            if (!box || score < minScore || !(box.width > 0) || !(box.height > 0)) continue;
            faces.push({
                x: box.originX / imageWidth,
                y: box.originY / imageHeight,
                width: box.width / imageWidth,
                height: box.height / imageHeight,
            });
        }
        return faces;
    }

    // Draws `crop` (normalized) of the source onto the whole canvas
    function drawCrop(ctx, source, sourceWidth, sourceHeight, crop, width, height) {
        ctx.drawImage(
            source,
            crop.x * sourceWidth,
            crop.y * sourceHeight,
            crop.width * sourceWidth,
            crop.height * sourceHeight,
            0,
            0,
            width,
            height
        );
    }

    class AutoFramer {
        constructor(options = {}) {
            this.options = {
                // Face box height as a fraction of the crop's short side (head and shoulders)
                faceSize: 0.28,
                // Vertical position of the faces' center in the crop (0 top, 1 bottom): headroom above
                faceY: 0.42,
                // Space kept around a group, in face sizes
                groupMarginX: 0.9,
                groupMarginY: 1.3,
                // Never crop more than this, to keep enough resolution
                maxZoom: isMobile() ? 1.6 : 2,
                // Re-frame only when the faces leave this zone (fraction of the crop size)
                deadZoneX: 0.1,
                deadZoneY: 0.08,
                deadZoneZoom: 0.15,
                panSeconds: 0.45,
                zoomSeconds: 0.7,
                // A face missing from the detections is kept this long
                faceMemoryMs: 800,
                // Keep the frame this long after everyone is gone, then zoom out
                holdMs: 1500,
                resetSeconds: 1.2,
                ...options,
            };
            this.reset();
        }

        reset() {
            this.faces = [];
            this.current = { cx: 0.5, cy: 0.5, size: 1 };
            this.velocity = { cx: 0, cy: 0, size: 0 };
            this.goal = null;
            this.lastTime = null;
            this.lastSeen = null;
            this.aspect = null;
        }

        // New detection result (normalized face boxes, possibly empty) for the frame analysed at `now`
        observe(faces, now) {
            const next = [];
            for (const face of faces || []) {
                const cx = face.x + face.width / 2;
                const cy = face.y + face.height / 2;
                const reach = Math.max(face.width, face.height);
                // Same person as a remembered face: follow it, otherwise a new face
                const match = this.faces.find(
                    (known) => !next.includes(known) && Math.hypot(known.cx - cx, known.cy - cy) < reach
                );
                const tracked = match || {};
                Object.assign(tracked, { cx, cy, width: face.width, height: face.height, seenAt: now });
                next.push(tracked);
            }
            // Briefly missed faces stay, so one dropped detection does not re-frame
            for (const known of this.faces) {
                if (!next.includes(known) && now - known.seenAt <= this.options.faceMemoryMs) next.push(known);
            }
            this.faces = next;
            if (faces?.length) this.lastSeen = now;
        }

        // The crop wanted for the remembered faces: zoom limited to maxZoom, kept inside the frame
        desired(width, height) {
            const o = this.options;
            let left = Infinity;
            let top = Infinity;
            let right = -Infinity;
            let bottom = -Infinity;
            let faceHeight = 0;
            let faceWidth = 0;
            for (const face of this.faces) {
                left = Math.min(left, face.cx - face.width / 2);
                right = Math.max(right, face.cx + face.width / 2);
                top = Math.min(top, face.cy - face.height / 2);
                bottom = Math.max(bottom, face.cy + face.height / 2);
                faceHeight = Math.max(faceHeight, face.height);
                faceWidth = Math.max(faceWidth, face.width);
            }
            const shortSide = Math.min(width, height);
            // One person: head and shoulders. A group: every face with some room around it.
            const portrait = (faceHeight * height) / shortSide / o.faceSize;
            const groupX = right - left + 2 * o.groupMarginX * faceWidth;
            const groupY = bottom - top + 2 * o.groupMarginY * faceHeight;
            const size = clamp(Math.max(portrait, groupX, groupY), 1 / o.maxZoom, 1);
            const cx = (left + right) / 2;
            const cy = (top + bottom) / 2 + (0.5 - o.faceY) * size;
            return this.constrain({ cx, cy, size });
        }

        constrain(frame) {
            const half = frame.size / 2;
            return {
                size: frame.size,
                cx: clamp(frame.cx, half, 1 - half),
                cy: clamp(frame.cy, half, 1 - half),
            };
        }

        /**
         * Advance the framing for the frame rendered at `now` (frame of width x height pixels) and
         * return the crop { x, y, width, height } in normalized frame units.
         */
        update(width, height, now) {
            const o = this.options;
            const aspect = width / height;
            if (this.aspect !== null && Math.abs(aspect - this.aspect) > 1e-3) this.reset();
            this.aspect = aspect;
            const dt = this.lastTime === null ? 0 : clamp((now - this.lastTime) / 1000, 0, 0.25);
            this.lastTime = now;
            this.faces = this.faces.filter((face) => now - face.seenAt <= o.faceMemoryMs);

            if (this.faces.length) {
                const wanted = this.desired(width, height);
                const goal = this.goal;
                if (
                    !goal ||
                    Math.abs(wanted.cx - goal.cx) > o.deadZoneX * goal.size ||
                    Math.abs(wanted.cy - goal.cy) > o.deadZoneY * goal.size ||
                    Math.abs(wanted.size - goal.size) > o.deadZoneZoom * goal.size
                ) {
                    this.goal = wanted;
                }
            } else if (this.goal && (this.lastSeen === null || now - this.lastSeen > o.holdMs)) {
                // Nobody in view: back to the whole camera
                this.goal = null;
            }

            const goal = this.goal || { cx: 0.5, cy: 0.5, size: 1 };
            if (dt > 0) {
                // Zooming back out to the whole camera is slower and pans with the zoom
                const pan = this.goal ? o.panSeconds : o.resetSeconds;
                const zoom = this.goal ? o.zoomSeconds : o.resetSeconds;
                for (const [key, time] of [
                    ['cx', pan],
                    ['cy', pan],
                    ['size', zoom],
                ]) {
                    const step = smoothDamp(this.current[key], goal[key], this.velocity[key], time, dt);
                    // Sub-pixel from the goal: land exactly on it (a still frame stays perfectly still)
                    const settled = Math.abs(step.value - goal[key]) < 5e-4 && Math.abs(step.velocity) < 5e-3;
                    this.current[key] = settled ? goal[key] : step.value;
                    this.velocity[key] = settled ? 0 : step.velocity;
                }
            }
            this.current.size = clamp(this.current.size, 1 / o.maxZoom, 1);
            this.current = this.constrain(this.current);
            return this.getCrop();
        }

        getCrop() {
            const { cx, cy, size } = this.current;
            if (size >= 0.9999) return FULL_FRAME;
            return { x: cx - size / 2, y: cy - size / 2, width: size, height: size };
        }
    }

    root.BackgroundFraming = Object.freeze({
        AutoFramer,
        FULL_FRAME,
        isFullFrame,
        normalizeDetections,
        drawCrop,
        smoothDamp,
    });
})(typeof globalThis !== 'undefined' ? globalThis : self);
