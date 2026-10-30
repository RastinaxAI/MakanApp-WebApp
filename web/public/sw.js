/* Only public offline assets are cached. Authenticated pages and APIs are network-only. */
const CACHE = 'makan-client-public-v5';
const isLegacyCache = (key) =>
  /^makan-[a-f0-9]{12}$/.test(key) ||
  key.startsWith('makan-public-') ||
  key.startsWith('makan-admin-public-');
const PUBLIC_ASSETS = [
  '/offline.html',
  '/icons/makan-192.png',
  '/icons/makan-512.png',
  '/icons/makan-maskable-512.png',
];
const NOTIFICATIONS_URL = '/personal/messages';
function settingsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('makan-client-pwa', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function setting(value) {
  const db = await settingsDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('settings', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('settings');
      const request =
        value === undefined ? store.get('notifications') : store.put(value, 'notifications');
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await (await caches.open(CACHE)).addAll(PUBLIC_ASSETS);
      // Replace the retired Vite worker on this origin. Claiming the new worker
      // does not navigate/reload open forms or delete IndexedDB drafts/outboxes.
      if ((await caches.keys()).some(isLegacyCache)) await self.skipWaiting();
    })(),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (isLegacyCache(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        if (self.navigator?.onLine === false)
          return (await caches.match('/offline.html')) || Response.error();
        try {
          return await fetch(event.request, { cache: 'no-store' });
        } catch {
          return (await caches.match('/offline.html')) || Response.error();
        }
      })(),
    );
  } else if (PUBLIC_ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
self.addEventListener('message', (event) => {
  // Accept preferences only from same-origin app windows, never arbitrary origins.
  if (!event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  if (event.data?.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'PUSH_ENABLED') {
    event.waitUntil(setting({ enabled: true, userId: String(event.data.userId || '') }));
  }
  if (event.data?.type === 'PUSH_DISABLED') {
    event.waitUntil(
      (async () => {
        await setting({ enabled: false });
        for (const notification of await self.registration.getNotifications()) notification.close();
      })(),
    );
  }
});
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const preferences = await setting().catch(() => null);
      if (!preferences?.enabled) return;
      // Lock screens receive a generic notice. No private text or external URL from a payload is exposed.
      let payload;
      try {
        payload = event.data?.json();
      } catch {}
      if (
        payload?.userId &&
        String(payload.userId).toLowerCase() !== preferences.userId.toLowerCase()
      )
        return;
      await self.registration.showNotification('اعلان تازه در ماکان', {
        body: 'برای مشاهده اعلان و جزئیات آن، پنل را باز کنید.',
        icon: '/icons/makan-192.png',
        badge: '/icons/makan-192.png',
        tag: 'makan-notification',
        dir: 'rtl',
        lang: 'fa',
        data: { url: NOTIFICATIONS_URL },
      });
    })(),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = new URL(NOTIFICATIONS_URL, self.location.origin).href;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url === target) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
