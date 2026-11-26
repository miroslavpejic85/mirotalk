'use strict';

/**
 * MiroTalk P2P - Service Worker (installable app / PWA)
 *
 * Kept intentionally small: every request goes straight to the network, so WebRTC, socket.io,
 * APIs and app updates behave exactly like in the browser. Only page navigations get a fallback
 * to a cached offline page when the network is unreachable.
 */

const CACHE_PREFIX = 'mirotalk-p2p-pwa';
const CACHE_NAME = `${CACHE_PREFIX}-__APP_VERSION__`;
const OFFLINE_URL = '/views/offline.html';
const PRECACHE_URLS = [OFFLINE_URL, '/images/pwa/icon-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .catch((error) => console.warn('[PWA] Offline page precache failed', error))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
            // Lets the browser start the navigation request while the worker boots
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.mode !== 'navigate' || request.method !== 'GET') return;

    event.respondWith(
        (async () => {
            try {
                const preloaded = await event.preloadResponse;
                return preloaded || (await fetch(request));
            } catch (error) {
                const offline = await caches.match(OFFLINE_URL);
                if (offline) return offline;
                throw error;
            }
        })()
    );
});
