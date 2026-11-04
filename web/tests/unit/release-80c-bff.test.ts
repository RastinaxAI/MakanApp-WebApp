import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ state: vi.fn(), read: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: async () => 'release-80c',
  getClientState: mocks.state,
}));
vi.mock('@/lib/server/session', async (original) => ({
  ...(await original<typeof import('@/lib/server/session')>()),
  readSession: mocks.read,
}));
vi.mock('@/lib/server/backend', async (original) => ({
  ...(await original<typeof import('@/lib/server/backend')>()),
  checkOrigin: () => true,
  authenticatedFetch: mocks.fetch,
}));
import { GET, POST } from '@/app/api/client/backend/[...path]/route';
import { request } from '@/lib/api/client';
const id = '00000000-0000-4000-8000-000000001800';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.mockResolvedValue({
    revision: 'current',
    context: { workspaceType: 'Personal', organizationId: null },
  });
  mocks.read.mockResolvedValue({ revision: 'current' });
});
const call = (path: string, method = 'GET', body?: unknown, revision = 'current') =>
  (method === 'GET' ? GET : POST)(
    new Request('http://localhost/api/client/backend' + path, {
      method,
      headers: { 'X-Makan-Context': revision, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    { params: Promise.resolve({ path: path.split('?')[0].slice(1).split('/') }) },
  );
it('forwards independent academic reads in Personal context without creating an organization', async () => {
  mocks.fetch.mockResolvedValue({
    response: Response.json({ items: [], page: 1, pageSize: 30, total: 0 }),
  });
  const r = await call(`/api/v1/academic/personal-classes/${id}/assignments`);
  expect(r.status).toBe(200);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
it('still denies organization-only reads in the same personal context', async () => {
  expect((await call('/api/v1/academic/classes')).status).toBe(403);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('blocks old context revisions before upstream traffic', async () => {
  expect((await call('/api/v1/personal-classes/page', 'GET', undefined, 'old')).status).toBe(409);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('rejects invented and owner endpoints before forwarding', async () => {
  for (const p of [
    '/api/admin/v1/personal-class-requests',
    '/api/v1/personal-classes/' + id + '/approve',
  ])
    expect((await call(p)).status).toBe(404);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('preserves a legitimate empty 202 repair response without inventing a file or JSON success', async () => {
  mocks.fetch.mockResolvedValue({ response: new Response(null, { status: 202 }) });
  const r = await call(`/api/v1/personal-classes/${id}/spaces/repair`, 'POST', {
    expectedVersion: 'MDAwMDAwMDE=',
    reason: 'بررسی آماده‌سازی',
  });
  expect(r.status).toBe(202);
  expect(r.headers.get('Content-Type')).toBeNull();
  expect(await r.text()).toBe('');
});
it('accepts the empty 202 on the browser transport', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
  try {
    await expect(request('/api/client/repair')).resolves.toBeUndefined();
  } finally {
    vi.unstubAllGlobals();
  }
});
