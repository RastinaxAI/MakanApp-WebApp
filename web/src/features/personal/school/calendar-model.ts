function calendarDate(value: string) {
  const date = new Date(value + 'T12:00:00Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error('تاریخ برنامه معتبر نیست.');
  return date;
}
function addDays(value: string, amount: number) {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function weekStart(value: string) {
  return addDays(value, -((calendarDate(value).getUTCDay() + 1) % 7));
}
export function currentSchoolWeek(now = new Date()) {
  return weekStart(localCalendarDay(now.toISOString()));
}
export function shiftSchoolWeek(first: string, amount: number) {
  return addDays(weekStart(first), 7 * amount);
}
export function schoolDayLabel(value: string) {
  const parts = new Intl.DateTimeFormat('fa-IR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(calendarDate(value));
  return ['day', 'month', 'year']
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join(' ');
}
function compactWeekLabel(first: string, last: string) {
  const parts = (value: string) => {
    const formatted = new Intl.DateTimeFormat('fa-IR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(calendarDate(value));
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      formatted.find((part) => part.type === type)!.value;
    return { day: read('day'), month: read('month'), year: read('year') };
  };
  const from = parts(first),
    to = parts(last);
  if (from.year !== to.year) return `${schoolDayLabel(first)} تا ${schoolDayLabel(last)}`;
  const start = from.month === to.month ? from.day : `${from.day} ${from.month}`;
  return `${start} تا ${to.day} ${to.month} ${to.year}`;
}
export function schoolWeekRange(anchor: string) {
  const first = weekStart(anchor),
    last = addDays(first, 6),
    after = addDays(first, 7);
  const start = new Date(first + 'T00:00:00'),
    end = new Date(new Date(after + 'T00:00:00').getTime() - 1);
  return {
    first,
    last,
    fromUtc: start.toISOString(),
    toUtc: end.toISOString(),
    firstLabel: schoolDayLabel(first),
    lastLabel: schoolDayLabel(last),
    label: compactWeekLabel(first, last),
    days: Array.from({ length: 7 }, (_, index) => {
      const day = addDays(first, index);
      return {
        date: day,
        label: schoolDayLabel(day),
        weekday: new Intl.DateTimeFormat('fa-IR', { weekday: 'long', timeZone: 'UTC' }).format(
          calendarDate(day),
        ),
      };
    }),
  };
}
export function localCalendarDay(time: string) {
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
export function sessionEndDayLabel(start: string, end: string) {
  const first = localCalendarDay(start),
    last = localCalendarDay(end);
  return first && last && first !== last ? schoolDayLabel(last) : '';
}
export function nearestUpcoming<T>(
  items: readonly T[],
  time: (item: T) => string | null | undefined,
  now = Date.now(),
) {
  return items
    .filter((item) => {
      const value = Date.parse(time(item) ?? '');
      return Number.isFinite(value) && value >= now;
    })
    .sort((a, b) => Date.parse(time(a)!) - Date.parse(time(b)!))[0];
}
