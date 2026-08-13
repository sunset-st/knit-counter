const CACHE_NAME = "knit-counter-v4";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "firebase-config.js",
  "manifest.json",
  "icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Firebase Auth/Firestore/CDN requests: always go to network, never cache.
    return;
  }
  // Network-first: always try to get the latest file when online, and
  // only fall back to the cached copy if the network request fails.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
