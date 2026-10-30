import { describe, it, expect } from 'vitest';
import { clientCookieName } from '@/lib/server/cookie-name';
describe('instance cookie names', () => {
  it('preserves the existing preview cookie and isolates the Docker instance', () => {
    expect(clientCookieName()).toBe('makan_client_session');
    expect(clientCookieName('makan_client_session_8080')).not.toBe(clientCookieName());
  });
  it('rejects names that could change cookie semantics', () => {
    for (const value of ['', 'session; Secure', 'session=bad', 'name\r\nX: bad', 'a'.repeat(65)])
      expect(() => clientCookieName(value)).toThrow();
  });
});
