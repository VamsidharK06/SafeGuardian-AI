/* =====================================================
   SafeGuardian AI - Service Worker (service-worker.js)
   Enables offline functionality using Cache API.
   ===================================================== */

const CACHE_NAME = "safeguardian-v5";

// Files to cache for offline use
const CACHE_FILES = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./contacts.html",
  "./sos.html",
  "./ai.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
];

// ─── Install Event: Pre-cache all files ───────────
self.addEventListener("install", function (event) {
  console.log("[ServiceWorker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("[ServiceWorker] Caching app files");
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// ─── Activate Event: Clean old caches ─────────────
self.addEventListener("activate", function (event) {
  console.log("[ServiceWorker] Activating...");
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch Event: Serve from cache, fallback to network ───
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise fetch from network and cache it
      return fetch(event.request)
        .then(function (networkResponse) {
          // Only cache successful responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          // Offline fallback: return index.html for HTML requests
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match("./index.html");
          }
        });
    })
  );
});
