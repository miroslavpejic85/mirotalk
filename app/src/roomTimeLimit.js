'use strict';

// Room-wide time limit (duration=HH:MM:SS), shared by all peers of a room.
// Started by the first presenter who joins with a duration, it can't be changed later.

// Time given to clients to show the "time limit reached" notice and leave before being disconnected
const GRACE_MS = 15000;

const limits = new Map(); // room_id -> { durationMs, endsAt, reached, timer, graceTimer }

/**
 * @param {*} duration HH:MM:SS
 * @returns {number} milliseconds, 0 if not a valid duration
 */
function parseDuration(duration) {
    if (typeof duration !== 'string') return 0;
    const match = duration.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return 0;
    const [hours, minutes, seconds] = match.slice(1).map(Number);
    if (minutes > 59 || seconds > 59) return 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Start the room time limit, first one wins
 * @param {string} roomId
 * @param {string} duration HH:MM:SS
 * @param {object} handlers { onReached, onGraceEnd }
 * @returns {boolean} true if the limit has been started
 */
function start(roomId, duration, { onReached, onGraceEnd } = {}) {
    if (limits.has(roomId)) return false;

    const durationMs = parseDuration(duration);
    if (!durationMs) return false;

    const limit = {
        durationMs,
        endsAt: Date.now() + durationMs,
        reached: false,
        timer: null,
        graceTimer: null,
    };

    limit.timer = setTimeout(() => {
        limit.reached = true;
        limit.timer = null;
        if (typeof onReached === 'function') onReached();

        // Clients leave on their own, disconnect anyone still connected once the grace period is over
        limit.graceTimer = setTimeout(() => {
            limit.graceTimer = null;
            if (typeof onGraceEnd === 'function') onGraceEnd();
        }, GRACE_MS);
    }, durationMs);

    limits.set(roomId, limit);
    return true;
}

/**
 * @param {string} roomId
 * @returns {object|null} { durationMs, remainingMs, reached }
 */
function get(roomId) {
    const limit = limits.get(roomId);
    if (!limit) return null;
    const { durationMs, endsAt, reached } = limit;
    return {
        durationMs,
        remainingMs: reached ? 0 : Math.max(0, endsAt - Date.now()),
        reached,
    };
}

function isReached(roomId) {
    return Boolean(limits.get(roomId)?.reached);
}

function clear(roomId) {
    const limit = limits.get(roomId);
    if (!limit) return;
    clearTimeout(limit.timer);
    clearTimeout(limit.graceTimer);
    limits.delete(roomId);
}

function reset() {
    for (const roomId of [...limits.keys()]) clear(roomId);
}

module.exports = {
    GRACE_MS,
    parseDuration,
    start,
    get,
    isReached,
    clear,
    reset,
};
