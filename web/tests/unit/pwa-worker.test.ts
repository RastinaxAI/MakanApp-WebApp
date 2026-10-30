import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function worker() {
  const listeners: Record<string, (event: any) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const focus = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const cache = { addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(new Response('offline-public-only')),
    delete: vi.fn(),
  };
  const self = {
    location: { origin: 'https://panel.example.test' },
    registration: { showNotification, getNotifications: vi.fn().mockResolvedValue([]) },
    addEventListener: (name: string, listener: any) => (listeners[name] = listener),
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(),
      openWindow,
      matchAll: vi
        .fn()
        .mockResolvedValue([
          { url: 'https://panel.example.test/personal/profile/edit?draft=1', focus, navigate },
        ]),
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: vi.fn().mockRejectedValue(new Error('offline')),
  });
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  return { listeners, self, context, caches, cache, showNotification, openWindow, navigate };
}
describe('PWA cache and notification boundaries', () => {
  it('retires legacy Vite caches without deleting unrelated storage or navigating drafts', async () => {
    const w = worker();
    w.caches.keys.mockResolvedValue([
      'makan-012345abcdef',
      'makan-admin-public-v4',
      'makan-client-public-v5',
      'unrelated-cache',
      'makan-personal-outbox',
    ]);
    let pending: Promise<unknown> | undefined;
    w.listeners.install({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
    expect(w.self.skipWaiting).toHaveBeenCalledTimes(1);
    w.listeners.activate({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
    expect(w.caches.delete.mock.calls.map(([key]) => key)).toEqual([
      'makan-012345abcdef',
      'makan-admin-public-v4',
    ]);
    expect(w.navigate).not.toHaveBeenCalled();
    expect(w.self.clients.claim).toHaveBeenCalledTimes(1);
  });
  it('accepts the retired client update message only from the same origin', () => {
    const w = worker();
    w.listeners.message({ source: { url: 'https://evil.example/' }, data: 'SKIP_WAITING' });
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
    w.listeners.message({ source: { url: 'https://panel.example.test/' }, data: 'SKIP_WAITING' });
    expect(w.self.skipWaiting).toHaveBeenCalledTimes(1);
  });
  it('preloads only public assets and never cached user pages or APIs', async () => {
    const w = worker();
    let pending;
    w.listeners.install({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
    const assets = w.cache.addAll.mock.calls[0][0];
    expect(assets).toContain('/offline.html');
    expect(
      assets.every((path: string) => path === '/offline.html' || path.startsWith('/icons/')),
    ).toBe(true);
    for (const path of [
      '/api/client/session',
      '/api/client/backend/api/v1/notifications',
      '/_next/static/private.js',
    ]) {
      const respondWith = vi.fn();
      w.listeners.fetch({
        request: { url: 'https://panel.example.test' + path, method: 'GET', mode: 'cors' },
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
  });
  it('network-failed navigation shows the public offline page without saving a protected response', async () => {
    const w = worker();
    let pending: Promise<Response> | undefined;
    w.listeners.fetch({
      request: {
        url: 'https://panel.example.test/personal/profile',
        method: 'GET',
        mode: 'navigate',
      },
      respondWith: (p: Promise<Response>) => (pending = p),
    });
    expect(await (await pending!).text()).toBe('offline-public-only');
    expect(w.caches.open).not.toHaveBeenCalled();
  });
  it('shows generic push text and ignores private body or malicious links', async () => {
    const w = worker();
    vm.runInContext('setting = async () => ({enabled:true,userId:"client-user"})', w.context);
    let pending;
    w.listeners.push({
      data: {
        json: () => ({
          userId: 'client-user',
          title: 'PRIVATE_TITLE',
          body: 'PRIVATE_PHONE',
          url: 'https://evil.example/',
        }),
      },
      waitUntil: (p: Promise<unknown>) => (pending = p),
    });
    await pending;
    const call = JSON.stringify(w.showNotification.mock.calls);
    expect(call).not.toContain('PRIVATE');
    expect(call).not.toContain('evil.example');
    expect(w.showNotification.mock.calls[0][1].data.url).toBe('/personal/messages');
  });
  it.each([{ enabled: false }, { enabled: true, userId: 'other-client-user' }])(
    'suppresses push for disabled or mismatched accounts',
    async (preferences) => {
      const w = worker();
      vm.runInContext(`setting=async()=>(${JSON.stringify(preferences)})`, w.context);
      let pending;
      w.listeners.push({
        data: { json: () => ({ userId: 'client-user' }) },
        waitUntil: (p: Promise<unknown>) => (pending = p),
      });
      await pending;
      expect(w.showNotification).not.toHaveBeenCalled();
    },
  );
  it('does not accept update or settings messages from another origin', () => {
    const w = worker();
    w.listeners.message({
      source: { url: 'https://evil.example/' },
      data: { type: 'SKIP_WAITING' },
      waitUntil: vi.fn(),
    });
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
  });
  it('notification click opens only the inbox and leaves an existing draft alone', async () => {
    const w = worker();
    let pending;
    const close = vi.fn();
    w.listeners.notificationclick({
      notification: { close, data: { url: 'https://evil.example/' } },
      waitUntil: (p: Promise<unknown>) => (pending = p),
    });
    await pending;
    expect(close).toHaveBeenCalled();
    expect(w.openWindow).toHaveBeenCalledWith('https://panel.example.test/personal/messages');
    expect(w.navigate).not.toHaveBeenCalled();
  });
});
