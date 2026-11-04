import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { upstreamUrl } from '@/lib/server/upstream-url';
import { checkOrigin } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { seal, unseal, cookieOptions, validSessionId, type Session } from '@/lib/server/session';
import { safeAuthReturnPath } from '@/lib/auth-return';
import { parseProblem, ApiError } from '@/lib/api/errors';
const origin = 'http://127.0.0.1:3132';
beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', '1'.repeat(64));
  vi.stubEnv('APP_ORIGIN', origin);
  vi.stubEnv('BACKEND_BASE_URL', 'http://127.0.0.1:3457');
  vi.stubEnv('MAKAN_TEST_MODE', 'fixture');
});
afterEach(() => vi.unstubAllEnvs());
describe('adversarial upstream destination handling', () => {
  it.each([
    'https://attacker.invalid/api/v1/me',
    '//attacker.invalid/api/v1/me',
    '/\\attacker.invalid/api/v1/me',
    '/api/v1/../../admin',
    '/api/v1/%2e%2e/admin',
    '/api/v1/files/%2fsecret',
    '/api/v1/files/%5csecret',
    '/api/v1/files/%252fsecret',
    '/api/v1/me#secret',
    '/api/v1/me\r\nAuthorization: injected',
    '/api/v1/me%00',
    '/api/v1/%ZZ',
    '/api/admin/v1/me',
  ])('blocks origin/namespace/traversal payload %s', (value) => {
    expect(() => upstreamUrl(value, 'http://127.0.0.1:3457')).toThrow();
  });
  it('retains an encoded query while fixing the destination origin', () => {
    const url = upstreamUrl(
      '/api/v1/conversations?Search=%D9%85%D8%A7%DA%A9%D8%A7%D9%86',
      'http://127.0.0.1:3457',
    );
    expect(url.origin).toBe('http://127.0.0.1:3457');
    expect(url.searchParams.get('Search')).toBe('ماکان');
  });
  it.each([
    'file:///etc/passwd',
    'http://user:password@127.0.0.1:3457',
    'http://127.0.0.1:3457/subpath',
    'http://127.0.0.1:3457?redirect=elsewhere',
    'http://127.0.0.1:3457#fragment',
  ])('rejects a malformed configured backend %s', (backend) => {
    vi.stubEnv('BACKEND_BASE_URL', backend);
    expect(() => serverConfig()).toThrow();
  });
  it('prevents fixture tests from escaping to an external backend', () => {
    vi.stubEnv('BACKEND_BASE_URL', 'https://external.invalid');
    expect(() => serverConfig()).toThrow('Fixture');
  });
});
describe('cross-site request forgery boundary', () => {
  it.each([
    undefined,
    'null',
    'https://attacker.invalid',
    'http://127.0.0.1:3133',
    'http://127.0.0.1:3132.attacker.invalid',
    'http://127.0.0.1:3132@attacker.invalid',
  ])('rejects untrusted Origin %s', (value) => {
    const headers: Record<string, string> = { Host: '127.0.0.1:3132' };
    if (value) headers.Origin = value;
    expect(
      checkOrigin(new Request(origin + '/api/client/auth/challenge', { method: 'POST', headers })),
    ).toBe(false);
  });
  it('rejects a forged Host even when Origin matches', () =>
    expect(
      checkOrigin(
        new Request(origin, {
          method: 'POST',
          headers: { Origin: origin, Host: 'attacker.invalid' },
        }),
      ),
    ).toBe(false));
  it('accepts exactly the configured origin and host', () =>
    expect(
      checkOrigin(
        new Request(origin, {
          method: 'POST',
          headers: { Origin: origin, Host: '127.0.0.1:3132' },
        }),
      ),
    ).toBe(true));
});
describe('sealed sessions and redirects', () => {
  const session: Session = {
    accessToken: 'synthetic-access-token',
    refreshToken: 'synthetic-refresh-token',
    expiresAtUtc: '2099-01-01T00:00:00Z',
    refreshExpiresAtUtc: '2099-02-01T00:00:00Z',
    revision: 'fixture-revision',
  };
  it.each([0, 12, 20, 28, 40])('rejects tampering at encrypted byte %s', (index) => {
    const encrypted = seal(session);
    encrypted[index] ^= 1;
    expect(() => unseal(encrypted)).toThrow();
  });
  it('uses fresh nonces and does not reveal plaintext tokens', () => {
    const a = seal(session),
      b = seal(session);
    expect(a.equals(b)).toBe(false);
    expect(a.toString()).not.toContain(session.accessToken);
    expect(unseal(a)).toEqual(session);
  });
  it('rejects a session encrypted with a different key', () => {
    const encrypted = seal(session);
    vi.stubEnv('SESSION_SECRET', '2'.repeat(64));
    expect(() => unseal(encrypted)).toThrow();
  });
  it('keeps the production session cookie inaccessible to JavaScript', () => {
    vi.stubEnv('COOKIE_SECURE', 'true');
    expect(cookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
  });
  it.each([
    '../../etc/passwd',
    '/absolute/file',
    '%2e%2e%2fprivate',
    '00000000-0000-4000-8000-000000000001/../../x',
  ])('rejects session filename injection %s', (value) => expect(validSessionId(value)).toBe(false));
  it.each([
    'javascript:alert(1)',
    '//attacker.invalid/personal',
    '/personal/../admin',
    '/personal/\\attacker.invalid',
    '/personal/%2e%2e/admin',
    '/personal\r\nLocation: https://attacker.invalid',
  ])('rejects malicious return target %s', (value) => expect(safeAuthReturnPath(value)).toBeNull());
});
describe('safe backend error projection', () => {
  it('does not copy tokens, stacks or arbitrary error details into the client response', () => {
    const result = parseProblem(
      {
        status: 500,
        code: 'UNKNOWN',
        detail: '<script>sendSecret()</script>',
        stack: 'private backend stack',
        accessToken: 'private-token',
      },
      500,
    );
    expect(JSON.stringify(result)).not.toContain('private');
    expect(new ApiError(500, result).message).not.toContain('sendSecret');
  });
});
