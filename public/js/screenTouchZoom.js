'use strict';

/**
 * Touch gestures for a screen share tile (mobile viewers): pinch to zoom, drag to pan, double tap to zoom in/out.
 *
 * The transform is applied to the screen <video> only, the tile (overflow hidden) clips it.
 * The zoom resets whenever the tile width changes (rotation, participants joining/leaving); a height-only change
 * (buttons bar shown/hidden) keeps it.
 */
const ScreenTouchZoom = (() => {
    const MAX_SCALE = 6;
    const DOUBLE_TAP_SCALE = 2.5;
    const DOUBLE_TAP_MS = 300;
    const DOUBLE_TAP_DISTANCE = 30;
    const MOVE_THRESHOLD = 6;
    const CLICK_SWALLOW_MS = 400;
    const SNAP_BACK_SCALE = 1.05;
    const ZOOMED_ATTR = 'touchZoomed';

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Keep the zoomed content covering the whole tile
     * @param {{scale: number, x: number, y: number}} state
     * @param {number} width tile width
     * @param {number} height tile height
     */
    function clampState(state, width, height) {
        const scale = clamp(state.scale, 1, MAX_SCALE);
        if (scale === 1) return { scale: 1, x: 0, y: 0 };
        return {
            scale,
            x: clamp(state.x, width - width * scale, 0),
            y: clamp(state.y, height - height * scale, 0),
        };
    }

    /**
     * Zoom keeping the content point under (focalX, focalY) fixed
     */
    function zoomAt(state, focalX, focalY, nextScale, width, height) {
        const scale = clamp(nextScale, 1, MAX_SCALE);
        const k = scale / state.scale;
        return clampState(
            { scale, x: focalX - (focalX - state.x) * k, y: focalY - (focalY - state.y) * k },
            width,
            height
        );
    }

    function midpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function attach(wrap) {
        if (!wrap || wrap.dataset.touchZoom) return;
        wrap.dataset.touchZoom = 'true';
        wrap.style.touchAction = 'none';

        const pointers = new Map();
        let state = { scale: 1, x: 0, y: 0 };
        let gesture = null;
        let moved = false;
        let swallowUntil = 0;
        let lastTap = null;
        let size = null;

        const getVideo = () => wrap.querySelector(':scope > video');

        const apply = () => {
            const video = getVideo();
            if (!video) return;
            video.style.transition = 'none';
            video.style.transformOrigin = '0 0';
            if (state.scale === 1) {
                video.style.transform = '';
                delete video.dataset[ZOOMED_ATTR];
            } else {
                video.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
                video.dataset[ZOOMED_ATTR] = 'true';
            }
        };

        const reset = () => {
            state = { scale: 1, x: 0, y: 0 };
            apply();
        };

        const local = (e) => {
            const rect = wrap.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const update = (next) => {
            state = clampState(next, wrap.clientWidth, wrap.clientHeight);
            apply();
        };

        wrap.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' || e.target.closest('.screen-cam-overlay')) return;
            const point = local(e);
            pointers.set(e.pointerId, { ...point, startX: point.x, startY: point.y });
            if (pointers.size === 1) moved = false;
            if (pointers.size === 2) {
                const [a, b] = [...pointers.values()];
                gesture = { mid: midpoint(a, b), dist: distance(a, b) };
                moved = true;
            }
        });

        wrap.addEventListener('pointermove', (e) => {
            const pointer = pointers.get(e.pointerId);
            if (!pointer) return;
            const point = local(e);
            const dx = point.x - pointer.x;
            const dy = point.y - pointer.y;
            pointer.x = point.x;
            pointer.y = point.y;

            if (pointers.size === 2 && gesture) {
                const [a, b] = [...pointers.values()];
                const mid = midpoint(a, b);
                const dist = distance(a, b);
                if (!gesture.dist || !dist) return;
                const zoomed = zoomAt(
                    state,
                    gesture.mid.x,
                    gesture.mid.y,
                    (state.scale * dist) / gesture.dist,
                    wrap.clientWidth,
                    wrap.clientHeight
                );
                update({ ...zoomed, x: zoomed.x + (mid.x - gesture.mid.x), y: zoomed.y + (mid.y - gesture.mid.y) });
                gesture = { mid, dist };
                return;
            }

            if (pointers.size !== 1 || state.scale === 1) return;
            if (!moved && Math.hypot(point.x - pointer.startX, point.y - pointer.startY) < MOVE_THRESHOLD) return;
            moved = true;
            update({ ...state, x: state.x + dx, y: state.y + dy });
        });

        const end = (e) => {
            const pointer = pointers.get(e.pointerId);
            if (!pointer) return;
            pointers.delete(e.pointerId);
            gesture = null;
            if (pointers.size > 0) return;

            if (state.scale < SNAP_BACK_SCALE) reset();
            if (e.type !== 'pointerup') return;

            if (moved) {
                swallowUntil = Date.now() + CLICK_SWALLOW_MS;
                lastTap = null;
                return;
            }

            const now = Date.now();
            if (
                lastTap &&
                now - lastTap.time < DOUBLE_TAP_MS &&
                Math.hypot(pointer.x - lastTap.x, pointer.y - lastTap.y) < DOUBLE_TAP_DISTANCE
            ) {
                update(
                    state.scale > 1
                        ? { scale: 1, x: 0, y: 0 }
                        : zoomAt(state, pointer.x, pointer.y, DOUBLE_TAP_SCALE, wrap.clientWidth, wrap.clientHeight)
                );
                swallowUntil = now + CLICK_SWALLOW_MS;
                lastTap = null;
            } else {
                lastTap = { time: now, x: pointer.x, y: pointer.y };
            }
        };

        wrap.addEventListener('pointerup', end);
        wrap.addEventListener('pointercancel', end);

        // A pan/pinch/double tap must not toggle the video menu bar
        wrap.addEventListener(
            'click',
            (e) => {
                if (Date.now() >= swallowUntil) return;
                e.stopPropagation();
                e.preventDefault();
            },
            true
        );

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => {
                const width = wrap.clientWidth;
                const height = wrap.clientHeight;
                if (size && state.scale !== 1 && (size.width !== width || size.height !== height)) {
                    // Height-only change (buttons bar shown/hidden): keep the zoom, just keep it inside the tile
                    if (size.width === width) update(state);
                    else reset();
                }
                size = { width, height };
            }).observe(wrap);
        }
    }

    return { MAX_SCALE, clampState, zoomAt, attach };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenTouchZoom;
}
