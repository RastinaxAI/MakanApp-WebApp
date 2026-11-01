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
import { GET, POST } from '@/app/api/client/school-files/[[...path]]/route';
const userId = '11111111-1111-4111-8111-111111111111',
  orgId = '22222222-2222-4222-8222-222222222222',
  classId = '33333333-3333-4333-8333-333333333333',
  lessonId = '44444444-4444-4444-8444-444444444444',
  fileId = '55555555-5555-4555-8555-555555555555';
const time = '2026-10-29T07:00:00Z';
const lesson = {
  id: lessonId,
  organizationId: orgId,
  classId,
  courseId: classId,
  title: 'QA',
  body: 'QA',
  displayOrder: 1,
  status: 'Published',
  revisionNumber: 1,
  version: 'version',
  createdByUserId: userId,
  createdAtUtc: time,
  updatedAtUtc: null,
  publishedAtUtc: time,
  attachments: [
    {
      fileAssetId: fileId,
      fileName: 'qa.txt',
      contentType: 'text/plain',
      sizeBytes: 3,
      status: 'Ready',
      isAvailable: true,
      downloadUrl: 'https://untrusted.invalid/file',
    },
  ],
};
let state: any, session: any;
const parameters = (upload = false) => ({
  params: Promise.resolve({ path: upload ? undefined : [fileId, 'content'] }),
});
function request(upload = false, query = upload ? 'classId=' + classId : 'lessonId=' + lessonId) {
  const form = new FormData();
  form.append('File', new Blob(['abc']), 'qa.txt');
  return new Request(
    'http://127.0.0.1:3000/api/client/school-files' +
      (upload ? '' : '/' + fileId + '/content') +
      '?' +
      query,
    {
      method: upload ? 'POST' : 'GET',
      headers: { Origin: 'http://127.0.0.1:3000', Host: '127.0.0.1:3000', 'X-Makan-Context': 'a' },
      body: upload ? form : undefined,
    },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  state = {
    revision: 'a',
    user: { id: userId },
    context: { workspaceType: 'Organization', organizationId: orgId, activeRole: 'Teacher' },
  };
  session = { revision: 'a', accessToken: 'fixture-token' };
  m.state.mockImplementation(async () => state);
  m.session.mockImplementation(async () => session);
  m.upstream.mockImplementation(async () => ({ response: Response.json(lesson) }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('school file binding and current authorization', () => {
  it('streams bytes only after authorized lesson attachment lookup; never trusts downloadUrl', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('abc'));
    vi.stubGlobal('fetch', fetch);
    const r = await GET(request(), parameters());
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('abc');
    expect(String(fetch.mock.calls[0][0])).toBe(
      'http://94.184.32.84/api/v1/files/' + fileId + '/content',
    );
  });
  it('preserves a backend Parent denial without requesting file bytes', async () => {
    state.context.activeRole = 'Parent';
    m.upstream.mockImplementation(async () => ({
      response: Response.json(
        { code: 'ACADEMIC_READ_NOT_ALLOWED', traceId: 'qa-trace' },
        { status: 403 },
      ),
    }));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const r = await GET(request(), parameters());
    expect(r.status).toBe(403);
    expect((await r.json()).traceId).toBe('qa-trace');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses an asset outside the lesson even if the file ID is known', async () => {
    m.upstream.mockImplementation(async () => ({
      response: Response.json({ ...lesson, attachments: [] }),
    }));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await GET(request(), parameters())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses context changes and unrelated organization lesson results', async () => {
    state.revision = 'b';
    expect((await GET(request(), parameters())).status).toBe(409);
    state.revision = 'a';
    m.upstream.mockImplementation(async () => ({
      response: Response.json({ ...lesson, organizationId: classId }),
    }));
    expect((await GET(request(), parameters())).status).toBe(409);
  });
  it('does not allow a Student to upload or accept an unbound query', async () => {
    state.context.activeRole = 'Student';
    expect((await POST(request(true), parameters(true))).status).toBe(403);
    expect((await GET(request(false, 'classId=' + classId), parameters())).status).toBe(400);
    expect(
      (await GET(request(false, 'lessonId=' + lessonId + '&extra=1'), parameters())).status,
    ).toBe(400);
  });
  it('interrupts a delayed stream when the local session changes', async () => {
    let controller!: ReadableStreamDefaultController;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(c) {
              controller = c;
            },
          }),
        ),
      ),
    );
    const r = await GET(request(), parameters());
    const body = r.text();
    session.revision = 'b';
    controller.enqueue(new TextEncoder().encode('abc'));
    controller.close();
    await expect(body).rejects.toMatchObject({ status: 409 });
  });
});
