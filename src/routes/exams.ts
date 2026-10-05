/** ED-09 … ED-12, TE-07 … TE-09 — exams, attempt runner with receipt-based state, results. */

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
  rich,
  sectionHead,
  seg,
  stat,
  textarea,
} from '../ui/kit';
import { duration, formatDate, formatTime, relative } from '../core/format';
import { assignmentById, classById, classes, examById, exams, nameOf, submissions } from '../data/seed';
import { app } from '../data/app-state';
import { can, currentRole, session as state } from '../data/session';
import { confirmDialog, toast } from '../core/overlays';
import { denied, missing } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';

function myAttempt(examId: string, studentId: string) {
  return app.get().examAttempts.find((a) => a.examId === examId && a.studentId === studentId);
}

function totalPoints(examId: string): number {
  return (examById.get(examId)?.questions ?? []).reduce((sum, q) => sum + q.points, 0);
}

function windowState(exam: (typeof exams)[number]): { open: boolean; label: string; tone: 'ok' | 'warn' | 'bad' | 'info' } {
  const now = Date.now();
  const opens = +new Date(exam.opensAt);
  const closes = +new Date(exam.closesAt);
  if (now < opens) return { open: false, label: 'هنوز باز نشده', tone: 'info' };
  if (now > closes) return { open: false, label: 'بازه تمام شده', tone: 'plain' as 'info' };
  return { open: true, label: 'باز است', tone: 'ok' };
}

/* ------------------------------------------------------------------ ED-09 */

export const examListPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('آزمون‌ها', 'آزمون‌های آینده، در حال برگزاری و نتایج قبلی'));

  const groups = [
    { id: 'upcoming', label: 'آینده' },
    { id: 'current', label: 'در حال برگزاری' },
    { id: 'past', label: 'گذشته' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'current';
  const host = h('div', { class: 'stack' });

  const paint = () => {
    host.replaceChildren();
    const list = exams.filter((exam) => {
      const status = windowState(exam);
      if (filter === 'current') return status.open;
      if (filter === 'upcoming') return !status.open && +new Date(exam.opensAt) > Date.now();
      return !status.open && +new Date(exam.opensAt) <= Date.now();
    });
    if (!list.length) {
      host.append(empty({ glyph: 'quiz', title: 'آزمونی در این دسته نیست' }));
      return;
    }
    for (const exam of list) {
      const room = classById.get(exam.classId)!;
      const status = windowState(exam);
      const attempt = myAttempt(exam.id, state.get().personaId);
      host.append(
        card(
          {},
          h('div', { class: 'row between wrap' }, h('h3', { text: exam.title }), chip(status.label, { tone: status.tone, glyph: status.open ? '●' : '◷' })),
          h('p', { class: 'small muted', text: `${room.name} · موضوع ${exam.topic} · ${exam.durationMin} دقیقه · ${exam.questions.length} سؤال` }),
          h(
            'div',
            { class: 'row wrap', style: { gap: '6px' } },
            chip(`بازه ${relative(exam.opensAt)} تا ${relative(exam.closesAt)}`, { glyph: 'calendar' }),
            chip(`${exam.maxAttempts} تلاش`, { glyph: 'refresh' }),
            chip(exam.resultsPublished ? 'نتیجه منتشر شده' : 'منتظر انتشار نتیجه', { tone: exam.resultsPublished ? 'ok' : 'warn' }),
          ),
          attempt ? banner('تلاش شما ثبت شده است؛ ادامه از همان نسخه و ترتیب سؤال.', { tone: 'info', glyph: 'info' }) : null,
          h(
            'div',
            { class: 'btn-row' },
            h('a', { class: 'btn soft sm', href: `/school/exams/${exam.id}`, text: attempt ? 'ادامه تلاش' : 'قواعد آزمون' }),
            currentRole() === 'teacher' ? h('a', { class: 'btn ghost sm', href: `/school/exams/${exam.id}/manage`, text: 'مدیریت برگزاری' }) : null,
            exam.resultsPublished && attempt?.released ? h('a', { class: 'btn ghost sm', href: `/school/exams/${exam.id}/result`, text: 'نتیجه' }) : null,
          ),
        ),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  if (can('authorContent')) page.append(h('a', { class: 'btn soft block', href: '/school/exams/new', text: 'آزمون تازه' }));
  paint();
  return page;
};

/* ------------------------------------------------------------------ ED-10 */

export const examRulesPage: PageRenderer = (ctx: RouteContext) => {
  const exam = examById.get(ctx.params.id);
  if (!exam) return missing('آزمون پیدا نشد');
  const room = classById.get(exam.classId)!;
  const role = currentRole();
  const status = windowState(exam);
  const attempt = myAttempt(exam.id, state.get().personaId);

  const page = h('div', { class: 'page' });
  page.append(pageHead(exam.title, `${room.name} · ${exam.topic}`, '/school/exams'));

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(
    card(
      { tint: true },
      sectionHead('شرایط آزمون'),
      kvGrid([
        ['مدت', `${exam.durationMin} دقیقه`],
        ['سؤال‌ها', `${exam.questions.length} سؤال / ${totalPoints(exam.id)} نمره`],
        ['تلاش مجاز', `${exam.maxAttempts}`],
        ['بازه', `${formatDate(exam.opensAt, { short: true })} تا ${formatDate(exam.closesAt, { short: true })}`],
        ['کمک AI', 'داخل آزمون فعال نیست'],
        ['انتشار نتیجه', exam.releasePolicy === 'auto' ? 'پس از پایان بازه' : 'پس از تصحیح معلم'],
      ]),
    ),
  );

  if (role === 'guardian') {
    main.append(banner('والد قواعد آزمون را می‌بیند اما شروع آزمون به‌جای دانش‌آموز انجام نمی‌شود.', { glyph: 'eye' }));
  } else if (role === 'teacher') {
    main.append(h('a', { class: 'btn soft block', href: `/school/exams/${exam.id}/manage`, text: 'مدیریت برگزاری' }));
  } else {
    main.append(
      card(
        {},
        attempt && attempt.finishedAt
          ? h('div', { class: 'stack sm' }, h('p', { class: 'small muted', text: 'تلاش شما پایان یافته و در انتظار تصحیح است.' }), h('a', { class: 'btn soft block', href: `/school/exams/${exam.id}/result`, text: 'دیدن رسید' }))
          : attempt
            ? h('div', { class: 'stack sm' }, h('p', { class: 'small muted', text: 'یک تلاش فعال دارید؛ ادامه از همان نسخه انجام می‌شود.' }), h('a', { class: 'btn primary block', href: `/school/exams/${exam.id}/attempt`, text: 'ادامه تلاش' }))
            : h(
                'div',
                { class: 'stack sm' },
                banner('با شروع آزمون، یک تلاش روی سرور ساخته می‌شود. دوبار زدن دکمه، دو تلاش نمی‌سازد.', { glyph: 'shield' }),
                h('button', {
                  class: 'btn primary block',
                  type: 'button',
                  text: status.open ? 'تأیید و شروع آزمون' : 'هنوز بازه باز نیست',
                  'aria-disabled': String(!status.open),
                  on: {
                    click: async () => {
                      if (!status.open) return;
                      const ok = await confirmDialog({
                        title: 'شروع آزمون',
                        message: 'پس از شروع، زمان‌سنج متوقف نمی‌شود و خروج از صفحه تلاش را لغو نمی‌کند.',
                        confirmLabel: 'شروع کن',
                      });
                      if (!ok) return;
                      const existing = app.get().examAttempts.find((a) => a.examId === exam.id && a.studentId === state.get().personaId);
                      if (!existing) {
                        app.set((s) => ({
                          examAttempts: [
                            ...s.examAttempts,
                            { id: `ea-${exam.id}-${state.get().personaId}`, examId: exam.id, studentId: state.get().personaId, startedAt: new Date().toISOString(), answers: {}, pending: {} },
                          ],
                        }));
                      }
                      location.assign(`/school/exams/${exam.id}/attempt`);
                    },
                  },
                }),
              ),
      ),
    );
  }

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('قبل از شروع'),
      h(
        'ul',
        { class: 'stack sm small muted' },
        h('li', { text: 'پاسخ‌های تأییدشده و پاسخ‌های در انتظار از هم جدا نمایش داده می‌شوند.' }),
        h('li', { text: 'بستن و باز کردن صفحه، ترتیب سؤال‌ها و مهلت را تغییر نمی‌دهد.' }),
        h('li', { text: 'پاسخ دیرهنگامِ ذخیره‌نشده خودکار رسمی نمی‌شود.' }),
      ),
    ),
  );
  side.append(banner('داشتن نمره تستی محاسبه‌شده به‌معنای مجاز بودن نمایش آن نیست.', { glyph: 'eye' }));

  cols.append(main, side);
  page.append(cols);
  return page;
};

/* ------------------------------------------------------------------ ED-11 */

export const examAttemptPage: PageRenderer = (ctx: RouteContext) => {
  const exam = examById.get(ctx.params.id);
  if (!exam) return missing('آزمون پیدا نشد');
  if (currentRole() !== 'student') return denied('شرکت در آزمون فقط برای دانش‌آموزِ صاحب تلاش است.');
  const record = myAttempt(exam.id, state.get().personaId);
  if (!record) return denied('ابتدا از صفحه قواعد آزمون، تلاش را روی سرور ایجاد کنید.');
  // Stable, narrowed aliases for the closures below.
  const examData = exam;
  const attemptRecord = record;
  if (record.finishedAt) {
    const page = h('div', { class: 'page' });
    page.append(pageHead('آزمون تمام شده', exam.title, '/school/exams'));
    page.append(banner('این تلاش پایان یافته است. رسید شامل زمان نهایی‌شدن و پاسخ‌های پذیرفته‌شده است.', { tone: 'ok', glyph: 'check' }));
    page.append(h('a', { class: 'btn primary block', href: `/school/exams/${exam.id}/result`, text: 'دیدن رسید' }));
    return page;
  }

  const deadline = +new Date(attemptRecord.startedAt) + examData.durationMin * 60_000;
  let index = 0;
  const answers: Record<string, number> = { ...record.answers };

  const page = h('div', { class: 'page' });
  const head = h('div', { class: 'row between', style: { position: 'sticky', top: 'calc(var(--header-h) + 8px)', zIndex: '10' } });
  const timer = h('div', { class: 'timer nums', text: duration(deadline - Date.now()) });
  head.append(h('div', { class: 'grow' }, h('h1', { style: { fontSize: '1.1rem' }, text: exam.title }), h('p', { class: 'tiny muted', text: `سؤال ${index + 1} از ${exam.questions.length}` })), timer);
  page.append(head);

  const dots = h('div', { class: 'q-dots' });
  const questionHost = h('div', { class: 'stack' });

  const paintDots = () => {
    dots.replaceChildren();
    exam.questions.forEach((question, i) => {
      const dot = h('button', { class: `q-dot ${answers[question.id] !== undefined ? 'answered' : ''} ${i === index ? 'active' : ''}`, type: 'button', text: String(i + 1), 'aria-label': `سؤال ${i + 1}` });
      dot.addEventListener('click', () => {
        index = i;
        paintQuestion();
      });
      dots.append(dot);
    });
  };

  const paintQuestion = () => {
    const question = exam.questions[index];
    questionHost.replaceChildren();
    const cardEl = h('div', { class: 'q-card active' });
    cardEl.append(h('div', { class: 'row between' }, h('span', { class: 'chip info', text: `${question.points} نمره` }), h('span', { class: 'tiny muted', text: `سؤال ${index + 1} از ${exam.questions.length}` })));
    cardEl.append(h('h3', { style: { fontSize: '1.05rem' } }, rich(question.prompt)));
    question.options.forEach((option, optionIndex) => {
      const btn = h('button', { class: 'opt', type: 'button' });
      btn.setAttribute('aria-pressed', String(answers[question.id] === optionIndex));
      btn.append(h('span', { class: 'mark', text: ['الف', 'ب', 'پ', 'ت'][optionIndex] ?? String(optionIndex + 1) }));
      btn.append(h('span', { class: 'grow' }, rich(option)));
      btn.addEventListener('click', () => {
        answers[question.id] = optionIndex;
        paintQuestion();
        paintDots();
        sync();
      });
      cardEl.append(btn);
    });
    questionHost.append(cardEl);

    const nav = h('div', { class: 'btn-row' });
    if (index > 0) {
      const prev = h('button', { class: 'btn soft', type: 'button', text: 'سؤال قبلی' });
      prev.addEventListener('click', () => {
        index -= 1;
        paintQuestion();
        paintDots();
      });
      nav.append(prev);
    }
    if (index < exam.questions.length - 1) {
      const next = h('button', { class: 'btn primary grow', type: 'button', text: 'سؤال بعدی' });
      next.addEventListener('click', () => {
        index += 1;
        paintQuestion();
        paintDots();
      });
      nav.append(next);
    } else {
      const finish = h('button', { class: 'btn primary grow', type: 'button', text: 'پایان تلاش' });
      finish.addEventListener('click', () => void finishAttempt());
      nav.append(finish);
    }
    questionHost.append(nav);

    const pending = exam.questions.filter((q) => answers[q.id] === undefined);
    if (pending.length) {
      questionHost.append(
        banner(`${pending.length} سؤال بی‌پاسخ مانده است. با پایان زودهنگام، این سؤال‌ها بدون پاسخ ثبت می‌شوند.`, { tone: 'warn', glyph: 'alert' }),
      );
    }
  };

  const sync = () => {
    const unanswered = examData.questions.filter((q) => answers[q.id] === undefined);
    app.set((s) => ({
      examAttempts: s.examAttempts.map((a) =>
        a.id === attemptRecord.id ? { ...a, answers: { ...answers }, pending: Object.fromEntries(unanswered.map((q) => [q.id, 0])) } : a,
      ),
    }));
  };

  async function finishAttempt(): Promise<void> {
    const unanswered = examData.questions.filter((q) => answers[q.id] === undefined);
    const ok = await confirmDialog({
      title: 'پایان دادن به تلاش',
      message: unanswered.length ? `${unanswered.length} سؤال بی‌پاسخ می‌ماند و پایان تلاش قطعی می‌شود.` : 'پایان تلاش قطعی است و امکان بازگشت وجود ندارد.',
      confirmLabel: 'پایان تلاش',
    });
    if (!ok) return;
    const autoScore = examData.questions.reduce((sum, q) => (answers[q.id] === q.answer ? sum + q.points : sum), 0);
    app.set((s) => ({
      examAttempts: s.examAttempts.map((a) => (a.id === attemptRecord.id ? { ...a, answers, pending: {}, finishedAt: new Date().toISOString(), autoScore } : a)),
    }));
    clearInterval(ticker);
    location.assign(`/school/exams/${examData.id}/result`);
  }

  const ticker = setInterval(() => {
    const remaining = deadline - Date.now();
    timer.textContent = duration(remaining);
    timer.classList.toggle('low', remaining < 120_000);
    if (remaining <= 0) void finishAttempt();
  }, 1000);

  page.append(dots, questionHost);
  page.append(
    banner('دستیار داخلی در این آزمون پاسخ نهایی سؤال را ارائه نمی‌دهد. خروج از این صفحه تلاش را لغو نمی‌کند.', { glyph: 'ai' }),
  );

  paintQuestion();
  paintDots();
  return page;
};

/* ------------------------------------------------------------------ ED-12 */

export const examResultPage: PageRenderer = (ctx: RouteContext) => {
  const exam = examById.get(ctx.params.id);
  if (!exam) return missing('آزمون پیدا نشد');
  const record = myAttempt(exam.id, state.get().personaId);
  if (!record) return missing('تلاشی برای این آزمون ثبت نشده است');
  const total = totalPoints(exam.id);
  const released = exam.resultsPublished && record.released;

  const page = h('div', { class: 'page' });
  page.append(pageHead('رسید آزمون', `${exam.title} · ${classById.get(exam.classId)?.name ?? ''}`, '/school/exams'));

  const cols = h('div', { class: 'two-col' });
  const main = h('div', { class: 'stack' });
  main.append(
    card(
      { tint: true },
      sectionHead('رسید تلاش'),
      kvGrid([
        ['زمان شروع', formatDate(record.startedAt, { time: true })],
        ['زمان پایان', record.finishedAt ? formatDate(record.finishedAt, { time: true }) : '—'],
        ['پاسخ‌های پذیرفته‌شده', `${Object.keys(record.answers).length} از ${exam.questions.length}`],
        ['وضعیت تصحیح', record.finishedAt ? (released ? 'منتشر شده' : 'در انتظار تصحیح') : 'در حال انجام'],
      ]),
    ),
  );

  if (!released) {
    main.append(
      banner(
        record.autoScore !== undefined
          ? 'نمره تستی محاسبه شده، اما انتشار نتیجه طبق سیاست آزمون به تأیید معلم نیاز دارد.'
          : 'تلاش ثبت شده و در انتظار تصحیح است.',
        { tone: 'warn', glyph: 'lock' },
      ),
    );
  } else {
    main.append(
      card(
        {},
        sectionHead('نتیجه منتشرشده'),
        h('div', { class: 'row' }, h('div', { class: 'stat' }, h('span', { class: 'v nums', text: `${record.autoScore ?? 0}` }), h('span', { class: 'k', text: `از ${total}` }))),
        h('p', { class: 'small muted', text: 'پاسخ‌نامه مجاز بر پایه سیاست انتشار همین آزمون نمایش داده می‌شود.' }),
        h(
          'div',
          { class: 'stack sm' },
          ...exam.questions.map((question, i) =>
            h(
              'div',
              { class: 'row between small' },
              h('span', { class: 'truncate grow', text: `${i + 1}. ${question.prompt}` }),
              chip(record.answers[question.id] === question.answer ? 'درست' : record.answers[question.id] === undefined ? 'بی‌پاسخ' : 'نادرست', { tone: record.answers[question.id] === question.answer ? 'ok' : 'bad', glyph: record.answers[question.id] === question.answer ? '✓' : '×' }),
            ),
          ),
        ),
        h('a', { class: 'btn soft block', href: '/school/progress', text: 'دیدن تحلیل عملکرد' }),
      ),
    );
  }

  const side = h('div', { class: 'stack' });
  side.append(
    card(
      {},
      sectionHead('گام بعدی'),
      h('p', { class: 'small muted', text: 'کمک آموزشی پس از آزمون با پاسخ دادن به سؤال آزمون یکی نیست؛ یک تمرین جداگانه است.' }),
      h('a', { class: 'btn soft block', href: '/ai/practice', text: 'تمرین پیشنهادی' }),
      h('a', { class: 'btn ghost block', href: '/profile/support', text: 'ثبت مشکل آزمون' }),
    ),
  );

  cols.append(main, side);
  page.append(cols);
  void assignmentById;
  void nameOf;
  void submissions;
  void stat;
  return page;
};

/* ------------------------------------------------------------------ TE-07 */

export const examEditorPage: PageRenderer = () => {
  if (!can('authorContent')) return denied('ساخت آزمون در نقش شما مجاز نیست.');
  const page = h('div', { class: 'page' });
  page.append(pageHead('ساخت آزمون', 'سؤال‌ها، کلید، زمان و سیاست انتشار'));

  const roomSelect = h('select', { class: 'select', 'aria-label': 'کلاس' });
  for (const room of classes) roomSelect.append(h('option', { value: room.id, text: room.name }));
  const title = field({ label: 'عنوان آزمون', placeholder: 'آزمون میان‌ترم' });
  const durationField = field({ label: 'مدت (دقیقه)', type: 'number', value: '25' });
  const opens = field({ label: 'بازه شروع', type: 'datetime-local' });
  const closes = field({ label: 'بازه پایان', type: 'datetime-local' });

  let key: number | null = null;
  const keyRow = h('div', { class: 'row wrap', style: { gap: '6px' } }, chip('کلید محرمانه هنوز وارد نشده', { tone: 'warn', glyph: 'lock' }));
  const setKey = h('button', { class: 'btn soft sm', type: 'button', text: 'ثبت کلید' });
  setKey.addEventListener('click', () => {
    key = 0;
    keyRow.replaceChildren(chip('کلید محرمانه ثبت شد — در پیش‌نمایش دانش‌آموز نمایش داده نمی‌شود', { tone: 'ok', glyph: 'lock' }));
  });

  const questions = card(
    {},
    sectionHead('سؤال‌ها', chip('۱')),
    h('div', { class: 'field' }, h('label', { class: 'label', text: 'صورت سؤال' }), textarea({ label: 'متن', rows: 2, placeholder: 'ریشه‌های x² − 5x + 6 = 0 کدام‌اند؟' }).wrap),
    h('div', { class: 'field' }, h('label', { class: 'label', text: 'گزینه‌ها (هر خط یک گزینه)' }), textarea({ label: 'گزینه‌ها', rows: 4, placeholder: '۱ و ۶\n۲ و ۳\n−۲ و −۳' }).wrap),
    h('div', { class: 'grid-2' }, durationField.wrap, opens.wrap),
    closes.wrap,
    h('div', { class: 'row wrap' }, h('span', { class: 'label', text: 'کلید محرمانه:' }), keyRow, setKey),
  );

  const preview = h('div', { class: 'card tint stack sm' });
  const paintPreview = () => {
    preview.replaceChildren(
      h('div', { class: 'row between' }, h('h3', { text: title.input.value || 'پیش‌نمایش آزمون' }), chip('همان داده مجاز کلاینت دانش‌آموز', { glyph: 'eye' })),
      h('p', { class: 'small muted', text: 'کلید پاسخ در پیش‌نمایش وجود ندارد؛ پنهان‌سازی فقط نمایشی نیست.' }),
    );
  };
  title.input.addEventListener('input', paintPreview);
  paintPreview();

  const publish = h('button', { class: 'btn primary block', type: 'button', text: 'انتشار نسخه آزمون' });
  publish.addEventListener('click', async () => {
    if (!title.input.value.trim()) {
      toast('عنوان لازم است', 'bad');
      return;
    }
    const ok = await confirmDialog({ title: 'انتشار آزمون', message: 'پس از انتشار، نسخه آزمون برای تغییر سؤال قفل می‌شود و تغییر بی‌ردپا ممکن نیست.', confirmLabel: 'انتشار' });
    if (!ok) return;
    toast('آزمون (نمایشی) منتشر شد', 'ok');
  });

  page.append(card({}, h('div', { class: 'field' }, h('label', { class: 'label', text: 'کلاس' }), roomSelect), title.wrap), questions, sectionHead('پیش‌نمایش'), preview, publish);
  return page;
};

/* ------------------------------------------------------------------ TE-08 */

export const examManagePage: PageRenderer = (ctx: RouteContext) => {
  const exam = examById.get(ctx.params.id);
  if (!exam) return missing('آزمون پیدا نشد');
  if (!can('authorContent')) return denied('مدیریت برگزاری در نقش شما مجاز نیست.');
  const room = classById.get(exam.classId)!;

  const attempts = app.get().examAttempts.filter((a) => a.examId === exam.id);
  const notStarted = room.studentIds.length - attempts.length;

  const page = h('div', { class: 'page' });
  page.append(pageHead('مدیریت برگزاری', exam.title, '/school/exams'));

  page.append(
    card(
      { tint: true },
      kvGrid([
        ['مخاطبان', `${room.studentIds.length}`],
        ['شروع کرده‌اند', `${attempts.length}`],
        ['تحویل داده', `${attempts.filter((a) => a.finishedAt).length}`],
        ['بدون تلاش', `${Math.max(0, notStarted)}`],
        ['بازه', `${formatDate(exam.opensAt, { short: true })} تا ${formatDate(exam.closesAt, { short: true })}`],
        ['وضعیت انتشار نتیجه', exam.resultsPublished ? 'منتشر شده' : 'منتظر'],
      ]),
      banner('این صفحه وضعیت شروع و تحویل را نشان می‌دهد؛ صفحه، دوربین یا چت خصوصی دانش‌آموز نمایش داده نمی‌شود.', { glyph: 'eye' }),
    ),
  );

  const release = h('button', { class: 'btn primary block', type: 'button', text: 'انتشار نتایج' });
  release.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'انتشار نتایج', message: 'پس از انتشار، دانش‌آموز و والدِ همان فرزند نتیجه را می‌بینند.', confirmLabel: 'انتشار' });
    if (!ok) return;
    app.set((s) => ({
      examAttempts: s.examAttempts.map((a) => (a.examId === exam.id ? { ...a, released: true } : a)),
    }));
    toast('نتایج منتشر شد (نمایشی)', 'ok');
  });

  page.append(
    card(
      {},
      sectionHead('تلاش‌ها'),
      ...(attempts.length
        ? attempts.map((a) =>
            listItem({
              href: `/school/exams/${exam.id}/review`,
              leading: h('div', { class: 'avatar sm' }, h('span', { text: nameOf(a.studentId).slice(0, 1) })),
              title: nameOf(a.studentId),
              subtitle: a.finishedAt ? `پایان ${formatTime(a.finishedAt)}` : 'در حال انجام',
              meta: a.autoScore !== undefined ? `${a.autoScore} از ${totalPoints(exam.id)}` : '',
              trailing: chip(a.released ? 'منتشر شده' : 'منتظر انتشار', { tone: a.released ? 'ok' : 'warn' }),
            }),
          )
        : [h('p', { class: 'small muted', text: 'هنوز تلاشی ثبت نشده است.' })]),
      h('a', { class: 'btn soft block', href: `/school/exams/${exam.id}/review`, text: 'صفحه تصحیح' }),
      release,
    ),
  );

  page.append(
    card(
      {},
      sectionHead('اختلال و استثنا'),
      h('p', { class: 'small muted', text: 'ثبت اختلال، تعریف بازه جبرانی و ابطال تلاش تصمیم انسانی است و باید سابقه اجرا داشته باشد.' }),
      h('button', { class: 'btn soft block', type: 'button', text: 'ثبت اختلال', on: { click: () => toast('در نسخه نمایشی ثبت نشد', 'info') } }),
    ),
  );
  return page;
};

/* ------------------------------------------------------------------ TE-09 */

export const examReviewPage: PageRenderer = (ctx: RouteContext) => {
  const exam = examById.get(ctx.params.id);
  if (!exam) return missing('آزمون پیدا نشد');
  if (!can('publishGrade')) return denied('تصحیح آزمون در نقش شما مجاز نیست.');
  const attempts = app.get().examAttempts.filter((a) => a.examId === exam.id);
  const total = totalPoints(exam.id);

  const page = h('div', { class: 'page' });
  page.append(pageHead('تصحیح آزمون', `${exam.title} · ${attempts.length} تلاش`, `/school/exams/${exam.id}/manage`));

  if (!attempts.length) {
    page.append(empty({ glyph: 'quiz', title: 'تلاشی برای تصحیح نیست' }));
    return page;
  }

  for (const attempt of attempts) {
    const autoScore = exam.questions.reduce((sum, q) => (attempt.answers[q.id] === q.answer ? sum + q.points : sum), 0);
    const cardEl = card(
      {},
      h(
        'div',
        { class: 'row between wrap' },
        h('div', { class: 'row' }, h('div', { class: 'avatar sm' }, h('span', { text: nameOf(attempt.studentId).slice(0, 1) })), h('h3', { text: nameOf(attempt.studentId) })),
        h('div', { class: 'row', style: { gap: '6px' } }, chip(`تستی ${autoScore} از ${total}`, { tone: 'info', glyph: 'gauge' }), chip(attempt.released ? 'منتشر شده' : 'منتظر انتشار', { tone: attempt.released ? 'ok' : 'warn' })),
      ),
      ...exam.questions.map((question, i) => {
        const given = attempt.answers[question.id];
        const correct = given === question.answer;
        return h(
          'div',
          { class: 'stack sm', style: { paddingBlock: '10px', borderBlockEnd: '1px solid var(--line)' } },
          h('div', { class: 'row between' }, h('span', { class: 'small grow', text: `${i + 1}. ${question.prompt}` }), chip(given === undefined ? 'بی‌پاسخ' : correct ? 'درست' : 'نادرست', { tone: given === undefined ? 'plain' : correct ? 'ok' : 'bad', glyph: correct ? '✓' : '×' })),
          h('p', { class: 'tiny muted', text: `پاسخ دانش‌آموز: ${given === undefined ? '—' : question.options[given]} · کلید: ${question.options[question.answer]}` }),
        );
      }),
      h('button', {
        class: 'btn soft block',
        type: 'button',
        text: 'اصلاح نمره با دلیل',
        on: {
          click: async () => {
            const ok = await confirmDialog({ title: 'اصلاح نمره', message: 'نمره تازه جایگزین نسخه قبلی می‌شود و گزارش‌ها زمان به‌روزرسانی دارند.', confirmLabel: 'ثبت اصلاح', requireText: { label: 'دلیل اصلاح نمره' } });
            if (ok) toast('اصلاح نمره ثبت شد (نمایشی)', 'ok');
          },
        },
      }),
    );
    page.append(cardEl);
  }
  void seg;
  return page;
};