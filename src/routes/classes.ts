/** ED-01 … ED-04, ED-13/14, TE-02/03 — classes, schedule, sessions, attendance, resources. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  banner,
  card,
  cardLink,
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
  timelineItem,
} from '../ui/kit';
import { formatDate, formatTime, relative, weekday, n } from '../core/format';
import {
  assignmentsOfClass,
  classById,
  classes,
  examsOfClass,
  lessonById,
  nameOf,
  personById,
  resourceById,
  resources,
  sessions,
  sessionsOfClass,
  submissions,
} from '../data/seed';
import { app, attendanceFor, setAttendance } from '../data/app-state';
import { can, currentRole, myClassIds, session as state } from '../data/session';
import { confirmDialog, toast } from '../core/overlays';
import type { AttendanceStatus } from '../data/types';
import type { PageRenderer, RouteContext } from '../core/router';

const ATT_LABEL: Record<AttendanceStatus, string> = {
  unset: 'ثبت‌نشده',
  present: 'حاضر',
  absent: 'غایب',
  late: 'دیررس',
  excused: 'موجه',
};

const ATT_TONE: Record<AttendanceStatus, 'plain' | 'ok' | 'bad' | 'warn' | 'info'> = {
  unset: 'plain',
  present: 'ok',
  absent: 'bad',
  late: 'warn',
  excused: 'info',
};

function scopeClassIds(): string[] {
  const mine = myClassIds();
  return mine.length ? mine : classes.map((c) => c.id);
}

/* ------------------------------------------------------------------ ED-01 */

export const classListPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('کلاس‌ها', 'کلاس‌های فعال، پایان‌یافته و آرشیو'));

  const groups = [
    { id: 'current', label: 'جاری' },
    { id: 'finished', label: 'پایان‌یافته' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'current';

  const host = h('div', { class: 'stack' });
  const paint = () => {
    host.replaceChildren();
    const list = classes.filter((c) => scopeClassIds().includes(c.id) && (filter === 'current' ? c.status !== 'completed' : c.status === 'completed'));
    if (!list.length) {
      host.append(
        empty({
          glyph: 'school',
          title: filter === 'current' ? 'کلاس فعالی ندارید' : 'کلاس پایان‌یافته‌ای ندارید',
          text: filter === 'current' ? 'پس از ثبت‌نام قطعی کلاس، اینجا نمایش داده می‌شود.' : 'سابقه کلاس‌های تمام‌شده جدا از فهرست فعال نگه داشته می‌شود.',
        }),
      );
      return;
    }
    for (const room of list) {
      const next = sessionsOfClass(room.id).find((s) => new Date(s.startsAt).getTime() > Date.now());
      host.append(
        cardLink(
          `/school/classes/${room.id}`,
          '',
          h(
            'div',
            { class: 'row' },
            h('div', { class: 'avatar lg', style: { background: room.color }, text: room.name.slice(0, 1) }),
            h(
              'div',
              { class: 'grow stack sm' },
              h('h3', { text: room.name }),
              h('div', { class: 'row wrap', style: { gap: '6px' } },
                chip(lessonById.get(room.lessonId)?.name ?? '', { glyph: 'book' }),
                chip(room.teacherIds.map(nameOf).join('، '), { glyph: 'user' }),
                chip(`${room.studentIds.length} دانش‌آموز`, { glyph: 'users' }),
              ),
              h('p', { class: 'tiny muted', text: next ? `جلسه بعدی ${relative(next.startsAt)} · ${formatDate(next.startsAt, { time: true })}` : 'جلسه‌ای ثبت نشده است' }),
            ),
          ),
        ),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (next) => { filter = next; paint(); } }));
  page.append(host);
  paint();
  return page;
};

/* ------------------------------------------------------------------ ED-02 */

export const classDetailPage: PageRenderer = (ctx: RouteContext) => {
  const room = classById.get(ctx.params.id);
  if (!room) return missing('کلاس پیدا نشد');
  const lesson = lessonById.get(room.lessonId);
  const role = currentRole();
  const isGuardian = role === 'guardian';
  const tabs = [
    { id: 'sessions', label: 'جلسه‌ها' },
    { id: 'assignments', label: 'تکالیف' },
    { id: 'exams', label: 'آزمون‌ها' },
    { id: 'resources', label: 'منابع' },
    { id: 'members', label: isGuardian ? 'کلاس' : 'اعضا' },
  ] as const;
  let active: (typeof tabs)[number]['id'] = 'sessions';

  const head = h('div', { class: 'stack sm' });
  const page = h('div', { class: 'page' });
  head.append(
    h('a', { class: 'row tiny muted', href: '/school/classes', style: { gap: '4px', width: 'fit-content' } }, icon('chevronEnd', 'icon sm'), h('span', { text: 'کلاس‌ها' })),
    h(
      'div',
      { class: 'row wrap' },
      h('div', { class: 'avatar lg', style: { background: room.color }, text: room.name.slice(0, 1) }),
      h(
        'div',
        { class: 'grow' },
        h('h1', { text: room.name }),
        h('p', { class: 'small muted', text: `${lesson?.name ?? ''} · ${lesson?.level ?? ''} · مدرس: ${room.teacherIds.map(nameOf).join('، ')}` }),
      ),
      room.groupChatId && !isGuardian ? h('a', { class: 'btn soft sm', href: `/msg/${room.groupChatId}`, text: 'گروه کلاس' }) : null,
    ),
  );

  const body = h('div', { class: 'stack' });
  const paint = () => {
    body.replaceChildren();
    if (active === 'sessions') {
      const rail = h('div', { class: 'rail-timeline' });
      const list = sessionsOfClass(room.id).slice().reverse();
      if (!list.length) body.append(empty({ glyph: 'calendar', title: 'جلسه‌ای ثبت نشده', text: 'معلم یا مدیر می‌تواند جلسه بسازد.' }));
      for (const item of list) {
        rail.append(
          timelineItem({
            time: `${formatDate(item.startsAt, { short: true })} · ${formatTime(item.startsAt)}`,
            title: item.title,
            subtitle:
              item.status === 'cancelled'
                ? 'این جلسه لغو شده است'
                : item.status === 'done'
                  ? `حضور: ${Object.values(item.attendance).filter((v) => v === 'present').length} از ${room.studentIds.length}`
                  : `مدت ${item.durationMin} دقیقه · ${item.provider}`,
            href: `/school/sessions/${item.id}`,
            state: item.status === 'done' ? 'past' : item.status === 'cancelled' ? 'past' : 'future',
            trailing:
              item.status === 'cancelled'
                ? chip('لغو شد', { tone: 'bad', glyph: '×' })
                : item.status === 'done'
                  ? chip('برگزار شد', { tone: 'ok', glyph: '✓' })
                  : chip('آینده', { tone: 'info', glyph: '◷' }),
          }),
        );
      }
      body.append(card({}, sectionHead('جلسه‌ها'), rail));
      if (can('authorContent')) body.append(h('a', { class: 'btn soft block', href: '/school/sessions/new', text: 'ساخت جلسه تازه' }));
    }

    if (active === 'assignments') {
      const list = assignmentsOfClass(room.id);
      if (!list.length) body.append(empty({ glyph: 'file', title: 'تکلیفی ثبت نشده' }));
      for (const assignment of list) {
        const mySub = submissions.find((s) => s.assignmentId === assignment.id && s.studentId === state.get().personaId);
        const count = submissions.filter((s) => s.assignmentId === assignment.id && s.status !== 'not-started').length;
        body.append(
          card(
            {},
            h(
              'div',
              { class: 'row between' },
              h('h3', { text: assignment.title }),
              chip(relative(assignment.dueAt), { tone: new Date(assignment.dueAt).getTime() > Date.now() ? 'warn' : 'plain', glyph: '⏱' }),
            ),
            h('p', { class: 'small muted clamp-2', text: assignment.body }),
            h(
              'div',
              { class: 'row wrap', style: { gap: '6px' } },
              chip(`نسخه ${assignment.version}`, { glyph: 'layers' }),
              chip(`${assignment.maxAttempts} تلاش`, { glyph: 'refresh' }),
              assignment.allowLate ? chip('تأخیر مجاز', { tone: 'ok' }) : chip('بدون تأخیر', { tone: 'bad' }),
            ),
            h(
              'div',
              { class: 'btn-row' },
              h('a', { class: 'btn soft sm', href: `/school/assignments/${assignment.id}`, text: isGuardian ? 'جزئیات' : 'باز کردن' }),
              !isGuardian && role !== 'student' ? h('a', { class: 'btn ghost sm', href: `/school/grading?assignment=${assignment.id}`, text: `${count} پاسخ` }) : null,
              mySub?.status === 'returned' && role === 'student' ? h('a', { class: 'btn primary sm', href: `/school/assignments/${assignment.id}/submit`, text: 'اصلاح و ارسال دوباره' }) : null,
            ),
          ),
        );
      }
      if (can('authorContent')) body.append(h('a', { class: 'btn soft block', href: '/school/assignments/new', text: 'تکلیف تازه' }));
    }

    if (active === 'exams') {
      const list = examsOfClass(room.id);
      if (!list.length) body.append(empty({ glyph: 'quiz', title: 'آزمونی ثبت نشده' }));
      for (const exam of list) {
        body.append(
          card(
            {},
            h('div', { class: 'row between' }, h('h3', { text: exam.title }), chip(`${exam.durationMin} دقیقه`, { glyph: 'clock' })),
            h('p', { class: 'small muted', text: `بازه: ${formatDate(exam.opensAt, { short: true })} تا ${formatDate(exam.closesAt, { short: true })}` }),
            h(
              'div',
              { class: 'btn-row' },
              h('a', { class: 'btn soft sm', href: `/school/exams/${exam.id}`, text: 'قواعد آزمون' }),
              role === 'teacher' ? h('a', { class: 'btn ghost sm', href: `/school/exams/${exam.id}/manage`, text: 'مدیریت برگزاری' }) : null,
            ),
          ),
        );
      }
      if (can('authorContent')) body.append(h('a', { class: 'btn soft block', href: '/school/exams/new', text: 'آزمون تازه' }));
    }

    if (active === 'resources') {
      const list = resources.filter((r) => r.classIds.includes(room.id));
      if (!list.length) body.append(empty({ glyph: 'book', title: 'منبعی برای این کلاس ثبت نشده' }));
      for (const resource of list) {
        body.append(
          card(
            {},
            h('div', { class: 'row between' }, h('h3', { text: resource.title }), chip(resource.kind === 'pdf' ? 'PDF' : resource.kind.toUpperCase(), { glyph: 'file' })),
            h(
              'div',
              { class: 'row wrap', style: { gap: '6px' } },
              chip(`نسخه ${resource.version}`, { glyph: 'layers' }),
              chip(`${n(resource.sizeKb)} کیلوبایت`, { glyph: 'gauge' }),
              resource.status === 'ready'
                ? resource.aiReady
                  ? chip('آماده ارجاع در دستیار', { tone: 'ok', glyph: 'ai' })
                  : chip('قابل مشاهده، بدون ارجاع AI', { tone: 'info', glyph: 'info' })
                : chip('در حال آماده‌سازی', { tone: 'warn', glyph: 'clock' }),
            ),
            h('a', { class: 'btn soft sm', href: `/school/resources/${resource.id}`, text: 'باز کردن' }),
          ),
        );
      }
    }

    if (active === 'members') {
      if (isGuardian) {
        body.append(
          card({}, h('h3', { text: 'کلاس' }), h('p', { class: 'small muted', text: 'از این مسیر به گفتگوی گروه کلاس یا فهرست خصوصی هم‌کلاسی‌ها دسترسی ندارید.' })),
        );
        return;
      }
      const list = room.studentIds.map((id) => personById.get(id)).filter(Boolean);
      body.append(
        card(
          {},
          sectionHead('دانش‌آموزان', chip(`${list.length} از ${room.capacity}`)),
          ...list.map((person) =>
            listItem({
              href: role === 'teacher' ? `/school/students?student=${person!.id}` : undefined,
              leading: h('div', { class: 'avatar sm', style: { background: room.color }, text: person!.name.slice(0, 1) }),
              title: person!.name,
              subtitle: `${person!.username} · ${person!.grade ?? ''}`,
            }),
          ),
        ),
      );
      body.append(
        card(
          {},
          sectionHead('معلمان'),
          ...room.teacherIds.map((id) => listItem({ leading: h('div', { class: 'avatar sm' }, icon('user', 'icon sm')), title: nameOf(id), subtitle: personById.get(id)?.bio ?? '' })),
        ),
      );
    }
  };

  const tabBar = h('div', { class: 'tabs-inline', role: 'tablist' });
  for (const tab of tabs) {
    const btn = h('button', { type: 'button', role: 'tab', text: tab.label, 'aria-selected': String(tab.id === active) });
    btn.addEventListener('click', () => {
      active = tab.id;
      for (const other of Array.from(tabBar.children)) other.setAttribute('aria-selected', 'false');
      btn.setAttribute('aria-selected', 'true');
      paint();
    });
    tabBar.append(btn);
  }

  page.append(head, tabBar, body);
  paint();
  return page;
};

/* ------------------------------------------------------------------ ED-03 */

export const schedulePage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('برنامه آموزشی', 'جلسه‌ها و مهلت‌ها در زمان محلی'));

  const days = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return { offset, date };
  });

  const rail = h('div', { class: 'stack' });
  for (const day of days) {
    const key = day.offset;
    const daySessions = sessions
      .filter((s) => {
        const d = new Date(s.startsAt);
        const today = new Date();
        const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
        return diff === key;
      })
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const deadlines = sessions.length >= 0 ? [] : [];
    const dayBlock = card({}, h('div', { class: 'row between' }, h('h3', { text: `${weekday(day.date)} — ${formatDate(day.date, { short: true })}` }), chip(key === 0 ? 'امروز' : relative(day.date), { tone: key === 0 ? 'solid' : 'plain' })));
    if (!daySessions.length && !deadlines.length) {
      dayBlock.append(h('p', { class: 'small muted', text: 'جلسه‌ای ثبت نشده است.' }));
    } else {
      const list = h('div', { class: 'rail-timeline' });
      for (const item of daySessions) {
        list.append(
          timelineItem({
            time: formatTime(item.startsAt),
            title: item.title,
            subtitle: `${classById.get(item.classId)?.name ?? ''} · ${item.status === 'cancelled' ? 'لغو شده' : `${item.durationMin} دقیقه`}`,
            href: `/school/sessions/${item.id}`,
            state: item.status === 'done' ? 'past' : item.status === 'cancelled' ? 'past' : 'future',
            trailing: item.status === 'cancelled' ? chip('لغو', { tone: 'bad', glyph: '×' }) : null,
          }),
        );
      }
      dayBlock.append(list);
    }
    rail.append(dayBlock);
  }

  page.append(rail);
  page.append(banner('تغییر زمان یک جلسه، یادآوری قبلی را بی‌اعتبار می‌کند و اعلان تازه می‌فرستد.', { glyph: 'bell' }));
  return page;
};

/* ------------------------------------------------------------------ ED-04 */

export const sessionPage: PageRenderer = (ctx: RouteContext) => {
  const item = sessions.find((s) => s.id === ctx.params.id);
  if (!item) return missing('جلسه پیدا نشد');
  const room = classById.get(item.classId)!;
  const isGuardian = currentRole() === 'guardian';
  const isTeacher = currentRole() === 'teacher' || currentRole() === 'manager';
  const page = h('div', { class: 'page' });

  page.append(pageHead(item.title, `${room.name} · ${weekday(item.startsAt)} ${formatDate(item.startsAt, { short: true })}`, '/school/schedule'));

  const info = card(
    { tint: true },
    kvGrid([
      ['زمان', `${formatTime(item.startsAt)} تا ${formatTime(new Date(new Date(item.startsAt).getTime() + item.durationMin * 60000))}`],
      ['مدرس', room.teacherIds.map(nameOf).join('، ')],
      ['سرویس جلسه', item.provider],
      ['وضعیت', item.status === 'cancelled' ? 'لغو شده' : item.status === 'done' ? 'برگزار شده' : 'برنامه‌ریزی‌شده'],
    ]),
  );

  if (item.status === 'cancelled') {
    info.append(banner('این جلسه لغو شده است. حضور از این جلسه تولید نمی‌شود و یادآوری قبلی بی‌اعتبار است.', { tone: 'bad', glyph: 'alert' }));
  } else if (item.meetLink) {
    const join = h('a', { class: 'btn primary block', href: item.meetLink, target: '_blank', rel: 'noopener noreferrer' });
    join.append(icon('video', 'icon sm'));
    join.append(h('span', { text: 'ورود به جلسه (سرویس خارجی)' }));
    info.append(join);
    info.append(
      h('p', { class: 'tiny muted', text: 'ماکان میزبان جلسه زنده نیست. کلیک روی دکمه ورود به‌معنای ثبت حضور نیست؛ حضور را مسئول جلسه تعیین می‌کند.' }),
    );
  } else {
    info.append(banner('هنوز لینک جلسه ثبت نشده است. با ثبت لینک، اعضای مجاز کلاس از همین مسیر وارد می‌شوند.', { tone: 'warn', glyph: 'video' }));
  }

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(info);

  if (item.materialIds.length) {
    main.append(
      card(
        {},
        sectionHead('منابع جلسه'),
        ...item.materialIds.map((id) => {
          const res = resourceById.get(id)!;
          return listItem({ href: `/school/resources/${id}`, leading: h('div', { class: 'avatar sm sq' }, icon('file', 'icon sm')), title: res.title, subtitle: `نسخه ${res.version} · ${n(res.sizeKb)} کیلوبایت` });
        }),
      ),
    );
  }

  if (item.homeworkId) {
    const assignment = assignmentsOfClass(item.classId).find((a) => a.id === item.homeworkId);
    if (assignment) {
      main.append(
        card({}, sectionHead('تکلیف مرتبط'), listItem({ href: `/school/assignments/${assignment.id}`, title: assignment.title, subtitle: `مهلت ${relative(assignment.dueAt)}`, trailing: chip('جزئیات', { glyph: 'chevronEnd' }) })),
      );
    }
  }

  const side = h('div', { class: 'stack' });
  if (isTeacher) {
    const records = attendanceFor(item.id, item.attendance);
    const present = Object.values(records).filter((v) => v === 'present').length;
    side.append(
      card(
        {},
        sectionHead('حضور', chip(`${present} از ${room.studentIds.length}`)),
        h('p', { class: 'tiny muted', text: 'وضعیت‌های «ثبت‌نشده» بدون ذخیره به غایب تبدیل نمی‌شوند.' }),
        h('a', { class: 'btn soft block', href: `/school/attendance/${item.id}`, text: item.status === 'done' ? 'ویرایش حضور' : 'ثبت حضور' }),
      ),
    );
    if (can('authorContent')) {
      side.append(h('a', { class: 'btn soft block', href: '/school/sessions/new', text: 'ویرایش جلسه' }));
    }
  } else if (isGuardian) {
    side.append(banner('والد فقط رابطه سرپرستی و گزارش را می‌بیند و وارد جلسه زنده فرزند نمی‌شود.', { glyph: 'eye' }));
  } else {
    const mine = attendanceFor(item.id, item.attendance)[state.get().personaId] ?? 'unset';
    side.append(
      card(
        {},
        sectionHead('حضور شما'),
        chip(ATT_LABEL[mine], { tone: ATT_TONE[mine], glyph: mine === 'unset' ? '?' : '✓' }),
        h('p', { class: 'tiny muted', text: 'تا ثبت معلم، وضعیت «ثبت‌نشده» باقی می‌ماند و حضور از باز کردن لینک حدس زده نمی‌شود.' }),
      ),
    );
  }
  side.append(h('a', { class: 'btn ghost block', href: '/profile/support', text: 'مشکل جلسه دارم' }));

  cols.append(main, side);
  page.append(cols);
  return page;
};

/* ------------------------------------------------------------------ TE-02 */

export const sessionEditorPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('ساخت جلسه', 'زمان، مدرس، لینک و منابع جلسه'));

  const roomSelect = h('select', { class: 'select', 'aria-label': 'کلاس' });
  for (const room of classes.filter((c) => scopeClassIds().includes(c.id))) {
    roomSelect.append(h('option', { value: room.id, text: room.name }));
  }
  const title = field({ label: 'عنوان جلسه', placeholder: 'حل معادله درجه دو — جلسه چهارم' });
  const date = field({ label: 'تاریخ', type: 'date', value: new Date().toISOString().slice(0, 10) });
  const start = field({ label: 'ساعت شروع', type: 'time', value: '16:00' });
  const duration = field({ label: 'مدت (دقیقه)', type: 'number', value: '75' });
  const link = field({ label: 'لینک جلسه', placeholder: 'https://meet.google.com/…', dir: 'ltr', hint: 'لینک سرویس بیرونی؛ ماکان میزبان جلسه نیست.' });

  const repeat = switchRow({ title: 'تکرار هفتگی', subtitle: 'تا پایان ترم با همان ساعت', checked: false, onChange: () => toast('در نسخه نمایشی فقط یک جلسه ساخته می‌شود') });

  const submit = h('button', { class: 'btn primary block', type: 'button', text: 'ذخیره جلسه' });
  submit.addEventListener('click', () => {
    if (!title.input.value.trim()) {
      toast('عنوان جلسه را وارد کنید', 'bad');
      return;
    }
    toast('جلسه ذخیره شد (نمایشی)', 'ok');
    location.assign(`/school/classes/${roomSelect.value}`);
  });

  page.append(
    card(
      {},
      h('div', { class: 'field' }, h('label', { class: 'label', text: 'کلاس' }), roomSelect),
      title.wrap,
      h('div', { class: 'grid-2' }, date.wrap, start.wrap),
      duration.wrap,
      link.wrap,
      repeat,
      submit,
    ),
  );
  page.append(banner('ویرایش «جلسه‌های آینده» زمان و حضور جلسات برگزارشده را تغییر نمی‌دهد.', { glyph: 'history' }));
  return page;
};

/* ------------------------------------------------------------------ TE-03 */

export const attendancePage: PageRenderer = (ctx: RouteContext) => {
  const item = sessions.find((s) => s.id === ctx.params.id);
  if (!item) return missing('جلسه پیدا نشد');
  if (!can('takeAttendance')) return denied('ثبت حضور برای نقش شما در دسترس نیست.');

  const room = classById.get(item.classId)!;
  const stored = attendanceFor(item.id, item.attendance);
  const records: Record<string, AttendanceStatus> = { ...stored };
  for (const studentId of room.studentIds) if (!records[studentId]) records[studentId] = 'unset';

  const page = h('div', { class: 'page' });
  page.append(pageHead('ثبت حضور', `${room.name} · ${formatDate(item.startsAt, { short: true })}`, `/school/sessions/${item.id}`));

  if (item.status === 'cancelled') {
    page.append(banner('این جلسه لغو شده است؛ ثبت حضور برای آن معنا ندارد.', { tone: 'bad', glyph: 'alert' }));
    return page;
  }

  const list = h('div', { class: 'stack sm' });
  const rows: HTMLElement[] = [];

  for (const studentId of room.studentIds) {
    const row = h('div', { class: 'list-item', style: { flexWrap: 'wrap' } });
    row.append(h('div', { class: 'avatar sm' }, h('span', { text: nameOf(studentId).slice(0, 1) })));
    row.append(h('div', { class: 'body' }, h('span', { text: nameOf(studentId) }), h('span', { class: 'meta', text: personById.get(studentId)?.username ?? '' })));
    const group = h('div', { class: 'pill-row' });
    const paint = () => {
      group.replaceChildren();
      for (const [key, label] of Object.entries(ATT_LABEL)) {
        const chip = h('button', { class: `chip btn-like ${records[studentId] === key ? '' : 'ghost'}`, type: 'button' });
        chip.setAttribute('aria-pressed', String(records[studentId] === key));
        chip.textContent = label;
        chip.addEventListener('click', () => {
          records[studentId] = key as AttendanceStatus;
          paint();
        });
        group.append(chip);
      }
    };
    paint();
    row.append(group);
    rows.push(row);
    list.append(row);
  }

  const save = h('button', { class: 'btn primary block', type: 'button', text: 'ذخیره حضور' });
  save.addEventListener('click', async () => {
    const unset = room.studentIds.filter((id) => records[id] === 'unset');
    if (unset.length && !(await confirmDialog({ title: `${unset.length} نفر ثبت‌نشده`, message: 'با ذخیره، این موارد «ثبت‌نشده» می‌مانند و به‌عنوان غایب محاسبه نمی‌شوند.', confirmLabel: 'با وجود ثبت‌نشده ذخیره کن' }))) return;
    setAttendance(item.id, records);
    toast('حضور ذخیره شد', 'ok');
    location.assign(`/school/sessions/${item.id}`);
  });

  page.append(
    card(
      {},
      sectionHead('دانش‌آموزان', chip(`${room.studentIds.length} نفر`)),
      list,
      h('hr', { class: 'divider' }),
      save,
    ),
  );
  page.append(banner('اصلاح بعدی حضور باید دلیل و تاریخچه داشته باشد؛ خطای ذخیره نباید همه افراد را غایب نشان دهد.', { glyph: 'history' }));
  return page;
};

/* ------------------------------------------------------------------ ED-13 */

export const resourcesPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('منابع و جزوه‌ها', 'فایل‌های رسمی درس، جدا از پیوست پیام‌رسان'));

  const groups = [
    { id: 'all', label: 'همه' },
    { id: 'ai', label: 'آماده ارجاع در دستیار' },
    { id: 'processing', label: 'در حال بررسی' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'all';
  const host = h('div', { class: 'stack' });

  const paint = () => {
    host.replaceChildren();
    const list = resources.filter((r) =>
      filter === 'all' ? true : filter === 'ai' ? r.aiReady && r.status === 'ready' : r.status !== 'ready',
    );
    if (!list.length) {
      host.append(empty({ glyph: 'book', title: 'در این دسته منبعی نیست' }));
      return;
    }
    for (const resource of list) {
      host.append(
        card(
          {},
          h(
            'div',
            { class: 'row between' },
            h('h3', { text: resource.title }),
            chip(`نسخه ${resource.version}`, { glyph: 'layers' }),
          ),
          h(
            'div',
            { class: 'row wrap', style: { gap: '6px' } },
            chip(resource.kind.toUpperCase(), { glyph: 'file' }),
            chip(`${n(resource.sizeKb)} کیلوبایت`, { glyph: 'gauge' }),
            chip(formatDate(resource.publishedAt, { short: true }), { glyph: 'calendar' }),
          ),
          h(
            'p',
            { class: 'tiny muted' },
            resource.status === 'ready'
              ? resource.aiReady
                ? 'منبع آماده ارجاع است: می‌توانید از دستیار درباره آن بپرسید.'
                : 'قابل مشاهده است، ولی هنوز منبع فعال دستیار نیست.'
              : 'در حال بررسی و آماده‌سازی؛ نسخه قبلی جایگزین نمی‌شود.',
          ),
          h('a', { class: 'btn soft sm', href: `/school/resources/${resource.id}`, text: 'باز کردن' }),
        ),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  paint();
  return page;
};

/* ------------------------------------------------------------------ ED-14 */

export const resourceViewerPage: PageRenderer = (ctx: RouteContext) => {
  const resource = resourceById.get(ctx.params.id);
  if (!resource) return missing('منبع پیدا نشد');
  const page = h('div', { class: 'page' });
  page.append(pageHead(resource.title, `نسخه ${resource.version} · ${formatDate(resource.publishedAt, { short: true })}`, '/school/resources'));

  const viewer = h(
    'div',
    { class: 'card', style: { minHeight: '360px', display: 'grid', placeItems: 'center', background: 'var(--paper-2)' } },
    h(
      'div',
      { class: 'empty' },
      h('div', { class: 'glyph' }, icon('file', 'icon lg')),
      h('h3', { text: 'نمایشگر سند' }),
      h('p', { class: 'small muted', text: `${resource.pages ?? 0} صفحه · ${n(resource.sizeKb)} کیلوبایت` }),
      h('p', { class: 'tiny muted', text: 'در نسخه نمایشی محتوای فایل رندر نمی‌شود؛ باز کردن با لینک قدیمی هم مجوز جاری را دور نمی‌زند.' }),
    ),
  );

  page.append(viewer);
  page.append(
    card(
      {},
      sectionHead('وضعیت دسترسی'),
      kvGrid([
        ['وضعیت سند', resource.status === 'ready' ? 'آماده' : 'در حال بررسی'],
        ['ارجاع در دستیار', resource.aiReady ? 'بله' : 'خیر'],
        ['کلاس‌های مرتبط', resource.classIds.map((id) => classById.get(id)?.name ?? '').join('، ')],
      ]),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn soft sm', type: 'button', text: 'دانلود' }), resource.aiReady ? h('a', { class: 'btn ghost sm', href: `/ai?source=${resource.id}`, text: 'پرسیدن از دستیار' }) : null),
    ),
  );
  return page;
};

/* --------------------------------------------------------------- helpers */

export function missing(title = 'پیدا نشد', text = 'این مورد در دسترس شما نیست یا وضعیت آن تغییر کرده است.'): HTMLElement {
  const page = h('div', { class: 'page' });
  page.append(empty({ glyph: 'search', title, text }));
  page.append(h('a', { class: 'btn soft block', href: '/school', text: 'بازگشت' }));
  return page;
}

export function denied(message = 'این عملیات برای نقش شما مجاز نیست.', title = 'دسترسی ندارید'): HTMLElement {
  const page = h('div', { class: 'page' });
  page.append(empty({ glyph: 'lock', title, text: message }));
  page.append(banner('نمایش ابزار به‌معنای اعطای مجوز نیست؛ سرور باید هر درخواست را مستقل کنترل کند.', { glyph: 'shield' }));
  page.append(h('a', { class: 'btn soft block', href: '/school', text: 'بازگشت' }));
  return page;
}

export { app, stat, textarea };