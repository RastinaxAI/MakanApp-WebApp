/** Shared interface primitives. Every page is assembled from these. */

import { h } from '../core/dom';
import { icon, P as ICONS, type IconName } from '../core/icons';
import { avatarColor, initials, n } from '../core/format';

type Kids = (Node | string | false | null | undefined)[];

export function card(props: { cls?: string; tint?: boolean } = {}, ...kids: Kids): HTMLElement {
  const el = h('div', {
    class: `card ${props.tint ? 'tint' : ''} ${props.cls ?? ''}`.trim(),
  });
  el.append(...kids);
  return el;
}

export function cardLink(path: string, cls = '', ...kids: Kids): HTMLAnchorElement {
  const el = h('a', { class: `card ${cls}`.trim(), href: path });
  el.append(...kids);
  return el;
}

export function sectionHead(title: string, extra?: Node | null): HTMLElement {
  return h('div', { class: 'h-sec' }, h('h2', { text: title }), extra);
}

/** `glyph` accepts either a single character (✓) or an icon name ('chevronEnd'). */
export function chip(
  text: string,
  opts: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'plain' | 'solid'; glyph?: string } = {},
): HTMLElement {
  const el = h('span', { class: `chip ${opts.tone && opts.tone !== 'plain' ? opts.tone : ''}`.trim() });
  if (opts.glyph) {
    if (opts.glyph in ICONS) el.append(icon(opts.glyph as IconName, 'icon sm'));
    else el.append(h('span', { class: 'glyph', text: opts.glyph }));
  }
  el.append(h('span', { text }));
  return el;
}

export function avatar(name: string, opts: { size?: 'xs' | 'sm' | 'lg' | ''; square?: boolean } = {}): HTMLElement {
  const el = h('div', {
    class: `avatar ${opts.size ?? ''} ${opts.square ? 'sq' : ''}`.trim(),
    style: { background: avatarColor(name) },
    'aria-hidden': 'true',
    text: initials(name),
  });
  return el;
}

/**
 * The same circle/tile, but painting the person's own photo when they have one
 * and falling back to their initials when they have not.
 */
export function photoAvatar(
  photo: string | null | undefined,
  name: string,
  opts: { size?: 'xs' | 'sm' | 'lg' | ''; square?: boolean } = {},
): HTMLElement {
  if (!photo) return avatar(name, opts);
  const el = h('div', { class: `avatar photo ${opts.size ?? ''} ${opts.square ? 'sq' : ''}`.trim() });
  el.append(h('img', { src: photo, alt: name, decoding: 'async' }));
  return el;
}

export function avatarStack(names: string[], max = 4): HTMLElement {
  const wrap = h('div', { class: 'avatar-stack' });
  for (const name of names.slice(0, max)) wrap.append(avatar(name, { size: 'xs' }));
  if (names.length > max) {
    wrap.append(h('div', { class: 'avatar xs', style: { background: 'var(--line-2)', color: 'var(--ink-2)' }, text: `+${n(names.length - max)}` }));
  }
  return wrap;
}

export function listItem(opts: {
  href?: string;
  onClick?: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: Node | null | false;
  trailing?: Node | null | false;
  unread?: boolean;
}): HTMLElement {
  const el = h(
    opts.href ? 'a' : 'button',
    {
      class: `list-item ${opts.unread ? 'unread' : ''}`.trim(),
      ...(opts.href ? { href: opts.href } : { type: 'button' }),
    },
  );
  if (opts.onClick && !opts.href) el.addEventListener('click', opts.onClick);
  if (opts.leading) el.append(opts.leading);
  const body = h('div', { class: 'body' }, h('span', { class: 'truncate', text: opts.title }));
  if (opts.subtitle) body.append(h('span', { class: 'meta truncate', text: opts.subtitle }));
  el.append(body);
  const end = h('div', { class: 'end' });
  if (opts.meta) end.append(h('span', { class: 'tiny muted nowrap', text: opts.meta }));
  if (opts.trailing) end.append(opts.trailing);
  if (end.childNodes.length) el.append(end);
  return el;
}

export function bar(value: number, max = 100): HTMLElement {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': String(Math.round(pct)) }, h('i', { style: { width: `${pct}%` } }));
}

export function ring(value: number, max = 100, label?: string): HTMLElement {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const el = h('div', { class: 'ring' }, h('span', { class: 'nums', text: label ?? `${Math.round(pct)}٪` }));
  el.style.setProperty('--p', String(Math.round(pct)));
  return el;
}

export function stat(value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, h('span', { class: 'v nums', text: value }), h('span', { class: 'k', text: label }));
}

export function empty(opts: { glyph: IconName; title: string; text?: string; action?: Node | null }): HTMLElement {
  const el = h('div', { class: 'empty' });
  const g = h('div', { class: 'glyph' });
  g.append(icon(opts.glyph, 'icon lg'));
  el.append(g);
  el.append(h('h3', { text: opts.title }));
  if (opts.text) el.append(h('p', { class: 'small', style: { maxWidth: '42ch' }, text: opts.text }));
  if (opts.action) el.append(h('div', { style: { marginBlockStart: '6px' } }, opts.action));
  return el;
}

export function banner(
  text: string,
  opts: { tone?: 'ok' | 'warn' | 'bad' | 'info'; glyph?: IconName; action?: Node | null } = {},
): HTMLElement {
  const el = h('div', { class: `banner ${opts.tone && opts.tone !== 'info' ? opts.tone : ''}`.trim(), role: 'note' });
  el.append(icon(opts.glyph ?? 'info', 'icon sm'));
  const body = h('div', { class: 'grow' }, h('div', { text }));
  el.append(body);
  if (opts.action) el.append(opts.action);
  return el;
}

export function skeleton(rows = 3): HTMLElement {
  const el = h('div', { class: 'stack' });
  for (let i = 0; i < rows; i += 1) {
    el.append(h('div', { class: 'skel', style: { height: i === 0 ? '92px' : '62px' } }));
  }
  return el;
}

export function seg<T extends string>(opts: {
  items: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}): HTMLElement {
  const el = h('div', { class: 'seg', role: 'tablist' });
  const buttons = new Map<T, HTMLButtonElement>();
  for (const item of opts.items) {
    const btn = h('button', {
      type: 'button',
      role: 'tab',
      'aria-selected': String(item.id === opts.value),
      text: item.count === undefined ? item.label : `${item.label} (${n(item.count)})`,
      on: {
        click: () => {
          /* The visual state must follow the click: repaint every tab's
             aria-selected so the CSS highlight moves, then notify. */
          for (const [id, b] of buttons) b.setAttribute('aria-selected', String(id === item.id));
          opts.onChange(item.id);
        },
      },
    });
    buttons.set(item.id, btn);
    el.append(btn);
  }
  return el;
}

export function field(opts: {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  hint?: string;
  error?: string;
  inputMode?: string;
  dir?: string;
  onInput?: (value: string) => void;
  maxLength?: number;
  autocomplete?: string;
}): { wrap: HTMLElement; input: HTMLInputElement } {
  const input = h('input', {
    class: 'input',
    type: opts.type ?? 'text',
    value: opts.value ?? '',
    placeholder: opts.placeholder ?? '',
    inputmode: opts.inputMode,
    dir: opts.dir,
    maxlength: opts.maxLength,
    autocomplete: opts.autocomplete ?? 'off',
    'aria-label': opts.label,
  });
  if (opts.onInput) input.addEventListener('input', () => opts.onInput!(input.value));
  const wrap = h(
    'div',
    { class: 'field' },
    h('label', { class: 'label', text: opts.label }),
    input,
    opts.hint ? h('span', { class: 'hint', text: opts.hint }) : null,
    opts.error ? h('span', { class: 'err', text: opts.error }) : null,
  );
  return { wrap, input };
}

export function textarea(opts: {
  label: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  onInput?: (v: string) => void;
}): { wrap: HTMLElement; input: HTMLTextAreaElement } {
  const input = h('textarea', {
    class: 'textarea',
    rows: opts.rows ?? 4,
    placeholder: opts.placeholder ?? '',
    'aria-label': opts.label,
  });
  input.value = opts.value ?? '';
  if (opts.onInput) input.addEventListener('input', () => opts.onInput!(input.value));
  return {
    wrap: h('div', { class: 'field' }, h('label', { class: 'label', text: opts.label }), input),
    input,
  };
}

export function switchRow(opts: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}): HTMLElement {
  const sw = h('button', {
    class: 'switch',
    type: 'button',
    role: 'switch',
    'aria-checked': String(opts.checked),
    'aria-label': opts.title,
    ...(opts.disabled ? { disabled: true } : {}),
  });
  sw.addEventListener('click', () => {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(next));
    opts.onChange(next);
  });
  return h(
    'div',
    { class: 'switch-row' },
    h('div', { class: 'grow' }, h('div', { style: { fontWeight: '700', fontSize: '14px' }, text: opts.title }), opts.subtitle ? h('div', { class: 'tiny muted', text: opts.subtitle }) : null),
    sw,
  );
}

export function pillRow(items: string[], active?: string): HTMLElement {
  const el = h('div', { class: 'hstack-scroll' });
  for (const item of items) {
    el.append(h('span', { class: `chip ${item === active ? 'solid' : ''}`, text: item }));
  }
  return el;
}

export function nextCard(opts: {
  kicker: string;
  title: string;
  cta: string;
  href?: string;
  onClick?: () => void;
  glyph?: IconName;
}): HTMLElement {
  const el = h(opts.href ? 'a' : 'button', {
    class: 'next-card',
    ...(opts.href ? { href: opts.href } : { type: 'button' }),
  });
  el.append(h('span', { class: 'kicker', text: opts.kicker }));
  const titleRow = h('div', { class: 'row' }, h('span', { class: 'title grow', text: opts.title }));
  if (opts.glyph) titleRow.append(icon(opts.glyph, 'icon lg'));
  el.append(titleRow);
  const cta = h('span', { class: 'cta', text: opts.cta });
  cta.append(icon('chevronEnd', 'icon sm'));
  el.append(cta);
  if (opts.onClick) el.addEventListener('click', opts.onClick);
  return el;
}

export function timelineItem(opts: {
  time: string;
  title: string;
  subtitle?: string;
  href?: string;
  state?: 'past' | 'live' | 'future';
  trailing?: Node | null | false;
  onClick?: () => void;
}): HTMLElement {
  const el = h(
    opts.href ? 'a' : 'button',
    {
      class: `tl-item ${opts.state === 'live' ? 'is-live' : ''} ${opts.state === 'past' ? 'is-past' : ''}`.trim(),
      ...(opts.href ? { href: opts.href } : { type: 'button' }),
    },
  );
  if (opts.onClick) el.addEventListener('click', opts.onClick);
  el.append(h('span', { class: 'tl-time nums', text: opts.time }));
  el.append(h('span', { style: { fontWeight: '700', fontSize: '14px' }, text: opts.title }));
  if (opts.subtitle) el.append(h('span', { class: 'tiny muted', text: opts.subtitle }));
  if (opts.trailing) el.append(h('div', { style: { marginBlockStart: '6px' } }, opts.trailing));
  return el;
}

export function kvGrid(entries: [string, string][]): HTMLElement {
  const el = h('dl', { class: 'kv-grid' });
  for (const [k, v] of entries) {
    el.append(h('div', { class: 'kv' }, h('dt', { text: k }), h('dd', { class: 'nums', text: v })));
  }
  return el;
}

export function pageHead(title: string, subtitle?: string, back?: string): HTMLElement {
  const el = h('div', { class: 'stack sm' });
  if (back) {
    el.append(
      h(
        'a',
        { class: 'row tiny muted', href: back, style: { gap: '4px', width: 'fit-content' } },
        icon('chevronEnd', 'icon sm'),
        h('span', { text: 'بازگشت' }),
      ),
    );
  }
  el.append(h('h1', { text: title }));
  if (subtitle) el.append(h('p', { class: 'small muted', text: subtitle }));
  return el;
}

/**
 * Mixed Persian + Latin/number runs (formulas, codes, usernames) must be
 * isolated with <bdi>, otherwise the bidi algorithm mirrors them inside RTL
 * text and `x² − 5x + 6 = 0` renders backwards.
 */
const LATIN_RUN = /[A-Za-z0-9][A-Za-z0-9\s²³¹²³⁰-⁹₀-₉+\-−=×÷√/^.,:;'"()[\]{}<>%]*[A-Za-z0-9²³¹²³⁰-⁹₀-₉)\]}]|[A-Za-z0-9]/g;

export function rich(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const index = match.index ?? 0;
    if (index > last) frag.appendChild(document.createTextNode(text.slice(last, index)));
    frag.appendChild(h('bdi', { text: match[0] }));
    last = index + match[0].length;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  return frag;
}

export function rowBetween(...kids: Kids): HTMLElement {
  const el = h('div', { class: 'row between' });
  el.append(...kids);
  return el;
}

export function inlineBtn(label: string, onClick: () => void, opts: { tone?: string; glyph?: IconName } = {}): HTMLElement {
  const el = h('button', { class: `btn ${opts.tone ?? 'ghost'} sm`, type: 'button' });
  if (opts.glyph) el.append(icon(opts.glyph, 'icon sm'));
  el.append(h('span', { text: label }));
  el.addEventListener('click', onClick);
  return el;
}

