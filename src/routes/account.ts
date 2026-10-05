/** C-08 … C-17 — profile, security, notifications, privacy, subscription, finance, support, recovery. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  banner,
  card,
  chip,
  empty,
  field,
  kvGrid,
  listItem,
  pageHead,
  photoAvatar,
  sectionHead,
  seg,
  stat,
  switchRow,
  textarea,
} from '../ui/kit';
import { formatDate, money, relative } from '../core/format';
import { MAX_UPLOAD_MB, openPhotoSourceSheet } from '../core/media';
import { LOCALES } from '../core/i18n';
import {
  app,
  markAllNotificationsRead,
  payInvoice,
  photoFor,
  resetDemo,
  setPersonPhoto,
} from '../data/app-state';
import { ROLE_LABEL, currentPerson, currentRole, session } from '../data/session';
import { openInstallSheet, syncChrome } from '../shell/shell';
import { shouldOffer } from '../core/pwa';
import { confirmDialog, toast } from '../core/overlays';
import { denied } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';

/* ------------------------------------------------------------------ C-10 */

export const profilePage: PageRenderer = () => {
  const persona = currentPerson();
  const page = h('div', { class: 'page' });
  page.append(pageHead('پروفایل', 'اطلاعات حساب و میانبرها'));

  /* Display-first: the profile reads like a page, not a form. A single edit
     button swaps the same card into edit mode with save/cancel. */
  const profileCard = card({ tint: true });
  const paintPhoto = () => {
    const photo = photoFor(persona.id);
    const face = photoAvatar(photo, persona.name, { size: 'lg' });
    face.classList.add('photo-tappable');
    face.setAttribute('role', 'button');
    face.setAttribute('tabindex', '0');
    face.setAttribute('aria-label', photo ? 'تغییر یا حذف تصویر پروفایل' : 'افزودن تصویر پروفایل');
    const openChooser = () =>
      openPhotoSourceSheet({
        title: 'تصویر پروفایل',
        allowRemove: Boolean(photo),
        onPick: (dataUrl, source) => {
          setPersonPhoto(persona.id, dataUrl);
          paintProfile();
          syncChrome('profile');
          toast(source === 'camera' ? 'عکس گرفته و ذخیره شد' : 'تصویر پروفایل ذخیره شد', 'ok');
        },
        onRemove: () => {
          setPersonPhoto(persona.id, null);
          paintProfile();
          syncChrome('profile');
          toast('تصویر پروفایل حذف شد', 'info');
        },
      });
    face.addEventListener('click', openChooser);
    face.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openChooser();
      }
    });

    /* View mode: avatar + identity + one quiet edit button (pencil). */
    const head = h(
      'div',
      { class: 'row' },
      face,
      h(
        'div',
        { class: 'grow' },
        h('h2', { text: persona.name }),
        h('p', { class: 'small muted nums', text: persona.phone }),
        h('p', { class: 'tiny muted', text: `@${persona.username} · ${ROLE_LABEL[currentRole()]}` }),
      ),
      h(
        'button',
        {
          class: 'btn soft sm',
          type: 'button',
          'aria-label': 'ویرایش پروفایل',
          on: { click: () => paintProfile(true) },
        },
        icon('edit', 'icon sm'),
        h('span', { text: 'ویرایش' }),
      ),
    );
    profileCard.replaceChildren(
      head,
      h('p', {
        class: 'small muted',
        style: { marginBlockStart: 'var(--sp-3)' },
        text: persona.bio?.trim() || 'بیوگرافی ثبت نشده است.',
      }),
    );
  };

  /* Edit mode: the photo itself opens the gallery/camera sheet; fields become
     editable and save/cancel closes back into view mode. */
  const paintEdit = () => {
    const photo = photoFor(persona.id);
    const face = photoAvatar(photo, persona.name, { size: 'lg' });
    face.classList.add('photo-tappable');
    face.setAttribute('role', 'button');
    face.setAttribute('tabindex', '0');
    face.setAttribute('aria-label', 'تغییر تصویر پروفایل');
    face.addEventListener('click', () =>
      openPhotoSourceSheet({
        title: 'تصویر پروفایل',
        allowRemove: Boolean(photo),
        onPick: (dataUrl, source) => {
          setPersonPhoto(persona.id, dataUrl);
          paintEdit();
          syncChrome('profile');
          toast(source === 'camera' ? 'عکس گرفته و ذخیره شد' : 'تصویر پروفایل ذخیره شد', 'ok');
        },
        onRemove: () => {
          setPersonPhoto(persona.id, null);
          paintEdit();
          syncChrome('profile');
          toast('تصویر پروفایل حذف شد', 'info');
        },
      }),
    );
    face.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        face.click();
      }
    });

    const bio = textarea({ label: 'بیوگرافی', value: persona.bio ?? '', rows: 3, placeholder: 'یک معرفی کوتاه…' });
    const displayName = field({ label: 'نام نمایشی', value: persona.name });
    const username = field({ label: 'نام کاربری', value: persona.username, dir: 'ltr', hint: 'نام کاربری در نسخهٔ نمایشی تغییر نمی‌کند.' });

    const save = h('button', { class: 'btn primary', type: 'button', text: 'ذخیره' });
    save.addEventListener('click', () => {
      const nextName = displayName.input.value.trim();
      if (!nextName) {
        toast('نام نمایشی لازم است', 'bad');
        return;
      }
      const nextBio = bio.input.value.trim();
      persona.name = nextName;
      persona.bio = nextBio || undefined;
      syncChrome('profile');
      toast('تغییرات ذخیره شد', 'ok');
      paintProfile();
    });
    const cancel = h('button', { class: 'btn ghost', type: 'button', text: 'انصراف', on: { click: () => paintProfile() } });

    profileCard.replaceChildren(
      h('div', { class: 'row' }, face, h('p', { class: 'tiny muted grow', text: 'برای تغییر تصویر روی آن بزنید؛ از گالری یا دوربین انتخاب می‌شود و ۲۵۶ پیکسل ذخیره می‌شود.' })),
      displayName.wrap,
      username.wrap,
      bio.wrap,
      h('div', { class: 'btn-row' }, save, cancel),
    );
  };

  const paintProfile = (editing = false) => (editing ? paintEdit() : paintPhoto());
  paintProfile();
  page.append(profileCard, banner('در نسخهٔ نمایشی تصویر و تغییرات فقط روی همین دستگاه نگه داشته می‌شود و به سرور ارسال نمی‌گردد.', { glyph: 'shield' }));

  page.append(
    card(
      {},
      sectionHead('مشخصات'),
      kvGrid([
        ['شماره تأییدشده', persona.phone],
        ['نقش', ROLE_LABEL[currentRole()]],
        ['شناسه حساب', 'usr-8842-makan'],
      ]),
      banner('شماره تأییدشده و نقش با فرم پروفایل تغییر نمی‌کنند؛ برای تغییر شماره مسیر جداگانه با احراز مجدد لازم است.', { glyph: 'lock' }),
    ),
  );

  const shortcuts = h('div', { class: 'grid-2' });
  for (const link of [
    { label: 'امور مالی', href: '/profile/finance', glyph: 'card' as const, note: 'فاکتور و پرداخت' },
    { label: 'تنظیمات', href: '/profile/notifications', glyph: 'settings' as const, note: 'زبان، تم و اعلان' },
    { label: 'پشتیبانی', href: '/profile/support', glyph: 'headset' as const, note: 'درخواست پیگیری' },
    { label: 'فضای آموزش', href: '/school', glyph: 'school' as const, note: 'کلاس و آزمون' },
    { label: 'امنیت و دستگاه‌ها', href: '/profile/security', glyph: 'shield' as const, note: 'نشست‌ها' },
    { label: 'حریم خصوصی', href: '/profile/privacy', glyph: 'lock' as const, note: 'تحلیل و داده' },
  ]) {
    shortcuts.append(
      h('a', { class: 'card', href: link.href, style: { gap: '6px' } }, h('div', { class: 'row' }, h('div', { class: 'avatar sm sq' }, icon(link.glyph, 'icon sm')), h('h3', { class: 'grow', text: link.label }), h('span', { class: 'end' }, icon('chevronEnd', 'icon sm'))), h('p', { class: 'tiny muted', text: link.note })),
    );
  }
  page.append(sectionHead('میانبرها'), shortcuts);

  const reset = h('button', { class: 'btn ghost block', type: 'button', text: 'بازنشانی داده‌های نمایشی', on: { click: async () => { const ok = await confirmDialog({ title: 'بازنشانی داده نمایشی', message: 'همه تغییرات محلی این نسخه به حالت اولیه برمی‌گردد.', confirmLabel: 'بازنشانی' }); if (ok) { resetDemo(); toast('داده‌ها بازنشانی شد', 'ok'); location.reload(); } } } });
  page.append(reset);
  return page;
};

/* ------------------------------------------------------------------ C-08 */

export const notificationsPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('مرکز اعلان‌ها', 'مرجع پایدار اطلاع‌رسانی'));

  const groups = [
    { id: 'all', label: 'همه' },
    { id: 'assignment', label: 'آموزشی' },
    { id: 'message', label: 'ارتباطی' },
    { id: 'account', label: 'حساب' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'all';
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const list = app.get().notifications.filter((n) => (filter === 'all' ? true : n.kind === 'assignment' || n.kind === 'exam' ? filter === 'assignment' : n.kind === filter));
    if (!list.length) {
      host.append(empty({ glyph: 'bell', title: 'اعلانی نیست', text: 'اعلان‌ها اینجا نگه داشته می‌شوند تا به پیامک وابسته نباشید.' }));
      return;
    }
    for (const item of list) {
      host.append(
        listItem({
          href: item.href ?? '/notifications',
          unread: !item.read,
          leading: h('div', { class: 'avatar sm sq' }, icon(item.kind === 'grade' ? 'check' : item.kind === 'message' ? 'chat' : item.kind === 'exam' ? 'quiz' : 'bell', 'icon sm')),
          title: item.title,
          subtitle: item.body,
          meta: relative(item.at),
          trailing: !item.read ? chip('جدید', { tone: 'solid' }) : null,
        }),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  page.append(h('a', { class: 'btn soft block', href: '/profile/notifications', text: 'تنظیم اعلان‌ها' }));
  paint();
  return page;
};

/* ------------------------------------------------------------------ C-12 */

export const securityPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('امنیت و دستگاه‌ها', 'نشست‌ها، دستگاه‌ها و روش ورود'));

  page.append(
    card(
      { tint: true },
      sectionHead('روش ورود'),
      kvGrid([
        ['شماره همراه', currentPerson().phone],
        ['ورود دومرحله‌ای', 'پیامک یک‌بارمصرف'],
        ['آخرین ورود', relative(new Date(Date.now() - 3600_000))],
      ]),
      h('a', { class: 'btn soft block', href: '/profile/recovery', text: 'تغییر روش ورود' }),
    ),
  );

  const devices = [
    { name: 'آیفون ۱۳ · مرورگر', status: 'همین دستگاه', current: true },
    { name: 'Chromebook · مرورگر', status: '۲ روز پیش', current: false },
  ];
  page.append(
    card(
      {},
      sectionHead('دستگاه‌ها'),
      ...devices.map((device) =>
        listItem({
          leading: h('div', { class: 'avatar sm sq' }, icon('phoneDevice', 'icon sm')),
          title: device.name,
          subtitle: `${device.status} · موقعیت تقریبی: نمایش داده نمی‌شود`,
          trailing: device.current ? chip('فعلی', { tone: 'ok', glyph: '●' }) : chip('خروج', { glyph: 'logout' }),
        }),
      ),
      h('button', {
        class: 'btn danger block',
        type: 'button',
        text: 'خروج از سایر دستگاه‌ها',
        on: {
          click: async () => {
            const ok = await confirmDialog({ title: 'خروج از سایر دستگاه‌ها', message: 'نشست‌های دیگر باطل می‌شوند. حذف کش آفلاین روی آن دستگاه‌ها فوری نیست.', confirmLabel: 'خروج' });
            if (ok) toast('درخواست ثبت شد', 'ok');
          },
        },
      }),
    ),
  );
  page.append(banner('دستگاه لغوشده در اتصال بعدی نمی‌تواند پیام یا گزارش تازه دریافت کند.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ C-13 */

export const notificationSettingsPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('تنظیمات', 'زبان، ظاهر و اعلان‌ها'));

  const langRow = h('div', { class: 'pill-row' });
  const paintLang = () => {
    langRow.replaceChildren();
    for (const locale of LOCALES) {
      const active = session.get().locale === locale.id;
      const btn = h('button', { class: `chip btn-like ${active ? '' : 'ghost'}`, type: 'button' });
      btn.setAttribute('aria-pressed', String(active));
      btn.textContent = locale.label;
      btn.addEventListener('click', () => {
        session.set({ locale: locale.id });
        toast(`زبان: ${locale.label} (نمایش آزمایشی)`, 'ok');
      });
      langRow.append(btn);
    }
  };
  paintLang();

  const themeRow = h('div', { class: 'pill-row' });
  const paintTheme = () => {
    themeRow.replaceChildren();
    for (const theme of [{ id: 'light', label: 'روشن', glyph: 'sun' }, { id: 'dark', label: 'تیره', glyph: 'moon' }, { id: 'system', label: 'سیستم', glyph: 'gauge' }] as const) {
      const active = session.get().theme === theme.id;
      const btn = h('button', { class: `chip btn-like ${active ? '' : 'ghost'}`, type: 'button' });
      btn.setAttribute('aria-pressed', String(active));
      btn.append(icon(theme.glyph, 'icon sm'));
      btn.append(h('span', { text: theme.label }));
      btn.addEventListener('click', () => session.set({ theme: theme.id }));
      themeRow.append(btn);
    }
  };
  paintTheme();

  page.append(
    card({}, sectionHead('زبان'), langRow, h('p', { class: 'tiny muted', text: 'در این نسخه، رابط به فارسی/عربی/انگلیسی برچسب‌گذاری شده و محتوای نمایشی فارسی می‌ماند.' })),
    card({}, sectionHead('ظاهر'), themeRow),
    card(
      {},
      sectionHead('اعلان‌ها'),
      switchRow({ title: 'تکلیف و مهلت', subtitle: 'هشدار پیش از موعد', checked: true, onChange: (v) => toast(v ? 'فعال' : 'خاموش', 'info') }),
      switchRow({ title: 'نتیجه و نمره', subtitle: 'پس از انتشار نتیجه', checked: true, onChange: () => undefined }),
      switchRow({ title: 'پیام‌رسان', subtitle: 'پیام مستقیم و گروهی', checked: true, onChange: () => undefined }),
      switchRow({ title: 'گزارش روزانه', subtitle: 'خلاصه کارهای فردا', checked: true, onChange: () => undefined }),
      switchRow({ title: 'هشدار امنیتی', subtitle: 'همیشه فعال — قابل خاموش‌کردن نیست', checked: true, disabled: true, onChange: () => undefined }),
    ),
  );
  page.append(
    card(
      {},
      sectionHead('اپلیکیشن'),
      shouldOffer()
        ? h('button', { class: 'btn primary block', type: 'button', text: 'نصب ماکان روی صفحه اصلی', on: { click: openInstallSheet } })
        : h('p', { class: 'small muted', text: 'ماکان روی این دستگاه نصب است یا قبلاً پیشنهاد نصب را رد کرده‌اید.' }),
      h('p', { class: 'tiny muted', text: 'روی iPhone، نصب از طریق هم‌رسانی Safari و گزینه Add to Home Screen انجام می‌شود.' }),
    ),
  );
  session.subscribe(() => {
    paintLang();
    paintTheme();
  });
  return page;
};

/* ------------------------------------------------------------------ C-14 */

export const privacyPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('حریم خصوصی و داده', 'تفاوت اجازه تحلیل با اجازه گزارش‌دادن'));

  page.append(
    card(
      { tint: true },
      sectionHead('سیاست فعال', chip('نسخه نمایشی', { tone: 'info' })),
      h('p', { class: 'small', text: 'تحلیل گفتگو برای گزارش آموزشی به‌صورت پیش‌فرض خاموش است. فعال‌کردن تحلیل شخصی، اجازه گزارش همان محتوا به مدیر ایجاد نمی‌کند.' }),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('انتخاب‌های اختیاری'),
      switchRow({ title: 'استفاده از داده‌های آموزشی برای بهبود پیشنهادها', subtitle: 'فقط برای حساب شخصی', checked: false, onChange: () => undefined }),
      switchRow({ title: 'اشتراک گزارش پیشرفت با اولیا', subtitle: 'سیاست سازمان — قابل خاموش‌کردن نیست', checked: true, disabled: true, onChange: () => undefined }),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('داده من'),
      listItem({ title: 'درخواست خروجی داده', subtitle: 'گزارش قابل دریافت از داده‌های شخصی', trailing: chip('شروع', { glyph: 'download' }) }),
      listItem({ title: 'درخواست حذف داده', subtitle: 'با توجه به سوابق رسمی و مدت نگهداری', trailing: chip('شروع', { glyph: 'trash' }) }),
      h('p', { class: 'tiny muted', text: 'پس‌گرفتن رضایت، محدودیت حذف نسخه‌های دانلودشده و سوابق رسمی را دربر نمی‌گیرد و در فرایند بررسی توضیح داده می‌شود.' }),
    ),
  );
  return page;
};

/* ------------------------------------------------------------------ C-15 */

export const subscriptionPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('اشتراک دستیار', 'پلن شخصی — هزینه‌اش از سهمیه آموزشگاه جداست'));

  type Plan = {
    id: 'student' | 'plus' | 'pro';
    name: string;
    tagline: string;
    monthly: number;
    yearly: number;
    glyph: 'user' | 'star' | 'sparkle';
    features: string[];
    solid?: boolean;
    badge?: string;
  };

  const PLANS: Plan[] = [
    {
      id: 'student',
      name: 'دانش‌آموزی',
      tagline: 'برای شروع؛ گفتگو و تمرین روزمره',
      monthly: 49_000,
      yearly: 490_000,
      glyph: 'user',
      features: [
        '۱۰۰ پیام دستیار در ماه',
        '۱ دفتر با ۱ منبع',
        'توضیح گام‌به‌گام تمرین ریاضی و علوم',
        'تاریخچه ۳۰ روز گفتگو',
        'پشتیبانی با تیکت',
      ],
    },
    {
      id: 'plus',
      name: 'پلاس',
      tagline: 'محبوب‌ترین پلن برای فصل امتحان',
      monthly: 99_000,
      yearly: 990_000,
      glyph: 'star',
      features: [
        '۵۰۰ پیام دستیار در ماه',
        '۵ دفتر با ۱۰ منبع در هر دفتر',
        'خلاصه‌سازی جزوه و ساخت فلش‌کارت',
        'آزمونک هوشمند از منابع خودت',
        'تاریخچه ۶ ماه + جست‌وجو در گفتگوها',
        'پشتیبانی سریع‌تر (چت)',
      ],
      solid: true,
      badge: 'پیشنهاد ما',
    },
    {
      id: 'pro',
      name: 'پرو',
      tagline: 'برای معلم و مدیر؛ ظرفیت سازمانی',
      monthly: 199_000,
      yearly: 1_990_000,
      glyph: 'sparkle',
      features: [
        'پاسخ نامحدود دستیار',
        '۲۰ دفتر با منبع نامحدود',
        'پیش‌نویس تکلیف و بازبینی قبل از انتشار',
        'گزارش پیشرفت گروهی کلاس',
        'اولویت صف پردازش منابع',
        'مدیریت اعضا و فاکتور سازمانی',
      ],
    },
  ];

  let period: 'monthly' | 'yearly' = 'monthly';
  let chosen: Plan['id'] = 'plus';

  const periodRow = h('div', { class: 'pill-row', role: 'tablist' });
  const grid = h('div', { class: 'plan-grid' });

  const paint = () => {
    periodRow.replaceChildren();
    for (const option of [
      { id: 'monthly', label: 'ماهانه' },
      { id: 'yearly', label: 'سالانه (۲ ماه هدیه)' },
    ] as const) {
      const btn = h('button', { class: `chip btn-like ${period === option.id ? '' : 'ghost'}`, type: 'button' });
      btn.setAttribute('aria-pressed', String(period === option.id));
      btn.textContent = option.label;
      btn.addEventListener('click', () => {
        period = option.id;
        paint();
      });
      periodRow.append(btn);
    }

    grid.replaceChildren();
    for (const plan of PLANS) {
      const active = chosen === plan.id;
      const price = period === 'monthly' ? plan.monthly : plan.yearly;
      const per = period === 'monthly' ? 'ماهانه' : 'سالانه';
      const el = h('button', { class: `plan-card ${plan.solid ? 'is-hot' : ''} ${active ? 'is-chosen' : ''}`, type: 'button' });
      el.setAttribute('aria-pressed', String(active));
      const head = h('div', { class: 'plan-head' });
      head.append(h('div', { class: 'plan-glyph' }, icon(plan.glyph)));
      const nameCol = h('div', { class: 'grow' }, h('div', { class: 'plan-name', text: plan.name }), h('div', { class: 'tiny muted', text: plan.tagline }));
      if (plan.badge) head.append(h('span', { class: 'plan-flag', text: plan.badge }));
      head.append(nameCol);
      el.append(head);
      el.append(
        h('div', { class: 'plan-price' }, h('span', { class: 'amount', text: price.toLocaleString('fa-IR') }), h('span', { class: 'unit', text: `تومان / ${per}` })),
      );
      const feats = h('ul', { class: 'plan-feats' });
      for (const feature of plan.features) {
        feats.append(h('li', {}, icon('check', 'icon sm'), h('span', { text: feature })));
      }
      el.append(feats);
      el.append(h('div', { class: `btn ${active ? 'primary' : 'soft'} plan-cta`, text: active ? 'انتخاب شد ✓' : 'انتخاب این پلن' }));
      el.addEventListener('click', () => {
        chosen = plan.id;
        paint();
      });
      grid.append(el);
    }
    payBtn.textContent = `خرید پلن ${PLANS.find((p) => p.id === chosen)!.name} — ${(period === 'monthly' ? PLANS.find((p) => p.id === chosen)!.monthly : PLANS.find((p) => p.id === chosen)!.yearly).toLocaleString('fa-IR')} تومان`;
  };

  const payBtn = h('button', { class: 'btn primary block', type: 'button', on: { click: () => toast('پرداخت در این نسخه شبیه‌سازی می‌شود؛ در محیط واقعی به درگاه می‌روید.', 'info') } });
  page.append(periodRow, grid, payBtn);
  paint();

  page.append(
    card(
      {},
      sectionHead('بسته فعال', chip('آزمایشی', { tone: 'info' })),
      kvGrid([
        ['دوره', 'ماهانه'],
        ['پرداخت‌کننده', 'شما (شخصی)'],
        ['مصرف', '۲۸ از ۵۰'],
        ['دستیار مجاز', 'دستیار شخصی'],
      ]),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('تاریخچه سفارش شخصی'),
      listItem({ title: 'اشتراک دستیار شخصی — ماهانه', subtitle: 'خریدار: شما', meta: relative(new Date(Date.now() - 20 * 86400000)), trailing: chip('پرداخت‌شده', { tone: 'ok' }) }),
    ),
  );
  page.append(banner('پایان سهمیه، چت را حذف نمی‌کند و انتقال هزینه از آموزشگاه به شخصی بدون تأیید ممنوع است.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ finance */

export const financePage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('امور مالی', 'فاکتورها و وضعیت پرداخت'));

  const invoices = app.get().invoices;
  const stats = h('div', { class: 'grid-2' });
  stats.append(
    card({ cls: 'pad-sm' }, stat(String(invoices.length), 'فاکتور')),
    card({ cls: 'pad-sm' }, stat(money(invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)), 'پرداخت‌شده')),
  );
  page.append(stats);

  for (const invoice of invoices) {
    const status = invoice.status === 'paid' ? 'پرداخت‌شده' : invoice.status === 'pending' ? 'در انتظار تأیید' : invoice.status === 'rejected' ? 'رد شده' : 'پرداخت‌نشده';
    const cardEl = card(
      {},
      h('div', { class: 'row between wrap' }, h('h3', { class: 'nums', text: invoice.number }), chip(status, { tone: invoice.status === 'paid' ? 'ok' : invoice.status === 'rejected' ? 'bad' : 'warn', glyph: invoice.status === 'paid' ? '✓' : '⏱' })),
      kvGrid([
        ['مبلغ', money(invoice.amount)],
        ['صادر', formatDate(invoice.issuedAt, { short: true })],
        ['کد پیگیری', invoice.ref ?? '—'],
        ['شرح', invoice.plan],
      ]),
    );
    if (invoice.status !== 'paid') {
      const pay = h('button', { class: 'btn primary block', type: 'button', text: 'پرداخت (شبیه‌سازی)' });
      pay.addEventListener('click', async () => {
        const ref = field({ label: 'کد پیگیری درگاه', placeholder: '۱۲ رقم', dir: 'ltr', hint: 'در محیط واقعی، مبلغ و شناسه فاکتور روی سرور تطبیق داده می‌شود.' });
        const close = openSheetFor(ref.wrap, pay, invoice.id);
        void close;
      });
      cardEl.append(pay);
    }
    page.append(cardEl);
  }

  page.append(
    banner('ثبت کد پیگیری یا ارسال رسید، اثبات پرداخت نیست. تأیید نهایی با پاسخ درگاه و ثبت اتمی انجام می‌شود.', { tone: 'warn', glyph: 'alert' }),
  );
  return page;
};

function openSheetFor(node: HTMLElement, trigger: HTMLElement, invoiceId: string): void {
  import('../core/overlays').then(({ openSheet }) => {
    const ref = node.querySelector('input') as HTMLInputElement;
    openSheet({
      title: 'پرداخت فاکتور',
      body: (() => {
        const host = h('div', { class: 'stack' }, node);
        const confirm = h('button', {
          class: 'btn primary block',
          type: 'button',
          text: 'ثبت پرداخت',
          on: {
            click: () => {
              const result = payInvoice(invoiceId, ref.value.trim() || 'TRX-DEMO');
              toast(result.message, result.ok ? 'ok' : 'bad');
              trigger.textContent = 'پرداخت (شبیه‌سازی)';
            },
          },
        });
        host.append(confirm);
        return host;
      })(),
    });
  });
}

/* ------------------------------------------------------------------ C-16 */

export const supportPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('پشتیبانی', 'برای هر مشکل، مسیر پیگیری مشخص'));

  const tickets = [
    { code: 'MK-10422', subject: 'لینک جلسه باز نمی‌شود', status: 'answered', assignee: 'پشتیبانی — سارا', at: new Date(Date.now() - 2 * 86400000) },
    { code: 'MK-10390', subject: 'نمره اشتباه محاسبه شده', status: 'open', assignee: 'مسئول آموزشی آموزشگاه', at: new Date(Date.now() - 4 * 86400000) },
  ];

  page.append(
    card(
      {},
      sectionHead('درخواست‌های من'),
      ...tickets.map((ticket) =>
        listItem({
          title: ticket.subject,
          subtitle: `${ticket.code} · مسئول: ${ticket.assignee}`,
          meta: relative(ticket.at),
          trailing: chip(ticket.status === 'open' ? 'در انتظار' : 'پاسخ داده شد', { tone: ticket.status === 'open' ? 'warn' : 'ok' }),
        }),
      ),
    ),
  );

  const subject = field({ label: 'موضوع', placeholder: 'مثلاً مشکل در ارسال پاسخ' });
  const detail = textarea({ label: 'شرح', rows: 4, placeholder: 'چه اتفاقی افتاد و چه انتظاری داشتید؟' });
  const attach = h('input', { type: 'file', class: 'sr', id: 'support-file' });
  const attachLabel = h('label', { class: 'btn ghost sm', for: 'support-file' }, icon('upload', 'icon sm'), h('span', { text: 'افزودن پیوست' }));
  attach.addEventListener('change', () => toast(attach.files?.[0]?.name ?? 'فایلی انتخاب نشد', 'info'));

  const submit = h('button', { class: 'btn primary block', type: 'button', text: 'ثبت درخواست' });
  submit.addEventListener('click', () => {
    if (!subject.input.value.trim()) {
      toast('موضوع را وارد کنید', 'bad');
      return;
    }
    toast('درخواست ثبت شد و کد پیگیری گرفتید', 'ok');
    subject.input.value = '';
    detail.input.value = '';
  });

  page.append(card({}, subject.wrap, detail.wrap, h('div', { class: 'row wrap', style: { gap: '8px' } }, attachLabel, attach), submit));
  page.append(banner('چت خصوصی به‌صورت خودکار ضمیمه نمی‌شود. سؤال درباره نمره به مسئول آموزشی می‌رسد، نه پشتیبانی فنی.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ C-17 */

export const recoveryPage: PageRenderer = () => {
  if (currentRole() === 'guardian') return denied('روش بازیابی برای حساب دانش‌آموز فقط با مدرسه سرپرستی و مدرک انجام می‌شود.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('بازیابی دسترسی', 'برای گوشی گم‌شده و حساب فراموش‌شده'));

  const issues = [
    { id: 'phone', label: 'شماره همراه در دسترس نیست', detail: 'با شماره دیگری و تأیید هویت' },
    { id: 'child', label: 'حساب دانش‌آموزی', detail: 'نیازمند تأیید آموزشگاه و سرپرست' },
    { id: 'device', label: 'گوشی گم شده', detail: 'ابطال نشست‌ها از راه دور' },
  ];
  const selected = h('div', { class: 'stack sm' });
  let choice = 'phone';
  const paint = () => {
    selected.replaceChildren();
    for (const issue of issues) {
      const active = choice === issue.id;
      const row = h('button', { class: `list-item ${active ? 'unread' : ''}`, type: 'button' });
      row.append(h('div', { class: 'body' }, h('span', { text: issue.label }), h('span', { class: 'meta', text: issue.detail })));
      row.append(h('span', { class: 'end' }, chip(active ? 'انتخاب‌شده' : 'انتخاب', { tone: active ? 'solid' : 'plain' })));
      row.addEventListener('click', () => {
        choice = issue.id;
        paint();
      });
      selected.append(row);
    }
  };
  paint();

  const next = h('button', { class: 'btn primary block', type: 'button', text: 'ادامه' });
  next.addEventListener('click', () => toast('درخواست بررسی ثبت شد و کد پیگیری می‌گیرید', 'ok'));

  page.append(card({}, sectionHead('مشکل را انتخاب کنید'), selected, next));
  page.append(banner('سرپرستی یا مدیریت آموزشگاه به‌تنهایی امکان ورود مخفی به حساب دانش‌آموز ایجاد نمی‌کند.', { glyph: 'shield' }));
  return page;
};

void markAllNotificationsRead;