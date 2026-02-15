const CACHE_NAME = 'wusul-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/booking.css',
    '/js/auth.js',
    '/js/config.js',
    '/offline.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
