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

    // console.log('videoMediaContainer.childElementCount:', {
    //     isOneVideoElement: isOneVideoElement,
    //     children: videoMediaContainer.childElementCount,
    //     optional: optional,
    // });

    resetZoom(); //...

    let bigWidth = Width * 4;
    if (isOneVideoElement) {
        Width = Width - bigWidth;
    }

    // Optimized: binary search for best tile size
    let low = 1;
    let high = Math.min(Width, Height);
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
    setWidth(Tiles, max, bigWidth, Margin, Height, isOneVideoElement);

    // When alone, use fixed avatar size; otherwise proportional to tile
    const avatarSize = isOneVideoElement ? Math.min(200, Math.max(120, Height * 0.25)) : max / 3;
    setSP('--vmi-wh', avatarSize + 'px');
}

/**
 * Reset zoom to avoid incorrect UI on screen resize
 */
function resetZoom() {
    const videoElements = getSlALL('video');
    videoElements.forEach((video) => {
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
