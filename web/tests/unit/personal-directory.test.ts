import { describe, expect, it } from 'vitest';
import { resolvePersonInput } from '@/features/personal/messaging/directory';
describe('migrated directory normalization', () => {
  it('normalizes Persian digits and national phone notation without inventing an account id', () => {
    expect(resolvePersonInput('۰۹۱۲ ۰۰۰ ۰۱۰۱')).toEqual({
      phoneNumber: '+989120000101',
      username: null,
    });
    expect(resolvePersonInput('+98 912 000 0101')).toEqual({
      phoneNumber: '+989120000101',
      username: null,
    });
  });
  it('preserves the server username while removing only the leading @', () =>
    expect(resolvePersonInput(' @dev.Student ')).toEqual({
      username: 'dev.Student',
      phoneNumber: null,
    }));
  it.each(['09', '<script>', 'a b', '+1abc'])('rejects malformed lookup %s', (input) =>
    expect(() => resolvePersonInput(input)).toThrow(),
  );
});
