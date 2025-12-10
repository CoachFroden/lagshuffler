// service-worker.js
// Enkel cache-basert PWA-støtte for LagShuffler

const CACHE_NAME = "lagshuffler-cache-v1";
const FILES_TO_CACHE = [
    "index.html",
    "style.css",
    "app.js",
    "players.js",
    "generator.js",
    "manifest.json"
    // Ikoner legges til her hvis ønskelig
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return (
                cachedResponse ||
                fetch(event.request).catch(() =>
                    caches.match("index.html")
                )
            );
        })
    );
});
