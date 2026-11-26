'use strict';

/**
 * MiroTalk P2P - Installable app (PWA)
 *
 * Registers the service worker (/sw.js) so browsers offer "Install app" (desktop window,
 * dock / home screen icon). Loaded only when the PWA is enabled (config.brand.pwa.enabled).
 */

(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    // Embedded (iframe) meetings belong to the host site, not to an installable app
    if (window.self !== window.top) return;

    const register = () =>
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .catch((error) => console.warn('[PWA] Service worker registration failed', error));

    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register, { once: true });
    }
})();
