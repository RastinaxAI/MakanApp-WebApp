import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ state: vi.fn(), read: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: async () => 'backend-concurrency',
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
import { GET, PATCH } from '@/app/api/client/backend/[...path]/route';
const contacts = '/api/v1/contacts',
  invitations = '/api/v1/invitations',
  profile = '/api/v1/me/profile';
const user = {
  id: '00000000-0000-4000-8000-000000000101',
  phoneNumber: '+989120000101',
  isProfileComplete: true,
  firstName: null,
  lastName: null,
  displayName: null,
  username: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.mockResolvedValue({ revision: 'current', context: { workspaceType: 'Personal' } });
  mocks.read.mockResolvedValue({ revision: 'current' });
});
function call(path: string, method: 'GET' | 'PATCH' = 'GET') {
  return (method === 'GET' ? GET : PATCH)(
    new Request('http://127.0.0.1/api/client/backend' + path, {
      method,
      headers: { 'X-Makan-Context': 'current', 'Content-Type': 'application/json' },
      ...(method === 'PATCH'
        ? {
            body: JSON.stringify({
              firstName: 'تست',
              lastName: 'کیفیت',
              displayName: 'تست',
              username: 'fixture.user',
            }),
          }
        : {}),
    }),
    { params: Promise.resolve({ path: path.slice(1).split('/') }) },
  );
}
function payload(path: string) {
  return path === contacts
    ? { items: [], page: 1, pageSize: 30, hasMore: false }
    : path === profile
      ? user
      : [];
}
it('does not queue an independent GET behind a slow read in the same session', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  mocks.fetch.mockImplementation(async (_id, _session, path) => {
    if (path === contacts) await gate;
    return { response: Response.json(payload(path)) };
  });
  const first = call(contacts),
    second = call(invitations);
  try {
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect((await second).status).toBe(200);
  } finally {
    release();
  }
  expect((await first).status).toBe(200);
});
it('keeps a queued mutation exclusive and prevents later reads from overtaking it', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const order: string[] = [];
  mocks.fetch.mockImplementation(async (_id, _session, path) => {
    order.push(path);
    if (path === contacts) await gate;
    return { response: Response.json(payload(path)) };
  });
  const first = call(contacts);
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  const write = call(profile, 'PATCH'),
    later = call(invitations);
  release();
  const responses = await Promise.all([first, write, later]);
  expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
  expect(order).toEqual([contacts, profile, invitations]);
});
