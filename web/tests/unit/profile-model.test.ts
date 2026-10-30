import { describe, expect, it } from 'vitest';
import { displayDateOnly, profilePatch, validDateOnly } from '@/features/personal/profile-model';
import { clientValidator } from '@/lib/api/client-contract';
describe('optional self-declared date-only birth date', () => {
  const identity = {
    firstName: ' نام ',
    lastName: ' نام خانوادگی ',
    displayName: ' ',
    username: ' demo ',
  };
  it('validates the calendar without normalizing invalid days', () => {
    expect(validDateOnly('2000-02-29')).toBe(true);
    for (const value of ['2001-02-29', '2000-02-30', '2000-13-01', '2000-01-01T00:00:00Z'])
      expect(validDateOnly(value)).toBe(false);
  });
  it('omits an empty date because null or omission preserve the previous backend value', () => {
    expect(profilePatch({ ...identity, dateOfBirth: '' })).toEqual({
      firstName: 'نام',
      lastName: 'نام خانوادگی',
      displayName: null,
      username: 'demo',
    });
    expect(profilePatch({ ...identity, dateOfBirth: '2000-02-29' }).dateOfBirth).toBe('2000-02-29');
  });
  it('does not let an invalid day silently become the next month', () => {
    expect(() => profilePatch({ ...identity, dateOfBirth: '2001-02-29' })).toThrow();
    expect(displayDateOnly(null)).toBe('ثبت نشده');
    expect(displayDateOnly('invalid')).toBe('ثبت نشده');
  });
  it('formats a date at UTC midnight without shifting its calendar day', () => {
    expect(displayDateOnly('2000-01-01')).toBe(
      new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date('2000-01-01T23:00:00Z'),
      ),
    );
  });
  it('validates the new profile-photo response without pretending it is a full current user', () => {
    const result = clientValidator({ $ref: '#/components/schemas/ProfilePhotoResult2' });
    expect(
      result.safeParse({
        fileAssetId: 'd3700000-0000-0000-0000-000000000001',
        contentType: 'image/png',
      }).success,
    ).toBe(true);
    expect(result.safeParse({ fileAssetId: 'not-an-id', contentType: 'image/png' }).success).toBe(
      false,
    );
  });
  it('rejects timestamps and invalid calendar dates at the API boundary', () => {
    const schema = clientValidator({ type: 'string', format: 'date', nullable: true });
    expect(schema.safeParse('2000-02-29').success).toBe(true);
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse('2001-02-29').success).toBe(false);
    expect(schema.safeParse('2000-01-01T00:00:00Z').success).toBe(false);
  });
});
