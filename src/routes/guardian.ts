/** PA-01 … PA-03 — guardian: child picker, permitted report view, relationship scope. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  banner,
  card,
  chip,
  empty,
  kvGrid,
  listItem,
  pageHead,
  sectionHead,
  seg,
  stat,
} from '../ui/kit';
import { formatDate, relative } from '../core/format';
import {
  assignmentById,
  assignments,
  classById,
  classes,
  exams,
  guardianLinks,
  nameOf,
  personById,
  sessionsOfClass,
  submissions,
} from '../data/seed';
import { currentRole, guardianScope, myChildren, session as state } from '../data/session';
import { denied } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';

const RELATION_LABEL: Record<string, string> = {
  mother: 'مادر',
  father: 'پدر',
  grandparent: 'مادربزرگ/پدربزرگ',
  supervisor: 'سرپرست',
};

/** Only the guardian's own verified children — never a global list. */
export const guardianHomePage: PageRenderer = () => {
  if (currentRole() !== 'guardian') return denied('این صفحه برای نقش والد و سرپرست است.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('فرزندان من', 'گزارش آموزشی هر فرزند، جدا از حساب و گفتگوی او'));

  const children = myChildren();
  if (!children.length) {
    page.append(
      empty({
        glyph: 'users',
        title: 'رابطه سرپرستی تأیید نشده',
        text: 'تا تأیید رابطه توسط مسئول آموزشگاه، هیچ گزارشی نمایش داده نمی‌شود. افزودن دستی نام کافی نیست.',
      }),
    );
    return page;
  }

  let active = state.get().childId && children.includes(state.get().childId!) ? state.get().childId! : children[0];
  const picker = h('div', { class: 'hstack-scroll' });
  const host = h('div', { class: 'stack' });

  const paintPicker = () => {
    picker.replaceChildren();
    for (const childId of children) {
      const child = personById.get(childId);
      const activeChip = h('button', { class: `chip btn-like ${childId === active ? '' : 'ghost'}`, type: 'button' });
      activeChip.setAttribute('aria-pressed', String(childId === active));
      activeChip.append(h('span', { text: `${child?.name ?? ''} · ${classById.get(classes.find((c) => c.studentIds.includes(childId))?.id ?? '')?.name ?? ''}` }));
      activeChip.addEventListener('click', () => {
        active = childId;
        state.set({ childId });
        paintPicker();
        paint();
      });
      picker.append(activeChip);
    }
  };

  const paint = () => {
    host.replaceChildren();
    const child = personById.get(active);
    if (!child) return;
    const scope = guardianScope(active);
    if (!scope || scope.status !== 'verified') {
      host.append(banner('این رابطه در انتظار یا منقضی است؛ گزارشی نمایش داده نمی‌شود.', { tone: 'warn', glyph: 'lock' }));
      return;
    }
    const childClasses = classes.filter((c) => c.studentIds.includes(active));
    const childAssignments = assignments.filter((a) => childClasses.some((c) => c.id === a.classId));
    const graded = submissions.filter((s) => s.studentId === active && s.status === 'graded');
    const nextSession = childClasses.flatMap((c) => sessionsOfClass(c.id)).filter((s) => +new Date(s.startsAt) > Date.now()).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];

    host.append(
      card(
        { tint: true },
        h(
          'div',
          { class: 'row' },
          h('div', { class: 'avatar lg' }, h('span', { text: child.name.slice(0, 1) })),
          h('div', { class: 'grow' }, h('h2', { text: child.name }), h('p', { class: 'small muted', text: `${child.grade ?? ''} · ${childClasses.map((c) => c.name).join('، ')}` })),
        ),
        kvGrid([
          ['جلسه بعدی', nextSession ? `${relative(nextSession.startsAt)}` : 'ثبت نشده'],
          ['نتیجه منتشرشده', `${graded.length}`],
          ['حضور ثبت‌شده', nextSession ? 'در دسترس' : '—'],
          ['آخرین به‌روزرسانی', 'امروز'],
        ]),
      ),
    );

    host.append(
      card(
        {},
        sectionHead('تکالیف و نتایج'),
        ...childAssignments.slice(0, 6).map((assignment) => {
          const sub = submissions.find((s) => s.assignmentId === assignment.id && s.studentId === active);
          const room = classById.get(assignment.classId);
          return listItem({
            title: assignment.title,
            subtitle: `${room?.name ?? ''} · ${
              sub?.status === 'graded'
                ? `نمره ${sub.score} — ${sub.feedback ?? 'بدون بازخورد'}`
                : sub?.status === 'submitted'
                  ? 'تحویل شده، در انتظار تصحیح'
                  : 'هنوز تحویل نشده'
            }`,
            meta: relative(assignment.dueAt),
            trailing: chip(sub?.status === 'graded' ? 'منتشرشده' : sub?.status === 'submitted' ? 'در تصحیح' : 'باز', {
              tone: sub?.status === 'graded' ? 'ok' : sub?.status === 'submitted' ? 'warn' : 'info',
            }),
          });
        }),
      ),
    );

    const childExams = exams.filter((e) => childClasses.some((c) => c.id === e.classId));
    host.append(
      card(
        {},
        sectionHead('آزمون‌ها'),
        ...childExams.map((exam) =>
          listItem({
            title: exam.title,
            subtitle: exam.resultsPublished ? 'نتیجه منتشر شده' : 'نتیجه هنوز منتشر نشده',
            meta: relative(exam.closesAt),
            trailing: chip(exam.resultsPublished ? 'منتشرشده' : 'منتظر', { tone: exam.resultsPublished ? 'ok' : 'plain' }),
          }),
        ),
      ),
    );

    host.append(
      card(
        {},
        sectionHead('دسترسی شما'),
        h('div', { class: 'pill-row' },
          chip(scope.scopes.scores ? 'نمره' : 'بدون نمره', { tone: scope.scopes.scores ? 'ok' : 'plain' }),
          chip(scope.scopes.attendance ? 'حضور' : 'بدون حضور', { tone: scope.scopes.attendance ? 'ok' : 'plain' }),
          chip(scope.scopes.reports ? 'گزارش آموزشی' : 'بدون گزارش', { tone: scope.scopes.reports ? 'ok' : 'plain' }),
          chip(scope.scopes.messaging ? 'ارتباط با معلم' : 'بدون ارتباط', { tone: scope.scopes.messaging ? 'ok' : 'plain' }),
        ),
        h('p', { class: 'tiny muted', text: 'متن گفتگوی فرزند، پاسخ‌نامه خصوصی و امکان تحویل به جای او در این نسخه وجود ندارد.' }),
        h('a', { class: 'btn soft block', href: `/school/child/${active}/relationship`, text: 'جزئیات رابطه' }),
      ),
    );

    host.append(
      card(
        {},
        sectionHead('پرسش از دستیار والد'),
        h('p', { class: 'small muted', text: 'دستیار فقط از داده آموزشی منتشرشده استفاده می‌کند و خلاصه آزاد چت کودک را نمی‌سازد.' }),
        h('a', { class: 'btn soft block', href: '/ai', text: 'پرسیدن سؤال' }),
      ),
    );
  };

  page.append(picker, host);
  paintPicker();
  paint();
  return page;
};

/** Detail view for a specific child. */
export const guardianChildPage: PageRenderer = (ctx: RouteContext) => {
  if (currentRole() !== 'guardian') return denied('این صفحه برای نقش والد و سرپرست است.');
  const childId = ctx.params.id;
  const allowed = myChildren().includes(childId);
  if (!allowed) return denied('این فرزند به حساب شما مرتبط نیست.');
  state.set({ childId });

  const page = h('div', { class: 'page' });
  const child = personById.get(childId)!;
  const scope = guardianScope(childId);
  page.append(pageHead(child.name, `${child.grade ?? ''} · گزارش مجاز`, '/school/child'));

  const childClasses = classes.filter((c) => c.studentIds.includes(childId));
  const graded = submissions.filter((s) => s.studentId === childId && s.status === 'graded');

  const stats = h('div', { class: 'grid-2' });
  stats.append(
    card({ cls: 'pad-sm' }, stat(String(graded.length), 'نتیجه منتشرشده')),
    card({ cls: 'pad-sm' }, stat(String(childClasses.length), 'کلاس')),
    card({ cls: 'pad-sm' }, stat(scope?.expiresAt ? formatDate(scope.expiresAt, { short: true }) : '—', 'اعتبار رابطه')),
    card({ cls: 'pad-sm' }, stat(RELATION_LABEL[scope?.relation ?? 'supervisor'] ?? '—', 'نوع رابطه')),
  );
  page.append(stats);

  page.append(
    card(
      {},
      sectionHead('کلاس‌ها'),
      ...childClasses.map((c) =>
        listItem({
          title: c.name,
          subtitle: `${c.teacherIds.map(nameOf).join('، ')} · ${assignments.filter((a) => a.classId === c.id).length} تکلیف`,
          trailing: chip('گزارش', { glyph: 'eye' }),
        }),
      ),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('آخرین بازخوردهای منتشرشده'),
      ...(graded.length
        ? graded.map((s) =>
            listItem({
              title: assignmentById.get(s.assignmentId)?.title ?? '',
              subtitle: s.feedback ?? 'بدون بازخورد متنی',
              meta: `${s.score}`,
              trailing: chip('نمره', { tone: 'ok', glyph: '✓' }),
            }),
          )
        : [h('p', { class: 'small muted', text: 'هنوز نتیجه‌ای منتشر نشده است.' })]),
    ),
  );

  page.append(
    banner('گزارش مجاز با نقل‌قول، ساعت یا نام طرف مکالمه خصوصی بازسازی نمی‌شود. دکمه حل تکلیف یا شروع آزمون وجود ندارد.', { glyph: 'shield' }),
  );
  void icon;
  void seg;
  return page;
};

/** PA-03 — relationship scope and correction path. */
export const relationshipPage: PageRenderer = (ctx: RouteContext) => {
  if (currentRole() !== 'guardian') return denied('این صفحه برای نقش والد و سرپرست است.');
  const childId = ctx.params.id;
  if (!myChildren().includes(childId)) return denied('این رابطه برای حساب شما ثبت نشده است.');
  const link = guardianLinks.find((g) => g.guardianId === state.get().personaId && g.studentId === childId)!;
  const child = personById.get(childId)!;

  const page = h('div', { class: 'page' });
  page.append(pageHead('رابطه سرپرستی', `${child.name} · ${RELATION_LABEL[link.relation]}`, `/school/child/${childId}`));

  page.append(
    card(
      { tint: true },
      sectionHead('وضعیت', chip(link.status === 'verified' ? 'تأییدشده' : link.status === 'pending' ? 'در انتظار' : 'منقضی', { tone: link.status === 'verified' ? 'ok' : 'warn' })),
      kvGrid([
        ['دانش‌آموز', child.name],
        ['نوع رابطه', RELATION_LABEL[link.relation]],
        ['تأییدکننده', link.verifiedBy ? nameOf(link.verifiedBy) : '—'],
        ['اعتبار تا', link.expiresAt ? formatDate(link.expiresAt, { short: true }) : '—'],
      ]),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('دسترسی‌های این رابطه'),
      ...([
        ['نمره‌ها', link.scopes.scores],
        ['حضور', link.scopes.attendance],
        ['گزارش آموزشی', link.scopes.reports],
        ['ارتباط با معلم', link.scopes.messaging],
      ] as [string, boolean][]).map(([label, enabled]) =>
        h('div', { class: 'row between small', style: { padding: '6px 0', borderBlockEnd: '1px solid var(--line)' } }, h('span', { text: label }), chip(enabled ? 'فعال' : 'غیرفعال', { tone: enabled ? 'ok' : 'plain', glyph: enabled ? '✓' : '×' })),
      ),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('درخواست اصلاح'),
      h('p', { class: 'small muted', text: 'برای افزودن یا کم‌کردن دسترسی، درخواست به مسئول آموزشگاه می‌رود. شما نمی‌توانید خودتان دسترسی تازه بدهید.' }),
      h('a', { class: 'btn soft block', href: '/profile/support', text: 'ثبت درخواست برای مسئول آموزشگاه' }),
      h('a', { class: 'btn ghost block', href: '/school/manage/guardians', text: 'رابطه در پنل آموزشگاه' }),
    ),
  );

  page.append(banner('با پایان رابطه، گزارش بعدی و منابع آن بسته می‌شود؛ اما سوابق آموزشی لازم حفظ می‌شود.', { glyph: 'history' }));
  return page;
};