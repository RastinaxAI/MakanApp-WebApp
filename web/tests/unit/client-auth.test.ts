import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  upstream: vi.fn(),
  authenticated: vi.fn(),
  clientId: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/lib/server/backend', async (original) => ({
  ...(await original<typeof import('@/lib/server/backend')>()),
  backendFetch: mocks.upstream,
  authenticatedFetch: mocks.authenticated,
}));
vi.mock('@/lib/server/client-session', () => ({
  CLIENT_COOKIE: 'makan_client_session',
  clientSessionId: mocks.clientId,
}));
vi.mock('@/lib/server/session', () => ({
  writeSession: mocks.write,
  readSession: mocks.read,
  removeSession: mocks.remove,
  withSessionLock: async (_id: string, work: () => Promise<unknown>) => work(),
  cookieOptions: () => ({
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600,
  }),
}));
import { POST } from '@/app/api/client/auth/[action]/route';
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  phoneNumber: '+989120000101',
  isProfileComplete: false,
  firstName: null,
  lastName: null,
  displayName: null,
  username: null,
};
function req(action: string, origin = 'http://127.0.0.1:3000', code = '123456') {
  return new Request(`http://127.0.0.1:3000/api/client/auth/${action}`, {
    method: 'POST',
    headers: { Origin: origin, Host: '127.0.0.1:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '09120000101',
      challengeId: '00000000-0000-4000-8000-000000000002',
      code,
      deviceName: 'test',
    }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3000');
  vi.stubEnv('SESSION_SECRET', '0'.repeat(64));
  mocks.clientId.mockResolvedValue(undefined);
  mocks.write.mockResolvedValue(undefined);
  mocks.upstream.mockImplementation(async (path: string) =>
    path === '/api/v1/auth/otp/verify'
      ? Response.json({
          accessToken: 'fixture-access',
          refreshToken: 'fixture-refresh',
          tokenType: 'Bearer',
          expiresAtUtc: '2099-01-01T00:00:00Z',
          refreshExpiresAtUtc: '2099-02-01T00:00:00Z',
          user,
        })
      : path === '/api/v1/me'
        ? Response.json(user)
        : new Response(null, { status: 204 }),
  );
});
afterEach(() => vi.unstubAllEnvs());
describe('general-account authentication isolated from the owner session', () => {
  it.each(['', '12345', '1234567', 'abcdef'])(
    'rejects invalid OTP %j before contacting the backend',
    async (code) => {
      const response = await POST(req('verify', 'http://127.0.0.1:3000', code), {
        params: Promise.resolve({ action: 'verify' }),
      });
      expect(response.status).toBe(400);
      expect(mocks.upstream).not.toHaveBeenCalled();
      expect(mocks.write).not.toHaveBeenCalled();
    },
  );
  it('admits a matching ordinary identity without an educational role, keeps tokens server-side and sets only its own HttpOnly cookie', async () => {
    const response = await POST(req('verify'), { params: Promise.resolve({ action: 'verify' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.cookies.getAll().map((cookie) => cookie.name)).toEqual([
      'makan_client_session',
    ]);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).not.toContain('fixture-access');
    expect(mocks.upstream.mock.calls.map((call) => call[0])).toEqual([
      '/api/v1/auth/otp/verify',
      '/api/v1/me',
    ]);
    expect(mocks.write).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ userId: user.id, accessToken: 'fixture-access' }),
    );
  });
  it('rejects a mismatch between the token principal and verified self identity and revokes the new upstream session', async () => {
    mocks.upstream.mockImplementation(async (path: string) =>
      path === '/api/v1/auth/otp/verify'
        ? Response.json({
            accessToken: 'fixture-access',
            refreshToken: 'fixture-refresh',
            tokenType: 'Bearer',
            expiresAtUtc: '2099-01-01T00:00:00Z',
            refreshExpiresAtUtc: '2099-02-01T00:00:00Z',
            user,
          })
        : path === '/api/v1/me'
          ? Response.json({ ...user, id: '00000000-0000-4000-8000-000000000099' })
          : new Response(null, { status: 204 }),
    );
    const response = await POST(req('verify'), { params: Promise.resolve({ action: 'verify' }) });
    expect(response.status).toBe(502);
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.upstream).toHaveBeenLastCalledWith(
      '/api/v1/auth/logout',
      { method: 'POST' },
      'fixture-access',
    );
  });
  it('rejects a cross-origin submission before any upstream action', async () => {
    const response = await POST(req('verify', 'http://malicious.invalid'), {
      params: Promise.resolve({ action: 'verify' }),
    });
    expect(response.status).toBe(403);
    expect(mocks.upstream).not.toHaveBeenCalled();
  });
  it('logs out and clears only the personal session cookie', async () => {
    mocks.clientId.mockResolvedValue('00000000-0000-4000-8000-000000000003');
    mocks.read.mockResolvedValue({ accessToken: 'fixture-access' });
    mocks.authenticated.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    const response = await POST(req('logout'), { params: Promise.resolve({ action: 'logout' }) });
    expect(response.status).toBe(204);
    expect(response.cookies.getAll().map((cookie) => cookie.name)).toEqual([
      'makan_client_session',
    ]);
    expect(mocks.remove).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000003');
  });
  it('preserves the backend verification failure and its trace without creating a session or reading a profile', async () => {
    const traceId = 'test-backend-trace';
    mocks.upstream.mockResolvedValue(
      Response.json({ code: 'UNEXPECTED_ERROR', traceId }, { status: 500 }),
    );
    const response = await POST(req('verify'), { params: Promise.resolve({ action: 'verify' }) });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'UNEXPECTED_ERROR', traceId });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.upstream).toHaveBeenCalledTimes(1);
    expect(mocks.upstream.mock.calls[0][0]).toBe('/api/v1/auth/otp/verify');
  });
});
