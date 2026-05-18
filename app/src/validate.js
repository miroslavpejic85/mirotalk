'use strict';

const path = require('path');

const checkXSS = require('./xss.js');

function isValidRoomName(input) {
    if (!input || typeof input !== 'string') {
        return false;
    }
    const room = checkXSS(input);
    return !room ? false : !hasPathTraversal(room);
}

function hasPathTraversal(input) {
    if (!input || typeof input !== 'string') {
        return false;
    }

    let decodedInput = input;
    try {
        decodedInput = decodeURIComponent(input);
        decodedInput = decodeURIComponent(decodedInput);
    } catch (err) {}

    const pathTraversalPattern = /(\.\.(\/|\\))+/;
    const excessiveDotsPattern = /(\.{4,}\/+|\.{4,}\\+)/;
    const complexTraversalPattern = /(\.{2,}(\/+|\\+))/;

    if (complexTraversalPattern.test(decodedInput)) {
        return true;
    }

    const normalizedPath = path.normalize(decodedInput);

    if (pathTraversalPattern.test(normalizedPath) || excessiveDotsPattern.test(normalizedPath)) {
        return true;
    }

    return false;
}

function isValidData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    return Object.keys(data).length > 0;
}

/**
 * Block private / loopback / link-local / unspecified hosts.
 * Note: does NOT do DNS resolution, so a public domain that resolves to
 * an internal IP (DNS rebinding) is not caught here — defending against
 * that on a signaling broadcast is out of scope.
 * @param {string} host  lowercased hostname (no brackets for IPv6)
 * @returns {boolean}
 */
function isPrivateOrLoopbackHost(host) {
    // IPv4
    const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
        const o = m.slice(1).map(Number);
        if (o.some((n) => n > 255)) return true; // malformed → treat as unsafe
        if (o[0] === 0) return true; // 0.0.0.0/8
        if (o[0] === 10) return true; // 10/8
        if (o[0] === 127) return true; // loopback
        if (o[0] === 169 && o[1] === 254) return true; // link-local
        if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true; // 172.16/12
        if (o[0] === 192 && o[1] === 168) return true; // 192.168/16
        if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true; // CGNAT
        if (o[0] >= 224) return true; // multicast / reserved
        return false;
    }
    // IPv6 (rough — block the well-known unsafe ranges)
    if (host.includes(':')) {
        if (host === '::' || host === '::1') return true;
        if (host.startsWith('fe80:') || host.startsWith('fe80::')) return true; // link-local
        if (/^f[cd][0-9a-f]{2}:/.test(host)) return true; // ULA fc00::/7
        if (host.startsWith('ff')) return true; // multicast
        // IPv4-mapped: ::ffff:127.0.0.1
        const v4 = host.match(/:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (v4) return isPrivateOrLoopbackHost(v4[1]);
        return false;
    }
    return false;
}

/**
 * Decide whether a fabric image `src` is safe to broadcast.
 *  - accepts `data:image/<mime>;...`
 *  - accepts `http(s)://` to a public host (rejects loopback / private /
 *    link-local IPs and `localhost`)
 *  - rejects everything else
 * @param {string} src
 * @returns {boolean}
 */
function isSafeImageSrc(src) {
    if (typeof src !== 'string') return false;
    const trimmed = src.trim();
    if (!trimmed) return false;

    if (/^data:image\/[a-z0-9.+-]+[;,]/i.test(trimmed)) return true;

    let url;
    try {
        url = new URL(trimmed);
    } catch (e) {
        return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return false;
    if (host === 'localhost' || host.endsWith('.localhost')) return false;
    if (isPrivateOrLoopbackHost(host)) return false;
    return true;
}

/**
 * Sanitize a fabric.js canvas JSON payload broadcast via `wbCanvasToJson`.
 *
 * The whiteboard accepts `image` objects whose `src` is loaded by every
 * recipient's browser. An attacker could otherwise embed URLs like
 * `http://internal-host/...` or `https://attacker.com/log?victim=...` to
 * turn every peer into a tracking beacon / internal-network probe.
 *
 * Mutates `config` in place:
 *   - if `wbCanvasJson` is a string (legitimate clients send it stringified),
 *     parse → filter → re-stringify
 *   - if it's already an object, filter in place
 * Allowed image `src` schemes:
 *   - `data:image/...`               (uploaded files via FileReader)
 *   - `http(s)://<public-host>/...`  (image-from-URL feature)
 * Blocked: javascript:, file:, vbscript:, blob:, gopher:, etc. and any
 * http(s):// URL whose host is a loopback / private / link-local IP or
 * the literal `localhost`. Other object types (text, paths, ...) are
 * untouched.
 *
 * @param {object} config
 * @param {(msg: string, ctx?: object) => void} [onDrop]  optional callback when an image is dropped
 */
function sanitizeWbCanvasJson(config, onDrop) {
    if (!config || typeof config !== 'object') return;

    const raw = config.wbCanvasJson;
    if (!raw) return;

    let parsed = raw;
    let wasString = false;
    if (typeof raw === 'string') {
        wasString = true;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            // Not parseable JSON, leave untouched (validator would normally reject).
            return;
        }
    }

    if (!parsed || !Array.isArray(parsed.objects)) {
        if (wasString) config.wbCanvasJson = JSON.stringify(parsed);
        return;
    }

    parsed.objects = parsed.objects.filter((obj) => {
        if (!obj || typeof obj !== 'object') return true;
        const type = String(obj.type || '').toLowerCase();
        if (type !== 'image') return true;
        if (isSafeImageSrc(obj.src)) return true;
        if (typeof onDrop === 'function') {
            onDrop('wbCanvasToJson: dropped image object with unsafe src', { src: obj.src });
        }
        return false;
    });

    if (wasString) config.wbCanvasJson = JSON.stringify(parsed);
}

module.exports = {
    isValidRoomName,
    hasPathTraversal,
    isValidData,
    isSafeImageSrc,
    isPrivateOrLoopbackHost,
    sanitizeWbCanvasJson,
};
