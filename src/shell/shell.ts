/** App shell: header, primary navigation, offline banner, command palette, install sheet. */

import { h, clear } from '../core/dom';
import { icon, type IconName } from '../core/icons';
import { avatar, photoAvatar } from '../ui/kit';
import { formatTime } from '../core/format';
import { app, photoFor } from '../data/app-state';
import {
  ROLE_LABEL,
  currentPerson,
  currentRole,
  currentSchool,
  session,
  setWorkspace,
  switchPersona,
  workspaces,
} from '../data/session';
import { install, promptInstall, shouldOffer, dismissInstall } from '../core/pwa';
import { openSheet, confirmDialog, toast } from '../core/overlays';
import { paintSidebar } from './side-list';
import { commandPalette } from './command';

export interface TabDef {
  id: 'school' | 'msg' | 'ai' | 'profile';
  href: string;
  label: string;
  glyph: IconName;
}

export const TABS: TabDef[] = [
  { id: 'school', href: '/school', label: 'آموزشگاه', glyph: 'school' },
  { id: 'msg', href: '/msg', label: 'پیام‌رسان', glyph: 'chat' },
  { id: 'ai', href: '/ai', label: 'دستیار', glyph: 'ai' },
  { id: 'profile', href: '/profile', label: 'پروفایل', glyph: 'user' },
];

let ctxButton: HTMLButtonElement | null = null;
let tabButtons = new Map<string, HTMLAnchorElement>();
let notifBadge: HTMLElement | null = null;
let msgBadge: HTMLElement | null = null;
let installBtn: HTMLElement | null = null;
let netBanner: HTMLElement | null = null;
let sidebar: HTMLElement | null = null;
let accountLink: HTMLAnchorElement | null = null;

export function mountShell(): HTMLElement {
  const topbar = h('header', { class: 'topbar' });
  const inner = h('div', { class: 'topbar-inner' });

  inner.append(
    h(
      'a',
      { class: 'brand', href: '/school', 'aria-label': 'ماکان — خانه' },
      h('span', { class: 'brand-mark logo-tile' }),
      h('span', { class: 'brand-name', text: 'ماکان' }),
    ),
  );

  ctxButton = h('button', {
    class: 'ctx',
    type: 'button',
    'aria-label': 'تغییر فضای کاری',
  }) as HTMLButtonElement;
  ctxButton.addEventListener('click', openWorkspaceSheet);
  inner.append(ctxButton);

  const actions = h('div', { class: 'topbar-actions' });
  actions.append(iconButton('search', 'جست‌وجوی سریع', () => commandPalette()));
  const notif = iconButton('bell', 'اعلان‌ها', () => {
    location.assign('/notifications');
  });
  notifBadge = h('span', { class: 'dot', text: '' });
  notif.append(notifBadge);
  actions.append(notif);

  installBtn = h('button', {
    class: 'btn soft sm',
    type: 'button',
    on: { click: openInstallSheet },
  });
  installBtn.append(icon('share', 'icon sm'));
  installBtn.append(h('span', { text: 'نصب' }));
  actions.append(installBtn);

  actions.append(
    accountLink = h('a', { class: 'icon-btn', href: '/profile', 'aria-label': 'پروفایل' }) as HTMLAnchorElement,
  );
  inner.append(actions);
  topbar.append(inner);

  const tabs = h('nav', { class: 'tabs', 'aria-label': 'مقصدهای اصلی' });
  const tabsInner = h('div', { class: 'tabs-inner' });
  /* Web A puts the app entry at the top of the rail and the account at the
     bottom; both collapse away with the rail itself on narrow screens. */
  tabsInner.append(h('a', { class: 'rail-mark logo-tile', href: '/school', 'aria-label': 'ماکان — خانه' }));
  const tabsBody = h('div', { class: 'tabs-body' });
  for (const tab of TABS) {
    const btn = h('a', { class: 'tab', href: tab.href, 'aria-label': tab.label }) as HTMLAnchorElement;
    btn.append(h('span', { class: 'tab-rail' }));
    const iconWrap = h('span', { style: { display: 'grid', placeItems: 'center' } });
    iconWrap.append(icon(tab.glyph));
    btn.append(iconWrap);
    btn.append(h('span', { text: tab.label }));
    if (tab.id === 'msg') {
      msgBadge = h('span', { class: 'tab-badge', text: '' });
      btn.append(msgBadge);
    }
    tabsBody.append(btn);
    tabButtons.set(tab.id, btn);
  }
  tabsBody.append(h('span', { class: 'rail-foot' }));
  tabsInner.append(tabsBody);
  tabs.append(tabsInner);

  sidebar = h('aside', { class: 'sidebar', 'aria-label': 'فهرست' });

  netBanner = h('div', { class: 'net-banner' });
  netBanner.style.display = 'none';

  const view = h('main', { class: 'main', id: 'view' });

  const shell = h(
    'div',
    { class: 'shell' },
    tabs,
    sidebar,
    h(
      'div',
      { class: 'main-col' },
      topbar,
      h('div', { class: 'shell-body' }, h('div', { class: 'col', style: { gap: '0' } }, netBanner, view)),
    ),
  );
  /* The wallpaper the islands float on sits behind everything, so it is a
     sibling of the shell rather than a child of it. */
  document.body.append(h('div', { class: 'ambient' }));
  return shell;
}

function iconButton(glyph: IconName, label: string, onClick: () => void, extra = ''): HTMLButtonElement {
  const btn = h('button', { class: `icon-btn ${extra}`.trim(), type: 'button', 'aria-label': label });
  btn.append(icon(glyph));
  btn.addEventListener('click', onClick);
  return btn;
}

/** Called on every navigation and state change. */
export function syncChrome(activeTab: string): void {
  document.documentElement.dataset.accent = activeTab === 'auth' ? 'school' : activeTab;
  for (const [id, btn] of tabButtons) {
    if (id === activeTab) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
  if (sidebar) paintSidebar(sidebar, location.pathname);

  const persona = currentPerson();
  const role = currentRole();
  const school = currentSchool();
  /* The account slot repaints itself so a photo picked on the profile page
     shows up in the shell without a reload. */
  if (accountLink) {
    clear(accountLink);
    accountLink.append(photoAvatar(photoFor(persona.id), persona.name, { size: 'sm', square: true }));
  }
  clear(ctxButton!);
  ctxButton!.append(avatar(school ? school.name : persona.name, { size: 'xs' }));
  const text = h('div', { class: 'ctx-text' });
  text.append(h('span', { class: 'ctx-title', text: school ? school.name : 'فضای شخصی' }));
  text.append(h('span', { class: 'ctx-sub', text: school ? ROLE_LABEL[role] : persona.name }));
  ctxButton!.append(text);
  ctxButton!.append(icon('chevronDown', 'icon sm'));

  const notifCount = app.get().notifications.filter((n) => !n.read).length;
  if (notifBadge) {
    notifBadge.textContent = notifCount ? String(notifCount) : '';
    notifBadge.style.display = notifCount ? '' : 'none';
  }
  const msgUnread = app
    .get()
    .conversations.filter((c) => c.memberIds.includes(session.get().personaId))
    .reduce((sum, c) => sum + c.unread, 0);
  if (msgBadge) {
    msgBadge.textContent = msgUnread ? String(msgUnread) : '';
    msgBadge.style.display = msgUnread ? '' : 'none';
  }

  const offer = shouldOffer();
  if (installBtn) installBtn.style.display = offer ? '' : 'none';

  if (netBanner) {
    const state = app.get();
    if (!state.online || state.pendingSync > 0) {
      netBanner.style.display = '';
      netBanner.replaceChildren(
        h(
          'div',
          { class: 'banner warn', style: { marginBottom: '12px' } },
          icon('wifiOff', 'icon sm'),
          h(
            'div',
            { class: 'grow' },
            h('div', {
              text: !state.online
                ? 'حالت آفلاین: داده‌های ذخیره‌شده نشان داده می‌شود و ارسال‌ها در صف می‌مانند.'
                : `${state.pendingSync} مورد در صف ارسال است و به‌زودی همگام می‌شود.`,
            }),
          ),
          h('button', {
            class: 'btn sm',
            type: 'button',
            text: state.online ? 'همگام‌سازی' : 'شبیه‌سازی اتصال',
            on: {
              click: () => {
                app.set((s) => ({ online: !s.online, pendingSync: s.online ? s.pendingSync : 0 }));
                toast(state.online ? 'حالت آفلاین شبیه‌سازی شد' : 'دوباره متصل شدیم', 'info');
              },
            },
          }),
        ),
      );
    } else {
      netBanner.style.display = 'none';
      netBanner.replaceChildren();
    }
  }
}

/* ------------------------------------------------------- workspace sheet */

function openWorkspaceSheet(): void {
  const persona = currentPerson();
  const body = h('div', { class: 'stack' });
  body.append(
    h('div', { class: 'row' }, avatar(persona.name, { size: 'lg' }), h('div', { class: 'grow' }, h('div', { style: { fontWeight: '800' }, text: persona.name }), h('div', { class: 'tiny muted', text: `${persona.username} · ${ROLE_LABEL[currentRole()]}` }))),
  );
  body.append(h('hr', { class: 'divider' }));

  const spaces = workspaces();
  for (const space of spaces) {
    const active = (space.kind === 'personal' && !session.get().schoolId) || space.id === session.get().schoolId;
    const row = h(
      'button',
      { class: 'list-item', type: 'button' },
      h('div', { class: `avatar sm ${space.kind === 'school' ? '' : 'sq'}`, text: space.kind === 'school' ? space.label.slice(0, 1) : 'م' }),
      h('div', { class: 'body' }, h('span', { class: 'truncate', text: space.label }), h('span', { class: 'meta', text: space.sub })),
      active ? h('span', { class: 'chip ok' }, h('span', { class: 'glyph', text: '✓' }), h('span', { text: 'فعال' })) : null,
    );
    row.addEventListener('click', () => {
      setWorkspace(space.id);
      close();
      toast(`فضای کاری: ${space.label}`, 'ok');
    });
    body.append(row);
  }

  body.append(h('hr', { class: 'divider' }));
  body.append(h('div', { class: 'label', text: 'نمای نقش آزمایشی' }));
  body.append(
    h('p', { class: 'tiny muted', text: 'این سوییچر فقط برای بازبینی رابط است. در سرویس واقعی نقش از عضویت معتبر می‌آید و هر درخواست جداگانه کنترل می‌شود.' }),
  );
  const roleRow = h('div', { class: 'pill-row' });
  for (const personaOption of [
    { role: 'student' as const, label: 'دانش‌آموز' },
    { role: 'teacher' as const, label: 'معلم' },
    { role: 'guardian' as const, label: 'والد' },
    { role: 'manager' as const, label: 'مدیر' },
    { role: 'admin' as const, label: 'ادمین' },
  ]) {
    const active = currentRole() === personaOption.role;
    const chip = h('button', { class: `chip btn-like ${active ? '' : 'ghost'}`, type: 'button' });
    chip.setAttribute('aria-pressed', String(active));
    chip.textContent = personaOption.label;
    chip.addEventListener('click', () => {
      switchPersona(personaOption.role);
      close();
      toast(`نمای ${personaOption.label} فعال شد`, 'ok');
    });
    roleRow.append(chip);
  }
  body.append(roleRow);

  const close = openSheet({ title: 'فضای کاری و نقش', body, grabber: true });
}

/* --------------------------------------------------------- install sheet */

export function openInstallSheet(): void {
  const state = install.get();
  const body = h('div', { class: 'stack' });

  if (state.installed) {
    body.append(
      h(
        'div',
        { class: 'install-hero' },
        icon('check', 'icon lg'),
        h('h3', { text: 'ماکان روی این دستگاه نصب است' }),
        h('p', { class: 'small muted', text: 'برنامه از صفحه اصلی باز می‌شود و آفلاین هم کار می‌کند.' }),
      ),
    );
    openSheet({ title: 'نصب برنامه', body });
    return;
  }

  body.append(
    h(
      'div',
      { class: 'install-hero' },
      h('div', { class: 'brand-mark logo-tile', style: { width: '56px', height: '56px', borderRadius: '18px' } }),
      h('h3', { text: 'ماکان را روی صفحه اصلی داشته باش' }),
      h('p', { class: 'small muted', text: 'اجرای تمام‌صفحه، دسترسی آفلاین به داده‌های ذخیره‌شده و باز شدن مستقیم از صفحه اصلی.' }),
    ),
  );

  if (state.platform === 'ios') {
    const steps = h('div', { class: 'install-steps' });
    const step = (n: number, text: string, glyph?: Node) => {
      const row = h('div', { class: 'install-step' }, h('span', { class: 'n', text: String(n) }), h('span', { class: 'grow', text }));
      if (glyph) row.append(glyph);
      return row;
    };
    const shareGlyph = h('span', { class: 'share-glyph' }, icon('share', 'icon lg'));
    steps.append(step(1, 'در مرورگر Safari دکمه «هم‌رسانی» را بزنید.', shareGlyph));
    steps.append(step(2, 'در فهرست، «Add to Home Screen» یا «افزودن به صفحه اصلی» را انتخاب کنید.'));
    steps.append(step(3, 'نام ماکان را تأیید کنید؛ آیکون روی صفحه اصلی اضافه می‌شود.'));
    body.append(steps);
    body.append(
      h('p', { class: 'tiny muted', text: 'در iOS نیازی به مجوز جداگانه نیست؛ پس از نصب، برنامه در حالت آفلاین هم بالا می‌آید.' }),
    );
  } else {
    body.append(
      h(
        'p',
        { class: 'small muted', text: 'نصب از طریق پنجره استاندارد مرورگر انجام می‌شود؛ اگر باز نشد، از منوی مرورگر گزینه نصب برنامه را بزنید.' },
      ),
    );
    const go = h('button', { class: 'btn primary block', type: 'button', text: 'نصب برنامه' });
    go.addEventListener('click', async () => {
      const outcome = await promptInstall();
      close();
      if (outcome === 'accepted') toast('نصب شروع شد', 'ok');
      else if (outcome === 'unavailable') toast('نصب از این مرورگر در دسترس نیست', 'bad');
    });
    body.append(go);
  }

  const later = h('button', {
    class: 'btn ghost block',
    type: 'button',
    text: 'بعداً',
    on: {
      click: () => {
        dismissInstall();
        close();
      },
    },
  });
  body.append(later);
  const close = openSheet({ title: 'نصب برنامه', body });
}

/** Small helper for pages that need a shared "saved at" line. */
export function savedAtLabel(iso: string): string {
  return `ذخیره‌شده در ${formatTime(iso)}`;
}

export { confirmDialog };