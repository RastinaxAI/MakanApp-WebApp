/**
 * The list island — Web A's left column, rebuilt from Makaan's own data.
 *
 * Which list shows up follows the active destination: conversations in the
 * messenger, the module's sections plus my classes in the school, notebooks in
 * the assistant, account sections in the profile. Everything here is read-only
 * navigation: it links to pages that enforce their own capabilities.
 */

import { h, clear } from '../core/dom';
import { icon, type IconName } from '../core/icons';
import { avatar, chip, field, photoAvatar } from '../ui/kit';
import { foldForSearch, normalizePhone, relative, searchHit } from '../core/format';
import { app, photoFor } from '../data/app-state';
import { classes, lessonById, nameOf, personById } from '../data/seed';
import { can, myChildren, myClassIds, session } from '../data/session';
import { openSheet } from '../core/overlays';
import type { Person } from '../data/types';

export interface SideItem {
  href?: string;
  title: string;
  sub?: string;
  meta?: string;
  badge?: number;
  glyph?: IconName;
  /** Circle avatar with initials; falls back to a glyph tile. */
  face?: string;
  /** The row's own picture (profile or group/channel); wins over `face`. */
  photo?: string | null;
  square?: boolean;
  active?: boolean;
  /** Pinned conversations get a pin glyph in the row's meta, no text. */
  pinned?: boolean;
  /** Rows without a destination act on the spot (e.g. the compose sheet). */
  onClick?: () => void;
  /** Everything the row contains (e.g. every message of a conversation).
      Searched by the list filter, but never rendered. */
  searchText?: string;
}

interface SideGroup {
  label?: string;
  items: SideItem[];
}

export interface SideSpec {
  title: string;
  search?: string;
  groups: SideGroup[];
  /** When set, the list header grows the pencil that opens this compose menu. */
  actions?: SideAction[];
}

export interface SideAction {
  label: string;
  sub?: string;
  glyph: IconName;
  href?: string;
  onClick?: () => void;
}

/** Sections of a module, in the order the sidebar lists them. */
function sections(
  list: SideItem[],
  entries: [string, string, IconName][],
  path: string,
): SideItem[] {
  for (const [href, title, glyph] of entries) {
    list.push({ href, title, glyph, active: path === href });
  }
  return list;
}

function schoolSpec(path: string): SideSpec {
  const groups: SideGroup[] = [];
  const home = sections(
    [],
    [
      ['/school', 'خانه', 'school'],
      ['/school/schedule', 'برنامه کلاس‌ها', 'calendar'],
      ['/school/classes', 'کلاس‌ها', 'book'],
      ['/school/assignments', 'تکالیف', 'list'],
      ['/school/exams', 'آزمون‌ها', 'quiz'],
      ['/school/progress', 'پیشرفت', 'chart'],
      ['/school/resources', 'منابع', 'folder'],
    ],
    path,
  );
  if (can('manageRoster')) home.push({ href: '/school/students', title: 'دانش‌آموزان', glyph: 'users', active: path === '/school/students' });
  if (can('authorContent') || can('manageRoster')) {
    home.push({ href: '/school/manage', title: 'مدیریت آموزشگاه', glyph: 'settings', active: path.startsWith('/school/manage') });
  }
  groups.push({ items: home });

  const mine = myClassIds()
    .map((id) => classes.find((c) => c.id === id))
    .filter((c): c is (typeof classes)[number] => Boolean(c));
  if (mine.length) {
    groups.push({
      label: 'کلاس‌های من',
      items: mine.map((c) => ({
        href: `/school/classes/${c.id}`,
        title: c.name,
        sub: lessonById.get(c.lessonId)?.field ?? '',
        glyph: 'book',
        square: true,
        active: path === `/school/classes/${c.id}` || path.startsWith(`/school/classes/${c.id}/`),
      })),
    });
  }

  const children = myChildren()
    .map((id) => personById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (children.length) {
    groups.push({
      label: 'فرزندان',
      items: children.map((p) => ({
        href: `/school/child/${p.id}`,
        title: p.name,
        sub: p.grade ?? '',
        face: p.name,
        active: path === `/school/child/${p.id}`,
      })),
    });
  }

  return { title: 'آموزشگاه', groups };
}

/**
 * People the signed-in persona can actually reach: everyone it already shares a
 * conversation with. Nothing outside that reach is ever listed, so opening the
 * messenger cannot widen who the user can see.
 */
function contacts(): Person[] {
  const persona = session.get().personaId;
  const ids = new Set<string>();
  for (const convo of app.get().conversations) {
    if (!convo.memberIds.includes(persona)) continue;
    for (const id of convo.memberIds) {
      if (id !== persona && id !== 'system' && personById.has(id)) ids.add(id);
    }
  }
  return [...ids]
    .map((id) => personById.get(id)!)
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

/** The direct chat with someone, if the two of them already have one. */
function directChatId(personId: string): string | null {
  const persona = session.get().personaId;
  const convo = app
    .get()
    .conversations.find(
      (c) =>
        c.kind === 'direct' && c.memberIds.includes(personId) && c.memberIds.includes(persona),
    );
  return convo?.id ?? null;
}

function msgSpec(path: string): SideSpec {
  const persona = session.get().personaId;
  const rows = app
    .get()
    .conversations.filter((c) => c.memberIds.includes(persona))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const lastA = a.messages[a.messages.length - 1]?.at ?? '';
      const lastB = b.messages[b.messages.length - 1]?.at ?? '';
      return +new Date(lastB) - +new Date(lastA);
    });

  const items: SideItem[] = rows.map((c) => {
    const last = c.messages[c.messages.length - 1];
    const isSpace = c.kind !== 'direct';
    return {
      href: `/msg/${c.id}`,
      title: c.title,
      sub: last ? last.text : c.subtitle ?? '',
      meta: last ? relative(last.at) : '',
      badge: c.unread || undefined,
      photo: isSpace ? photoFor(c.id) : undefined,
      face: isSpace ? nameOf(c.ownerId) : c.title,
      square: isSpace,
      pinned: c.pinned,
      active: path === `/msg/${c.id}` || path.startsWith(`/msg/${c.id}/`),
      /* Searching by name must also find a word said inside the conversation,
         so the whole thread, its description and its members are searchable.
         Folded once here rather than on every keystroke. */
      searchText: foldForSearch([c.title, c.subtitle ?? '', ...c.memberIds.map((id) => nameOf(id)), ...c.messages.map((m) => `${nameOf(m.authorId)} ${m.text}`)].join('\n')),
    };
  });
  if (!items.length) items.push({ href: '/msg/new', title: 'گفتگوی تازه', glyph: 'plus' });

  return {
    title: 'گفتگوها',
    search: 'جست‌وجوی گفتگو و پیام',
    /* Actions only mount the floating pencil on the list island; the rows live
       in the pencil's sheet, so the list itself stays chats + contacts. */
    actions: COMPOSE_ACTIONS,
    groups: [{ items }],
  };
}

function aiSpec(path: string): SideSpec {
  const notes = app.get().notebooks.filter((n) => !n.archived);
  const items: SideItem[] = notes.map((n) => ({
    href: `/ai/chat/${n.id}`,
    title: n.title,
    sub: n.messages[n.messages.length - 1]?.text ?? '',
    meta: relative(n.updatedAt),
    glyph: 'ai',
    active: path === `/ai/chat/${n.id}` || path.startsWith(`/ai/chat/${n.id}/`),
  }));
  if (!items.length) items.push({ href: '/ai/notebooks', title: 'دفترچه‌ای نداری', glyph: 'ai' });

  return {
    title: 'دستیار',
    search: 'جست‌وجوی دفترچه',
    groups: [
      { label: 'دفترچه‌ها', items },
      {
        label: 'ابزارها',
        items: [
          { href: '/ai', title: 'شروع گفتگو', glyph: 'sparkle', active: path === '/ai' },
          { href: '/ai/notebooks', title: 'همه دفترچه‌ها', glyph: 'book', active: path === '/ai/notebooks' },
          { href: '/ai/practice', title: 'تمرین', glyph: 'target', active: path === '/ai/practice' },
          { href: '/ai/sources', title: 'منابع من', glyph: 'folder', active: path === '/ai/sources' },
        ],
      },
    ],
  };
}

function profileSpec(path: string): SideSpec {
  const account = sections(
    [],
    [
      ['/profile', 'حساب من', 'user'],
      ['/notifications', 'اعلان‌ها', 'bell'],
      ['/profile/security', 'امنیت و ورود', 'shield'],
      ['/profile/privacy', 'حریم خصوصی', 'lock'],
      ['/profile/notifications', 'تنظیمات اعلان', 'bell'],
      ['/profile/subscription', 'اشتراک', 'star'],
      ['/profile/finance', 'صورت‌حساب', 'card'],
      ['/profile/support', 'پشتیبانی', 'headset'],
      ['/profile/recovery', 'بازیابی حساب', 'refresh'],
    ],
    path,
  );
  return {
    title: 'حساب',
    groups: [
      { items: account },
      {
        label: 'محتوا',
        items: [
          { href: '/library', title: 'کتابخانه منابع', glyph: 'layers', active: path.startsWith('/library') },
        ],
      },
    ],
  };
}

/** The list for a path, or null when the destination has no list of its own. */
export function sideSpec(path: string): SideSpec | null {
  if (path.startsWith('/msg')) return msgSpec(path);
  if (path.startsWith('/school')) return schoolSpec(path);
  if (path.startsWith('/ai')) return aiSpec(path);
  if (path.startsWith('/profile') || path === '/notifications' || path.startsWith('/library')) {
    return profileSpec(path);
  }
  return null;
}

let listHost: HTMLElement | null = null;
let searchInput: HTMLInputElement | null = null;

/* ----------------------------------------------------------- compose menu */

export const COMPOSE_ACTIONS: SideAction[] = [
  { label: 'گفتگوی تازه', sub: 'شروع گفتگو با یکی از مخاطبان مجاز', glyph: 'chat', href: '/msg/new' },
  { label: 'گروه جدید', sub: 'گفتگوی چند نفره با اعضای انتخابی', glyph: 'users', href: '/msg/new-group' },
  { label: 'کانال جدید', sub: 'انتشار یک‌طرفه؛ فقط مدیران می‌نویسند', glyph: 'inbox', href: '/msg/new-channel' },
  { label: 'افزودن مخاطب با شماره', sub: 'شمارهٔ موبایل ایران', glyph: 'phone', onClick: openContactSheet },
];

/** The pencil's sheet: one row per way to start something new. Also opened by
    the mobile floating pencil on the chat and inbox pages. */
export function openComposeSheet(): void {
  const body = h('div', { class: 'compose-sheet' });
  for (const action of COMPOSE_ACTIONS) {
    const el = h(action.href ? 'a' : 'button', {
      class: 'compose-item',
      ...(action.href ? { href: action.href } : { type: 'button' }),
    });
    el.append(h('span', { class: 'compose-ico' }, icon(action.glyph)));
    const text = h('span', { class: 'compose-text' });
    text.append(h('span', { class: 'compose-label', text: action.label }));
    if (action.sub) text.append(h('span', { class: 'compose-sub', text: action.sub }));
    el.append(text);
    el.append(icon('chevronEnd', 'icon sm'));
    // Links keep their real href (middle-click, copy-link) and the router's
    // document-level handler still navigates; the sheet only needs closing.
    el.addEventListener('click', () => {
      close();
      if (!action.href) action.onClick?.();
    });
    body.append(el);
  }
  const close = openSheet({ title: 'ساخت', body, grabber: true });
}

/**
 * Add a contact by phone number. The lookup is deliberately scoped to the
 * people the user can already reach: an unknown number gets the same answer
 * whether or not it exists somewhere else on the platform.
 */
function openContactSheet(): void {
  const body = h('div', { class: 'stack' });
  const phone = field({
    label: 'شمارهٔ موبایل',
    placeholder: '۰۹۱۲۳۴۵۶۷۸۹',
    inputMode: 'tel',
    dir: 'ltr',
  });
  const result = h('div', { class: 'stack sm' });

  const lookup = () => {
    const value = phone.input.value.trim();
    const normalized = normalizePhone(value);
    result.replaceChildren();
    if (!normalized) {
      result.append(
        h('div', { class: 'banner warn' }, icon('info', 'icon sm'), h('div', { class: 'grow' }, h('div', { text: 'شماره باید ۱۱ رقم و با ۰۹ شروع شود؛ ارقام فارسی هم پذیرفته می‌شود.' }))),
      );
      return;
    }
    const person = contacts().find((p) => normalizePhone(p.phone) === normalized);
    if (!person) {
      result.append(
        h(
          'div',
          { class: 'banner warn' },
          icon('shield', 'icon sm'),
          h('div', { class: 'grow' }, h('div', { text: 'این شماره در محدودهٔ ارتباط شما نیست.' })),
        ),
      );
      return;
    }
    const chatId = directChatId(person.id);
    const row = h('button', { class: 'list-item', type: 'button' });
    row.append(avatar(person.name, { size: 'sm' }));
    row.append(
      h(
        'div',
        { class: 'body' },
        h('span', { class: 'truncate', text: person.name }),
        h('span', { class: 'meta', text: `${person.roles.join('، ')}${person.grade ? ` · ${person.grade}` : ''}` }),
      ),
    );
    row.append(h('div', { class: 'end' }, chip(chatId ? 'ادامهٔ گفتگو' : 'شروع گفتگو', { glyph: 'chevronEnd' })));
    row.addEventListener('click', () => {
      close();
      location.assign(chatId ? `/msg/${chatId}` : '/msg/new');
    });
    result.append(row);
  };

  const submit = h('button', { class: 'btn primary block', type: 'button', text: 'جست‌وجوی مخاطب' });
  submit.addEventListener('click', lookup);
  phone.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      lookup();
    }
  });

  body.append(phone.wrap, submit, result);
  body.append(
    h(
      'div',
      { class: 'banner' },
      icon('shield', 'icon sm'),
      h('div', { class: 'grow' }, h('div', { text: 'شمارهٔ خصوصی در نتیجهٔ جست‌وجو افشا نمی‌شود؛ فقط مخاطبان داخل محدودهٔ ارتباط شما دیده می‌شوند.' })),
    ),
  );
  const close = openSheet({ title: 'افزودن مخاطب با شماره', body });
}

/** Repaint the island for a new path. Cheap: a handful of rows, no route load.
    The shell calls this on every navigation and state change, so the list keeps
    up with unread counts and sent messages without any extra plumbing. */
export function paintSidebar(root: HTMLElement, path: string): void {
  const spec = sideSpec(path);
  if (!spec) {
    root.dataset.empty = '1';
    clear(root);
    return;
  }
  root.dataset.empty = '0';

  const head = h('div', { class: 'side-head' }, h('h3', { text: spec.title }));
  listHost = h('div', { class: 'side-body' });
  searchInput = null;

  clear(root);
  root.append(head);
  if (spec.search) {
    searchInput = h('input', {
      type: 'search',
      placeholder: spec.search,
      'aria-label': spec.search,
    }) as HTMLInputElement;
    searchInput.addEventListener('input', () => render(spec, searchInput!.value));
    root.append(h('div', { class: 'side-search' }, searchInput));
  }
  root.append(listHost);
  if (spec.actions?.length) {
    // The pencil floats over the list, the way a compose button sits on top of
    // the chat list rather than inside its header row.
    const compose = h('button', {
      class: 'side-fab',
      type: 'button',
      'aria-label': 'ساخت گفتگو، گروه یا کانال',
      on: { click: openComposeSheet },
    });
    compose.append(icon('edit', 'icon lg'));
    root.append(compose);
  }
  render(spec, '');
}

function render(spec: SideSpec, query: string): void {
  if (!listHost) return;
  /* Folded once per keystroke, then compared against folded row text — a plain
     `includes` misses Persian words split by a zero-width non-joiner. */
  const q = foldForSearch(query);
  const match = (item: SideItem) =>
    !q ||
    searchHit(item.title, q) ||
    searchHit(item.sub ?? '', q) ||
    searchHit(item.meta ?? '', q) ||
    searchHit(item.searchText ?? '', q);

  clear(listHost);
  for (const group of spec.groups) {
    const items = group.items.filter(match);
    if (!items.length) continue;
    if (group.label && !q) listHost.append(h('div', { class: 'side-sep', text: group.label }));
    for (const item of items) listHost.append(row(item));
  }
  if (!listHost.childElementCount) {
    listHost.append(h('div', { class: 'side-sep', text: 'چیزی پیدا نشد.' }));
  }
}

function row(item: SideItem): HTMLElement {
  const el = item.href
    ? (h('a', { class: 'side-item', href: item.href }) as HTMLAnchorElement)
    : h('button', { class: 'side-item', type: 'button' });
  if (item.onClick) el.addEventListener('click', item.onClick);
  if (item.active) el.setAttribute('aria-current', 'page');

  const ico = h('span', { class: `side-ico${item.square ? ' sq' : ''}` });
  if (item.photo) ico.append(photoAvatar(item.photo, item.face ?? item.title, { square: item.square }));
  else if (item.face) ico.append(avatar(item.face));
  else if (item.glyph) ico.append(icon(item.glyph));
  el.append(ico);

  const text = h('span', { class: 'side-text' }, h('span', { class: 'side-title', text: item.title }));
  if (item.sub) text.append(h('span', { class: 'side-sub', text: item.sub }));
  el.append(text);

  const meta = h('span', { class: 'side-meta' });
  if (item.meta) meta.append(h('span', { text: item.meta }));
  if (item.pinned) {
    /* Pin is an icon, not a word: the row already has a time here and the
       label overflowed the narrow meta column. */
    const pin = h('span', { class: 'side-pin', 'aria-label': 'سنجاق‌شده', role: 'img' });
    pin.append(icon('pin', 'icon sm'));
    meta.append(pin);
  }
  if (item.badge) meta.append(h('span', { class: 'side-badge', text: String(item.badge) }));
  if (meta.childElementCount) el.append(meta);
  return el;
}