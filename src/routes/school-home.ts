/** Role home: ST-01 (student), TE-01 (teacher), PA-01 (guardian), MG-01 (manager). */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  avatar,
  banner,
  bar,
  card,
  cardLink,
  chip,
  empty,
  kvGrid,
  listItem,
  nextCard,
  ring,
  sectionHead,
  seg,
  stat,
  timelineItem,
} from '../ui/kit';
import { formatTime, relative } from '../core/format';
import {
  applications,
  assignmentById,
  assignments,
  classById,
  classes,
  exams,
  guardianLinks,
  lessons,
  nameOf,
  personById,
  schoolById,
  sessions,
  sessionsOfClass,
  submissions,
} from '../data/seed';
import { app } from '../data/app-state';
import { ROLE_LABEL, currentRole, currentSchool, session } from '../data/session';
import type { PageRenderer } from '../core/router';

const ATTENDANCE_LABEL: Record<string, string> = {
  unset: 'ثبت‌نشده',
  present: 'حاضر',
  absent: 'غایب',
  late: 'دیررس',
  excused: 'موجه',
};

function liveSessions(): typeof sessions {
  const stamp = Date.now();
  return sessions
    .filter((s) => s.status !== 'cancelled' && new Date(s.startsAt).getTime() + s.durationMin * 60_000 > stamp)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

function deadlineLine(): { label: string; sub: string; href: string } | null {
  const open = assignments
    .filter((a) => new Date(a.dueAt).getTime() > Date.now())
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))[0];
  if (!open) return null;
  const room = classById.get(open.classId);
  return { label: open.title, sub: `مهلت تا ${relative(open.dueAt)} · ${room?.name ?? ''}`, href: `/school/assignments/${open.id}` };
}

function dashboardFrame(title: string, subtitle: string, ...kids: (Node | false | null)[]): HTMLElement {
  const page = h('div', { class: 'page' });
  const head = h('div', { class: 'row between wrap' });
  const heading = h('div', {}, h('h1', { text: title }), h('p', { class: 'small muted', text: subtitle }));
  head.append(heading);
  page.append(head);
  for (const kid of kids) if (kid) page.append(kid);
  return page;
}

function todayRail(): Node | false {
  const upcoming = liveSessions().filter((s) => new Date(s.startsAt).getTime() > Date.now() - 2 * 3600_000).slice(0, 4);
  if (!upcoming.length) return false;
  const rail = h('div', { class: 'rail-timeline' });
  for (const sessionRow of upcoming) {
    const startsAt = new Date(sessionRow.startsAt).getTime();
    const endsAt = startsAt + sessionRow.durationMin * 60_000;
    const state = Date.now() > startsAt && Date.now() < endsAt ? 'live' : startsAt < Date.now() ? 'past' : 'future';
    rail.append(
      timelineItem({
        time: `${formatTime(sessionRow.startsAt)} تا ${formatTime(endsAt)}`,
        title: sessionRow.title,
        subtitle: `${classById.get(sessionRow.classId)?.name ?? ''} · ${nameOf(sessionRow.classId ? (classById.get(sessionRow.classId)?.teacherIds[0] ?? '') : '')}`,
        href: `/school/sessions/${sessionRow.id}`,
        state,
        trailing: state === 'live' ? chip('هم‌اکنون', { tone: 'ok', glyph: '●' }) : null,
      }),
    );
  }
  return card({}, sectionHead('امروز', chip('زمان محلی')), rail);
}

/* --------------------------------------------------------------- student */

function studentHome(): HTMLElement {
  const persona = session.get().personaId;
  const myClassIds = classes.filter((c) => c.studentIds.includes(persona)).map((c) => c.id);
  const pending = assignments.filter((a) => myClassIds.includes(a.classId));
  const graded = submissions.filter((s) => s.studentId === persona && s.status === 'graded');
  const toDo = pending.filter((a) => {
    const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === persona);
    return !sub || sub.status === 'not-started' || sub.status === 'draft' || sub.status === 'returned';
  });
  const due = deadlineLine();
  const next = liveSessions()[0];

  const action =
    toDo.length > 0 && due
      ? nextCard({
          kicker: 'کار بعدی',
          title: due.label,
          cta: 'شروع پاسخ',
          href: `/school/assignments/${toDo[0].id}/submit`,
          glyph: 'edit',
        })
      : next
        ? nextCard({
            kicker: 'جلسه بعدی',
            title: `${next.title} ساعت ${formatTime(next.startsAt)}`,
            cta: 'جزئیات جلسه',
            href: `/school/sessions/${next.id}`,
            glyph: 'video',
          })
        : nextCard({ kicker: 'برنامه امروز', title: 'جلسه‌ای در پیش نیست', cta: 'دیدن برنامه', href: '/school/schedule', glyph: 'calendar' });

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });

  main.append(todayRail());

  main.append(
    card(
      {},
      sectionHead('تکالیف در انتظار', h('span', { class: 'count', text: `${toDo.length}` })),
      ...(toDo.length
        ? toDo.slice(0, 4).map((a) => {
            const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === persona);
            const overdue = new Date(a.dueAt).getTime() < Date.now();
            return listItem({
              href: `/school/assignments/${a.id}`,
              title: a.title,
              subtitle: `${classById.get(a.classId)?.name ?? ''} · ${
                sub?.status === 'returned' ? 'بازگشتی برای اصلاح' : sub?.status === 'draft' ? 'پیش‌نویس ذخیره شده' : 'هنوز تحویل نداده‌اید'
              }`,
              meta: relative(a.dueAt),
              trailing: overdue ? chip('دیررس', { tone: 'bad', glyph: '!' }) : chip('مهلت', { tone: 'warn', glyph: '⏱' }),
            });
          })
        : [empty({ glyph: 'check', title: 'همه تکالیف تحویل شده', text: 'برای این کلاس‌ها کاری باقی نمانده است.' })]),
    ),
  );

  main.append(
    card(
      {},
      sectionHead('کلاس‌های من'),
      h('a', { class: 'spacer tiny', href: '/school/classes', text: 'همه' }),
      ...myClassIds.map((id) => {
        const room = classById.get(id)!;
        const nextSession = sessionsOfClass(id).find((s) => new Date(s.startsAt).getTime() > Date.now());
        return listItem({
          href: `/school/classes/${id}`,
          leading: h('div', { class: 'avatar sm', style: { background: room.color }, text: room.name.slice(0, 1) }),
          title: room.name,
          subtitle: nextSession ? `جلسه بعدی: ${relative(nextSession.startsAt)}` : 'جلسه‌ای ثبت نشده',
          meta: lessons.find((l) => l.id === room.lessonId)?.name ?? '',
        });
      }),
    ),
  );

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('آخرین بازخورد'),
      ...(graded.length
        ? graded.slice(-2).reverse().map((s) =>
            listItem({
              href: `/school/submissions/${s.id}`,
              title: assignmentById.get(s.assignmentId)?.title ?? '',
              subtitle: s.feedback ?? '',
              meta: `${s.score} از ۲۰`,
            }),
          )
        : [h('p', { class: 'small muted', text: 'هنوز نتیجه‌ای منتشر نشده است.' })]),
    ),
  );
  side.append(
    card(
      {},
      sectionHead('پیشنهاد مطالعه'),
      h('p', { class: 'small muted', text: 'بر پایه تمرین‌های اخیر، یک مرور ۲۰ دقیقه‌ای پیشنهاد شده است.' }),
      h('a', { class: 'btn soft block', href: '/ai/practice', text: 'دیدن پیشنهاد' }),
      h('p', { class: 'tiny muted', text: 'این تمرین کمکی است و نمره رسمی ایجاد نمی‌کند.' }),
    ),
  );
  side.append(card({}, sectionHead('میانبر'), ...quickLinks()));

  cols.append(main, side);
  return dashboardFrame('امروز من', 'کارهای امروز، نزدیک‌ترین موعد و تازه‌ترین بازخورد', action, cols);
}

function quickLinks(): Node[] {
  const links = [
    { label: 'برنامه کامل', href: '/school/schedule', glyph: 'calendar' as const },
    { label: 'پیشرفت من', href: '/school/progress', glyph: 'chart' as const },
    { label: 'منابع کلاس', href: '/school/resources', glyph: 'book' as const },
    { label: 'کمک هوشمند', href: '/ai', glyph: 'ai' as const },
  ];
  return links.map((link) => {
    const el = h('a', { class: 'list-item', href: link.href }, h('div', { class: 'avatar sm sq' }, icon(link.glyph, 'icon sm')), h('div', { class: 'body' }, h('span', { text: link.label })), h('span', { class: 'end' }, icon('chevronEnd', 'icon sm')));
    return el;
  });
}

/* --------------------------------------------------------------- teacher */

function teacherHome(): HTMLElement {
  const persona = session.get().personaId;
  const myClasses = classes.filter((c) => c.teacherIds.includes(persona));
  const myClassIds = myClasses.map((c) => c.id);
  const queue = submissions.filter((s) => {
    const assignment = assignmentById.get(s.assignmentId);
    return assignment && myClassIds.includes(assignment.classId) && ['submitted', 'returned'].includes(s.status);
  });
  const attendanceDue = sessions.filter(
    (s) => myClassIds.includes(s.classId) && s.status === 'done' && Object.values(s.attendance).includes('unset'),
  );
  const upcomingExams = exams.filter((e) => myClassIds.includes(e.classId));

  const main = h('div', { class: 'stack' });
  main.append(
    todayRail() as Node,
    card(
      {},
      sectionHead('صف تصحیح', h('a', { class: 'spacer tiny', href: '/school/grading', text: 'باز کردن صف' })),
      ...(queue.length
        ? queue.slice(0, 5).map((s) =>
            listItem({
              href: `/school/grading/${s.id}`,
              leading: avatar(nameOf(s.studentId), { size: 'sm' }),
              title: nameOf(s.studentId),
              subtitle: assignmentById.get(s.assignmentId)?.title ?? '',
              meta: relative(s.attempts[s.attempts.length - 1]?.receivedAt ?? new Date().toISOString()),
              trailing: chip(s.status === 'returned' ? 'بازگشتی' : 'در انتظار', { tone: 'warn', glyph: '⏱' }),
            }),
          )
        : [empty({ glyph: 'check', title: 'صف تصحیح خالی است', text: 'همه پاسخ‌های دریافتی بررسی شده‌اند.' })]),
    ),
    card(
      {},
      sectionHead('نیازمند توجه', chip(`${attendanceDue.length + upcomingExams.length} مورد`, { tone: 'info' })),
      ...attendanceDue.map((s) =>
        listItem({
          href: `/school/attendance/${s.id}`,
          title: `ثبت حضور: ${s.title}`,
          subtitle: `${classById.get(s.classId)?.name ?? ''} · ${relative(s.startsAt)}`,
          trailing: chip('ثبت‌نشده', { tone: 'bad', glyph: '!' }),
        }),
      ),
      ...upcomingExams.map((e) =>
        listItem({
          href: `/school/exams/${e.id}/manage`,
          title: e.title,
          subtitle: `بازه: ${relative(e.opensAt)} تا ${relative(e.closesAt)}`,
          trailing: chip('مدیریت آزمون', { tone: 'info', glyph: 'quiz' }),
        }),
      ),
    ),
  );

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('کلاس‌های من'),
      ...myClasses.map((c) =>
        listItem({
          href: `/school/classes/${c.id}`,
          leading: h('div', { class: 'avatar sm', style: { background: c.color }, text: c.name.slice(0, 1) }),
          title: c.name,
          subtitle: `${c.studentIds.length} دانش‌آموز · ظرفیت ${c.capacity}`,
        }),
      ),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn soft sm', href: '/school/sessions/new', text: 'جلسه تازه' }), h('a', { class: 'btn soft sm', href: '/school/assignments/new', text: 'تکلیف تازه' }), h('a', { class: 'btn soft sm', href: '/school/exams/new', text: 'آزمون تازه' })),
    ),
  );
  side.append(
    card(
      {},
      sectionHead('تحلیل‌های در بررسی', chip('۲ مورد')),
      listItem({ href: '/school/insights-queue', title: 'یکنوایی در بازه‌ها', subtitle: 'نیازمند تأیید معلم', trailing: chip('در بررسی', { tone: 'warn' }) }),
      listItem({ href: '/school/insights-queue', title: 'حضور در جلسات اخیر', subtitle: 'داده کم', trailing: chip('کم‌داده', { tone: 'info' }) }),
    ),
  );

  const cols = h('div', { class: 'two-col' }, main, side);
  return dashboardFrame('داشبورد تدریس', 'جلسه‌ها، صف تصحیح و کارهای نیازمند توجه', cols);
}

/* -------------------------------------------------------------- guardian */

function guardianHome(): HTMLElement {
  const persona = session.get().personaId;
  const children = guardianLinks
    .filter((link) => link.guardianId === persona && link.status === 'verified')
    .map((link) => ({ link, child: personById.get(link.studentId) }))
    .filter((entry) => entry.child);

  const page = dashboardFrame('فرزندان من', 'گزارش آموزشی فرزند و وضعیت رابطه');
  if (!children.length) {
    page.append(
      empty({
        glyph: 'users',
        title: 'هنوز فرزندی به حساب شما وصل نیست',
        text: 'رابطه سرپرستی باید توسط مسئول آموزشگاه با مدرک معتبر تأیید شود. افزودن دستی نام، دسترسی ایجاد نمی‌کند.',
      }),
    );
    return page;
  }

  const selected = session.get().childId ?? children[0].link.studentId;
  session.set({ childId: selected });

  const picker = h('div', { class: 'hstack-scroll' });
  for (const { child } of children) {
    const active = child!.id === selected;
    const btn = h('button', { class: `chip btn-like ${active ? '' : 'ghost'}`, type: 'button' });
    btn.setAttribute('aria-pressed', String(active));
    btn.append(h('span', { text: child!.name }));
    btn.addEventListener('click', () => {
      session.set({ childId: child!.id });
      location.assign(`/school/child/${child!.id}`);
    });
    picker.append(btn);
  }
  page.append(picker);

  const child = personById.get(selected)!;
  const childClasses = classes.filter((c) => c.studentIds.includes(selected));
  const pendingAssignments = assignments.filter((a) => childClasses.some((c) => c.id === a.classId));
  const graded = submissions.filter((s) => s.studentId === selected && s.status === 'graded');

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(
    card(
      {},
      sectionHead('برنامه کلاس‌ها', chip(schoolById.get('s-neda')?.name ?? '')),
      ...childClasses.map((c) => {
        const nextSession = sessionsOfClass(c.id).find((s) => new Date(s.startsAt).getTime() > Date.now());
        return listItem({
          href: `/school/child/${child.id}`,
          leading: h('div', { class: 'avatar sm', style: { background: c.color }, text: c.name.slice(0, 1) }),
          title: c.name,
          subtitle: nextSession ? `جلسه بعدی ${relative(nextSession.startsAt)}` : 'بدون جلسه پیش‌رو',
        });
      }),
    ),
    card(
      {},
      sectionHead('وضعیت تکالیف'),
      ...(pendingAssignments.length
        ? pendingAssignments.slice(0, 4).map((a) => {
            const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === child.id);
            const state = sub?.status ?? 'not-started';
            return listItem({
              href: `/school/child/${child.id}`,
              title: a.title,
              subtitle:
                state === 'graded'
                  ? `نمره منتشرشده: ${sub?.score}`
                  : state === 'submitted'
                    ? 'تحویل شده — در انتظار تصحیح'
                    : state === 'returned'
                      ? 'بازگشتی برای اصلاح'
                      : 'هنوز تحویل نشده',
              trailing: chip(
                state === 'graded' ? 'نمره' : state === 'submitted' ? 'در انتظار' : 'باز',
                { tone: state === 'graded' ? 'ok' : state === 'submitted' ? 'warn' : 'info' },
              ),
            });
          })
        : [h('p', { class: 'small muted', text: 'تکلیفی ثبت نشده است.' })]),
    ),
  );

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('پیشرفت'),
      h('div', { class: 'row' }, ring(Math.round((graded.length / Math.max(1, pendingAssignments.length)) * 100), 100), h('div', { class: 'grow stack sm' }, h('div', { class: 'small', text: `${graded.length} تکلیف با نتیجه منتشرشده` }), h('p', { class: 'tiny muted', text: 'نمره‌ای که هنوز منتشر نشده در این خلاصه نمی‌آید.' }))),
      h('a', { class: 'btn soft block', href: `/school/child/${child.id}`, text: 'گزارش کامل فرزند' }),
    ),
  );
  side.append(
    card(
      {},
      sectionHead('رابطه سرپرستی'),
      h('p', { class: 'small muted', text: 'دامنه دسترسی شما: نمره، حضور و گزارش آموزشی. ارسال پاسخ به جای فرزند ممکن نیست.' }),
      h('a', { class: 'btn soft block', href: `/school/child/${child.id}/relationship`, text: 'دیدن حدود دسترسی' }),
    ),
  );
  side.append(
    card(
      {},
      sectionHead('پرسش از دستیار'),
      h('p', { class: 'small muted', text: 'دستیار والد فقط از داده آموزشی منتشرشده استفاده می‌کند؛ متن گفتگوی خصوصی فرزند در دسترس نیست.' }),
      h('a', { class: 'btn soft block', href: '/ai', text: 'پرسیدن سؤال' }),
    ),
  );

  cols.append(main, side);
  page.append(cols);
  return page;
}

/* --------------------------------------------------------------- manager */

function managerHome(): HTMLElement {
  const school = currentSchool();
  const isMehr = school?.id === 's-mehr';
  const classesHere = classes.filter((c) => c.schoolId === school?.id);
  const studentIds = new Set(classesHere.flatMap((c) => c.studentIds));
  const pendingInvites = 3;

  const page = dashboardFrame(school?.name ?? 'آموزشگاه', `${ROLE_LABEL[currentRole()]} · ${school?.city ?? ''}`);

  if (!school?.active) {
    page.append(banner('این فضا هنوز فعال نیست؛ ابزارهای آموزشی بسته می‌مانند.', { tone: 'warn', glyph: 'lock' }));
  }

  const isFresh = school ? school.usedSeats < 8 : false;
  if (isFresh) {
    const checklist = [
      { label: 'تکمیل اطلاعات آموزشگاه', done: true },
      { label: 'تعریف ترم و درس', done: true },
      { label: 'افزودن معلم', done: school!.usedSeats > 3 },
      { label: 'ثبت‌نام دانش‌آموز', done: school!.usedSeats > 5 },
      { label: 'ساخت کلاس و برنامه جلسات', done: classesHere.some((c) => c.status === 'active') },
    ];
    const cardEl = card({}, sectionHead('راهنمای راه‌اندازی', chip(`${checklist.filter((c) => c.done).length} از ${checklist.length}`)));
    for (const item of checklist) {
      cardEl.append(
        h(
          'div',
          { class: 'row', style: { gap: '10px' } },
          h('span', { class: `chip ${item.done ? 'ok' : ''}`, style: { width: '26px', justifyContent: 'center', padding: '3px' }, text: item.done ? '✓' : '' }),
          h('span', { class: 'grow small', text: item.label }),
        ),
      );
    }
    cardEl.append(h('a', { class: 'btn primary block', href: '/school/manage/classes', text: 'ادامه راه‌اندازی' }));
    page.append(cardEl);
  }

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(
    card(
      {},
      sectionHead('کارهای امروز'),
      listItem({ href: '/school/manage/invites', title: `${pendingInvites} دعوت در انتظار پذیرش`, subtitle: 'ارسال پیامک انجام شده؛ پذیرش هنوز نه', trailing: chip('پیگیری', { tone: 'warn' }) }),
      listItem({ href: '/school/manage/reports', title: '۲ جلسه بدون لینک جلسه', subtitle: 'این هفته', trailing: chip('اقدام', { tone: 'bad', glyph: '!' }) }),
      listItem({ href: '/school/manage/reports', title: 'تصحیح معوق ۵ پاسخ', subtitle: 'بیش از ۴۸ ساعت از تحویل', trailing: chip('تأخیر', { tone: 'warn' }) }),
      listItem({ href: '/school/manage/people', title: '۲ رابطه سرپرستی در انتظار تأیید', subtitle: 'نیازمند بررسی مدرک', trailing: chip('بررسی', { tone: 'info' }) }),
    ),
    card(
      {},
      sectionHead('کلاس‌ها', h('a', { class: 'spacer tiny', href: '/school/manage/classes', text: 'مدیریت' })),
      ...classesHere.map((c) =>
        listItem({
          href: `/school/classes/${c.id}`,
          leading: h('div', { class: 'avatar sm', style: { background: c.color }, text: c.name.slice(0, 1) }),
          title: c.name,
          subtitle: `${c.studentIds.length} دانش‌آموز · ${c.teacherIds.map(nameOf).join('، ')}`,
          trailing: chip(c.status === 'active' ? 'فعال' : c.status === 'completed' ? 'پایان‌یافته' : 'پیش‌نویس', { tone: c.status === 'active' ? 'ok' : 'plain' }),
        }),
      ),
    ),
  );

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('ظرفیت و مصرف'),
      ...(school
        ? [
            kvGrid([
              ['دانش‌آموز فعال', `${school.usedSeats} از ${school.seats}`],
              ['پلن', school.plan],
              ['سهمیه دستیار', `${school.aiQuota.used} از ${school.aiQuota.total}`],
            ]),
            bar(school.usedSeats, school.seats),
            h('a', { class: 'btn soft block', href: '/school/manage/plan', text: 'مدیریت اشتراک' }),
          ]
        : []),
    ),
  );
  side.append(
    card(
      {},
      sectionHead('مدیریت'),
      ...[
        { label: 'افراد و نقش‌ها', href: '/school/manage/people', glyph: 'users' as const },
        { label: 'دعوت‌ها', href: '/school/manage/invites', glyph: 'mail' as const },
        { label: 'ورود گروهی CSV', href: '/school/manage/import', glyph: 'upload' as const },
        { label: 'روابط سرپرستی', href: '/school/manage/guardians', glyph: 'shield' as const },
        { label: 'گزارش‌های سازمان', href: '/school/manage/reports', glyph: 'chart' as const },
        { label: 'تنظیمات و سیاست‌ها', href: '/school/manage/settings', glyph: 'settings' as const },
      ].map((link) => h('a', { class: 'list-item', href: link.href }, h('div', { class: 'avatar sm sq' }, icon(link.glyph, 'icon sm')), h('div', { class: 'body' }, h('span', { text: link.label })), h('span', { class: 'end' }, icon('chevronEnd', 'icon sm')))),
    ),
  );

  cols.append(main, side);
  page.append(cols);
  void isMehr;
  void studentIds;
  return page;
}

/* ----------------------------------------------------------------- admin */

function adminHome(): HTMLElement {
  const state = app.get();
  const waiting = state.applications.filter((a) => a.status === 'submitted' || a.status === 'invoiced');
  const page = dashboardFrame('پنل عملیات ماکان', 'درخواست‌ها، پرداخت‌ها و راه‌اندازی مشتری');

  const stats = h('div', { class: 'grid-2' });
  stats.append(
    card({ cls: 'pad-sm' }, stat(String(state.applications.filter((a) => a.status === 'submitted').length), 'درخواست تازه')),
    card({ cls: 'pad-sm' }, stat(String(state.applications.filter((a) => a.status === 'invoiced').length), 'در انتظار پرداخت')),
    card({ cls: 'pad-sm' }, stat(String(state.invoices.filter((i) => i.status === 'paid').length), 'پرداخت تأییدشده')),
    card({ cls: 'pad-sm' }, stat(String(state.invoices.filter((i) => i.status === 'unpaid').length), 'فاکتور باز')),
  );
  page.append(stats);

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(
    card(
      {},
      sectionHead('صف درخواست آموزشگاه', h('a', { class: 'spacer tiny', href: '/admin', text: 'همه' })),
      ...waiting.map((application) =>
        listItem({
          href: `/admin?app=${application.id}`,
          title: application.schoolName,
          subtitle: `${application.applicantName} · ${application.city} · ${application.capacity} صندلی`,
          meta: relative(application.steps[application.steps.length - 1]?.at ?? new Date().toISOString()),
          trailing: chip(
            application.status === 'invoiced' ? 'فاکتور صادر شد' : 'ثبت شده',
            { tone: application.status === 'invoiced' ? 'warn' : 'info' },
          ),
        }),
      ),
    ),
  );
  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('مرز دسترسی این پنل'),
      h('p', { class: 'small muted', text: 'ادمین بودن به‌معنای اجازه خواندن گفتگوی خصوصی یا پاسخ‌نامه کاربران نیست. دسترسی حساس با دلیل و مدت باز می‌شود.' }),
      banner('هیچ‌یک از این صفحه‌ها متن چت کاربران را نشان نمی‌دهد.', { glyph: 'shield' }),
    ),
  );
  cols.append(main, side);
  page.append(cols);
  void applications;
  return page;
}

/* ------------------------------------------------------------------ page */

const render: PageRenderer = () => {
  const role = currentRole();
  const school = currentSchool();
  if (role === 'admin') return adminHome();
  if (!school && role !== 'guardian') {
    const page = h('div', { class: 'page' });
    page.append(
      card(
        {},
        h('h2', { text: 'عضو آموزشگاهی نیستید' }),
        h('p', { class: 'small muted', text: 'فضای شخصی شما فعال است. برای دسترسی به کلاس، تکلیف و آزمون باید دعوت یک آموزشگاه را بپذیرید.' }),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn primary', href: '/invites', text: 'دیدن دعوت‌ها' }), h('a', { class: 'btn soft', href: '/msg', text: 'پیام‌رسان' })),
      ),
    );
    return page;
  }
  switch (role) {
    case 'student':
      return studentHome();
    case 'teacher':
      return teacherHome();
    case 'guardian':
      return guardianHome();
    case 'manager':
      return managerHome();
    default:
      return studentHome();
  }
};

export { render };