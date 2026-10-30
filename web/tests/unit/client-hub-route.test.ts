import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  clientId: vi.fn(),
  state: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  locked: false,
}));
vi.mock('@/lib/server/client-session', () => ({
  clientSessionId: mocks.clientId,
  getClientState: mocks.state,
}));
vi.mock('@/lib/server/session', () => ({
  readSession: mocks.read,
  writeSession: mocks.write,
  withSessionLock: async (_id: string, work: () => Promise<unknown>) => {
    mocks.locked = true;
    try {
      return await work();
    } finally {
      mocks.locked = false;
    }
  },
}));
import { createHash } from 'node:crypto';
import { GET, POST } from '@/app/api/client/hub/[[...path]]/route';
let session: {
  accessToken: string;
  revision: string;
  messagingConnections: { hash: string; revision: string; createdAt: number }[];
};
const parameters = { params: Promise.resolve({ path: undefined }) };
function request(method = 'GET', body?: string) {
  return new Request('http://127.0.0.1:3000/api/client/hub?id=connection-a', {
    method,
    body,
    headers: {
      Host: '127.0.0.1:3000',
      Origin: 'http://127.0.0.1:3000',
      'X-Makan-Context': 'revision-a',
    },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  session = {
    accessToken: 'server-only-token',
    revision: 'revision-a',
    messagingConnections: [
      {
        hash: createHash('sha256').update('connection-a').digest('hex'),
        revision: 'revision-a',
        createdAt: Date.now(),
      },
    ],
  };
  mocks.clientId.mockResolvedValue('session-a');
  mocks.state.mockResolvedValue({ revision: 'revision-a' });
  mocks.read.mockImplementation(async () => session);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('authenticated hub proxy', () => {
  it('does not accept a connection negotiated by another session or context', async () => {
    session.messagingConnections = [];
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await GET(request(), parameters)).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps the long poll outside the refresh lock and strips event data before sending it to the browser', async () => {
    const fetch = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(mocks.locked).toBe(false);
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer server-only-token');
      return new Response(
        JSON.stringify({
          type: 1,
          target: 'ConversationChanged',
          arguments: [{ text: 'restricted event content' }],
        }) + '\u001e',
      );
    });
    vi.stubGlobal('fetch', fetch);
    const response = await GET(request(), parameters);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      '{"type":1,"target":"ConversationChanged","arguments":[]}\u001e',
    );
  });
  it('discards a poll that finishes after a local context revision changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        session.revision = 'revision-b';
        return new Response('{}\u001e');
      }),
    );
    const response = await GET(request(), parameters);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'CONTEXT_CHANGED' });
  });
  it('rejects hub message writes; message commands must use the REST outbox contract', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const response = await POST(
      request('POST', '{"type":1,"invocationId":"0","target":"SendMessage","arguments":[]}\u001e'),
      parameters,
    );
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
