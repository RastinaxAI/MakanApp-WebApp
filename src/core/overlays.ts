/** Overlays: bottom sheets, centred confirmations, toasts. Esc + scrim close. */

import { h } from './dom';
import { icon, type IconName } from './icons';

type Closer = () => void;

let layer: HTMLElement | null = null;

function ensureLayer(): HTMLElement {
  if (!layer) {
    layer = h('div', { id: 'overlay-layer' });
    document.body.append(layer);
  }
  return layer;
}

export interface SheetOptions {
  title?: string;
  body: Node | (() => Node);
  /** Renders a drag affordance; disable for sheets that feel like menus. */
  grabber?: boolean;
  onClose?: () => void;
}

export function openSheet(opts: SheetOptions): Closer {
  const root = ensureLayer();
  const scrim = h('div', { class: 'scrim' });
  const sheet = h('div', {
    class: 'sheet',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': opts.title ?? 'پنجره',
  });
  if (opts.grabber !== false) sheet.append(h('div', { class: 'grabber' }));
  if (opts.title) sheet.append(h('div', { class: 'sheet-title', text: opts.title }));
  const bodyHost = h('div', { class: 'sheet-body' });
  bodyHost.append(typeof opts.body === 'function' ? opts.body() : opts.body);
  sheet.append(bodyHost);

  const close = () => {
    scrim.remove();
    sheet.remove();
    document.removeEventListener('keydown', onKey);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  root.append(scrim, sheet);
  return close;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Extra fields rendered above the actions (e.g. a required reason). */
  extra?: () => Node;
  requireText?: { label: string; hint?: string };
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const root = ensureLayer();
    const scrim = h('div', { class: 'scrim' });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    box.append(h('h3', { text: opts.title }));
    if (opts.message) box.append(h('p', { class: 'small muted', text: opts.message }));

    let inputEl: HTMLTextAreaElement | null = null;
    if (opts.requireText) {
      const label = h('label', { class: 'label', text: opts.requireText.label });
      inputEl = h('textarea', {
        class: 'textarea',
        rows: 3,
        placeholder: opts.requireText.hint ?? '',
        'aria-label': opts.requireText.label,
      });
      box.append(h('div', { class: 'field' }, label, inputEl));
    }
    if (opts.extra) box.append(opts.extra());

    const done = (value: boolean) => {
      scrim.remove();
      box.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const confirmBtn = h('button', {
      class: `btn ${opts.danger ? 'danger' : 'primary'} block`,
      type: 'button',
      text: opts.confirmLabel ?? 'تأیید',
      on: { click: () => done(true) },
    });
    if (inputEl) {
      inputEl.addEventListener('input', () => {
        confirmBtn.toggleAttribute('aria-disabled', inputEl!.value.trim().length < 4);
      });
      confirmBtn.setAttribute('aria-disabled', 'true');
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done(false);
    };
    scrim.addEventListener('click', () => done(false));
    document.addEventListener('keydown', onKey);
    box.append(
      h(
        'div',
        { class: 'btn-row' },
        confirmBtn,
        h('button', {
          class: 'btn ghost grow',
          type: 'button',
          text: opts.cancelLabel ?? 'انصراف',
          on: { click: () => done(false) },
        }),
      ),
    );
    root.append(scrim, box);
    (inputEl ?? confirmBtn).focus();
  });
}

export function toast(message: string, kind: 'ok' | 'bad' | 'info' = 'info', ms = 2600): void {
  const host = qsHost();
  const el = h('div', { class: `toast ${kind}` });
  el.append(icon(kind === 'ok' ? 'check' : kind === 'bad' ? 'alert' : 'info', 'icon sm'));
  el.append(h('span', { text: message }));
  host.append(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms';
    setTimeout(() => el.remove(), 220);
  }, ms);
}

function qsHost(): HTMLElement {
  let host = document.querySelector<HTMLElement>('.toasts');
  if (!host) {
    host = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(host);
  }
  return host;
}

