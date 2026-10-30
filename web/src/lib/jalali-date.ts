import { latinDigits } from './formatting';
const dayMs = 86400000;
const calendar = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});
function parts(date: Date) {
  const p = calendar.formatToParts(date);
  return ['year', 'month', 'day'].map((type) =>
    Number(p.find((item) => item.type === type)?.value),
  );
}
function dateOnly(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T00:00:00Z')) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
  );
}
export function toJalaliDate(value: string) {
  if (!dateOnly(value)) return '';
  const [year, month, day] = parts(new Date(value + 'T00:00:00Z'));
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('/');
}
export function fromJalaliDate(value: string): string | null {
  const normalized = latinDigits(value).trim();
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1 || year > 9377 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const target = year * 10000 + month * 100 + day;
  // Compare date-only calendar days at UTC; no local offset or DST enters conversion.
  let lo = Math.floor(Date.parse(String(year + 620).padStart(4, '0') + '-01-01T00:00:00Z') / dayMs);
  let hi = Math.floor(
    Date.parse(String(Math.min(9999, year + 623)).padStart(4, '0') + '-12-31T00:00:00Z') / dayMs,
  );
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2),
      date = new Date(mid * dayMs);
    const [y, m, d] = parts(date);
    const key = y * 10000 + m * 100 + d;
    if (key === target) return date.toISOString().slice(0, 10);
    if (key < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}
export function jalaliInputValue(value: string, withTime = false) {
  const [date, time] = value.split('T');
  const jalali = toJalaliDate(date);
  if (!jalali) return '';
  return jalali + (withTime && time ? ' ' + time.slice(0, 5) : '');
}
export function parseJalaliInput(value: string, withTime = false): string | null {
  const normalized = latinDigits(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  const [date, time, ...extra] = normalized.split(' ');
  if (extra.length) return null;
  const gregorian = fromJalaliDate(date);
  if (!gregorian) return null;
  if (!withTime) return time ? null : gregorian;
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return gregorian + 'T' + time;
}
export function dateRangeError(value: string, min?: string, max?: string) {
  if (!value) return '';
  if (min && (min.includes('T') ? value : value.slice(0, 10)) < min)
    return 'تاریخ انتخاب‌شده پیش از شروع بازهٔ مجاز است.';
  if (max && (max.includes('T') ? value : value.slice(0, 10)) > max)
    return 'تاریخ انتخاب‌شده پس از پایان بازهٔ مجاز است.';
  return '';
}
