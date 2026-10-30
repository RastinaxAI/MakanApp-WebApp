import { describe, expect, it } from 'vitest';
import { canonicalLocalLoginUrl } from '@/lib/login-origin';

describe('local login canonical address', () => {
  it.each(['localhost:3000', '[::1]:3000'])(
    'moves alias %s to the configured address before submitting credentials',
    (host) => {
      expect(canonicalLocalLoginUrl(host, 'http://127.0.0.1:3000')).toBe(
        'http://127.0.0.1:3000/enter',
      );
    },
  );
  it('uses the configured port and supports a localhost canonical address', () => {
    expect(canonicalLocalLoginUrl('127.0.0.1:3012', 'http://localhost:3012')).toBe(
      'http://localhost:3012/enter',
    );
  });
  it.each([
    null,
    '127.0.0.1:3000',
    'localhost:3001',
    'foreign.example:3000',
    'localhost.evil.example:3000',
    'localhost:3000@foreign.example',
    'localhost:3000/path',
  ])('does not redirect canonical, missing, unrelated or malformed host %s', (host) => {
    expect(canonicalLocalLoginUrl(host, 'http://127.0.0.1:3000')).toBeNull();
  });
  it('does not rewrite a deployed domain to a local address', () => {
    expect(canonicalLocalLoginUrl('localhost:3000', 'https://panel.example')).toBeNull();
  });
});
