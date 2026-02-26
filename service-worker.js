const VERSION = 19;
const CACHE_NAME = `planung-v${VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-32x32.png",
  "./icon-192x192.png",
  "./icon-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate";
  const isIndexRequest = requestUrl.pathname.endsWith("/index.html");
  if (isNavigation || isIndexRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || typeof event.data !== "object") {
    return;
  }
  const { type } = event.data;
  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (type === "GET_VERSION") {
    if (event.source && typeof event.source.postMessage === "function") {
      event.source.postMessage({ type: "VERSION", version: VERSION });
    }
  }
});
