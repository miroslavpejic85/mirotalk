'use strict';

const config = require('../config');

/**
 * Embed (iframe) restrictions.
 *
 * Controls which origins may embed MiroTalk P2P in an <iframe> via CSP
 * `frame-ancestors` (and `X-Frame-Options` for legacy browsers).
 * Configured via ALLOWED_EMBED_ORIGINS env var. See config.server.embed.
 */
const embedAllowedOrigins = Array.isArray(config?.server?.embed?.allowedOrigins)
    ? config.server.embed.allowedOrigins
    : [];

function buildEmbedCsp(origins) {
    if (!origins || origins.length === 0) {
        // Allow embedding from anywhere (default, no header set)
        return null;
    }
    // Single-token shortcuts
    if (origins.length === 1) {
        const single = origins[0].toLowerCase();
        if (single === 'none' || single === "'none'") {
            return { csp: "frame-ancestors 'none'", xfo: 'DENY' };
        }
        if (single === 'self' || single === "'self'") {
            return { csp: "frame-ancestors 'self'", xfo: 'SAMEORIGIN' };
        }
    }
    // Build allow-list; always include 'self' implicitly so the app's own
    // pages can still iframe themselves (share popups, etc.)
    const sources = ["'self'"];
    for (const o of origins) {
        const v = o.trim();
        if (!v) continue;
        if (v.toLowerCase() === 'self' || v === "'self'") continue;
        if (v.toLowerCase() === 'none' || v === "'none'") continue;
        sources.push(v);
    }
    // X-Frame-Options cannot express multiple origins; omit it to avoid
    // contradicting the CSP (modern browsers prefer CSP anyway).
    return { csp: `frame-ancestors ${sources.join(' ')}`, xfo: null };
}

const embedCsp = buildEmbedCsp(embedAllowedOrigins);

const applyEmbedHeaders = (req, res, next) => {
    if (embedCsp) {
        // Merge with any existing CSP header set earlier in the chain
        const existing = res.getHeader('Content-Security-Policy');
        const merged = existing ? `${existing}; ${embedCsp.csp}` : embedCsp.csp;
        res.setHeader('Content-Security-Policy', merged);
        if (embedCsp.xfo) {
            res.setHeader('X-Frame-Options', embedCsp.xfo);
        }
    }
    next();
};

module.exports = {
    applyEmbedHeaders,
    buildEmbedCsp,
    embedAllowedOrigins,
    embedCsp,
};
