/** Public application flow + operations console (admin side of the business flow). */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import { banner, card, chip, empty, field, kvGrid, listItem, pageHead, sectionHead, stat, textarea } from '../ui/kit';
import { formatDate, money, relative } from '../core/format';
import { applications as seedApplications, invoices as seedInvoices, resources } from '../data/seed';
import { app, approveApplication, issueInvoice, rejectApplication } from '../data/app-state';
import { can, currentRole } from '../data/session';
import { confirmDialog, toast } from '../core/overlays';
import { denied } from './classes';
import type { PageRenderer } from '../core/router';

/* ------------------------------------------------------------ application */

const STEPS = [
  { id: 1, label: 'اطلاعات پایه' },
  { id: 2, label: 'جواز و مدارک' },
  { id: 3, label: 'تکمیل درخواست' },
] as const;

export const applyPage: PageRenderer = () => {
  let step: (typeof STEPS)[number]['id'] = 1;
  const data = {
    first: '',
    last: '',
    nationalId: '',
    username: '',
    phone: '',
    schoolName: '',
    founded: '',
    parentOrg: '',
    licenseName: '' as string | undefined,
    licenseKb: 0,
    city: '',
    topic: '',
    level: '',
    capacity: '',
    needs: '',
    resourceIds: new Set<string>(),
  };

  const page = h('div', { class: 'page' });
  const host = h('div', { class: 'stack' });
  const errors = h('div', { class: 'err' });
  errors.style.display = 'none';

  const paint = () => {
    host.replaceChildren();
    const stepper = h('div', { class: 'stepper' });
    for (const item of STEPS) stepper.append(h('span', { class: `step ${item.id <= step ? 'done' : ''}` }));
    host.append(stepper, h('div', { class: 'steps-label' }, ...STEPS.map((item) => h('span', { text: `${item.id}. ${item.label}` }))));

    if (step === 1) {
      const first = field({ label: 'نام', value: data.first });
      const last = field({ label: 'نام خانوادگی', value: data.last });
      const nationalId = field({ label: 'کد ملی مدیر', value: data.nationalId, inputMode: 'numeric', dir: 'ltr', hint: 'کد ملی نامعتبر یا تکراری رد می‌شود.' });
      const username = field({ label: 'نام کاربری', value: data.username, dir: 'ltr' });
      const phone = field({ label: 'شماره همراه', value: data.phone, inputMode: 'numeric', dir: 'ltr' });
      const schoolName = field({ label: 'نام آموزشگاه', value: data.schoolName });
      const founded = field({ label: 'تاریخ تأسیس', type: 'date' });
      const parentOrg = field({ label: 'سازمان وابسته', value: data.parentOrg, placeholder: 'ندارد' });
      for (const [key, el] of [['first', first], ['last', last], ['nationalId', nationalId], ['username', username], ['phone', phone], ['schoolName', schoolName], ['parentOrg', parentOrg]] as const) {
        el.input.addEventListener('input', () => {
          (data as unknown as Record<string, string>)[key] = el.input.value;
        });
      }
      nationalId.input.addEventListener('input', () => {
        nationalId.input.value = nationalId.input.value.replace(/\D/g, '').slice(0, 10);
      });
      phone.input.addEventListener('input', () => {
        phone.input.value = phone.input.value.replace(/\D/g, '').slice(0, 11);
        data.phone = phone.input.value;
      });
      host.append(card({}, first.wrap, last.wrap, nationalId.wrap, username.wrap, phone.wrap, schoolName.wrap, h('div', { class: 'grid-2' }, founded.wrap, parentOrg.wrap)));
    }

    if (step === 2) {
      const input = h('input', { type: 'file', class: 'sr', id: 'license-file', accept: '.pdf,.jpg,.jpeg,.png' });
      const info = h('div', { class: 'stack sm' });
      const paintInfo = () => {
        info.replaceChildren();
        if (!data.licenseName) {
          info.append(h('p', { class: 'tiny muted', text: 'PDF یا تصویر JPG/PNG تا ۵۱۲ کیلوبایت پذیرفته می‌شود.' }));
          return;
        }
        info.append(h('div', { class: 'chip info' }, icon('file', 'icon sm'), h('span', { text: `${data.licenseName} · ${data.licenseKb} کیلوبایت` })));
      };
      paintInfo();
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
          toast('فقط PDF یا تصویر پذیرفته می‌شود', 'bad');
          return;
        }
        if (file.size > 512 * 1024) {
          toast('حجم فایل بیش از ۵۱۲ کیلوبایت است', 'bad');
          return;
        }
        data.licenseName = file.name;
        data.licenseKb = Math.round(file.size / 1024);
        paintInfo();
      });
      host.append(
        card(
          {},
          h('label', { class: 'btn primary block', for: 'license-file' }, icon('upload', 'icon sm'), h('span', { text: 'بارگذاری فایل جواز' })),
          input,
          info,
          banner('در نسخه نمایشی، فایل فقط در مرورگر شما خوانده می‌شود و ارسال واقعی انجام نمی‌گیرد. از اطلاعات ساختگی استفاده کنید.', { tone: 'warn', glyph: 'alert' }),
        ),
      );
    }

    if (step === 3) {
      const city = field({ label: 'شهر', value: data.city });
      const topic = field({ label: 'موضوع آموزش', value: data.topic });
      const level = field({ label: 'سطح‌بندی', value: data.level });
      const capacity = field({ label: 'ظرفیت موردنیاز', type: 'number', value: data.capacity });
      const needs = textarea({ label: 'نیازهای آموزشی', rows: 3, placeholder: 'مثلاً ۳ کلاس با گروه رسمی و حضور' });
      host.append(card({}, city.wrap, topic.wrap, level.wrap, capacity.wrap, needs.wrap));

      const picker = h('div', { class: 'stack sm' });
      for (const resource of resources.slice(0, 3)) {
        const active = data.resourceIds.has(resource.id);
        const row = h('div', { class: 'list-item' });
        row.append(h('div', { class: 'avatar sm sq' }, icon('file', 'icon sm')));
        row.append(h('div', { class: 'body' }, h('span', { text: resource.title }), h('span', { class: 'meta', text: `${resource.pages ?? 0} صفحه` })));
        const toggle = h('button', { class: `chip btn-like ${active ? '' : 'ghost'}`, type: 'button' });
        toggle.setAttribute('aria-pressed', String(active));
        toggle.textContent = active ? 'انتخاب شد' : 'انتخاب';
        toggle.addEventListener('click', () => {
          if (data.resourceIds.has(resource.id)) data.resourceIds.delete(resource.id);
          else data.resourceIds.add(resource.id);
          toggle.setAttribute('aria-pressed', String(data.resourceIds.has(resource.id)));
          toggle.className = `chip btn-like ${data.resourceIds.has(resource.id) ? '' : 'ghost'}`;
          toggle.textContent = data.resourceIds.has(resource.id) ? 'انتخاب شد' : 'انتخاب';
        });
        row.append(toggle);
        picker.append(row);
      }
      host.append(card({}, sectionHead('منابع درخواستی', chip(`${data.resourceIds.size} انتخاب`)), h('p', { class: 'tiny muted', text: 'انتخاب منابع می‌تواند خالی، تکی یا چندتایی باشد.' }), picker));
    }

    const nav = h('div', { class: 'btn-row' });
    if (step > 1) {
      nav.append(h('button', { class: 'btn ghost', type: 'button', text: 'مرحله قبل', on: { click: () => { step = (step - 1) as typeof step; paint(); } } }));
    }
    if (step < 3) {
      const next = h('button', { class: 'btn primary grow', type: 'button', text: 'ادامه' });
      next.addEventListener('click', () => {
        if (step === 1) {
          if (!data.first.trim() || !data.last.trim() || !data.schoolName.trim() || data.username.trim().length < 3 || !/^09\d{9}$/.test(data.phone) || data.nationalId.length !== 10) {
            errors.textContent = 'نام، نام آموزشگاه، نام کاربری، شماره همراه و کد ملی معتبر لازم است.';
            errors.style.display = '';
            return;
          }
        }
        errors.style.display = 'none';
        step = (step + 1) as typeof step;
        paint();
      });
      nav.append(next);
    } else {
      const submit = h('button', { class: 'btn primary grow', type: 'button', text: 'ثبت درخواست' });
      submit.addEventListener('click', async () => {
        if (!data.licenseName) {
          errors.textContent = 'فایل جواز الزامی است.';
          errors.style.display = '';
          return;
        }
        const ok = await confirmDialog({ title: 'ثبت درخواست', message: 'درخواست بررسی می‌شود. فعال‌شدن آموزشگاه فقط پس از تأیید نهایی پرداخت انجام می‌گیرد.', confirmLabel: 'ثبت' });
        if (!ok) return;
        toast('درخواست ثبت شد؛ پیگیری از بخش وضعیت', 'ok');
        location.assign('/apply/status');
      });
      nav.append(submit);
    }
    host.append(nav, errors);
  };

  page.append(pageHead('درخواست آموزشگاه', 'ایجاد حساب با فعال‌شدن آموزشگاه یکی نیست'));
  page.append(host);
  paint();
  page.append(
    card(
      {},
      sectionHead('مراحل بعد از ثبت'),
      h(
        'ol',
        { class: 'stack sm small muted' },
        h('li', { text: '۱. بررسی اولیه ادمین (ادامه تجاری، نه مجوز پنل)' }),
        h('li', { text: '۲. صدور فاکتور' }),
        h('li', { text: '۳. پرداخت و تأیید نهایی ادمین' }),
        h('li', { text: '۴. فعال‌سازی آموزشگاه' }),
      ),
    ),
  );
  return page;
};

export const applyStatusPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('پیگیری درخواست', 'وضعیت بررسی، فاکتور و فعال‌سازی'));

  const mine = app.get().applications[0];
  if (!mine) {
    page.append(empty({ glyph: 'file', title: 'درخواستی ثبت نشده است' }));
    return page;
  }

  const statusLabel: Record<string, string> = {
    draft: 'پیش‌نویس',
    submitted: 'ثبت شده',
    'pre-approved': 'تأیید اولیه',
    rejected: 'رد شده',
    invoiced: 'فاکتور صادر شد',
    paid: 'پرداخت تأیید و فعال',
    activated: 'فعال',
  };

  page.append(
    card(
      { tint: true },
      h('div', { class: 'row between wrap' }, h('h2', { text: mine.schoolName }), chip(statusLabel[mine.status], { tone: mine.status === 'rejected' ? 'bad' : mine.status === 'paid' ? 'ok' : 'warn' })),
      kvGrid([
        ['متقاضی', mine.applicantName],
        ['شهر', mine.city],
        ['ظرفیت', `${mine.capacity} نفر`],
        ['مرحله فعلی', statusLabel[mine.status]],
      ]),
    ),
  );

  const timeline = h('div', { class: 'rail-timeline' });
  for (const entry of mine.steps) {
    timeline.append(
      h(
        'div',
        { class: 'tl-item is-live' },
        h('span', { class: 'tl-time', text: formatDate(entry.at, { short: true, time: true }) }),
        h('span', { style: { fontWeight: '700', fontSize: '14px' }, text: entry.label }),
        h('span', { class: 'tiny muted', text: entry.actor }),
      ),
    );
  }
  page.append(card({}, sectionHead('تاریخچه'), timeline));

  if (mine.invoice) {
    page.append(
      card(
        {},
        sectionHead('فاکتور', chip(mine.invoice.number)),
        kvGrid([
          ['مبلغ', money(mine.invoice.amount)],
          ['وضعیت', mine.invoice.status === 'paid' ? 'پرداخت‌شده' : mine.invoice.status === 'pending' ? 'در انتظار تأیید' : 'پرداخت‌نشده'],
          ['کد پیگیری', mine.invoice.ref ?? '—'],
          ['صادر', formatDate(mine.invoice.issuedAt, { short: true })],
        ]),
        h('a', { class: 'btn soft block', href: '/profile/finance', text: 'رفتن به امور مالی' }),
      ),
    );
  }

  page.append(
    banner('پرداخت موفق به‌معنای «آموزشگاه آماده است» نیست؛ فعال‌سازی پس از تأیید نهایی ادمین انجام می‌شود.', { tone: 'warn', glyph: 'alert' }),
  );
  void seedApplications;
  return page;
};

/* --------------------------------------------------------------- admin ops */

export const adminHomePage: PageRenderer = () => {
  if (!can('adminPlatform')) return denied('پنل عملیات فقط برای نقش ادمین ماکان است.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('پنل عملیات ماکان', 'درخواست‌ها، فاکتورها و راه‌اندازی'));

  const state = app.get();
  const stats = h('div', { class: 'grid-2' });
  stats.append(
    card({ cls: 'pad-sm' }, stat(String(state.applications.filter((a) => a.status === 'submitted').length), 'درخواست تازه')),
    card({ cls: 'pad-sm' }, stat(String(state.applications.filter((a) => a.status === 'invoiced').length), 'در انتظار پرداخت')),
    card({ cls: 'pad-sm' }, stat(money(state.invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)), 'درآمد تأییدشده')),
    card({ cls: 'pad-sm' }, stat(String(state.invoices.filter((i) => i.status === 'unpaid').length), 'فاکتور باز')),
  );
  page.append(stats);

  for (const application of state.applications) {
    const el = card(
      {},
      h(
        'div',
        { class: 'row between wrap' },
        h('div', {}, h('h3', { text: application.schoolName }), h('p', { class: 'tiny muted', text: `${application.applicantName} · ${application.city} · ظرفیت ${application.capacity}` })),
        chip(application.status === 'submitted' ? 'ثبت شده' : application.status === 'invoiced' ? 'فاکتور صادر شد' : application.status === 'paid' ? 'فعال' : application.status, {
          tone: application.status === 'paid' ? 'ok' : application.status === 'rejected' ? 'bad' : 'warn',
        }),
      ),
      kvGrid([
        ['کد ملی مدیر', application.nationalId],
        ['جواز', `${application.licenseName} · ${application.licenseKb} کیلوبایت`],
        ['موضوع آموزش', application.topic],
        ['نیازها', application.needs],
      ]),
      h(
        'div',
        { class: 'btn-row' },
        (() => {
          const approve = h('button', { class: 'btn soft sm', type: 'button', text: 'تأیید اولیه', on: { click: () => { toast('تأیید اولیه فقط ادامه تجاری است، نه مجوز پنل', 'info'); } } });
          return approve;
        })(),
        (() => {
          const invoice = h('button', {
            class: 'btn soft sm',
            type: 'button',
            text: 'صدور فاکتور',
            'aria-disabled': String(application.status === 'paid'),
            on: {
              click: () => {
                issueInvoice(application.id);
                toast('فاکتور صادر شد', 'ok');
                location.reload();
              },
            },
          });
          return invoice;
        })(),
        (() => {
          const approve = h('button', {
            class: 'btn primary sm',
            type: 'button',
            text: 'تأیید پرداخت و فعال‌سازی',
            'aria-disabled': String(application.status !== 'invoiced'),
            on: {
              click: async () => {
                const ok = await confirmDialog({ title: 'فعال‌سازی آموزشگاه', message: 'تأیید پرداخت و فعال‌سازی باید در یک تراکنش پایدار ثبت شود.', confirmLabel: 'فعال‌سازی' });
                if (!ok) return;
                approveApplication(application.id);
                toast('آموزشگاه فعال شد (نمایشی)', 'ok');
                location.reload();
              },
            },
          });
          return approve;
        })(),
        (() => {
          const reject = h('button', {
            class: 'btn danger sm',
            type: 'button',
            text: 'رد با دلیل',
            on: {
              click: async () => {
                const ok = await confirmDialog({ title: 'رد درخواست', message: 'رد درخواست بدون دلیل مجاز نیست.', confirmLabel: 'رد', danger: true, requireText: { label: 'دلیل رد' } });
                if (!ok) return;
                rejectApplication(application.id, 'مدارک ناقص');
                toast('درخواست رد شد', 'ok');
                location.reload();
              },
            },
          });
          return reject;
        })(),
      ),
    );
    page.append(el);
  }

  page.append(
    card(
      {},
      sectionHead('فهرست فاکتورها'),
      ...state.invoices.map((invoice) =>
        listItem({
          title: invoice.number,
          subtitle: `${invoice.plan} · صادر ${relative(invoice.issuedAt)}`,
          meta: money(invoice.amount),
          trailing: chip(invoice.status === 'paid' ? 'پرداخت‌شده' : invoice.status === 'pending' ? 'در انتظار' : 'باز', { tone: invoice.status === 'paid' ? 'ok' : 'warn' }),
        }),
      ),
    ),
  );

  page.append(
    banner('این پنل به گفتگوی خصوصی یا پاسخ‌نامه کاربران دسترسی ندارد. اصلاح دستی وضعیت پرداخت بدون فرایند مجاز ممنوع است.', { glyph: 'shield' }),
  );
  void seedInvoices;
  void currentRole;
  return page;
};
