import { describe, expect, it } from 'vitest';
import {
  currentSchoolWeek,
  shiftSchoolWeek,
  schoolWeekRange,
  nearestUpcoming,
  sessionEndDayLabel,
} from '@/features/personal/school/calendar-model';
describe('weekly school agenda', () => {
  it('starts Saturday and ends Friday when opened in the middle of the week', () => {
    expect(currentSchoolWeek(new Date(2026, 9, 29, 12))).toBe('2026-10-24');
    const week = schoolWeekRange('2026-10-29');
    expect(week.first).toBe('2026-10-24');
    expect(week.last).toBe('2026-10-30');
    expect(week.days.map((d) => d.weekday)).toEqual([
      'شنبه',
      'یکشنبه',
      'دوشنبه',
      'سه‌شنبه',
      'چهارشنبه',
      'پنجشنبه',
      'جمعه',
    ]);
  });
  it('keeps both month names and years clear when a week crosses Nowruz', () => {
    const week = schoolWeekRange('2025-03-21');
    expect(week.firstLabel).toContain('اسفند');
    expect(week.firstLabel).toContain('۱۴۰۳');
    expect(week.lastLabel).toContain('فروردین');
    expect(week.lastLabel).toContain('۱۴۰۴');
    expect(week.label).toBe('۲۵ اسفند ۱۴۰۳ تا ۱ فروردین ۱۴۰۴');
    expect(shiftSchoolWeek(week.first, 1)).toBe('2025-03-22');
    expect(shiftSchoolWeek(shiftSchoolWeek(week.first, 1), -1)).toBe(week.first);
  });
  it('shows one month and year for a compact same-month range', () => {
    expect(schoolWeekRange('2026-09-05').label).toBe('۱۴ تا ۲۰ شهریور ۱۴۰۵');
  });
  it('keeps both months when the week crosses a month boundary', () => {
    expect(schoolWeekRange('2026-09-19').label).toBe('۲۸ شهریور تا ۳ مهر ۱۴۰۵');
  });
  it('covers all seven calendar days through leap day with adjacent UTC query bounds', () => {
    const week = schoolWeekRange('2024-02-29'),
      next = schoolWeekRange(shiftSchoolWeek(week.first, 1));
    expect(week.days).toHaveLength(7);
    expect(week.days.map((d) => d.date)).toContain('2024-02-29');
    expect(new Date(week.fromUtc).getHours()).toBe(0);
    expect(new Date(week.toUtc).getHours()).toBe(23);
    expect(Date.parse(next.fromUtc) - Date.parse(week.toUtc)).toBe(1);
  });
  it('rejects invalid calendar days instead of silently rolling into another week', () => {
    expect(() => schoolWeekRange('2025-02-30')).toThrow();
    expect(() => schoolWeekRange('invalid')).toThrow();
  });
  it('selects the closest future item, ignores past and invalid times and preserves input order', () => {
    const rows = [
      { id: 'late', at: '2026-11-05T12:00:00Z' },
      { id: 'old', at: '2026-10-01T12:00:00Z' },
      { id: 'nearest', at: '2026-10-30T12:00:00Z' },
      { id: 'invalid', at: 'invalid' },
    ];
    expect(nearestUpcoming(rows, (x) => x.at, Date.parse('2026-10-29T00:00:00Z'))?.id).toBe(
      'nearest',
    );
    expect(rows.map((x) => x.id)).toEqual(['late', 'old', 'nearest', 'invalid']);
    expect(nearestUpcoming([], () => null)).toBeUndefined();
  });
  it('identifies the local end date of an overnight session without labeling same-day sessions as overnight', () => {
    const start = new Date(2026, 9, 28, 23, 7).toISOString(),
      end = new Date(2026, 9, 29, 0, 7).toISOString();
    expect(sessionEndDayLabel(start, end)).toBe('۷ آبان ۱۴۰۵');
    expect(sessionEndDayLabel(start, new Date(2026, 9, 28, 23, 57).toISOString())).toBe('');
  });
});
