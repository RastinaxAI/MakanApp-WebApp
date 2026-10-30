import { describe, it, expect } from 'vitest';
import {
  toJalaliDate,
  fromJalaliDate,
  jalaliInputValue,
  parseJalaliInput,
  dateRangeError,
} from '@/lib/jalali-date';
describe('Jalali calendar adapter at the API boundary', () => {
  it.each([
    ['1403/01/01', '2024-03-20'],
    ['1378/10/11', '2000-01-01'],
    ['1399/12/30', '2021-03-20'],
    ['1405/08/07', '2026-10-29'],
  ])('round-trips %s without a timezone shift', (jalali, iso) => {
    expect(fromJalaliDate(jalali)).toBe(iso);
    expect(toJalaliDate(iso)).toBe(jalali);
  });
  it('normalizes Persian and Arabic digits and validates actual calendar days', () => {
    expect(parseJalaliInput('۱۴۰۳/۰۱/۰۱')).toBe('2024-03-20');
    expect(parseJalaliInput('١٤٠٣/٠١/٠١')).toBe('2024-03-20');
    for (const date of [
      '1400/12/30',
      '1403/07/31',
      '1403/13/01',
      '1403/00/10',
      '2024-03-20',
      '1403/01/01 12:00',
    ])
      expect(parseJalaliInput(date)).toBeNull();
    expect(parseJalaliInput('')).toBe('');
  });
  it('preserves the local time until the existing timestamp adapter converts it to UTC', () => {
    expect(parseJalaliInput('۱۴۰۳/۰۱/۰۱ ۱۴:۳۰', true)).toBe('2024-03-20T14:30');
    expect(jalaliInputValue('2024-03-20T14:30', true)).toBe('1403/01/01 14:30');
    for (const date of ['1403/01/01', '1403/01/01 24:00', '1403/01/01 12:60'])
      expect(parseJalaliInput(date, true)).toBeNull();
  });
  it('does not introduce a role or age policy while enforcing supplied date limits', () => {
    expect(dateRangeError('2026-10-30', undefined, '2026-10-29')).not.toBe('');
    expect(dateRangeError('2000-01-01', undefined, '2026-10-29')).toBe('');
    expect(dateRangeError('2026-10-29T10:00', '2026-10-29T11:00')).not.toBe('');
  });
  it('round-trips all Gregorian month boundaries across leap years and Nowruz', () => {
    for (let year = 1990; year <= 2030; year++)
      for (let month = 1; month <= 12; month++) {
        const date = year + '-' + String(month).padStart(2, '0') + '-01';
        expect(fromJalaliDate(toJalaliDate(date))).toBe(date);
      }
  });
});
