'use strict';

// https://developer.mozilla.org/en-US/docs/Web/API/WakeLock

let wakeLockSentinel = null;
let userWantsKeepAwake = false;
let syncTimeout = null;

function isWakeLockSupported() {
    return !!navigator?.wakeLock?.request;
}

function isAudioOrUIActive() {
    return (myAudioStatus || userWantsKeepAwake) && !myVideoStatus && !myScreenStatus;
}

function shouldKeepAwake() {
    return (
        !isDesktopDevice &&
        isWakeLockSupported() &&
        document.visibilityState === 'visible' &&
        !document.pictureInPictureElement &&
        isAudioOrUIActive()
    );
}

async function requestWakeLock() {
    if (wakeLockSentinel || !shouldKeepAwake()) return;
    try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
            wakeLockSentinel = null;
            syncWakeLockDebounced();
        });
        switchKeepAwake.checked = true;
        userLog('toast', '🟢 Wake Lock is active');
    } catch (err) {
        wakeLockSentinel = null;
        switchKeepAwake.checked = false;
        userLog('toast', '🔴 Failed to request Wake Lock: ' + err.message);
    }
}

async function releaseWakeLock() {
    if (isDesktopDevice) return;
    try {
        await wakeLockSentinel?.release();
        userLog('toast', '⚪ Wake Lock released');
    } catch {}
    wakeLockSentinel = null;
    switchKeepAwake.checked = false;
}

function syncWakeLockDebounced() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(syncWakeLock, 50);
}

async function syncWakeLock() {
    shouldKeepAwake() ? await requestWakeLock() : await releaseWakeLock();
}

function applyKeepAwake(enabled) {
    if (isDesktopDevice) return;
    userWantsKeepAwake = !!enabled;
    syncWakeLockDebounced();
}

document.addEventListener('visibilitychange', syncWakeLockDebounced);

document.addEventListener('enterpictureinpicture', releaseWakeLock);
document.addEventListener('leavepictureinpicture', syncWakeLockDebounced);

window.addEventListener('pagehide', releaseWakeLock);
