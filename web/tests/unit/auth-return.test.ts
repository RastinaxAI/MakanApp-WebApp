import { describe, it, expect } from 'vitest';
import { safeAuthReturnPath, rememberAuthReturn, takeAuthReturn } from '@/lib/auth-return';
describe('return to authorized client route after sign in', () => {
  it('retains a deep invitation destination and its client fragment', () => {
    expect(safeAuthReturnPath('/personal/extracurricular/invitations?ref=mail#rules')).toBe(
      '/personal/extracurricular/invitations?ref=mail#rules',
    );
  });
  it.each([
    'https://elsewhere.invalid',
    '//elsewhere.invalid/personal',
    '/personal-malicious',
    '/admin',
    '/personal/\\elsewhere',
    '/personal/\r\nX: secret',
    '/personal/../admin',
  ])('rejects unsafe destination %s', (value) => {
    expect(safeAuthReturnPath(value)).toBeNull();
  });
  it('consumes a pending destination exactly once', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
    rememberAuthReturn(storage, '/personal/messages?view=all');
    expect(takeAuthReturn(storage)).toBe('/personal/messages?view=all');
    expect(takeAuthReturn(storage)).toBeNull();
  });
  it('does not make a blocked browser store prevent sign in', () => {
    const unavailable = () => {
      throw new Error('unavailable');
    };
    expect(() => rememberAuthReturn({ setItem: unavailable }, '/personal')).not.toThrow();
    expect(takeAuthReturn({ getItem: unavailable, removeItem: unavailable })).toBeNull();
  });
});
