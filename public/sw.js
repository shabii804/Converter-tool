/**
 * PrivyPDF service worker — makes the local-first promise concrete:
 * once the app is loaded, it keeps working offline.
 *
 * Strategies:
 * - static build assets (_next/static) and public files: cache-first
 * - navigations (pages): network-first with cache fallback (fresh when
 *   online, offline-capable when not)
 * - never touches POST requests or the /api route (there is nothing to
 *   upload in this app, but we are explicit anyway)
 */
const VERSION = "privypdf-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          "/logo.svg",
          "/og.png",
          "/icon-192.png",
          "/icon-512.png",
        ])
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  // build assets + public files: cache-first (immutable content)
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|jpg|jpeg|webp|svg|woff2|ico|mjs|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // navigations: network-first, fall back to the cached page (offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/en"))
        )
    );
  }
});
