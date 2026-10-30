import { beforeEach, expect, it, vi } from 'vitest';
import type { components } from '@/generated/api/schema';
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), fetch: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/server/session', async (original) => ({
  ...(await original<typeof import('@/lib/server/session')>()),
  readSession: mocks.read,
  writeSession: mocks.write,
}));
vi.mock('@/lib/server/backend', async (original) => ({
  ...(await original<typeof import('@/lib/server/backend')>()),
  authenticatedFetch: mocks.fetch,
}));
import { getClientState } from '@/lib/server/client-session';
import { withSessionRead, withSessionLock, isSessionRead } from '@/lib/server/session-lock';
import { contextSignature } from '@/lib/client-surface';
const userId = '00000000-0000-4000-8000-000000000101';
const user: components['schemas']['CurrentUserResult'] = {
  id: userId,
  phoneNumber: '+989120000101',
  isProfileComplete: true,
  firstName: null,
  lastName: null,
  displayName: 'آزمایشی',
  username: null,
  dateOfBirth: null,
};
const context: components['schemas']['AccessContext'] = {
  actorId: userId,
  sessionId: '00000000-0000-4000-8000-000000000001',
  userId,
  workspaceType: 'Personal',
  organizationId: null,
  membershipId: null,
  activeRole: null,
  subjectOrganizationPersonId: null,
};
let stored: { userId: string; revision: string; contextSignature?: string };
beforeEach(() => {
  vi.clearAllMocks();
  stored = { userId, revision: 'initial', contextSignature: contextSignature(context) };
  mocks.read.mockImplementation(async () => ({ ...stored }));
  mocks.write.mockImplementation(async (_id, value) => {
    expect(isSessionRead(_id)).toBe(false);
    stored = value;
  });
  mocks.fetch.mockImplementation(async (_id, _session, path) => ({
    response: Response.json(path === '/api/v1/me' ? user : context),
  }));
});
it('shares only overlapping checks, runs identity/context reads together and never keeps a completed authorization cache', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  mocks.fetch.mockImplementation(async (_id, _session, path) => {
    await gate;
    return { response: Response.json(path === '/api/v1/me' ? user : context) };
  });
  const reads = Array.from({ length: 3 }, () =>
    withSessionRead('parallel-state', () => getClientState('parallel-state')),
  );
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  expect(mocks.fetch.mock.calls.map((call) => call[2]).sort()).toEqual([
    '/api/v1/me',
    '/api/v1/workspaces/current',
  ]);
  release();
  const results = await Promise.all(reads);
  expect(results.every((r) => r?.revision === 'initial')).toBe(true);
  expect(mocks.write).not.toHaveBeenCalled();
  await withSessionRead('parallel-state', () => getClientState('parallel-state'));
  expect(mocks.fetch).toHaveBeenCalledTimes(4);
});
it('upgrades changed context to exclusive access, rotates revision and never writes while sharing reads', async () => {
  stored.contextSignature = 'previous-context';
  const result = await withSessionRead('changed-state', () => getClientState('changed-state'));
  expect(result?.revision).not.toBe('initial');
  expect(mocks.write).toHaveBeenCalledTimes(1);
  expect(stored.contextSignature).toBe(contextSignature(context));
});
it('does not share sessions or accept an identity/context mismatch', async () => {
  mocks.fetch.mockImplementation(async (_id, _session, path) => ({
    response: Response.json(
      path === '/api/v1/me' ? user : { ...context, userId: '00000000-0000-4000-8000-000000000999' },
    ),
  }));
  await expect(
    withSessionRead('wrong-user', () => getClientState('wrong-user')),
  ).rejects.toMatchObject({ status: 502 });
  expect(mocks.write).not.toHaveBeenCalled();
  mocks.fetch.mockImplementation(async (_id, _session, path) => ({
    response: Response.json(path === '/api/v1/me' ? user : context),
  }));
  await Promise.all(
    ['separate-a', 'separate-b'].map((id) => withSessionRead(id, () => getClientState(id))),
  );
  expect(mocks.fetch).toHaveBeenCalledTimes(6);
});
it('keeps exclusive credential-dependent reads sequential', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  mocks.fetch.mockImplementation(async (_id, _session, path) => {
    if (path === '/api/v1/me') await gate;
    return { response: Response.json(path === '/api/v1/me' ? user : context) };
  });
  const read = withSessionLock('exclusive-state', () => getClientState('exclusive-state'));
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  release();
  await read;
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
