/**
 * Service Worker for the Note-taking PWA.
 * Implements a Cache-First strategy for static assets.
 */

const CACHE_NAME = 'notes-cache-v2';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './manifest.json',
    './icon.png',
    'https://unpkg.com/chota@latest'
];

/**
 * Install Event - Cache initial set of assets.
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

/**
 * Activate Event - Remove old caches.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

/**
 * Fetch Event - Intercept network requests and return cached versions if available.
 */
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached version or fetch from network
                return cachedResponse || fetch(event.request);
            })
    );
});
