import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  id: vi.fn(),
  state: vi.fn(),
  read: vi.fn(),
  authenticated: vi.fn(),
}));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: mocks.id,
  getClientState: mocks.state,
}));
vi.mock('@/lib/server/session', () => ({
  readSession: mocks.read,
  withSessionLock: async (_id: string, work: () => Promise<unknown>) => work(),
}));
vi.mock('@/lib/server/backend', async (original) => ({
  ...(await original<typeof import('@/lib/server/backend')>()),
  authenticatedFetch: mocks.authenticated,
}));
import { GET, POST } from '@/app/api/client/source-files/[[...path]]/route';
const user = '11111111-1111-4111-8111-111111111111',
  sourceId = '22222222-2222-4222-8222-222222222222',
  fileId = '33333333-3333-4333-8333-333333333333';
const stamp = '2026-11-02T10:00:00Z';
const initial = {
  sourceId,
  scope: 'Personal',
  ownerUserId: user,
  organizationId: null,
  classId: null,
  status: 'Active',
  visibility: 'Hidden',
  currentVersion: 1,
  publishedVersion: 1,
  revision: 1,
  title: 'منبع',
  description: null,
  sourceType: 'Document',
  publicationStatus: 'Published',
  safetyStatus: 'FileValidated',
  processingStatus: 'NotRequested',
  processingFailureCode: null,
  fileReady: true,
  sourceReady: true,
  aiReady: false,
  capabilities: {
    canRead: true,
    canWrite: true,
    canPublish: true,
    canArchive: true,
    canDownload: true,
    canUseForAi: true,
  },
  file: {
    fileAssetId: fileId,
    originalFileName: 'test.pdf',
    contentType: 'application/pdf',
    sizeBytes: 4,
    status: 'Ready',
  },
  createdByUserId: user,
  createdAtUtc: stamp,
  publishedAtUtc: stamp,
  version: 'opaque+/source=token',
};
const asset = {
  id: fileId,
  organizationId: null,
  uploadedByUserId: user,
  originalFileName: 'test.pdf',
  contentType: 'application/pdf',
  sizeBytes: 4,
  sha256Hash: null,
  status: 'Ready',
  createdAtUtc: stamp,
  completedAtUtc: stamp,
  deletedAtUtc: null,
  retainedAtUtc: null,
  unattachedExpiresAtUtc: stamp,
  rowVersion: 'opaque-file',
};
let source: typeof initial,
  context: {
    revision: string;
    user: { id: string };
    context: { workspaceType: string; organizationId: string | null; activeRole?: string };
  },
  session: { revision: string; accessToken: string };
const parameters = (path?: string[]) => ({ params: Promise.resolve({ path }) });
function request(
  suffix = `/${sourceId}/content?revision=1`,
  upload = false,
  origin = 'http://127.0.0.1:3000',
) {
  const body = new FormData();
  body.append('File', new Blob(['%PDF'], { type: 'application/pdf' }), 'test.pdf');
  return new Request('http://127.0.0.1:3000/api/client/source-files' + suffix, {
    method: upload ? 'POST' : 'GET',
    headers: { Origin: origin, Host: '127.0.0.1:3000', 'X-Makan-Context': 'a' },
    body: upload ? body : undefined,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
  source = structuredClone(initial);
  context = {
    revision: 'a',
    user: { id: user },
    context: { workspaceType: 'Personal', organizationId: null },
  };
  session = { revision: 'a', accessToken: 'fixture-only-never-returned' };
  mocks.id.mockResolvedValue('test');
  mocks.state.mockImplementation(async () => context);
  mocks.read.mockImplementation(async () => session);
  mocks.authenticated.mockImplementation(async () => ({ response: Response.json(source) }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('source transfer authorization and stream isolation', () => {
  it('downloads only through an authorized source revision and does not expose a token', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } }));
    vi.stubGlobal('fetch', fetch);
    const r = await GET(request(), parameters([sourceId, 'content']));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('%PDF');
    expect(r.headers.get('Cache-Control')).toContain('no-store');
    expect(r.headers.get('Content-Disposition')).toBe('attachment');
    expect(mocks.authenticated.mock.calls[0][2]).toBe(`/api/v1/sources/${sourceId}?revision=1`);
    expect(String(fetch.mock.calls[0][0])).toContain(`/sources/${sourceId}/content?revision=1`);
    expect([...r.headers.values()].join(' ')).not.toContain(session.accessToken);
  });
  it.each(['Library', 'not-ready', 'no-capability', 'wrong-revision'])(
    'rejects a forbidden or unbound source: %s',
    async (kind) => {
      if (kind === 'Library') source.scope = 'Library';
      if (kind === 'not-ready') source.fileReady = false;
      if (kind === 'no-capability') source.capabilities.canDownload = false;
      if (kind === 'wrong-revision') source.revision = 2;
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);
      const r = await GET(request(), parameters([sourceId, 'content']));
      expect(r.status).toBe(kind === 'wrong-revision' ? 502 : 403);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('never treats JSON as a successful file download', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 'error' })));
    expect((await GET(request(), parameters([sourceId, 'content']))).status).toBe(502);
  });
  it('preserves explicit Personal upload scope in an educational context', async () => {
    context.context = {
      workspaceType: 'Organization',
      organizationId: sourceId,
      activeRole: 'Student',
    };
    const fetch = vi.fn().mockResolvedValue(Response.json(asset, { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request('?scope=Personal', true), parameters())).status).toBe(201);
    expect(String(fetch.mock.calls[0][0])).toContain('/files?workspaceScope=Personal');
  });
  it('rejects Student school upload and Library upload before sending any bytes upstream', async () => {
    context.context = {
      workspaceType: 'Organization',
      organizationId: sourceId,
      activeRole: 'Student',
    };
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request('?scope=Organization', true), parameters())).status).toBe(403);
    expect((await POST(request('?scope=Library', true), parameters())).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects another origin and a stale context', async () => {
    vi.stubGlobal('fetch', vi.fn());
    expect(
      (await POST(request('?scope=Personal', true, 'https://another.example'), parameters()))
        .status,
    ).toBe(403);
    context.revision = 'changed';
    expect((await GET(request(), parameters([sourceId, 'content']))).status).toBe(409);
    expect(mocks.authenticated).not.toHaveBeenCalled();
  });
  it('cancels a download whose session changes while the upstream responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        session.revision = 'new-context';
        return new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } });
      }),
    );
    expect((await GET(request(), parameters([sourceId, 'content']))).status).toBe(409);
  });
  it('rejects an upload receipt belonging to a different account', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ ...asset, uploadedByUserId: sourceId }, { status: 201 }),
        ),
    );
    expect((await POST(request('?scope=Personal', true), parameters())).status).toBe(403);
  });
});
