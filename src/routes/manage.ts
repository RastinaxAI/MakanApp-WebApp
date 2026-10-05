/** MG-01 … MG-11 — academy manager console. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  banner,
  bar,
  card,
  chip,
  empty,
  field,
  kvGrid,
  listItem,
  pageHead,
  sectionHead,
  seg,
  stat,
  switchRow,
  textarea,
} from '../ui/kit';
import { formatDate, n, relative } from '../core/format';
import {
  assignments,
  classById,
  classes,
  guardianLinks,
  lessons,
  nameOf,
  people,
  personById,
  schoolById,
  sessions,
  submissions,
  terms,
} from '../data/seed';
import { app } from '../data/app-state';
import { can, currentSchool, session as state } from '../data/session';
import { confirmDialog, toast } from '../core/overlays';
import { denied } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';

function requireManager(message = 'این بخش برای نقش شما در دسترس نیست.') {
  return currentSchool() && can('manageRoster') ? null : denied(message);
}

function scopedClasses() {
  const schoolId = currentSchool()?.id;
  return classes.filter((c) => !schoolId || c.schoolId === schoolId);
}

/* ------------------------------------------------------------------ index */

export const manageHomePage: PageRenderer = () => {
  if (requireManager()) return denied();
  const school = currentSchool()!;
  const page = h('div', { class: 'page' });
  page.append(pageHead('مدیریت آموزشگاه', `${school.name} · ${school.city}`));

  const groups = [
    { id: 'people', label: 'افراد', href: '/school/manage/people', glyph: 'users' as const, note: `${school.usedSeats} نفر` },
    { id: 'classes', label: 'کلاس‌ها', href: '/school/manage/classes', glyph: 'school' as const, note: `${scopedClasses().length} کلاس` },
    { id: 'curriculum', label: 'ترم و درس', href: '/school/manage/curriculum', glyph: 'layers' as const, note: `${terms.length} ترم` },
    { id: 'invites', label: 'دعوت‌ها', href: '/school/manage/invites', glyph: 'mail' as const, note: '۳ در انتظار' },
    { id: 'guardians', label: 'سرپرستی', href: '/school/manage/guardians', glyph: 'shield' as const, note: '۲ در بررسی' },
    { id: 'reports', label: 'گزارش‌ها', href: '/school/manage/reports', glyph: 'chart' as const, note: 'هفته جاری' },
    { id: 'plan', label: 'اشتراک', href: '/school/manage/plan', glyph: 'wallet' as const, note: school.plan },
    { id: 'settings', label: 'سیاست‌ها', href: '/school/manage/settings', glyph: 'settings' as const, note: school.timezone },
  ];

  const grid = h('div', { class: 'grid-2' });
  for (const item of groups) {
    grid.append(
      h(
        'a',
        { class: 'card', href: item.href, style: { gap: '6px' } },
        h('div', { class: 'row' }, h('div', { class: 'avatar sm sq' }, icon(item.glyph, 'icon sm')), h('h3', { class: 'grow', text: item.label }), h('span', { class: 'end' }, icon('chevronEnd', 'icon sm'))),
        h('p', { class: 'tiny muted', text: item.note }),
      ),
    );
  }
  page.append(grid);
  page.append(banner('مدیر آموزشگاه مشتری پلتفرم است؛ دسترسی به پنل عملیات ماکان ندارد.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ MG-02 */

export const curriculumPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('ترم و درس', 'ساختار آموزشی مشترک بین کلاس‌ها'));

  let tab: 'terms' | 'lessons' = 'terms';
  const host = h('div', { class: 'stack' });
  const paint = () => {
    host.replaceChildren();
    if (tab === 'terms') {
      for (const term of terms) {
        host.append(
          card(
            {},
            h('div', { class: 'row between' }, h('h3', { text: term.name }), chip(`${formatDate(term.from, { short: true })} تا ${formatDate(term.to, { short: true })}`, { glyph: 'calendar' })),
            h('p', { class: 'small muted', text: `${classes.filter((c) => c.termId === term.id).length} کلاس در این ترم` }),
          ),
        );
      }
      host.append(h('button', { class: 'btn soft block', type: 'button', text: 'ترم تازه', on: { click: () => toast('در نسخه نمایشی ساخته نمی‌شود', 'info') } }));
    } else {
      for (const lesson of lessons) {
        host.append(
          card(
            {},
            h('div', { class: 'row between' }, h('h3', { text: lesson.name }), chip(`${lesson.field} · ${lesson.level}`, { glyph: 'book' })),
            h('ul', { class: 'stack sm small muted' }, ...lesson.goals.map((goal) => h('li', { text: `• ${goal}` }))),
          ),
        );
      }
      host.append(h('button', { class: 'btn soft block', type: 'button', text: 'درس تازه', on: { click: () => toast('در نسخه نمایشی ساخته نمی‌شود', 'info') } }));
    }
  };

  page.append(seg({ items: [{ id: 'terms' as const, label: 'ترم‌ها' }, { id: 'lessons' as const, label: 'درس‌ها' }], value: tab, onChange: (id) => { tab = id; paint(); } }));
  page.append(host);
  page.append(banner('تغییر ساختار آموزشی، معنای نمره و هدف آزمون‌های گذشته را بی‌ردپا تغییر نمی‌دهد.', { glyph: 'history' }));
  paint();
  return page;
};

/* ------------------------------------------------------------------ MG-03 */

export const manageClassesPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('کلاس‌ها و ثبت‌نام', 'ظرفیت، مدرس و وضعیت ثبت‌نام'));

  for (const room of scopedClasses()) {
    const filled = room.studentIds.length;
    page.append(
      card(
        {},
        h(
          'div',
          { class: 'row between wrap' },
          h('div', { class: 'row' }, h('div', { class: 'avatar sm', style: { background: room.color }, text: room.name.slice(0, 1) }), h('h3', { text: room.name })),
          chip(`${filled} از ${room.capacity}`, { tone: filled >= room.capacity ? 'bad' : 'ok', glyph: 'users' }),
        ),
        h('div', { class: 'row wrap', style: { gap: '6px' } }, chip(room.status === 'active' ? 'فعال' : room.status === 'completed' ? 'پایان‌یافته' : 'پیش‌نویس', { tone: room.status === 'active' ? 'ok' : 'plain' }), chip(room.teacherIds.map(nameOf).join('، '), { glyph: 'user' })),
        bar(filled, room.capacity),
        h(
          'div',
          { class: 'btn-row' },
          h('a', { class: 'btn soft sm', href: `/school/classes/${room.id}`, text: 'مشاهده' }),
          h('button', { class: 'btn ghost sm', type: 'button', text: 'ثبت‌نام', on: { click: () => toast('ثبت‌نام تکراری صندلی مضاعف مصرف نمی‌کند (نمایشی)', 'info') } }),
          h('button', {
            class: 'btn ghost sm',
            type: 'button',
            text: 'پایان کلاس',
            on: {
              click: async () => {
                const ok = await confirmDialog({ title: 'پایان کلاس', message: 'پس از پایان، کلاس از فهرست فعال جدا می‌شود اما سوابق آموزشی حفظ می‌شود.', confirmLabel: 'پایان کلاس' });
                if (ok) toast('کلاس پایان یافت (نمایشی)', 'ok');
              },
            },
          }),
        ),
      ),
    );
  }

  page.append(h('button', { class: 'btn primary block', type: 'button', text: 'کلاس تازه (پیش‌نویس)', on: { click: () => toast('کلاس Draft ساخته می‌شود و پس از کنترل قواعد فعال می‌گردد', 'info') } }));
  page.append(banner('انتقال دانش‌آموز، ثبت‌نام قبلی را می‌بندد و ثبت‌نام تازه می‌سازد؛ نمره‌های گذشته به کلاس جدید نسبت داده نمی‌شود.', { glyph: 'refresh' }));
  return page;
};

/* ------------------------------------------------------------------ MG-04/05 */

export const peoplePage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('افراد آموزشگاه', 'یک پرونده برای هر فرد، با چند نقش'));

  const groups = [
    { id: 'student', label: 'دانش‌آموز' },
    { id: 'teacher', label: 'معلم' },
    { id: 'guardian', label: 'سرپرست' },
    { id: 'pending', label: 'در انتظار' },
  ] as const;
  let tab: (typeof groups)[number]['id'] = 'student';
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const ids = tab === 'pending' ? [] : scopedClasses().flatMap((c) => (tab === 'student' ? c.studentIds : c.teacherIds));
    const unique = [...new Set(ids)];
    if (!unique.length) {
      host.append(empty({ glyph: 'users', title: 'فهرست خالی است' }));
      return;
    }
    for (const personId of unique) {
      const person = personById.get(personId)!;
      const linkCount = guardianLinks.filter((g) => g.studentId === personId).length;
      host.append(
        listItem({
          href: `/school/manage/people/${personId}`,
          leading: h('div', { class: 'avatar sm' }, h('span', { text: person.name.slice(0, 1) })),
          title: person.name,
          subtitle: `${person.username} · ${person.phone} · ${person.grade ?? ''}${linkCount ? ` · ${linkCount} سرپرست` : ''}`,
          trailing: chip('پرونده', { glyph: 'chevronEnd' }),
        }),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: tab, onChange: (id) => { tab = id; paint(); } }));
  page.append(host);
  page.append(
    h('div', { class: 'btn-row' }, h('a', { class: 'btn soft', href: '/school/manage/import', text: 'ورود گروهی CSV' }), h('a', { class: 'btn ghost', href: '/school/manage/invites', text: 'دعوت فرد' })),
  );
  paint();
  return page;
};

export const personPage: PageRenderer = (ctx: RouteContext) => {
  if (requireManager()) return denied();
  const person = personById.get(ctx.params.id);
  if (!person) {
    const page = h('div', { class: 'page' });
    page.append(empty({ glyph: 'user', title: 'پرونده پیدا نشد' }));
    return page;
  }
  const page = h('div', { class: 'page' });
  page.append(pageHead(person.name, `${person.username} · ${person.phone}`, '/school/manage/people'));

  const roles = scopedClasses().flatMap((c) => (c.studentIds.includes(person.id) ? [`دانش‌آموز ${c.name}`] : c.teacherIds.includes(person.id) ? [`معلم ${c.name}`] : []));

  page.append(
    card(
      { tint: true },
      sectionHead('نقش‌ها و عضویت'),
      h('div', { class: 'pill-row' }, ...(roles.length ? roles.map((role) => chip(role, { tone: 'info', glyph: 'user' })) : [chip('نقشی ندارد', { tone: 'plain' })])),
      kvGrid([
        ['پایه', person.grade ?? '—'],
        ['شماره محلی', person.phone],
        ['سرپرست‌ها', String(guardianLinks.filter((g) => g.studentId === person.id).length)],
        ['ثبت‌نام‌های فعال', String(scopedClasses().filter((c) => c.studentIds.includes(person.id)).length)],
      ]),
    ),
  );

  const subs = submissions.filter((s) => s.studentId === person.id);
  page.append(
    card(
      {},
      sectionHead('سوابق آموزشی', chip(`${subs.length} فعالیت`)),
      ...(subs.length
        ? subs.map((s) =>
            listItem({
              href: `/school/submissions/${s.id}`,
              title: assignments.find((a) => a.id === s.assignmentId)?.title ?? '',
              subtitle: s.status === 'graded' ? `نمره ${s.score}` : 'در انتظار تصحیح',
              trailing: chip(relative(s.publishedAt ?? s.attempts[0]?.createdAt ?? new Date().toISOString()), { glyph: 'calendar' }),
            }),
          )
        : [h('p', { class: 'small muted', text: 'فعالیتی ثبت نشده است.' })]),
      banner('حذف نقش، دسترسی آینده را قطع می‌کند اما تکالیف و نمرات ساخته‌شده توسط این فرد حذف نمی‌شود.', { glyph: 'history' }),
    ),
  );

  const remove = h('button', { class: 'btn danger block', type: 'button', text: 'پایان عضویت' });
  remove.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'پایان عضویت', message: 'دسترسی آینده قطع می‌شود و مسئولیت لازم باید منتقل شود.', confirmLabel: 'ادامه', requireText: { label: 'دلیل پایان عضویت' } });
    if (ok) toast('درخواست ثبت شد؛ حذف آخرین مدیر تا انتقال مدیریت متوقف است.', 'info');
  });
  page.append(remove);
  return page;
};

/* ------------------------------------------------------------------ MG-06 */

export const invitesAdminPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('دعوت‌ها', 'ارسال پیامک، پذیرش دعوت و ثبت‌نام کلاس سه وضعیت جدا'));

  const rows = [
    { person: 'آرین احمدی', role: 'دانش‌آموز ریاضی دهم', sms: 'ارسال شد', accepted: 'پذیرفته', enrolled: 'ثبت‌نام تأییدشده', tone: 'ok' as const },
    { person: 'ترانه صادقی', role: 'دانش‌آموز ریاضی دهم', sms: 'ارسال شد', accepted: 'در انتظار', enrolled: 'ثبت‌نام نشده', tone: 'warn' as const },
    { person: 'مریم اسدی', role: 'معلم ادبیات', sms: 'ارسال شد', accepted: 'در انتظار', enrolled: '—', tone: 'warn' as const },
  ];

  const cardEl = card({}, sectionHead('وضعیت دعوت‌ها', chip(`${rows.length} مورد`)));
  for (const row of rows) {
    cardEl.append(
      h(
        'div',
        { class: 'stack sm', style: { padding: '10px 0', borderBlockEnd: '1px solid var(--line)' } },
        h('div', { class: 'row between' }, h('strong', { text: row.person }), chip(row.accepted, { tone: row.tone, glyph: row.accepted === 'پذیرفته' ? '✓' : '⏱' })),
        h('p', { class: 'tiny muted', text: `${row.role} · پیامک: ${row.sms} · ${row.enrolled}` }),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn ghost sm', type: 'button', text: 'ارسال دوباره پیامک', on: { click: () => toast('ارسال دوباره نقش یا حساب تازه نمی‌سازد', 'info') } }), h('button', { class: 'btn ghost sm', type: 'button', text: 'لغو دعوت', on: { click: () => toast('لغو دعوت، عضویت قبلی را تغییر نمی‌دهد', 'info') } })),
      ),
    );
  }
  page.append(cardEl);
  page.append(banner('خطای ارسال پیامک به‌معنای لغو دعوت نیست و «پذیرش دعوت» تضمین صندلی کلاس نیست.', { glyph: 'info' }));
  return page;
};

/* ------------------------------------------------------------------ MG-07 */

export const importPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('ورود گروهی افراد', 'پیش‌نمایش و اعتبارسنجی پیش از ایجاد پرونده'));

  let step = 1;
  const host = h('div', { class: 'stack' });

  const csv = [
    'name,username,phone,grade',
    'سارا نیک‌پور,sara.n,09123456789,دهم',
    'پارسا مرادی,p.m,09121122333,نهم',
    'نام نامعتبر,,,دهم',
    'تکراری,arian.a,09129876543,دهم',
  ];

  const paint = () => {
    host.replaceChildren();
    const stepper = h('div', { class: 'stepper' });
    for (let i = 1; i <= 3; i += 1) stepper.append(h('span', { class: `step ${i <= step ? 'done' : ''}` }));
    host.append(stepper, h('div', { class: 'steps-label' }, h('span', { text: '۱ انتخاب فایل' }), h('span', { text: '۲ پیش‌نمایش' }), h('span', { text: '۳ تأیید' })));

    if (step === 1) {
      const template = h('a', { class: 'btn soft block', href: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv.join('\n')), download: 'makan-template.csv', text: 'دریافت قالب CSV' });
      host.append(
        card(
          {},
          h('p', { class: 'small muted', text: 'فایل را انتخاب کنید تا پیش‌نمایش ردیف‌ها و خطاها را ببینید. تا اصلاح خطاها، ثبت نهایی انجام نمی‌شود.' }),
          h('label', { class: 'btn primary block', for: 'csv-file' }, icon('upload', 'icon sm'), h('span', { text: 'انتخاب فایل' })),
          h('input', { class: 'sr', type: 'file', id: 'csv-file', accept: '.csv', on: { change: () => { step = 2; paint(); } } }),
          template,
        ),
      );
    }

    if (step === 2) {
      const rows = csv.slice(1).map((line, index) => {
        const [name, username, phone, grade] = line.split(',');
        const errors: string[] = [];
        if (!name) errors.push('نام خالی است');
        if (!username) errors.push('نام کاربری خالی است');
        if (!/^09\d{9}$/.test(phone ?? '')) errors.push('شماره همراه نامعتبر است');
        if (index === 3) errors.push('نام کاربری تکراری است');
        return { name, username, phone, grade, errors };
      });
      const table = h('div', { class: 'stack sm' });
      for (const row of rows) {
        table.append(
          h(
            'div',
            { class: 'list-item', style: { flexWrap: 'wrap' } },
            h('div', { class: 'body' }, h('span', { text: row.name || '—' }), h('span', { class: 'meta', text: `${row.username || '—'} · ${row.phone || '—'}` })),
            row.errors.length ? h('span', { class: 'chip bad', text: `${row.errors.length} خطا` }) : chip('آماده ثبت', { tone: 'ok', glyph: '✓' }),
          ),
        );
      }
      const errorList = card({}, sectionHead('خطاها', chip(String(rows.filter((r) => r.errors.length).length), { tone: 'bad' })), table);
      host.append(errorList);
      const confirm = h('button', { class: 'btn primary block', type: 'button', text: 'ثبت ردیف‌های معتبر', 'aria-disabled': String(rows.every((r) => r.errors.length)) });
      confirm.addEventListener('click', () => {
        step = 3;
        paint();
      });
      host.append(confirm, h('button', { class: 'btn ghost block', type: 'button', text: 'اصلاح فایل یا نگاشت ستون‌ها', on: { click: () => { step = 1; paint(); } } }));
    }

    if (step === 3) {
      host.append(
        card(
          {},
          sectionHead('نتیجه اجرا', chip('نمایشی', { tone: 'info' })),
          listItem({ title: '۲ پرونده ساخته شد', subtitle: 'سارا نیک‌پور · پارسا مرادی', trailing: chip('موفق', { tone: 'ok', glyph: '✓' }) }),
          listItem({ title: '۱ ردیف تکراری نادیده گرفته شد', subtitle: 'arian.a', trailing: chip('رد شد', { tone: 'plain' }) }),
          listItem({ title: '۱ ردیف نامعتبر', subtitle: 'نام کاربری خالی', trailing: chip('خطا', { tone: 'bad', glyph: '×' }) }),
          banner('اجرای دوباره همین فایل، پرونده‌های موفق قبلی را دوباره نمی‌سازد.', { glyph: 'shield' }),
        ),
      );
    }
  };

  page.append(host);
  paint();
  return page;
};

/* ------------------------------------------------------------------ MG-08 */

export const guardiansPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('روابط سرپرستی', 'تأیید رابطه با مدرک و دامنه مشخص'));

  for (const link of guardianLinks) {
    const status = link.status === 'verified' ? 'تأییدشده' : link.status === 'pending' ? 'در بررسی' : link.status === 'expired' ? 'منقضی' : 'لغوشده';
    page.append(
      card(
        {},
        h(
          'div',
          { class: 'row between wrap' },
          h('div', { class: 'row' }, h('div', { class: 'avatar sm' }, h('span', { text: nameOf(link.studentId).slice(0, 1) })), h('div', {}, h('h3', { text: nameOf(link.studentId) }), h('p', { class: 'tiny muted', text: `${nameOf(link.guardianId)} · ${link.relation}` }))),
          chip(status, { tone: link.status === 'verified' ? 'ok' : 'warn', glyph: link.status === 'verified' ? '✓' : '⏱' }),
        ),
        h('div', { class: 'pill-row' },
          chip(link.scopes.scores ? 'نمره' : 'بدون نمره', { tone: link.scopes.scores ? 'ok' : 'plain' }),
          chip(link.scopes.attendance ? 'حضور' : 'بدون حضور', { tone: link.scopes.attendance ? 'ok' : 'plain' }),
          chip(link.scopes.reports ? 'گزارش' : 'بدون گزارش', { tone: link.scopes.reports ? 'ok' : 'plain' }),
          chip(link.scopes.messaging ? 'ارتباط' : 'بدون ارتباط', { tone: link.scopes.messaging ? 'ok' : 'plain' }),
        ),
        h('p', { class: 'tiny muted', text: link.expiresAt ? `اعتبار تا ${formatDate(link.expiresAt, { short: true })}` : 'بدون تاریخ انقضا' }),
        h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn soft sm', type: 'button', text: 'تأیید با مدرک', on: { click: () => toast('تأیید (نمایشی) — پیش از تأیید، داده فرزند به مقصد باز نشد', 'ok') } }),
          h('button', { class: 'btn ghost sm', type: 'button', text: 'اصلاح دامنه', on: { click: () => toast('دامنه دسترسی قابل تنظیم است', 'info') } }),
          h('button', { class: 'btn ghost sm', type: 'button', text: 'پایان رابطه', on: { click: () => toast('با پایان رابطه، گزارش آینده والد هم بسته می‌شود', 'info') } }),
        ),
      ),
    );
  }
  page.append(banner('پیش از تأیید، هیچ داده آموزشی فرزند برای مقصد باز نمی‌شود. حداکثر دو سرپرست برای هر دانش‌آموز.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ MG-09 */

export const reportsPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const page = h('div', { class: 'page' });
  page.append(pageHead('گزارش‌های سازمان', 'شاخص‌های قابل اقدام، نه محتوای خصوصی'));

  const totalStudents = new Set(scopedClasses().flatMap((c) => c.studentIds)).size;
  const pendingGrading = submissions.filter((s) => s.status === 'submitted').length;
  const missingAttendance = sessions.filter((s) => s.status === 'done' && Object.values(s.attendance).includes('unset')).length;

  const stats = h('div', { class: 'grid-2' });
  stats.append(
    card({ cls: 'pad-sm' }, stat(String(totalStudents), 'دانش‌آموز فعال')),
    card({ cls: 'pad-sm' }, stat(String(pendingGrading), 'پاسخ در انتظار تصحیح')),
    card({ cls: 'pad-sm' }, stat(String(missingAttendance), 'جلسه با حضور ثبت‌نشده')),
    card({ cls: 'pad-sm' }, stat(String(scopedClasses().filter((c) => c.status === 'active').length), 'کلاس فعال')),
  );
  page.append(stats);

  page.append(
    card(
      {},
      sectionHead('حجم کار معلم'),
      ...[...new Set(scopedClasses().flatMap((c) => c.teacherIds))].map((teacherId) => {
        const rooms = scopedClasses().filter((c) => c.teacherIds.includes(teacherId));
        const students = new Set(rooms.flatMap((c) => c.studentIds)).size;
        const load = Math.min(100, students * 6);
        return h(
          'div',
          { class: 'stack sm', style: { padding: '10px 0', borderBlockEnd: '1px solid var(--line)' } },
          h('div', { class: 'row between small' }, h('span', { text: nameOf(teacherId) }), h('span', { class: 'muted', text: `${rooms.length} کلاس · ${students} دانش‌آموز` })),
          bar(load, 100),
        );
      }),
      h('p', { class: 'tiny muted', text: 'زمان پاسخ پیام یا تعداد گفتگو معیار خودکار کیفیت تدریس نیست.' }),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('خروجی'),
      h('button', { class: 'btn soft block', type: 'button', text: 'ساخت خروجی (CSV)', on: { click: () => toast('خروجی ساخته می‌شود و پس از آماده‌شدن قابل دانلود است', 'info') } }),
      banner('هیچ فیلتر یا خروجی به متن چت خصوصی یا تاریخچه کوپایلت اشخاص تبدیل نمی‌شود.', { glyph: 'shield' }),
    ),
  );
  void schoolById;
  void n;
  void app;
  void lessons;
  void terms;
  void people;
  void field;
  void textarea;
  void switchRow;
  void kvGrid;
  void classById;
  void state;
  return page;
};

/* ------------------------------------------------------------------ MG-10 */

export const settingsPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const school = currentSchool()!;
  const page = h('div', { class: 'page' });
  page.append(pageHead('تنظیمات و سیاست‌ها', 'رفتار سازمان باید نسخه‌دار و قابل مشاهده باشد'));

  const schoolName = field({ label: 'نام آموزشگاه', value: school.name });
  const timezone = field({ label: 'منطقه زمانی', value: school.timezone, dir: 'ltr' });
  const weekStart = field({ label: 'شروع هفته', value: school.weekStart });

  const policies = card(
    {},
    sectionHead('سیاست‌های مصوب'),
    switchRow({ title: 'گزارش حضور به والد', subtitle: 'والد فقط داده آموزشی منتشرشده را می‌بیند', checked: true, onChange: (v) => toast(v ? 'گزارش حضور فعال شد' : 'تغییر نیازمند تأیید است', 'info') }),
    switchRow({ title: 'ارتباط والد با معلم', subtitle: 'گفتگوی مستقیم در همان کلاس', checked: true, onChange: () => toast('تغییر سیاست ارتباط ثبت شد (نمایشی)', 'ok') }),
    switchRow({ title: 'تحلیل گفتگوی کلاس', subtitle: 'پیش‌فرض خاموش است', checked: false, onChange: (v) => toast(v ? 'فعال‌سازی نیازمند تصویب سیاست است' : 'خاموش ماند', 'info') }),
    switchRow({ title: 'سیاست سفارشی نقش', subtitle: 'فقط پس از تصویب', checked: false, disabled: true, onChange: () => undefined }),
  );

  const save = h('button', { class: 'btn primary block', type: 'button', text: 'ذخیره با پیش‌نمایش اثر' });
  save.addEventListener('click', () => toast('ذخیره نیازمند تأیید مدیر آموزشگاه است', 'info'));

  page.append(card({}, schoolName.wrap, timezone.wrap, weekStart.wrap, save), policies);
  page.append(banner('مدیر نمی‌تواند مجوز پلتفرم یا خواندن چت شخصی را به نقش سازمانی اضافه کند.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ MG-11 */

export const planPage: PageRenderer = () => {
  if (requireManager()) return denied();
  const school = currentSchool()!;
  const page = h('div', { class: 'page' });
  page.append(pageHead('اشتراک و مصرف', 'محدودیت تجاری جدا از خطای فنی'));

  page.append(
    card(
      { tint: true },
      sectionHead('پلن فعلی', chip(school.plan, { tone: 'solid' })),
      kvGrid([
        ['صندلی', `${school.usedSeats} از ${school.seats}`],
        ['سهمیه دستیار', `${school.aiQuota.used} از ${school.aiQuota.total}`],
        ['دوره', 'تا ۳۰ اسفند ۱۴۰۵'],
        ['وضعیت', 'فعال'],
      ]),
      bar(school.usedSeats, school.seats),
      h('a', { class: 'btn soft block', href: '/profile/finance', text: 'فاکتورها و پرداخت' }),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('حالت‌های محدودیت'),
      listItem({ title: 'در انتظار پرداخت', subtitle: 'تا پرداخت موفق، سرویس فعال می‌ماند', trailing: chip('۰', { tone: 'plain' }) }),
      listItem({ title: 'مهلت ارفاقی', subtitle: 'روزهای پس از پایان دوره', trailing: chip('۰', { tone: 'plain' }) }),
      listItem({ title: 'بیش از ظرفیت', subtitle: 'ورود عضو تازه متوقف می‌شود', trailing: chip('۰', { tone: 'plain' }) }),
      listItem({ title: 'محدود', subtitle: 'دسترسی مدیر به پنل حفظ می‌شود', trailing: chip('۰', { tone: 'plain' }) }),
    ),
  );

  page.append(
    banner('کاهش پلن افراد را حذف نمی‌کند و پایان سهمیه دستیار، آزمون جاری را قطع نمی‌کند.', { glyph: 'shield' }),
  );
  return page;
};