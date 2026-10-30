import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ state: vi.fn(), session: vi.fn(), upstream: vi.fn() }));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: async () => 'session',
  getClientState: m.state,
}));
vi.mock('@/lib/server/session', () => ({
  readSession: m.session,
  withSessionLock: async (_id: string, work: () => unknown) => work(),
}));
vi.mock('@/lib/server/backend', async (original) => ({
  ...(await original<typeof import('@/lib/server/backend')>()),
  authenticatedFetch: m.upstream,
}));
import { GET, POST } from '@/app/api/client/submission-files/[[...path]]/route';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
const uid = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222',
  aid = '33333333-3333-4333-8333-333333333333',
  fid = '44444444-4444-4444-8444-444444444444',
  assignment = '55555555-5555-4555-8555-555555555555',
  time = '2026-10-29T10:00:00Z';
const asset: S['FileAssetResult'] = {
  id: fid,
  organizationId: org,
  uploadedByUserId: uid,
  originalFileName: 'answer.pdf',
  contentType: 'application/pdf',
  sizeBytes: 3,
  sha256Hash: null,
  status: 'Ready',
  createdAtUtc: time,
  completedAtUtc: time,
  deletedAtUtc: null,
  retainedAtUtc: null,
  unattachedExpiresAtUtc: time,
  rowVersion: 'f1',
};
const attempt: S['SubmissionAttemptResult'] = {
  id: aid,
  organizationId: org,
  assignmentId: assignment,
  assignmentVersionId: assignment,
  assignmentRecipientId: assignment,
  enrollmentId: assignment,
  attemptNumber: 1,
  status: 'Draft',
  contentVisible: true,
  answerText: null,
  attachments: [
    {
      fileAssetId: fid,
      originalFileName: 'answer.pdf',
      contentType: 'application/pdf',
      sizeBytes: 3,
      fileStatus: 'Ready',
      attachedAtUtc: time,
    },
  ],
  createdAtUtc: time,
  lastSavedAtUtc: null,
  submittedAtUtc: null,
  isLate: false,
  rowVersion: 'a1',
};
let state: {
    user: { id: string };
    revision: string;
    context: { workspaceType: string; activeRole: string; organizationId: string };
  },
  session: { revision: string; accessToken: string };
function req(upload = false, revision = 'a') {
  return new Request(
    `http://127.0.0.1:3132/api/client/submission-files${upload ? '' : '/' + fid + '/content'}?attemptId=${aid}`,
    {
      method: upload ? 'POST' : 'GET',
      headers: {
        Origin: 'http://127.0.0.1:3132',
        'X-Makan-Context': revision,
        ...(upload ? { 'Content-Type': 'multipart/form-data; boundary=qa' } : {}),
      },
      ...(upload ? { body: '--qa\r\n' } : {}),
    },
  );
}
const parameters = (upload = false) => ({
  params: Promise.resolve({ path: upload ? [] : [fid, 'content'] }),
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', '1'.repeat(64));
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3132');
  state = {
    user: { id: uid },
    revision: 'a',
    context: { workspaceType: 'Organization', activeRole: 'Student', organizationId: org },
  };
  session = { revision: 'a', accessToken: 'local-fixture-token' };
  m.state.mockResolvedValue(state);
  m.session.mockImplementation(async () => session);
  m.upstream.mockImplementation(async (_id: unknown, _session: unknown, path: string) => ({
    session,
    response: Response.json(
      path.endsWith('/attempts/me')
        ? [attempt]
        : path.startsWith('/api/v1/files/')
          ? asset
          : attempt,
    ),
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('own-attempt file proxy', () => {
  it('streams only a ready file bound to the owned attempt', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('abc'));
    vi.stubGlobal('fetch', fetch);
    const r = await GET(req(), parameters());
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('abc');
    expect(r.headers.get('Cache-Control')).toContain('no-store');
    expect(String(fetch.mock.calls[0][0])).toContain('/api/v1/files/' + fid + '/content');
  });
  it.each(['Parent', 'Teacher', 'Manager'])(
    'does not grant %s the Student upload route',
    async (role) => {
      state.context.activeRole = role;
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      expect((await POST(req(true), parameters(true))).status).toBe(403);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('rejects another attempt even when its detail endpoint returns 200', async () => {
    m.upstream.mockImplementation(async (_id: unknown, _session: unknown, path: string) => ({
      session,
      response: Response.json(path.endsWith('/attempts/me') ? [] : attempt),
    }));
    vi.stubGlobal('fetch', vi.fn());
    expect((await GET(req(), parameters())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects stale context before requesting upstream file bytes', async () => {
    vi.stubGlobal('fetch', vi.fn());
    expect((await GET(req(false, 'old'), parameters())).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not serve another uploader asset', async () => {
    m.upstream.mockImplementation(async (_id: unknown, _session: unknown, path: string) => ({
      session,
      response: Response.json(
        path.endsWith('/attempts/me')
          ? [attempt]
          : path.startsWith('/api/v1/files/')
            ? { ...asset, uploadedByUserId: org }
            : attempt,
      ),
    }));
    vi.stubGlobal('fetch', vi.fn());
    expect((await GET(req(), parameters())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses refreshed credentials for all later reads and the file transfer', async () => {
    const normal = m.upstream.getMockImplementation()!;
    m.upstream.mockImplementation(async (...args) => {
      if (m.upstream.mock.calls.length === 1)
        session = { ...session, accessToken: 'refreshed-local-token' };
      return normal(...args);
    });
    const fetch = vi.fn().mockResolvedValue(new Response('abc'));
    vi.stubGlobal('fetch', fetch);
    const response = await GET(req(), parameters());
    expect(await response.text()).toBe('abc');
    expect(m.upstream.mock.calls[1][1].accessToken).toBe('refreshed-local-token');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer refreshed-local-token');
  });
});
