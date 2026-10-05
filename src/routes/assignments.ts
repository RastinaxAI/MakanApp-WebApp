/** ED-05 … ED-08, TE-04 … TE-06 — assignments, submission with receipt, grading queue. */

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
  textarea,
} from '../ui/kit';
import { formatDate, formatTime, relative, n } from '../core/format';
import {
  assignmentById,
  assignments,
  classById,
  classes,
  nameOf,
  personById,
  resourceById,
  submissions as seedSubmissions,
} from '../data/seed';
import { app, publishGrade as publishGradeAction, saveDraft, submitAssignment } from '../data/app-state';
import { can, canReadSubmission, currentRole, session as state } from '../data/session';
import { confirmDialog, toast } from '../core/overlays';
import { denied, missing } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';

function subFor(assignmentId: string, studentId: string) {
  return app.get().submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
}

function scopedAssignments(): typeof assignments {
  const mine = classes.filter((c) => state.get().personaId && c.studentIds.includes(state.get().personaId)).map((c) => c.id);
  const teacherClasses = classes.filter((c) => c.teacherIds.includes(state.get().personaId)).map((c) => c.id);
  if (currentRole() === 'student') return assignments.filter((a) => mine.includes(a.classId));
  if (currentRole() === 'teacher') return assignments.filter((a) => teacherClasses.includes(a.classId));
  return assignments;
}

function statusChip(status: string): HTMLElement {
  const map: Record<string, { tone: 'ok' | 'warn' | 'bad' | 'info' | 'plain'; glyph: string }> = {
    'not-started': { tone: 'plain', glyph: '○' },
    draft: { tone: 'warn', glyph: '✎' },
    queued: { tone: 'warn', glyph: 'clock' },
    submitted: { tone: 'info', glyph: '↑' },
    returned: { tone: 'warn', glyph: '↩' },
    graded: { tone: 'ok', glyph: '✓' },
  };
  const entry = map[status] ?? map['not-started'];
  const label: Record<string, string> = {
    'not-started': 'شروع‌نشده',
    draft: 'پیش‌نویس',
    queued: 'در صف ارسال',
    submitted: 'تحویل شد',
    returned: 'بازگشتی',
    graded: 'تصحیح شد',
  };
  return chip(label[status] ?? status, { tone: entry.tone, glyph: entry.glyph });
}

/* ------------------------------------------------------------------ ED-05 */

export const assignmentListPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('تکالیف', 'موعد، وضعیت تحویل و نمره منتشرشده'));

  const groups = [
    { id: 'open', label: 'باز' },
    { id: 'done', label: 'تحویل‌شده' },
    { id: 'graded', label: 'نمره‌دار' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'open';
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const list = scopedAssignments()
      .filter((assignment) => {
        const sub = subFor(assignment.id, state.get().personaId);
        const status = sub?.status ?? 'not-started';
        if (filter === 'open') return status !== 'graded' && new Date(assignment.dueAt).getTime() > Date.now() - 86400000;
        if (filter === 'done') return ['submitted', 'returned'].includes(status);
        return status === 'graded';
      })
      .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));

    if (!list.length) {
      host.append(empty({ glyph: 'file', title: 'تکلیفی در این دسته نیست', text: 'فهرست بر پایه وضعیت واقعی شما ساخته می‌شود، نه حدس.' }));
      return;
    }

    for (const assignment of list) {
      const sub = subFor(assignment.id, state.get().personaId);
      const room = classById.get(assignment.classId);
      const overdue = new Date(assignment.dueAt).getTime() < Date.now() && !['submitted', 'graded'].includes(sub?.status ?? '');
      host.append(
        card(
          {},
          h(
            'div',
            { class: 'row between wrap' },
            h('div', { class: 'grow stack sm' }, h('h3', { text: assignment.title }), h('p', { class: 'tiny muted', text: `${room?.name ?? ''} · نسخه ${assignment.version}` })),
            h('div', { class: 'row', style: { gap: '6px' } }, statusChip(sub?.status ?? 'not-started'), overdue ? chip('دیررس', { tone: 'bad', glyph: '!' }) : null),
          ),
          h('p', { class: 'small muted clamp-2', text: assignment.body }),
          h(
            'div',
            { class: 'row between wrap' },
            h('span', { class: 'tiny muted', text: `مهلت ${relative(assignment.dueAt)}` }),
            h(
              'div',
              { class: 'btn-row' },
              sub?.status === 'graded' && sub.publishedAt
                ? h('a', { class: 'btn soft sm', href: `/school/submissions/${sub.id}`, text: `نمره ${sub.score}` })
                : h('a', { class: 'btn soft sm', href: `/school/assignments/${assignment.id}`, text: 'جزئیات' }),
              currentRole() === 'student' && ['not-started', 'draft', 'returned'].includes(sub?.status ?? 'not-started')
                ? h('a', { class: 'btn primary sm', href: `/school/assignments/${assignment.id}/submit`, text: 'پاسخ' })
                : null,
            ),
          ),
        ),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  if (can('authorContent')) page.append(h('a', { class: 'btn soft block', href: '/school/assignments/new', text: 'تکلیف تازه' }));
  paint();
  return page;
};

/* ------------------------------------------------------------------ ED-06 */

export const assignmentPage: PageRenderer = (ctx: RouteContext) => {
  const assignment = assignmentById.get(ctx.params.id);
  if (!assignment) return missing('تکلیف پیدا نشد');
  const room = classById.get(assignment.classId)!;
  const sub = subFor(assignment.id, state.get().personaId);
  const role = currentRole();
  const rubricTotal = assignment.rubric.reduce((sum, r) => sum + r.points, 0);
  const overdue = new Date(assignment.dueAt).getTime() < Date.now();

  const page = h('div', { class: 'page' });
  page.append(pageHead(assignment.title, `${room.name} · نسخه ${assignment.version}`, '/school/assignments'));

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });

  main.append(
    card(
      { tint: true },
      h('p', { text: assignment.body }),
      kvGrid([
        ['مهلت', `${formatDate(assignment.dueAt, { short: true, time: true })}`],
        ['تعداد تلاش', `${assignment.maxAttempts}`],
        ['تأخیر', assignment.allowLate ? 'با ثبت «دیرهنگام» پذیرفته می‌شود' : 'پذیرفته نمی‌شود'],
        ['تلاش ارزیابی‌شده', assignment.scoredAttempt === 'best' ? 'بهترین تلاش' : 'آخرین تلاش'],
      ]),
    ),
  );

  if (overdue && !assignment.allowLate) {
    main.append(banner('مهلت این تکلیف تمام شده و تحویل دیرهنگام مجاز نیست.', { tone: 'bad', glyph: 'alert' }));
  } else if (overdue) {
    main.append(banner('مهلت گذشته است؛ تلاش شما به‌عنوان «دیرهنگام» ثبت می‌شود.', { tone: 'warn', glyph: 'clock' }));
  }

  if (assignment.resourceIds.length) {
    main.append(
      card(
        {},
        sectionHead('فایل مرجع'),
        ...assignment.resourceIds.map((id) => {
          const res = resourceById.get(id)!;
          return listItem({ href: `/school/resources/${id}`, leading: h('div', { class: 'avatar sm sq' }, icon('file', 'icon sm')), title: res.title, subtitle: `${n(res.sizeKb)} کیلوبایت` });
        }),
      ),
    );
  }

  main.append(
    card(
      {},
      sectionHead('معیار نمره', chip(`${rubricTotal} نمره`)),
      ...assignment.rubric.map((row) =>
        h('div', { class: 'row between small' }, h('span', { text: row.label }), h('span', { class: 'nums', text: String(row.points) })),
      ),
    ),
  );

  const side = h('div', { class: 'stack' });
  if (role === 'student') {
    const attemptsUsed = sub?.attempts.length ?? 0;
    side.append(
      card(
        {},
        sectionHead('وضعیت شما'),
        h('div', { class: 'stack sm' }, ...(sub?.attempts ?? []).map((attempt) =>
          h(
            'div',
            { class: 'row between small' },
            h('span', { text: `تلاش ${attempt.number}` }),
            h('span', { class: 'row', style: { gap: '6px' } }, chip(attempt.state === 'received' ? 'دریافت شد' : attempt.state === 'late' ? 'دیرهنگام' : attempt.state === 'queued' ? 'در صف' : 'پیش‌نویس', { tone: attempt.state === 'received' ? 'ok' : 'warn' }), attempt.receiptId ? h('span', { class: 'tiny muted nums', text: attempt.receiptId }) : null),
          ),
        )),
        bar(attemptsUsed, assignment.maxAttempts),
        attemptsUsed >= assignment.maxAttempts
          ? banner('سقف تعداد تلاش پر شده است؛ تلاش تازه‌ای ساخته نمی‌شود.', { tone: 'warn', glyph: 'lock' })
          : h('a', { class: 'btn primary block', href: `/school/assignments/${assignment.id}/submit`, text: sub?.attempts.length ? 'تلاش تازه' : 'شروع پاسخ' }),
      ),
    );
  } else if (role === 'guardian') {
    side.append(banner('والد پاسخ دانش‌آموز را نمی‌بیند و امکان تحویل به جای او ندارد؛ فقط وضعیت و بازخورد منتشرشده.', { glyph: 'eye' }));
  } else {
    const received = app.get().submissions.filter((s) => s.assignmentId === assignment.id && s.status !== 'not-started').length;
    side.append(
      card(
        {},
        sectionHead('پاسخ‌ها'),
        stat(String(received), 'پاسخ دریافتی'),
        h('a', { class: 'btn soft block', href: `/school/grading?assignment=${assignment.id}`, text: 'باز کردن صف تصحیح' }),
      ),
    );
  }

  side.append(h('a', { class: 'btn ghost block', href: `/msg/${room.groupChatId}`, text: 'گروه رسمی کلاس' }));

  cols.append(main, side);
  page.append(cols);
  return page;
};

/* ------------------------------------------------------------------ ED-07 */

export const submissionEditorPage: PageRenderer = (ctx: RouteContext) => {
  const assignment = assignmentById.get(ctx.params.id);
  if (!assignment) return missing('تکلیف پیدا نشد');
  if (currentRole() !== 'student') return denied('ارسال پاسخ فقط برای دانش‌آموزِ ثبت‌نام‌شده در این کلاس مجاز است.');

  const sub = subFor(assignment.id, state.get().personaId);
  const used = sub?.attempts.length ?? 0;
  if (used >= assignment.maxAttempts) {
    const page = h('div', { class: 'page' });
    page.append(pageHead('پاسخ', assignment.title, '/school/assignments'));
    page.append(banner('سقف تعداد تلاش این تکلیف پر شده است. تلاش تازه‌ای ساخته نمی‌شود.', { tone: 'warn', glyph: 'lock' }));
    return page;
  }

  const draft = app.get().drafts[assignment.id];
  const body = textarea({
    label: 'پاسخ شما',
    value: draft?.text ?? sub?.attempts[sub.attempts.length - 1]?.text ?? '',
    placeholder: 'پاسخ تشریحی خود را بنویسید…',
    rows: 8,
  });

  let fileName: string | undefined = draft?.fileName;
  const fileChip = h('div', { class: 'row wrap', style: { gap: '6px' } });
  const paintFile = () => {
    fileChip.replaceChildren();
    if (!fileName) return;
    const pill = h('span', { class: 'chip info' }, icon('file', 'icon sm'), h('span', { text: fileName }), (() => {
      const remove = h('button', { class: 'icon-btn', style: { width: '22px', height: '22px' }, 'aria-label': 'حذف پیوست' }, icon('x', 'icon sm'));
      remove.addEventListener('click', () => {
        fileName = undefined;
        paintFile();
      });
      return remove;
    })());
    fileChip.append(pill);
  };
  paintFile();

  const fileInput = h('input', { type: 'file', class: 'sr', id: 'answer-file' });
  fileInput.addEventListener('change', () => {
    const picked = fileInput.files?.[0];
    if (!picked) return;
    if (picked.size > 512 * 1024) {
      toast('حجم فایل بیش از ۵۱۲ کیلوبایت است', 'bad');
      return;
    }
    fileName = picked.name;
    paintFile();
  });

  const statusLine = h('div', { class: 'stack sm' });
  const offline = !app.get().online;

  if (offline) {
    statusLine.append(
      banner('حالت آفلاین: پاسخ روی این دستگاه ذخیره می‌شود و تا دریافت رسید سرور، «تحویل شد» نمایش داده نمی‌شود.', { tone: 'warn', glyph: 'wifiOff' }),
    );
  }

  const saveBtn = h('button', { class: 'btn soft block', type: 'button', text: 'ذخیره پیش‌نویس' });
  saveBtn.addEventListener('click', () => {
    saveDraft(assignment.id, body.input.value, fileName);
    toast('پیش‌نویس روی این دستگاه ذخیره شد', 'ok');
  });

  const sendBtn = h('button', { class: 'btn primary block', type: 'button', text: 'تأیید تحویل' });
  sendBtn.addEventListener('click', async () => {
    if (!body.input.value.trim() && !fileName) {
      toast('پاسخ خالی است', 'bad');
      return;
    }
    const ok = await confirmDialog({
      title: 'تحویل نهایی پاسخ',
      message: `تلاش ${used + 1} از ${assignment.maxAttempts} ثبت می‌شود. پس از ثبت، امکان ویرایش همان تلاش وجود ندارد.`,
      confirmLabel: 'ثبت و ارسال',
    });
    if (!ok) return;
    const result = submitAssignment(assignment.id, state.get().personaId, {
      text: body.input.value,
      fileName,
      allowLate: assignment.allowLate,
      maxAttempts: assignment.maxAttempts,
      dueAt: assignment.dueAt,
    });
    if (result.ok) {
      toast(`پاسخ ثبت شد — رسید ${result.receiptId}`, 'ok');
      const updated = subFor(assignment.id, state.get().personaId)!;
      location.assign(`/school/submissions/${updated.id}`);
    } else {
      toast(result.message, 'bad');
      statusLine.replaceChildren(banner(result.message, { tone: 'warn', glyph: 'wifiOff' }));
    }
  });

  const page = h('div', { class: 'page' });
  page.append(pageHead('آماده‌سازی پاسخ', `${assignment.title} · تلاش ${used + 1} از ${assignment.maxAttempts}`, `/school/assignments/${assignment.id}`));

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(
    card(
      {},
      body.wrap,
      h('div', { class: 'row wrap', style: { gap: '8px' } },
        h('label', { class: 'btn soft sm', for: 'answer-file' }, icon('camera', 'icon sm'), h('span', { text: 'افزودن تصویر یا فایل' })),
        h('label', { class: 'btn ghost sm', for: 'answer-file' }, icon('upload', 'icon sm'), h('span', { text: 'بارگذاری فایل' })),
        fileInput,
      ),
      fileChip,
      statusLine,
      h('div', { class: 'btn-row' }, sendBtn, saveBtn),
    ),
  );

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('قبل از ارسال بدانید'),
      h(
        'ul',
        { class: 'stack sm small muted' },
        h('li', { text: `تلاش ارزیابی‌شده: ${assignment.scoredAttempt === 'best' ? 'بهترین تلاش' : 'آخرین تلاش'}` }),
        h('li', { text: assignment.allowLate ? 'ارسال دیرهنگام پذیرفته و با برچسب ثبت می‌شود.' : 'ارسال دیرهنگام پذیرفته نمی‌شود.' }),
        h('li', { text: 'بارگذاری موفق فایل به‌معنای ثبت تحویل نیست؛ رسید سرور ملاک است.' }),
      ),
    ),
  );
  side.append(banner('اگر ارسال قطع شد، دوباره نزنید؛ تلاش تازه ساخته می‌شود. ابتدا رسید را بررسی کنید.', { glyph: 'shield' }));

  cols.append(main, side);
  page.append(cols);
  return page;
};

/* ------------------------------------------------------------------ ED-08 */

export const receiptPage: PageRenderer = (ctx: RouteContext) => {
  const sub = app.get().submissions.find((s) => s.id === ctx.params.id) ?? seedSubmissions.find((s) => s.id === ctx.params.id);
  if (!sub) return missing('رسید پیدا نشد');
  if (!canReadSubmission(sub.id)) return denied('این پاسخ در دسترس شما نیست.');

  const assignment = assignmentById.get(sub.assignmentId)!;
  const room = classById.get(assignment.classId)!;
  const isGuardian = currentRole() === 'guardian' && sub.studentId !== state.get().personaId;
  const latest = sub.attempts[sub.attempts.length - 1];
  const rubricTotal = assignment.rubric.reduce((sum, r) => sum + r.points, 0);

  const page = h('div', { class: 'page' });
  page.append(pageHead('رسید و بازخورد', `${assignment.title} · ${room.name}`, '/school/assignments'));

  if (!latest || latest.state === 'draft' || latest.state === 'queued') {
    page.append(
      banner(
        latest?.state === 'queued'
          ? 'پاسخ روی این دستگاه آماده است؛ هنوز رسید تحویل از سرور دریافت نشده.'
          : 'این تلاش هنوز ارسال نشده و پیش‌نویس محلی است.',
        { tone: 'warn', glyph: 'clock' },
      ),
    );
  } else {
    page.append(
      banner(
        latest.state === 'late'
          ? 'پاسخ ثبت شد و دیرهنگام علامت خورد. زمان پذیرش و شماره تلاش در رسید زیر آمده است.'
          : 'پاسخ ثبت شد. زمان پذیرش و شماره تلاش در رسید زیر آمده است.',
        { tone: 'ok', glyph: 'check' },
      ),
    );
  }

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });

  main.append(
    card(
      {},
      sectionHead('مشخصات تحویل'),
      kvGrid([
        ['زمان پذیرش', latest?.receivedAt ? `${formatDate(latest.receivedAt, { time: true })}` : '—'],
        ['شماره تلاش', latest ? `${latest.number} از ${assignment.maxAttempts}` : '—'],
        ['کد رسید', latest?.receiptId ?? '—'],
        ['وضعیت تأخیر', latest?.state === 'late' ? 'دیرهنگام' : latest ? 'به‌موقع' : '—'],
        ['نسخه تکلیف', `${assignment.version}`],
        ['نمره منتشرشده', sub.publishedAt ? `${sub.score} از ${rubricTotal}` : 'هنوز منتشر نشده'],
      ]),
    ),
  );

  if (!isGuardian && latest) {
    main.append(
      card(
        {},
        sectionHead('تلاش‌های ثبت‌شده'),
        ...sub.attempts.map((attempt) =>
          h(
            'div',
            { class: 'row between small', style: { padding: '6px 0', borderBlockEnd: '1px solid var(--line)' } },
            h('span', { text: `تلاش ${attempt.number}` }),
            h('span', { class: 'muted', text: `${formatDate(attempt.createdAt, { short: true, time: true })}` }),
            h('span', { class: 'row', style: { gap: '6px' } }, attempt.fileName ? chip(attempt.fileName, { glyph: 'file' }) : null, chip(attempt.state === 'received' ? 'دریافت شد' : attempt.state === 'late' ? 'دیرهنگام' : attempt.state === 'queued' ? 'در صف' : 'پیش‌نویس', { tone: attempt.state === 'received' ? 'ok' : 'warn' })),
          ),
        ),
      ),
    );
  }

  if (!isGuardian && latest) {
    main.append(
      card(
        {},
        sectionHead('متن پاسخ'),
        h('p', { class: 'small', text: latest.text || '— متنی ثبت نشده است.' }),
      ),
    );
  }

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('بازخورد'),
      sub.publishedAt
        ? h(
            'div',
            { class: 'stack sm' },
            h('div', { class: 'row' }, h('span', { class: 'stat' }, h('span', { class: 'v nums', text: `${sub.score}` }), h('span', { class: 'k', text: `از ${rubricTotal}` }))),
            h('p', { class: 'small', text: sub.feedback ?? '' }),
            h('p', { class: 'tiny muted', text: `منتشرشده در ${formatDate(sub.publishedAt, { time: true })}` }),
          )
        : h(
            'div',
            { class: 'stack sm' },
            h('p', { class: 'small muted', text: sub.status === 'returned' ? 'پاسخ برای اصلاح برگشت خورده است.' : 'نمره هنوز منتشر نشده است.' }),
            sub.status === 'returned' && currentRole() === 'student'
              ? h('a', { class: 'btn primary block', href: `/school/assignments/${assignment.id}/submit`, text: 'ارسال اصلاح' })
              : null,
          ),
    ),
  );

  if (!isGuardian && sub.publishedAt) {
    side.append(
      card(
        {},
        sectionHead('آزمون بعدی'),
        h('p', { class: 'small muted', text: 'بر پایه همین شواهد، یک مرور کوتاه پیشنهاد شده است.' }),
        h('a', { class: 'btn soft block', href: '/ai/practice', text: 'دیدن پیشنهاد' }),
      ),
    );
  }

  cols.append(main, side);
  page.append(cols);
  return page;
};

/* ------------------------------------------------------------------ TE-04 */

export const assignmentEditorPage: PageRenderer = () => {
  if (!can('authorContent')) return denied('ساخت تکلیف در نقش شما مجاز نیست.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('تکلیف تازه', 'صورت سؤال، قواعد و مخاطب پیش از انتشار'));

  const roomSelect = h('select', { class: 'select', 'aria-label': 'کلاس' });
  for (const room of classes) roomSelect.append(h('option', { value: room.id, text: room.name }));
  const title = field({ label: 'عنوان', placeholder: 'تمرین معادله درجه دو' });
  const body = textarea({ label: 'شرح تکلیف', placeholder: 'صورت سؤال…', rows: 6 });
  const due = field({ label: 'مهلت', type: 'datetime-local' });
  const attempts = field({ label: 'تعداد تلاش', type: 'number', value: '2' });

  const draftBadge = h('div', { class: 'stack sm' });
  const preview = h('div', { class: 'card tint stack sm' });
  const syncPreview = () => {
    preview.replaceChildren(
      h('div', { class: 'row between' }, h('h3', { text: title.input.value || 'پیش‌نمایش عنوان' }), chip('پیش‌نمایش دانش‌آموز', { glyph: 'eye' })),
      h('p', { class: 'small', text: body.input.value || 'متن صورت سؤال اینجا نمایش داده می‌شود.' }),
      h('div', { class: 'row wrap', style: { gap: '6px' } }, chip('بدون نمره', { glyph: 'gauge' }), chip(attempts.input.value ? `${attempts.input.value} تلاش` : '', { glyph: 'refresh' })),
    );
  };
  title.input.addEventListener('input', syncPreview);
  body.input.addEventListener('input', syncPreview);
  syncPreview();

  const publish = h('button', { class: 'btn primary block', type: 'button', text: 'انتشار تکلیف' });
  publish.addEventListener('click', async () => {
    if (!title.input.value.trim()) {
      toast('عنوان لازم است', 'bad');
      return;
    }
    const ok = await confirmDialog({ title: 'انتشار برای کلاس', message: 'پس از انتشار، اعلان برای همه مخاطبان ارسال می‌شود. تغییر بعدی نسخه تازه می‌سازد.', confirmLabel: 'منتشر کن' });
    if (!ok) return;
    draftBadge.replaceChildren(banner('پیش‌نویس AI بدون تأیید معلم منتشر نشد. تکلیف (نمایشی) ساخته شد.', { tone: 'ok', glyph: 'check' }));
    toast('تکلیف منتشر شد', 'ok');
  });

  page.append(
    card(
      {},
      h('div', { class: 'field' }, h('label', { class: 'label', text: 'کلاس' }), roomSelect),
      title.wrap,
      body.wrap,
      h('div', { class: 'grid-2' }, due.wrap, attempts.wrap),
      publish,
    ),
  );
  page.append(sectionHead('پیش‌نمایش دانش‌آموز'), preview, draftBadge);
  return page;
};

/* ------------------------------------------------------------------ TE-05 */

export const gradingQueuePage: PageRenderer = (ctx: RouteContext) => {
  if (!can('publishGrade')) return denied('صف تصحیح برای نقش شما در دسترس نیست.');
  const page = h('div', { class: 'page' });
  const assignmentFilter = ctx.query.get('assignment');
  page.append(pageHead('صف تصحیح', 'پاسخ‌های دریافتی، دیرهنگام و در انتظار بررسی'));

  const groups = [
    { id: 'waiting', label: 'در انتظار بررسی' },
    { id: 'late', label: 'دیرهنگام' },
    { id: 'returned', label: 'بازگشتی' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'waiting';
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const list = app.get().submissions.filter((s) => {
      if (assignmentFilter && s.assignmentId !== assignmentFilter) return false;
      if (filter === 'waiting') return s.status === 'submitted';
      if (filter === 'late') return s.attempts.some((a) => a.state === 'late') && s.status !== 'graded';
      return s.status === 'returned';
    });
    if (!list.length) {
      host.append(empty({ glyph: 'check', title: 'موردی در این صف نیست', text: 'صف خالی به معنی نبود کار نیست؛ وضعیت واقعی نمایش داده می‌شود.' }));
      return;
    }
    for (const sub of list) {
      const assignment = assignmentById.get(sub.assignmentId)!;
      const latest = sub.attempts[sub.attempts.length - 1];
      host.append(
        listItem({
          href: `/school/grading/${sub.id}`,
          leading: h('div', { class: 'avatar sm' }, h('span', { text: nameOf(sub.studentId).slice(0, 1) })),
          title: nameOf(sub.studentId),
          subtitle: `${assignment.title} · تلاش ${latest?.number ?? 0}`,
          meta: relative(latest?.receivedAt ?? new Date().toISOString()),
          trailing: chip(latest?.state === 'late' ? 'دیرهنگام' : 'در انتظار', { tone: latest?.state === 'late' ? 'bad' : 'warn', glyph: '⏱' }),
        }),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  paint();
  return page;
};

/* ------------------------------------------------------------------ TE-06 */

export const gradingPage: PageRenderer = (ctx: RouteContext) => {
  const sub = app.get().submissions.find((s) => s.id === ctx.params.id);
  if (!sub) return missing('پاسخ پیدا نشد');
  if (!can('publishGrade')) return denied('انتشار نتیجه برای نقش شما مجاز نیست.');
  if (sub.studentId === state.get().personaId) return denied('تصحیح پاسخ خود، حتی با جمع نقش‌ها، مجاز نیست.');

  const assignment = assignmentById.get(sub.assignmentId)!;
  const room = classById.get(assignment.classId)!;
  const latest = sub.attempts[sub.attempts.length - 1];
  const rubricTotal = assignment.rubric.reduce((sum, r) => sum + r.points, 0);

  const page = h('div', { class: 'page' });
  page.append(pageHead('محیط ارزیابی', `${assignment.title} · ${nameOf(sub.studentId)}`, '/school/grading'));

  const scoreInput = field({ label: `نمره (۰ تا ${rubricTotal})`, type: 'number', value: '' });
  const feedback = textarea({ label: 'بازخورد قابل انتشار', placeholder: 'نقطه قوت و یک پیشنهاد مشخص…', rows: 4 });
  const privateNote = textarea({ label: 'یادداشت خصوصی ارزیاب', placeholder: 'این متن هرگز برای والد یا دانش‌آموز ارسال نمی‌شود.', rows: 2 });

  const error = h('div', { class: 'err' });
  error.style.display = 'none';

  const publish = h('button', { class: 'btn primary block', type: 'button', text: 'انتشار نتیجه' });
  publish.addEventListener('click', () => {
    const score = Number(scoreInput.input.value);
    if (!Number.isFinite(score) || score < 0 || score > rubricTotal) {
      error.textContent = `نمره باید عددی بین ۰ و ${rubricTotal} باشد.`;
      error.style.display = '';
      return;
    }
    const result = publishGrade(sub.id, { score, feedback: feedback.input.value, privateNote: privateNote.input.value, rubricTotal });
    toast(result.message, result.ok ? 'ok' : 'bad');
    if (result.ok) location.assign('/school/grading');
  });

  const returnBtn = h('button', { class: 'btn soft block', type: 'button', text: 'بازگرداندن برای اصلاح' });
  returnBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'بازگرداندن برای اصلاح',
      message: 'پاسخ به وضعیت «بازگشتی» می‌رود و به دانش‌آموز امکان تلاش تازه می‌دهد.',
      confirmLabel: 'بازگردان',
    });
    if (!ok) return;
    app.set((s) => ({
      submissions: s.submissions.map((item) => (item.id === sub.id ? { ...item, status: 'returned' } : item)),
    }));
    toast('برای اصلاح برگشت', 'ok');
  });

  const cols = h('div', { class: 'two-col reverse' });

  const question = card(
    {},
    sectionHead('صورت سؤال', chip(`نسخه ${assignment.version}`)),
    h('p', { class: 'small', text: assignment.body }),
    h('hr', { class: 'divider' }),
    sectionHead('معیار نمره'),
    ...assignment.rubric.map((row) => h('div', { class: 'row between small' }, h('span', { text: row.label }), h('span', { class: 'nums', text: String(row.points) }))),
    sectionHead('پیشینه تلاش‌ها'),
    ...sub.attempts.map((attempt) =>
      h('div', { class: 'row between small' }, h('span', { text: `تلاش ${attempt.number}` }), h('span', { class: 'muted', text: formatDate(attempt.createdAt, { short: true, time: true }) })),
    ),
  );

  const answer = h('div', { class: 'stack' });
  answer.append(
    card(
      { tint: true },
      sectionHead('پاسخ دانش‌آموز', chip(nameOf(sub.studentId))),
      latest?.fileName ? chip(latest.fileName, { tone: 'info', glyph: 'file' }) : null,
      h('p', { class: 'small', text: latest?.text || '— متنی ثبت نشده است.' }),
      h('p', { class: 'tiny muted', text: latest ? `دریافت ${formatDate(latest.receivedAt ?? latest.createdAt, { time: true })}` : '' }),
    ),
  );
  answer.append(card({}, scoreInput.wrap, feedback.wrap, privateNote.wrap, error, publish, returnBtn));
  answer.append(banner('پیشنهاد دستیار فقط کمک ارزیاب است و هرگز نمره رسمی تولید نمی‌کند.', { glyph: 'ai' }));

  cols.append(question, answer);
  page.append(cols);
  void personById;
  void room;
  return page;
};

function publishGrade(subId: string, opts: { score: number; feedback: string; privateNote?: string; rubricTotal: number }) {
  return publishGradeAction(subId, opts);
}