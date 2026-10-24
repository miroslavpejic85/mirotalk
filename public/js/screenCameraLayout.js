'use strict';

/**
 * Screen share + camera layout.
 *
 * When a participant shares the screen while the camera is on, both tracks are already
 * received as separate tiles. This helper (viewer side only, no signaling involved) can
 * move the camera tile inside the screen tile, either as a draggable picture-in-picture
 * overlay ('pip') or side by side ('split'), and restore it to the grid ('separate').
 *
 * The layout is stored as a data attribute on the screen tile because the pin logic
 * resets the tile className.
 */
const ScreenCameraLayout = (() => {
    const MODES = ['separate', 'pip', 'split'];
    const OVERLAY_CLASS = 'screen-cam-overlay';
    const DRAGGING_CLASS = 'screen-cam-dragging';
    const CAMERA_CLASS = 'Camera';
    const DRAG_THRESHOLD = 4;

    let mode = 'separate';

    function normalizeMode(value) {
        return MODES.includes(value) ? value : 'separate';
    }

    function getMode() {
        return mode;
    }

    function setMode(value) {
        mode = normalizeMode(value);
        return mode;
    }

    function nextMode(current = mode) {
        return MODES[(MODES.indexOf(normalizeMode(current)) + 1) % MODES.length];
    }

    function isOverlaid(cameraWrap) {
        return !!cameraWrap && cameraWrap.classList.contains(OVERLAY_CLASS);
    }

    function clearPosition(cameraWrap) {
        cameraWrap.style.left = '';
        cameraWrap.style.top = '';
        cameraWrap.style.right = '';
        cameraWrap.style.bottom = '';
    }

    function hasOverlayChild(screenWrap) {
        return [...screenWrap.children].some((child) => isOverlaid(child));
    }

    function refreshHost(screenWrap) {
        if (!screenWrap) return false;
        const previous = screenWrap.dataset.camLayout;
        if (mode !== 'separate' && hasOverlayChild(screenWrap)) {
            screenWrap.dataset.camLayout = mode;
        } else {
            delete screenWrap.dataset.camLayout;
        }
        return previous !== screenWrap.dataset.camLayout;
    }

    function isEligible(cameraWrap, screenWrap, gridContainer) {
        if (mode === 'separate' || !cameraWrap || !screenWrap) return false;
        if (!cameraWrap.isConnected || !screenWrap.isConnected) return false;
        if (cameraWrap.style.display === 'none' || screenWrap.style.display === 'none') return false;
        // A camera pinned on its own (or anywhere outside the grid) is left where it is
        const parent = cameraWrap.parentElement;
        return parent === gridContainer || parent === screenWrap;
    }

    function attach(cameraWrap, screenWrap) {
        if (cameraWrap.parentElement === screenWrap && isOverlaid(cameraWrap)) return false;
        cameraWrap.className = OVERLAY_CLASS;
        clearPosition(cameraWrap);
        screenWrap.appendChild(cameraWrap);
        enableDrag(cameraWrap);
        return true;
    }

    function detach(cameraWrap, gridContainer) {
        if (!isOverlaid(cameraWrap) || !cameraWrap.isConnected || !gridContainer) return false;
        const host = cameraWrap.parentElement;
        cameraWrap.className = CAMERA_CLASS;
        clearPosition(cameraWrap);
        gridContainer.appendChild(cameraWrap);
        refreshHost(host);
        return true;
    }

    /**
     * Apply the current mode to every camera/screen pair.
     * @param {Array<{cameraWrap: HTMLElement, screenWrap: HTMLElement}>} pairs
     * @param {HTMLElement} gridContainer the video grid (videoMediaContainer)
     * @returns {boolean} true if any tile was moved or a screen tile layout changed
     */
    function sync(pairs, gridContainer) {
        let changed = false;
        for (const { cameraWrap, screenWrap } of pairs) {
            if (!cameraWrap) continue;
            const moved = isEligible(cameraWrap, screenWrap, gridContainer)
                ? attach(cameraWrap, screenWrap)
                : detach(cameraWrap, gridContainer);
            const relayout = refreshHost(screenWrap);
            changed = moved || relayout || changed;
        }
        return changed;
    }

    /**
     * Move any camera shown inside this screen tile back to the grid (call before removing the screen tile).
     * @param {HTMLElement} screenWrap
     * @param {HTMLElement} gridContainer
     * @returns {boolean} true if a camera was restored
     */
    function release(screenWrap, gridContainer) {
        if (!screenWrap) return false;
        let changed = false;
        [...screenWrap.children].filter(isOverlaid).forEach((cameraWrap) => {
            changed = detach(cameraWrap, gridContainer) || changed;
        });
        return refreshHost(screenWrap) || changed;
    }

    function suppressNextClick() {
        const stop = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };
        window.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
    }

    function enableDrag(cameraWrap) {
        if (cameraWrap.dataset.camDrag) return;
        cameraWrap.dataset.camDrag = 'true';

        let drag = null;

        const canDrag = () => {
            const host = cameraWrap.parentElement;
            return isOverlaid(cameraWrap) && host && host.dataset.camLayout === 'pip';
        };

        cameraWrap.addEventListener('pointerdown', (e) => {
            if (!canDrag() || (e.pointerType === 'mouse' && e.button !== 0)) return;
            drag = {
                pointerId: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                left: cameraWrap.offsetLeft,
                top: cameraWrap.offsetTop,
                moved: false,
            };
        });

        cameraWrap.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.pointerId) return;
            const dx = e.clientX - drag.x;
            const dy = e.clientY - drag.y;
            if (!drag.moved) {
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                drag.moved = true;
                cameraWrap.classList.add(DRAGGING_CLASS);
                try {
                    cameraWrap.setPointerCapture(drag.pointerId);
                } catch (_) {}
            }
            const host = cameraWrap.parentElement;
            if (!host || !host.clientWidth || !host.clientHeight) return;
            const maxLeft = Math.max(0, host.clientWidth - cameraWrap.offsetWidth);
            const maxTop = Math.max(0, host.clientHeight - cameraWrap.offsetHeight);
            const left = Math.min(Math.max(0, drag.left + dx), maxLeft);
            const top = Math.min(Math.max(0, drag.top + dy), maxTop);
            // Percentages keep the overlay in place when the tile is resized
            cameraWrap.style.left = (left * 100) / host.clientWidth + '%';
            cameraWrap.style.top = (top * 100) / host.clientHeight + '%';
            cameraWrap.style.right = 'auto';
            cameraWrap.style.bottom = 'auto';
            e.preventDefault();
        });

        const endDrag = (e) => {
            if (!drag || e.pointerId !== drag.pointerId) return;
            if (drag.moved) {
                cameraWrap.classList.remove(DRAGGING_CLASS);
                try {
                    cameraWrap.releasePointerCapture(drag.pointerId);
                } catch (_) {}
                // A drag must not trigger the video click action (full screen)
                if (e.type === 'pointerup') suppressNextClick();
            }
            drag = null;
        };

        cameraWrap.addEventListener('pointerup', endDrag);
        cameraWrap.addEventListener('pointercancel', endDrag);
    }

    return {
        MODES,
        OVERLAY_CLASS,
        normalizeMode,
        getMode,
        setMode,
        nextMode,
        isOverlaid,
        sync,
        release,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenCameraLayout;
}
