/** Locale-aware formatting: Persian digits, Jalali calendar, relative time. */

export type Locale = 'fa' | 'ar' | 'en';

const LOCALES: Record<Locale, string> = {
  fa: 'fa-IR-u-ca-persian',
  ar: 'ar',
  en: 'en-GB',
};

let current: Locale = 'fa';

export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale === 'en' ? 'en' : locale;
  document.documentElement.dir = 'rtl';
}

export function getLocale(): Locale {
  return current;
}

const cache = new Map<string, Intl.DateTimeFormat | null>();

function fmtDate(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  let out: Intl.DateTimeFormat | null = null;
  try {
    out = new Intl.DateTimeFormat(LOCALES[current], options);
  } catch {
    out = null;
  }
  cache.set(key, out);
  return out;
}

const NUMBER_FMT = () =>
  new Intl.NumberFormat(LOCALES[current], { maximumFractionDigits: 0, numberingSystem: 'latn' });

export function n(value: number): string {
  return NUMBER_FMT().format(value);
}

export function n1(value: number): string {
  return new Intl.NumberFormat(LOCALES[current], { maximumFractionDigits: 1, numberingSystem: 'latn' }).format(value);
}

export function money(value: number): string {
  return `${n(value)} تومان`;
}

export function formatDate(input: Date | number | string, opts: { time?: boolean; short?: boolean } = {}): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  const f = fmtDate('dt' + JSON.stringify(opts), {
    year: 'numeric',
    month: opts.short ? 'short' : 'long',
    day: 'numeric',
    ...(opts.time ? { hour: '2-digit', minute: '2-digit' } : {}),
    numberingSystem: 'latn',
  });
  return f ? f.format(date) : date.toLocaleDateString();
}

export function formatTime(input: Date | number | string): string {
  const date = input instanceof Date ? input : new Date(input);
  const f = fmtDate('time', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
  return f ? f.format(date) : '--:--';
}

export function dayKey(input: Date | number | string): string {
  const d = input instanceof Date ? input : new Date(input);
  const f = fmtDate('day', { year: 'numeric', month: '2-digit', day: '2-digit', numberingSystem: 'latn' });
  return f ? f.format(d) : d.toISOString().slice(0, 10);
}

export function weekday(input: Date | number | string): string {
  const d = input instanceof Date ? input : new Date(input);
  const f = fmtDate('wd', { weekday: 'long', numberingSystem: 'latn' });
  return f ? f.format(d) : '';
}

/** Midnight of the local day an instant falls in — the chat grouping unit. */
function midnight(input: Date | number | string): number {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole calendar days between an instant and now: 0 = today, 1 = yesterday. */
export function daysAgo(input: Date | number | string, now = Date.now()): number {
  return Math.round((midnight(now) - midnight(input)) / 86_400_000);
}

/**
 * The divider a chat puts above the first message of a day: the three relative
 * words people actually use, then the Jalali date once "پریروز" stops making
 * sense. Exactly one of these appears per day in a thread.
 */
export function dayLabel(input: Date | number | string, now = Date.now()): string {
  const age = daysAgo(input, now);
  if (age === 0) return 'امروز';
  if (age === 1) return 'دیروز';
  if (age === 2) return 'پریروز';
  const date = input instanceof Date ? input : new Date(input);
  return `${weekday(date)}، ${formatDate(date, { short: true })}`;
}

/** Persian and Arabic-Indic digits → Latin; everything else passes through. */
export function latinDigits(input: string): string {
  return input
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * An Iranian mobile number as `09XXXXXXXXX`, however it was typed
 * (۰۹۱۲…, +98 912…, dashes). Returns null when it is not a mobile number.
 */
export function normalizePhone(input: string): string | null {
  const digits = latinDigits(input)
    .replace(/[\s\-()._]/g, '')
    .replace(/^(?:\+98|0098|98)(?=9)/, '0');
  return /^09\d{9}$/.test(digits) ? digits : null;
}

/**
 * Folds a Persian string down to a shape that compares equal however it was
 * typed. Persian text is full of zero-width non-joiners (`اطلاعیه‌های` is one
 * word, not two) and of Arabic/Urdu look-alikes that share a keyboard but not
 * a code point, so a literal `includes` misses the very word the user is
 * looking for. Search always runs on this form on *both* sides of the compare.
 */
export function foldForSearch(input: string): string {
  return latinDigits(input)
    // Arabic yeh/kaf and their Urdu variants → the Persian letters
    .replace(/[يىے]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    // hamza carriers → the bare letter they stand on. `آ` is *not* folded to
    // `ا`: alef-madda is its own letter in Persian (آموزش ≠ اموزش).
    .replace(/[أإ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    // harakat, tashdid and the zero-width family (ZWNJ joins two morphemes)
    .replace(/[ً-ْٰ]/g, '')
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    /* Whitespace goes entirely, not merely collapsed: `اطلاعیه‌های` is one
       word joined by a ZWNJ that reads as nothing, and a user who cannot see
       that invisible character types a space instead. Dropping both makes the
       two spellings compare equal. */
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** True when `needle` occurs in `haystack`, both folded. A query that folds
    away to nothing (empty, or nothing but spaces) matches everything, so a
    half-typed box never blanks the list. */
export function searchHit(haystack: string, needle: string): boolean {
  const q = foldForSearch(needle);
  if (!q) return true;
  return foldForSearch(haystack).includes(q);
}

export function relative(input: Date | number | string, now = Date.now()): string {
  const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
  const diff = then - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(LOCALES[current], { numeric: 'auto', style: 'short' });
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (abs < min) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < hour) return rtf.format(Math.round(diff / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), 'day');
  return formatDate(then, { short: true });
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  return parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[1][0]}`;
}

/* Avatar tiles stay in the same family as the rest of the palette: two brand
   blues anchor the set, the warmer tones only ever separate two people. */
const AVATAR_GRADIENTS = [
  'linear-gradient(140deg,#156dee,#5b9bf0)',
  'linear-gradient(140deg,#0f5fd6,#64c8ff)',
  'linear-gradient(140deg,#1b8a5a,#4dcd5e)',
  'linear-gradient(140deg,#b8531b,#f0a30a)',
  'linear-gradient(140deg,#8a5cf6,#d946ef)',
  'linear-gradient(140deg,#c2416b,#ef5350)',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}