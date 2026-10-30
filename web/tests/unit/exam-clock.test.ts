import { describe, expect, it } from 'vitest';
import { examClockLabel, remainingExamSeconds } from '@/features/personal/school/exam-clock';

describe('server-anchored exam clock', () => {
  it('uses the server interval and elapsed time, independent of device wall time', () => {
    expect(remainingExamSeconds('2026-10-29T12:30:00Z', '2026-10-29T12:00:00Z', 1500)).toBe(1799);
    expect(remainingExamSeconds('2026-10-29T16:00:00+03:30', '2026-10-29T12:00:00Z', 0)).toBe(1800);
  });
  it('expires without going negative and does not extend time for a negative elapsed value', () => {
    expect(remainingExamSeconds('2026-10-29T12:00:03Z', '2026-10-29T12:00:00Z', 4000)).toBe(0);
    expect(remainingExamSeconds('2026-10-29T12:00:03Z', '2026-10-29T12:00:00Z', -1000)).toBe(3);
  });
  it.each([
    ['invalid', '2026-10-29T12:00:00Z', 0],
    ['2026-10-29T12:00:00Z', 'invalid', 0],
    ['2026-10-29T12:00:00Z', '2026-10-29T12:00:00Z', NaN],
  ])('does not turn an invalid clock into a valid deadline (%s)', (deadline, now, elapsed) => {
    expect(remainingExamSeconds(deadline as string, now as string, elapsed as number)).toBeNull();
  });
  it('shows seconds, full hours and zero without wrapping a long exam', () => {
    expect(examClockLabel(65)).toBe('01:05');
    expect(examClockLabel(3605)).toBe('1:00:05');
    expect(examClockLabel(0)).toBe('00:00');
  });
});
