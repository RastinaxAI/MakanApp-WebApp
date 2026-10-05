// Generates dist/sw.js with a precache manifest taken from the real build output.
// No workbox, no runtime dependency — the cache logic is ~60 readable lines.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(dist).map((file) => '/' + relative(dist, file).split(/[\\/]/).join('/'));

const precache = files.filter((file) => !file.endsWith('sw.js'));
const version = createHash('sha1')
  .update(precache.map((file) => `${file}:${statSync(join(dist, file.slice(1))).size}`).sort().join('|'))
  .digest('hex')
  .slice(0, 12);

const sw = `/* ماکان — service worker (generated). Build id: ${version} */
const VERSION = '${version}';
const CACHE = 'makan-' + VERSION;
const PRECACHE = ${JSON.stringify(precache, null, 2)};

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
`;

writeFileSync(join(dist, 'sw.js'), sw, 'utf8');
console.log(`sw.js — build ${version} — ${precache.length} precached entries`);
