// Minimal service worker: caches the app shell so the app still opens
// (with the last-seen content) without a network connection.
// Live data (weather, nearby places, exchange rates) still needs internet.

const CACHE_NAME = "chester-app-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./wetter.html",
  "./unterwegs.html",
  "./naehe.html",
  "./gruppe.html",
  "./mehr.html",
  "./notfall.html",
  "./css/style.css",
  "./js/geo.js",
  "./js/weather.js",
  "./js/places.js",
  "./js/bus.js",
  "./js/currency.js",
  "./js/checklist.js",
  "./js/notfall.js",
  "./js/contacts.js",
  "./js/firebase-config.js",
  "./js/admin-config.js",
  "./js/group.js",
  "./js/livemap.js",
  "./js/chester-stops.json",
  "./js/chester-bus-connections.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // App shell files: cache-first. Everything else (APIs): network-first, no caching of live data.
  const url = new URL(event.request.url);
  const isShellFile = APP_SHELL.some((path) => url.pathname.endsWith(path.replace("./", "/")));

  if (isShellFile) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
