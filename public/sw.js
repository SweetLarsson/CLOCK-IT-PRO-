// Service Worker for CLOCK-IT PRO+ PWA
const CACHE_NAME = "clockit-pwa-v2";
const DATA_CACHE_NAME = "clockit-data-cache-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/manifest.json",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-192x192.png",
  "/pwa-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("PWA: Pre-caching partial notice", err);
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
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // SSE event stream is live only
  if (url.pathname.startsWith("/api/events/")) {
    return;
  }

  // Cachable read-only API requests: Attendance records, workers, settings, departments, notifications
  const isCachableApi =
    url.pathname.startsWith("/api/attendance/records") ||
    url.pathname.startsWith("/api/tenant/workers") ||
    url.pathname.startsWith("/api/tenant/departments") ||
    url.pathname.startsWith("/api/tenant/settings") ||
    url.pathname.startsWith("/api/permissions") ||
    url.pathname.startsWith("/api/notifications") ||
    url.pathname.startsWith("/api/visitor/logs") ||
    url.pathname.startsWith("/api/reports/jobs");

  if (isCachableApi) {
    // Network-First with Cache Fallback for offline records viewing
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
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
            return new Response(JSON.stringify({ records: [], workers: [], depts: [], offline: true }), {
              headers: { "Content-Type": "application/json" }
            });
          });
        })
    );
    return;
  }

  // Skip other /api/ routes
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Static Assets and HTML Navigation
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.endsWith(".js") ||
              url.pathname.endsWith(".css") ||
              url.pathname.endsWith(".png") ||
              url.pathname.endsWith(".svg") ||
              url.pathname.endsWith(".woff2") ||
              url.pathname === "/" ||
              url.pathname.startsWith("/index.html"))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (cached) return cached;
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/index.html") || caches.match("/");
          }
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });

      return cached || fetchPromise;
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

