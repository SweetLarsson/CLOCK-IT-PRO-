// Service Worker for CLOCK-IT PRO+ PWA
const CACHE_NAME = "clockit-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("PWA: Pre-caching partial failure", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Ignore non-GET or chrome-extension / API requests for dynamic DB
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith("/api/")) {
    return; // Network only for dynamic multi-tenant API
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful static asset responses
        if (
          response &&
          response.status === 200 &&
          (url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".woff2"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
          return new Response("Network offline", { status: 503, statusText: "Service Unavailable" });
        });
      })
  );
});

// Background Sync event listener
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-attendance") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_OFFLINE_SYNC" });
        });
      })
    );
  }
});

// Message listener from client window
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "REGISTER_SYNC") {
    if ("sync" in self.registration) {
      self.registration.sync.register("sync-offline-attendance").catch(() => {});
    }
  }
});

