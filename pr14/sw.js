/**
 * Service Worker for the Note-taking PWA (v5).
 * Enhanced Cache to include all icons to satisfy 'minimum 3 size' requirement.
 */

const CACHE_NAME = 'notes-cache-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/favicon.ico',
    './icons/favicon-16x16.png',
    './icons/favicon-32x32.png',
    './icons/favicon-192x192.png',
    './icons/favicon-256x256.png',
    './icons/favicon-512x512.png',
    './screenshots/desktop.png',
    './screenshots/mobile.png',
    'https://unpkg.com/chota@latest'
];

/**
 * Install Event - Cache assets.
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching assets (v5)...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

/**
 * Activate Event - Clean up old caches.
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
 * Fetch Event - Serve from cache when possible.
 */
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                return cachedResponse || fetch(event.request);
            })
    );
});
