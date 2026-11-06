'use strict';

let customRatio = true;
let isHideALLVideosActive = false;

// aspect       0      1      2      3       4
let ratios = ['0:0', '4:3', '16:9', '1:1', '1:2'];
let aspect = 2;

let ratio = getAspectRatio();

/**
 * Get aspect ratio
 * @returns {integer} aspect ratio
 */
function getAspectRatio() {
    customRatio = aspect == 0 ? true : false;
    const ratio = ratios[aspect].split(':');
    return ratio[1] / ratio[0];
}

/**
 * Set aspect ratio
 * @param {integer} index ratios index
 */
function setAspectRatio(index) {
    aspect = index;
    ratio = getAspectRatio();
    resizeVideoMedia();
}

/**
 * Calculate area
 * @param {integer} Increment
 * @param {integer} Count
 * @param {integer} Width
 * @param {integer} Height
 * @param {integer} Margin
 * @returns
 */
function Area(Increment, Count, Width, Height, Margin = 10) {
    ratio = customRatio ? 0.75 : ratio;
    let i = 0;
    let w = 0;
    let h = Increment * ratio + Margin * 2;
    while (i < Count) {
        if (w + Increment > Width) {
            w = 0;
            h = h + Increment * ratio + Margin * 2;
        }
        w = w + Increment + Margin * 2;
        i++;
    }
    if (h > Height) return false;
    else return Increment;
}

/**
 * Resize video elements
 */
function resizeVideoMedia() {
    if (isHideALLVideosActive) return;

    const videoMediaContainer = getId('videoMediaContainer');
    // Include both Camera and Screen tiles in layout sizing
    const Cameras = getEcN('Camera');
    const Screens = getEcN('Screen');
    const Tiles = [...Cameras, ...Screens];

    const Margin = 5;
    let Width = videoMediaContainer.offsetWidth - Margin * 2;
    let Height = videoMediaContainer.offsetHeight - Margin * 2;
    let max = 0;
    let optional = isHideMeActive && videoMediaContainer.childElementCount <= 2 ? 1 : 0;
    let isOneVideoElement = videoMediaContainer.childElementCount - optional == 1 ? true : false;
    let isPinnedSingleVideo = isOneVideoElement && isVideoPinned;
    let expandSingleVideo = isOneVideoElement && !isPinnedSingleVideo;

    // console.log('videoMediaContainer.childElementCount:', {
    //     isOneVideoElement: isOneVideoElement,
    //     children: videoMediaContainer.childElementCount,
    //     optional: optional,
    // });

    resetZoom(); //...

    if (layoutScreenStage(videoMediaContainer, Margin)) {
        if (typeof VideoDrawingOverlay !== 'undefined') VideoDrawingOverlay.overlays.forEach((o) => o.resize());
        return;
    }

    let bigWidth = Width * 4;
    if (expandSingleVideo) {
        Width = Width - bigWidth;
    }

    // Optimized: binary search for best tile size
    let low = 1;
    let high = Math.min(Width, Height);
    if (isPinnedSingleVideo) {
        const tileRatio = customRatio ? 0.75 : ratio;
        high = Math.min(Width, Math.floor((Height - Margin * 2) / tileRatio));
    }
    let best = 1;
    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        let w = Area(mid, Tiles.length, Width, Height, Margin);
        if (w !== false) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    max = best - Margin * 2;
    setWidth(Tiles, max, bigWidth, Margin, Height, expandSingleVideo);

    // When alone, use fixed avatar size; otherwise proportional to tile
    const avatarSize = expandSingleVideo ? Math.min(200, Math.max(120, Height * 0.25)) : max / 3;
    setSP('--vmi-wh', avatarSize + 'px');
}

let layoutAnimationRaf = null;

/**
 * Mobile viewers: a screen share fills the stage and the other tiles become a small strip below it
 * (hidden in landscape, so the presentation gets the whole screen).
 * @param {HTMLElement} container videoMediaContainer
 * @param {integer} Margin tile margin
 * @returns {boolean} true if the stage layout was applied
 */
function layoutScreenStage(container, Margin) {
    const isMobile = typeof isMobileDevice !== 'undefined' && isMobileDevice;
    const Tiles = [...container.children].filter((c) => c.matches('.Camera, .Screen') && c.style.display !== 'none');
    const stage = isMobile ? Tiles.find((c) => c.classList.contains('Screen')) : null;

    if (!stage) {
        if (container.classList.contains('screen-stage')) {
            container.classList.remove('screen-stage', 'screen-stage-landscape');
            [...container.children].forEach((c) => c.removeAttribute('data-screen-stage'));
        }
        return false;
    }

    const Width = container.offsetWidth - Margin * 2;
    const Height = container.offsetHeight - Margin * 2;
    const others = Tiles.filter((c) => c !== stage);
    const landscape = Width > Height;
    const showStrip = !landscape && others.length > 0;

    container.classList.add('screen-stage');
    container.classList.toggle('screen-stage-landscape', landscape);
    [...container.children].forEach((c) => c.removeAttribute('data-screen-stage'));
    stage.dataset.screenStage = 'main';

    let thumbW = 0;
    let stripHeight = 0;
    if (showStrip) {
        const perRow = Math.max(1, Math.floor(Width / (90 + Margin * 2)));
        const rows = Math.min(2, Math.ceil(others.length / perRow));
        thumbW = Math.min(120, Math.floor(Width / Math.min(perRow, others.length)) - Margin * 2);
        const thumbH = Math.round(thumbW * 0.75);
        stripHeight = rows * (thumbH + Margin * 2);
        others.forEach((c) => {
            c.style.width = thumbW + 'px';
            c.style.height = thumbH + 'px';
            c.style.margin = Margin + 'px';
        });
    }

    stage.style.width = Width + 'px';
    stage.style.height = Math.max(0, Height - stripHeight) + 'px';
    stage.style.margin = Margin + 'px';

    setSP('--vmi-wh', Math.max(32, thumbW / 3) + 'px');
    return true;
}

/**
 * Check if the user asked the system to reduce motion
 * @returns {boolean}
 */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Smoothly re-layout the video grid while a side panel (chat, captions) is pinned/unpinned.
 * The CSS transition (see .layout-animating) glides the containers, and the tiles
 * are recomputed every frame so they always follow the container's current size.
 * Call it right BEFORE changing the containers' size, so the transition kicks in.
 * @param {integer} duration animation length in ms (keep in sync with .layout-animating in videoGrid.css)
 */
function animateVideoLayout(duration = 240) {
    if (prefersReducedMotion()) return;
    const root = document.documentElement;
    root.classList.add('layout-animating');
    cancelAnimationFrame(layoutAnimationRaf);
    const end = performance.now() + duration + 60;
    const step = (now) => {
        resizeVideoMedia();
        if (now < end) {
            layoutAnimationRaf = requestAnimationFrame(step);
        } else {
            root.classList.remove('layout-animating');
            resizeVideoMedia();
        }
    };
    layoutAnimationRaf = requestAnimationFrame(step);
}

/**
 * Reset zoom to avoid incorrect UI on screen resize
 */
function resetZoom() {
    const videoElements = getSlALL('video');
    videoElements.forEach((video) => {
        // Touch-zoomed screen share (screenTouchZoom.js) keeps its own transform
        if (video.dataset.touchZoomed) return;
        video.style.transform = '';
        video.style.transformOrigin = 'center';
    });
}

/**
 * Set Width
 * @param {object} Cameras
 * @param {integer} width
 * @param {integer} bigWidth
 * @param {integer} margin
 * @param {integer} maxHeight
 * @param {boolean} isOneVideoElement
 */
function setWidth(Tiles, width, bigWidth, margin, maxHeight, isOneVideoElement) {
    ratio = customRatio ? 0.68 : ratio;
    for (let s = 0; s < Tiles.length; s++) {
        Tiles[s].style.width = width + 'px';
        Tiles[s].style.margin = margin + 'px';
        Tiles[s].style.height = width * ratio + 'px';
        if (isOneVideoElement) {
            Tiles[s].style.width = bigWidth + 'px';
            Tiles[s].style.height = bigWidth * ratio + 'px';
            let camHeigh = Tiles[s].style.height.substring(0, Tiles[s].style.height.length - 2);
            if (camHeigh >= maxHeight) Tiles[s].style.height = maxHeight - 2 + 'px';
        }
    }
}

/**
 * Handle window event listener
 */
window.addEventListener(
    'load',
    function (event) {
        resizeVideoMedia();
        let resizeTimeout;
        window.addEventListener('resize', function () {
            if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
            resizeTimeout = requestAnimationFrame(function () {
                resizeVideoMedia();
            });
        });
    },
    false
);
