/* ماکان — service worker (generated). Build id: cb5ddaa1c0d8 */
const VERSION = 'cb5ddaa1c0d8';
const CACHE = 'makan-' + VERSION;
const PRECACHE = [
  "/assets/account-CZwN6ZMO.js",
  "/assets/ai-DcLuJT4j.js",
  "/assets/assignments-CI44QkYw.js",
  "/assets/auth-Cy4xsM0o.js",
  "/assets/classes-Dh45a5Fe.js",
  "/assets/exams-BSqyitXJ.js",
  "/assets/guardian-Ju2qh_1r.js",
  "/assets/icons-DX8ZAGN2.js",
  "/assets/index-BX3GGqnO.css",
  "/assets/index-CLNBTAgM.js",
  "/assets/landing-CbipGOOm.js",
  "/assets/library--G6ozyxH.js",
  "/assets/manage-BzaZ3L1W.js",
  "/assets/media-CfKt20U_.js",
  "/assets/messenger-2d7_4Ykt.js",
  "/assets/overlays-r3hdh5vo.js",
  "/assets/progress-Cqf2g_km.js",
  "/assets/sales-DeL-00T8.js",
  "/assets/school-home-DjlRuQGL.js",
  "/assets/seed-OxTdOfF7.js",
  "/assets/session-25Ek0RHy.js",
  "/fonts/OFL.txt",
  "/fonts/vazirmatn-33.0.3.woff2",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-64.png",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/makan-192.png",
  "/index.html",
  "/manifest.webmanifest",
  "/offline.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // Add one-by-one so a single failure cannot abort the whole precache.
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)));
      self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('makan-') && key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isAsset = (url) => url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/');

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build output: cache-first, it is immutable by definition.
  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations: network-first with a short timeout, then the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timer);
          const cache = await caches.open(CACHE);
          cache.put('/index.html', response.clone());
          return response;
        } catch {
          const cached = (await caches.match(request)) || (await caches.match('/index.html')) || (await caches.match('/offline.html'));
          return cached || new Response('<h1>offline</h1>', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
        }
      })(),
    );
  }
});
