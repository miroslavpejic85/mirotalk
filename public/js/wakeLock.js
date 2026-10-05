'use strict';

// https://developer.mozilla.org/en-US/docs/Web/API/WakeLock

let wakeLockSentinel = null;
let wakeLockRequestPending = false;
let wakeLockReleasePending = false;
let wakeLockGeneration = 0;
let wakeLockPageActive = true;
let userWantsKeepAwake = false;
let pendingManualWakeLockNotification = null;
let syncTimeout = null;

function isWakeLockSupported() {
    return !!navigator?.wakeLock?.request;
}

function isAudioOrUIActive() {
    return userWantsKeepAwake || (myAudioStatus && !myVideoStatus && !myScreenStatus);
}

function shouldKeepAwake() {
    return (
        !isDesktopDevice &&
        wakeLockPageActive &&
        isWakeLockSupported() &&
        document.visibilityState === 'visible' &&
        !document.pictureInPictureElement &&
        isAudioOrUIActive()
    );
}

async function requestWakeLock() {
    if (wakeLockSentinel || wakeLockRequestPending || wakeLockReleasePending || !shouldKeepAwake()) return;
    wakeLockRequestPending = true;
    const generation = wakeLockGeneration;
    try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel = sentinel;
        sentinel.addEventListener('release', () => {
            if (wakeLockSentinel !== sentinel) return;
            wakeLockSentinel = null;
            switchKeepAwake.checked = false;
            syncWakeLockDebounced();
        });
        if (generation !== wakeLockGeneration || !shouldKeepAwake() || sentinel.released) {
            await releaseWakeLock();
            return;
        }
        switchKeepAwake.checked = true;
        console.info('🟢 Wake Lock is active');
    } catch (err) {
        pendingManualWakeLockNotification = null;
        switchKeepAwake.checked = false;
        userLog('error', '🔴 Failed to request Wake Lock: ' + err.message, 'top-end');
    } finally {
        wakeLockRequestPending = false;
        notifyManualWakeLockChange();
        if (generation !== wakeLockGeneration && shouldKeepAwake()) syncWakeLockDebounced();
    }
}

async function releaseWakeLock() {
    if (isDesktopDevice) return;
    wakeLockGeneration++;
    const sentinel = wakeLockSentinel;
    if (wakeLockReleasePending) return;
    if (!sentinel) {
        switchKeepAwake.checked = false;
        return;
    }
    wakeLockReleasePending = true;
    try {
        await sentinel.release();
        if (wakeLockSentinel === sentinel) wakeLockSentinel = null;
        switchKeepAwake.checked = false;
        console.info('⚪ Wake Lock released');
    } catch (err) {
        console.error('Failed to release Wake Lock:', err);
        switchKeepAwake.checked = !!wakeLockSentinel && !wakeLockSentinel.released;
        if (pendingManualWakeLockNotification !== null) {
            pendingManualWakeLockNotification = null;
            userLog('error', 'Failed to release Wake Lock: ' + err.message);
        }
    } finally {
        wakeLockReleasePending = false;
        notifyManualWakeLockChange();
        if (!wakeLockSentinel && shouldKeepAwake()) syncWakeLockDebounced();
    }
}

function syncWakeLockDebounced() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(syncWakeLock, 50);
}

async function syncWakeLock() {
    shouldKeepAwake() ? await requestWakeLock() : await releaseWakeLock();
    notifyManualWakeLockChange();
}

function notifyManualWakeLockChange() {
    if (pendingManualWakeLockNotification === null || wakeLockRequestPending || wakeLockReleasePending) return;
    if (!wakeLockPageActive || document.visibilityState !== 'visible' || document.pictureInPictureElement) {
        pendingManualWakeLockNotification = null;
        return;
    }
    const active = !!wakeLockSentinel && !wakeLockSentinel.released;
    if (pendingManualWakeLockNotification && !active) return;
    const enabled = pendingManualWakeLockNotification;
    pendingManualWakeLockNotification = null;
    if (enabled) {
        userLog('success', 'Device wake lock is active', 'top-end', 1800);
    } else if (active) {
        userLog('info', 'Manual keep-awake disabled; audio-only wake lock remains active', 'top-end', 1800);
    } else {
        userLog('info', 'Device wake lock released', 'top-end', 1800);
    }
}

function applyKeepAwake(enabled, notify = false) {
    if (isDesktopDevice) return;
    userWantsKeepAwake = !!enabled;
    pendingManualWakeLockNotification = notify ? userWantsKeepAwake : null;
    syncWakeLockDebounced();
}

document.addEventListener('visibilitychange', syncWakeLockDebounced);

document.addEventListener('enterpictureinpicture', releaseWakeLock);
document.addEventListener('leavepictureinpicture', syncWakeLockDebounced);

window.addEventListener('pagehide', () => {
    wakeLockPageActive = false;
    pendingManualWakeLockNotification = null;
    clearTimeout(syncTimeout);
    releaseWakeLock();
});
window.addEventListener('pageshow', () => {
    wakeLockPageActive = true;
    syncWakeLockDebounced();
});
