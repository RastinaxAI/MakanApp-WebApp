import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ id: vi.fn(), state: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: mocks.id,
  getClientState: mocks.state,
}));
vi.mock('@/lib/server/session', () => ({
  readSession: mocks.read,
  withSessionLock: async (_id: string, fn: () => Promise<unknown>) => fn(),
}));
import { GET, POST } from '@/app/api/client/profile-media/[[...path]]/route';
const userId = 'd3700000-0000-0000-0000-000000000107';
const fileId = '11111111-1111-4111-8111-111111111111';
const asset = {
  id: fileId,
  organizationId: null,
  uploadedByUserId: userId,
  originalFileName: 'avatar.png',
  contentType: 'image/png',
  sizeBytes: 3,
  sha256Hash: null,
  status: 'Ready',
  createdAtUtc: '2026-10-28T10:00:00Z',
  completedAtUtc: '2026-10-28T10:00:00Z',
  deletedAtUtc: null,
  retainedAtUtc: null,
  unattachedExpiresAtUtc: '2026-10-29T10:00:00Z',
  rowVersion: 'v1',
};
let revision: string;
function request(upload = false, origin = 'http://127.0.0.1:3000') {
  const body = new FormData();
  body.append('File', new Blob(['abc'], { type: 'image/png' }), 'avatar.png');
  return new Request(
    'http://127.0.0.1:3000/api/client/profile-media' + (upload ? '' : '/' + fileId),
    {
      method: upload ? 'POST' : 'GET',
      headers: { Origin: origin, Host: '127.0.0.1:3000', 'X-Makan-Context': 'a' },
      body: upload ? body : undefined,
    },
  );
}
const params = (path?: string[]) => ({ params: Promise.resolve({ path }) });
beforeEach(() => {
  vi.clearAllMocks();
  revision = 'a';
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
  mocks.id.mockResolvedValue('session-a');
  mocks.state.mockResolvedValue({ user: { id: userId }, revision: 'a' });
  mocks.read.mockImplementation(async () => ({ revision, accessToken: 'test-secret' }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('authenticated profile media BFF', () => {
  it('rejects an off-origin upload and a stale context before calling the backend', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request(true, 'https://elsewhere.invalid'), params())).status).toBe(403);
    mocks.state.mockResolvedValue({ user: { id: userId }, revision: 'b' });
    expect((await POST(request(true), params())).status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('streams an owner upload and never returns a token to the browser', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: URL, init: RequestInit) => {
        expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-secret');
        await new Response(init.body).arrayBuffer();
        return Response.json(asset, { status: 201 });
      }),
    );
    const result = await POST(request(true), params());
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual(asset);
  });
  it('rejects a receipt for another actor or a non-image asset', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ...asset, uploadedByUserId: fileId }))
      .mockResolvedValueOnce(Response.json({ ...asset, contentType: 'image/svg+xml' }));
    vi.stubGlobal('fetch', fetch);
    expect((await POST(request(true), params())).status).toBe(502);
    expect((await POST(request(true), params())).status).toBe(415);
  });
  it('downloads only through the configured backend and never follows a downloadUrl', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ ...asset, downloadUrl: 'https://elsewhere.invalid/secret' }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal('fetch', fetch);
    const result = await GET(request(), params([fileId]));
    expect(result.headers.get('Cache-Control')).toContain('no-store');
    expect(result.headers.get('Content-Type')).toBe('image/png');
    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(
      fetch.mock.calls.every(([url]) => new URL(String(url)).hostname !== 'elsewhere.invalid'),
    ).toBe(true);
  });
  it('honors backend authorization and does not fetch content after a denied metadata request', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ code: 'FILE_NOT_FOUND' }, { status: 404 }));
    vi.stubGlobal('fetch', fetch);
    expect((await GET(request(), params([fileId]))).status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('refuses to expose owner-only processing metadata for another user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ...asset, uploadedByUserId: fileId })),
    );
    expect((await GET(request(), params([fileId, 'metadata']))).status).toBe(403);
  });
  it('stops a delayed image download when the account context changes', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(asset))
        .mockResolvedValueOnce(
          new Response(
            new ReadableStream({
              start(c) {
                controller = c;
              },
            }),
          ),
        ),
    );
    const result = await GET(request(), params([fileId]));
    const pending = result.arrayBuffer();
    revision = 'b';
    controller.enqueue(new Uint8Array([1]));
    controller.close();
    await expect(pending).rejects.toMatchObject({ status: 409 });
  });
});
