export function latinDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (c) =>
    String(c.charCodeAt(0) >= 0x6f0 ? c.charCodeAt(0) - 0x6f0 : c.charCodeAt(0) - 0x660),
  );
}
export function number(value: number | null | undefined) {
  return value == null ? '—' : new Intl.NumberFormat('fa-IR').format(value);
}
export function date(value: string | null | undefined, time = false) {
  if (!value) return '—';
  // Date-only values are anchored at noon UTC; never interpret them as local timestamps.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(d.getTime())) return 'تاریخ نامعتبر';
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(time ? ({ hour: '2-digit', minute: '2-digit' } as const) : {}),
  }).format(d);
}
export function money(amount: number | null | undefined, currency: string | null | undefined) {
  return amount == null
    ? '—'
    : `${number(amount)} ${currency === 'Irr' ? 'ریال' : (currency ?? 'واحد نامشخص')}`;
}
export function localDateTime(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function utcDateTime(value: string) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : value;
}
