'use strict';

const crypto = require('crypto');

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // failures are counted within this window, also the lockout duration

const attempts = new Map(); // `${ip}|${room}` -> { count, first, blockedUntil }

function keyOf(ip, roomId) {
    return `${ip}|${roomId}`;
}

function prune(now) {
    for (const [key, entry] of attempts) {
        if (now - entry.first > WINDOW_MS && entry.blockedUntil <= now) attempts.delete(key);
    }
}

const pruneTimer = setInterval(() => prune(Date.now()), 5 * 60 * 1000);
if (pruneTimer.unref) pruneTimer.unref();

/**
 * Constant-time password comparison.
 * @param {*} provided
 * @param {*} stored
 * @returns {boolean}
 */
function passwordMatches(provided, stored) {
    const a = provided == null;
    const b = stored == null;
    if (a || b) return a && b;
    const ha = crypto.createHash('sha256').update(String(provided)).digest();
    const hb = crypto.createHash('sha256').update(String(stored)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

/**
 * @returns {boolean} true while this ip is locked out of guessing this room's password
 */
function isBlocked(ip, roomId, now = Date.now()) {
    const entry = attempts.get(keyOf(ip, roomId));
    return !!entry && entry.blockedUntil > now;
}

function recordFailure(ip, roomId, now = Date.now()) {
    const key = keyOf(ip, roomId);
    let entry = attempts.get(key);
    if (!entry || now - entry.first > WINDOW_MS) {
        entry = { count: 0, first: now, blockedUntil: 0 };
        attempts.set(key, entry);
    }
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) entry.blockedUntil = now + WINDOW_MS;
}

function recordSuccess(ip, roomId) {
    attempts.delete(keyOf(ip, roomId));
}

function reset() {
    attempts.clear();
}

module.exports = {
    MAX_FAILED_ATTEMPTS,
    WINDOW_MS,
    passwordMatches,
    isBlocked,
    recordFailure,
    recordSuccess,
    reset,
};
