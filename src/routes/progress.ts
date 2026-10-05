/** ED-15/16, TE-10/11 — progress, insight evidence, roster, insight review queue. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  banner,
  bar,
  card,
  chip,
  empty,
  kvGrid,
  listItem,
  pageHead,
  ring,
  sectionHead,
  seg,
  stat,
} from '../ui/kit';
import { formatDate, n, relative } from '../core/format';
import { assignmentById, assignments, classById, classes, nameOf, personById, submissions } from '../data/seed';
import { app } from '../data/app-state';
import { can, currentRole, session as state } from '../data/session';
import { toast } from '../core/overlays';
import { denied } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';

function subjectsFor(personId: string) {
  return submissions.filter((s) => s.studentId === personId);
}

function gradedCount(personId: string): number {
  return subjectsFor(personId).filter((s) => s.status === 'graded').length;
}

function averageScore(personId: string): number | null {
  const graded = subjectsFor(personId).filter((s) => s.status === 'graded' && typeof s.score === 'number');
  if (!graded.length) return null;
  return graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length;
}

/* ------------------------------------------------------------------ ED-15 */

export const progressPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  const role = currentRole();
  const subjectId = role === 'guardian' ? state.get().childId ?? '' : state.get().personaId;

  page.append(pageHead('پیشرفت و گزارش', 'عملکرد ارزیابی، وضعیت شواهد و پیشنهادها'));

  const graded = gradedCount(subjectId);
  const average = averageScore(subjectId);
  const totalAssignments = assignments.filter((a) => {
    const room = classById.get(a.classId);
    return room && (room.studentIds.includes(subjectId) || room.teacherIds.includes(subjectId));
  }).length;

  const stats = h('div', { class: 'grid-2' });
  stats.append(
    card({ cls: 'pad-sm' }, stat(String(graded), 'نتیجه منتشرشده')),
    card({ cls: 'pad-sm' }, stat(average === null ? '—' : average.toFixed(1), 'میانگین نمره')),
    card({ cls: 'pad-sm' }, stat(String(totalAssignments), 'تکلیف مرتبط')),
    card({ cls: 'pad-sm' }, stat(String(subjectsFor(subjectId).filter((s) => s.status === 'submitted').length), 'در انتظار تصحیح')),
  );
  page.append(stats);

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });

  main.append(
    card(
      {},
      sectionHead('وضعیت کفایت شواهد'),
      h('div', { class: 'row' }, ring(Math.min(100, graded * 20)), h('div', { class: 'grow stack sm' }, h('p', { class: 'small', text: graded >= 5 ? 'داده برای بیشتر مبحث‌ها کافی است.' : 'برای نتیجه‌گیری درباره روند، داده کم است.' }), h('p', { class: 'tiny muted', text: 'تعداد سؤال‌پرسیدن یا غیبت، شاخص تسلست نیست و نمره با آن مخلوط نمی‌شود.' }))),
      graded < 5 ? banner('برای تحلیل روند این مبحث، شواهد کافی وجود ندارد.', { tone: 'warn', glyph: 'info' }) : null,
    ),
  );

  const perAssignment = assignments.filter((a) => {
    const room = classById.get(a.classId);
    return room?.studentIds.includes(subjectId);
  });

  main.append(
    card(
      {},
      sectionHead('آخرین نتایج'),
      ...(perAssignment.length
        ? perAssignment.map((assignment) => {
            const sub = submissions.find((s) => s.assignmentId === assignment.id && s.studentId === subjectId);
            return listItem({
              href: sub ? `/school/submissions/${sub.id}` : `/school/assignments/${assignment.id}`,
              title: assignment.title,
              subtitle: `${classById.get(assignment.classId)?.name ?? ''} · ${assignment.rubric.reduce((sum, r) => sum + r.points, 0)} نمره`,
              meta: sub?.status === 'graded' ? `${sub.score}` : sub?.status === 'submitted' ? 'در تصحیح' : '—',
              trailing: chip(sub?.status === 'graded' ? 'منتشرشده' : sub?.status === 'submitted' ? 'در انتظار' : 'بدون نمره', { tone: sub?.status === 'graded' ? 'ok' : 'plain' }),
            });
          })
        : [h('p', { class: 'small muted', text: 'هنوز فعالیتی ثبت نشده است.' })]),
    ),
  );

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('تحلیل‌ها'),
      listItem({ href: '/school/insights/eq-trend', title: 'یکنوایی در حل معادله', subtitle: 'نیازمند بررسی معلم', trailing: chip('در بررسی', { tone: 'warn' }) }),
      listItem({ href: '/school/insights/attendance', title: 'حضور در جلسات اخیر', subtitle: 'داده کم', trailing: chip('کم‌داده', { tone: 'info' }) }),
      h('p', { class: 'tiny muted', text: 'هر تحلیل شواهد، وضعیت بررسی انسانی و امکان رد دارد.' }),
    ),
  );
  if (role === 'teacher') {
    side.append(h('a', { class: 'btn soft block', href: '/school/insights-queue', text: 'صف بازبینی تحلیل‌ها' }));
    side.append(h('a', { class: 'btn soft block', href: '/school/students', text: 'دانش‌آموزان کلاس' }));
  }

  cols.append(main, side);
  page.append(cols);
  return page;
};

/* ------------------------------------------------------------------ ED-16 */

export const insightPage: PageRenderer = (ctx: RouteContext) => {
  const page = h('div', { class: 'page' });
  const isGuardian = currentRole() === 'guardian';
  page.append(pageHead('جزئیات تحلیل', 'ادعا، شواهد قابل انتشار و کفایت داده', '/school/progress'));

  const declined = ctx.params.id === 'attendance';
  page.append(
    card(
      { tint: true },
      sectionHead(declined ? 'حضور در جلسات اخیر' : 'یکنوایی در حل معادله', chip(declined ? 'داده کم' : 'در بررسی', { tone: declined ? 'info' : 'warn' })),
      h(
        'p',
        { class: 'small' },
        declined
          ? 'در دو جلسه اخیر، حضور ثبت‌نشده زیاد بوده است. برای نتیجه‌گیری درباره الگو، داده کافی نیست.'
          : 'در چهار پاسخ اخیر، نیمی از پاسخ‌ها در مرحله بررسی ریشه‌ها خطا داشته‌اند. این یک الگوی مشاهده‌شده است، نه نتیجه قطعی.',
      ),
      kvGrid([
        ['بازه', '۲۸ روز گذشته'],
        ['تعداد نمونه', declined ? '۲ جلسه' : '۴ پاسخ'],
        ['کفایت شواهد', declined ? 'ناکافی' : 'قابل بررسی'],
        ['زمان ساخت', formatDate(new Date(Date.now() - 3 * 86400000), { short: true })],
      ]),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('شواهد قابل انتشار'),
      ...(declined
        ? [h('p', { class: 'small muted', text: 'شواهد کافی برای نمایش وجود ندارد. منابع آموزشی قابل مشاهده نیست.' })]
        : [
            listItem({ href: '/school/assignments/as-quad', title: 'تمرین معادله درجه دو', subtitle: 'تلاش ۲ — نمره ۱۲ از ۲۰', trailing: chip('۴ روز پیش', { glyph: 'calendar' }) }),
            listItem({ href: '/school/assignments/as-graph', title: 'تحلیل نمودار تابع', subtitle: 'نمره ۱۷ از ۲۰', trailing: chip('۱ هفته پیش', { glyph: 'calendar' }) }),
          ]),
      isGuardian ? banner('والد فقط منابع آموزشی مجاز را می‌بیند؛ نقل پیام خصوصی و شناسه گفتگو در دسترس نیست.', { glyph: 'shield' }) : null,
    ),
  );

  if (can('publishGrade')) {
    const approve = h('button', { class: 'btn primary', type: 'button', text: 'تأیید تحلیل' });
    approve.addEventListener('click', () => toast('تحلیل تأیید شد (نمایشی)', 'ok'));
    const reject = h('button', { class: 'btn soft', type: 'button', text: 'رد با دلیل' });
    reject.addEventListener('click', () => toast('برای ثبت دلیل، صف بازبینی باز شود', 'info'));
    page.append(h('div', { class: 'btn-row' }, approve, reject));
    page.append(banner('نظر معلم داده مخالف را حذف نمی‌کند؛ تحلیل در بررسی می‌ماند تا شواهد کامل شود.', { glyph: 'history' }));
  }

  const practice = h('a', { class: 'btn soft block', href: '/ai/practice', text: 'ساخت تمرین از این تحلیل' });
  page.append(practice);
  void app;
  void bar;
  return page;
};

/* ------------------------------------------------------------------ TE-10 */

export const classRosterPage: PageRenderer = () => {
  if (currentRole() !== 'teacher') return denied('فهرست دانش‌آموزان کلاس برای نقش شما در دسترس نیست.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('دانش‌آموزان کلاس', 'روند هر دانش‌آموز، محدود به همین کلاس'));

  const groups = [
    { id: 'c-math', label: 'ریاضی دهم' },
    { id: 'c-physics', label: 'فیزیک دهم' },
  ] as const;
  let active: (typeof groups)[number]['id'] = 'c-math';
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const room = classById.get(active)!;
    for (const studentId of room.studentIds) {
      const person = personById.get(studentId);
      const average = averageScore(studentId);
      const graded = gradedCount(studentId);
      host.append(
        card(
          {},
          h(
            'div',
            { class: 'row between wrap' },
            h('div', { class: 'row' }, h('div', { class: 'avatar sm' }, h('span', { text: (person?.name ?? '؟').slice(0, 1) })), h('div', {}, h('h3', { text: person?.name ?? '؟' }), h('p', { class: 'tiny muted', text: `${person?.username ?? ''} · ${person?.grade ?? ''}` }))),
            h('div', { class: 'row', style: { gap: '8px' } }, chip(average === null ? 'بدون نمره' : `میانگین ${average.toFixed(1)}`, { tone: average === null ? 'plain' : 'info' }), chip(`${graded} نتیجه`, { tone: graded ? 'ok' : 'plain' })),
          ),
          graded ? bar(Math.min(100, average ?? 0), 20) : null,
          h(
            'div',
            { class: 'btn-row' },
            h('a', { class: 'btn soft sm', href: `/school/progress`, text: 'گزارش' }),
            room.groupChatId ? h('a', { class: 'btn ghost sm', href: `/msg/${room.groupChatId}`, text: 'پیام آموزشی' }) : null,
          ),
        ),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: active, onChange: (id) => { active = id; paint(); } }));
  page.append(host);
  page.append(banner('انتساب به یک کلاس، مجوز مشاهده تمام سوابق دانش‌آموز در کل پلتفرم ایجاد نمی‌کند.', { glyph: 'shield' }));
  paint();
  return page;
};

/* ------------------------------------------------------------------ TE-11 */

export const insightQueuePage: PageRenderer = () => {
  if (currentRole() !== 'teacher') return denied('بازبینی تحلیل برای نقش شما در دسترس نیست.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('بازبینی تحلیل‌ها', 'تأیید، رد با دلیل و اصلاح مستند'));

  const items = [
    { id: 'eq-trend', title: 'یکنوایی در حل معادله', status: 'نیازمند بررسی', tone: 'warn' as const, sub: '۴ پاسخ · ۲۸ روز' },
    { id: 'attendance', title: 'حضور در جلسات اخیر', status: 'داده کم', tone: 'info' as const, sub: '۲ جلسه' },
    { id: 'graph', title: 'تمایز بین تمرین‌ها', status: 'تأییدشده', tone: 'ok' as const, sub: '۵ پاسخ' },
  ];

  page.append(
    card(
      {},
      ...items.map((item) =>
        listItem({
          href: `/school/insights/${item.id}`,
          title: item.title,
          subtitle: item.sub,
          trailing: chip(item.status, { tone: item.tone, glyph: item.tone === 'ok' ? '✓' : item.tone === 'warn' ? '⏱' : '?' }),
        }),
      ),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn soft sm', href: '/ai/practice', text: 'ساخت تمرین از پیشنهاد' }), h('a', { class: 'btn ghost sm', href: '/school/progress', text: 'گزارش کلاس' })),
    ),
  );

  page.append(banner('شواهد متناقض با ثبت دلیل بازبینی می‌شود، نه با حذف شواهد مخالف.', { glyph: 'history' }));
  void classes;
  void nameOf;
  void n;
  void relative;
  void icon;
  return page;
};