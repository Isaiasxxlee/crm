const CACHE_NAME = "zuarts-cache-v6";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    return;
  }
  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.match(event.request))
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => {});
          }
          return response;
        });
      }),
  );
});
