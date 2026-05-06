/**
 * Service Worker for the Note-taking PWA (v6 - App Shell Update).
 * Uses Cache-First for static assets and Network-First for dynamic content.
 */

const CACHE_NAME = 'notes-cache-v6';
const DYNAMIC_CACHE_NAME = 'dynamic-content-v1';

const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/favicon.ico',
    './icons/favicon-512x512.png',
    'https://unpkg.com/chota@latest'
];

/**
 * Install Event - Cache static assets (App Shell).
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching App Shell (v6)...');
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
                keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

/**
 * Fetch Event - Strategy implementation.
 */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 1. Пропускаем запросы к внешним источникам (кроме CDN chota)
    if (url.origin !== location.origin && !url.origin.includes('unpkg.com')) return;

    // 2. Стратегия для динамического контента (/content/*) - Network First
    if (url.pathname.includes('/content/')) {
        event.respondWith(
            fetch(event.request)
                .then(networkRes => {
                    const resClone = networkRes.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                    return networkRes;
                })
                .catch(() => {
                    // Если сеть недоступна, берем из кэша (или fallback на home)
                    return caches.match(event.request)
                        .then(cachedRes => cachedRes || caches.match('./content/home.html'));
                })
        );
    } 
    // 3. Стратегия для статики (App Shell) - Cache First
    else {
        event.respondWith(
            caches.match(event.request)
                .then(cachedRes => cachedRes || fetch(event.request))
        );
    }
});
