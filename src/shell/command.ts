/** ⌘K / Ctrl+K command palette: jump anywhere without hunting through menus. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import { assignments, classes, conversationById, exams, nameOf } from '../data/seed';
import { session } from '../data/session';

interface Entry {
  label: string;
  hint: string;
  href: string;
  glyph: Parameters<typeof icon>[0];
}

function normalise(value: string): string {
  return value
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ً-ْ]/g, '')
    .toLowerCase()
    .trim();
}

function buildIndex(): Entry[] {
  const entries: Entry[] = [
    { label: 'امروز من', hint: 'داشبورد', href: '/school', glyph: 'home' },
    { label: 'برنامه و تقویم', hint: 'آموزشگاه', href: '/school/schedule', glyph: 'calendar' },
    { label: 'کلاس‌های من', hint: 'آموزشگاه', href: '/school/classes', glyph: 'school' },
    { label: 'تکالیف', hint: 'آموزشگاه', href: '/school/assignments', glyph: 'file' },
    { label: 'آزمون‌ها', hint: 'آموزشگاه', href: '/school/exams', glyph: 'quiz' },
    { label: 'منابع و جزوه‌ها', hint: 'آموزشگاه', href: '/school/resources', glyph: 'book' },
    { label: 'پیشرفت و گزارش', hint: 'آموزشگاه', href: '/school/progress', glyph: 'chart' },
    { label: 'گفتگوها', hint: 'پیام‌رسان', href: '/msg', glyph: 'chat' },
    { label: 'گفتگوی تازه', hint: 'پیام‌رسان', href: '/msg/new', glyph: 'plusCircle' },
    { label: 'دستیار', hint: 'دستیار', href: '/ai', glyph: 'ai' },
    { label: 'دفترهای من', hint: 'دستیار', href: '/ai/notebooks', glyph: 'folder' },
    { label: 'کتابخانه منابع', hint: 'منابع', href: '/library', glyph: 'layers' },
    { label: 'پروفایل', hint: 'پروفایل', href: '/profile', glyph: 'user' },
    { label: 'مرکز اعلان‌ها', hint: 'پروفایل', href: '/notifications', glyph: 'bell' },
    { label: 'تنظیمات اعلان', hint: 'پروفایل', href: '/profile/notifications', glyph: 'settings' },
    { label: 'امور مالی', hint: 'پروفایل', href: '/profile/finance', glyph: 'card' },
    { label: 'پشتیبانی', hint: 'پروفایل', href: '/profile/support', glyph: 'headset' },
    { label: 'بازیابی دسترسی', hint: 'پروفایل', href: '/profile/recovery', glyph: 'key' },
    { label: 'درخواست آموزشگاه', hint: 'فروش', href: '/apply', glyph: 'bank' },
  ];

  for (const room of classes) {
    entries.push({ label: room.name, hint: 'کلاس', href: `/school/classes/${room.id}`, glyph: 'school' });
  }
  for (const assignment of assignments) {
    entries.push({ label: assignment.title, hint: 'تکلیف', href: `/school/assignments/${assignment.id}`, glyph: 'file' });
  }
  for (const exam of exams) {
    entries.push({ label: exam.title, hint: 'آزمون', href: `/school/exams/${exam.id}`, glyph: 'quiz' });
  }
  const persona = session.get().personaId;
  for (const convo of conversationById.values()) {
    if (!convo.memberIds.includes(persona)) continue;
    entries.push({ label: convo.title, hint: 'گفتگو', href: `/msg/${convo.id}`, glyph: convo.kind === 'channel' ? 'inbox' : 'chat' });
  }
  void nameOf;
  return entries;
}

const INDEX = buildIndex();

function score(entry: Entry, query: string): number {
  const label = normalise(entry.label);
  const hint = normalise(entry.hint);
  if (label === query) return 100;
  if (label.startsWith(query)) return 80;
  if (label.includes(query)) return 60;
  if (hint.includes(query)) return 30;
  // Subsequence match: "rgz" finds "ریاضی گروه" style partial typing.
  let i = 0;
  for (const char of label) {
    if (char === query[i]) i += 1;
    if (i === query.length) return 10;
  }
  return 0;
}

export function commandPalette(): void {
  let cursor = 0;
  let results: Entry[] = INDEX.slice(0, 8);

  const scrim = h('div', { class: 'scrim' });
  const panel = h('div', { class: 'cmdk', role: 'dialog', 'aria-label': 'جست‌وجوی سریع' });
  const input = h('input', {
    type: 'search',
    placeholder: 'برو به… (نام کلاس، تکلیف، گفتگو)',
    'aria-label': 'جست‌وجوی سریع',
    autocomplete: 'off',
  });
  const list = h('div', { class: 'cmdk-results', role: 'listbox' });
  panel.append(input, list, h('div', { class: 'cmdk-foot' }, h('span', { text: '↑ ↓ حرکت' }), h('span', { text: '⏎ رفتن' }), h('span', { text: 'Esc بستن' })));

  const paint = () => {
    list.replaceChildren();
    if (!results.length) {
      list.append(h('div', { class: 'empty', text: 'نتیجه‌ای پیدا نشد' }));
      return;
    }
    results.forEach((entry, index) => {
      const item = h(
        'button',
        { class: 'cmdk-item', type: 'button', role: 'option' },
        icon(entry.glyph, 'icon sm'),
        h('span', { class: 'grow truncate', text: entry.label }),
        h('span', { class: 'tiny muted', text: entry.hint }),
      );
      item.setAttribute('aria-selected', String(index === cursor));
      item.addEventListener('click', () => go(entry.href));
      item.addEventListener('pointerenter', () => {
        cursor = index;
        paint();
      });
      list.append(item);
    });
  };

  const close = () => {
    scrim.remove();
    panel.remove();
    document.removeEventListener('keydown', onKey);
  };
  const go = (href: string) => {
    close();
    location.assign(href);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown') {
      cursor = Math.min(results.length - 1, cursor + 1);
      paint();
      event.preventDefault();
    }
    if (event.key === 'ArrowUp') {
      cursor = Math.max(0, cursor - 1);
      paint();
      event.preventDefault();
    }
    if (event.key === 'Enter' && results[cursor]) {
      go(results[cursor].href);
      event.preventDefault();
    }
  };

  input.addEventListener('input', () => {
    const query = normalise(input.value);
    if (!query) {
      results = INDEX.slice(0, 8);
    } else {
      results = INDEX.map((entry) => ({ entry, s: score(entry, query) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
        .map((r) => r.entry);
    }
    cursor = 0;
    paint();
  });

  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(scrim, panel);
  paint();
  input.focus();
}

export function installCommandKeys(): void {
  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      commandPalette();
    }
  });
}