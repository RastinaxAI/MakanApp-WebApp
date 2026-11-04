import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect, request } from '@playwright/test';
import { entries, id, ids } from './design-atlas-manifest.mjs';
import { make } from '../tests/fixtures/backend/state.mjs';
process.chdir(path.resolve(fileURLToPath(new URL('..', import.meta.url))));
const origin = 'http://127.0.0.1:3140',
  fixture = 'http://127.0.0.1:3460',
  folder = 'output/review/design-atlas',
  reportFile = 'tmp/design-atlas/captures.json';
const from = Number(process.argv[2] ?? 1),
  to = Number(process.argv[3] ?? entries.length),
  only = process.argv[4]?.split(',');
await fs.mkdir(folder, { recursive: true });
await fs.mkdir('tmp/design-atlas/records', { recursive: true });
let report = await fs
  .readFile(reportFile, 'utf8')
  .then(JSON.parse)
  .catch(() => ({
    createdAtUtc: new Date().toISOString(),
    environment: 'isolated local fixture',
    origin,
    syntheticData: true,
    views: [],
  }));
for (const file of await fs.readdir('tmp/design-atlas/records')) {
  if (file.endsWith('.json')) {
    const value = await fs.readFile('tmp/design-atlas/records/' + file, 'utf8').then(JSON.parse);
    report.views = report.views.filter((row) => row.id !== value.id);
    report.views.push(value);
  }
}
const backend = await request.newContext({ baseURL: fixture });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const png = await fs.readFile('public/icons/makan-512.png'),
  pdf = {
    name: 'جزوه-نمونه.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-design-atlas'),
  };
async function fixturePost(name, body = {}) {
  const r = await backend.post('/__test__/' + name, { data: body });
  if (!r.ok()) throw Error('Fixture setup ' + name + ' ' + r.status());
}
async function login(context, role, school) {
  if (role === 'Public') return;
  const phone = {
    Student: '09120000101',
    Teacher: '09120000102',
    Parent: '09120000103',
    Manager: '09120000104',
    Personal: '09120000199',
  }[role];
  const headers = { Origin: origin };
  const c = await context.request.post(origin + '/api/client/auth/challenge', {
    headers,
    data: { phoneNumber: phone },
  });
  const v = await context.request.post(origin + '/api/client/auth/verify', {
    headers,
    data: {
      phoneNumber: phone,
      challengeId: (await c.json()).challengeId,
      code: '123456',
      deviceName: 'Design atlas isolated browser',
    },
  });
  if (v.status() !== 200) throw Error('Fixture login ' + v.status());
  if (school && role !== 'Personal') {
    const session = await (await context.request.get(origin + '/api/client/session')).json();
    const spaces = await (
      await context.request.get(origin + '/api/client/backend/api/v1/workspaces/me', {
        headers: { 'X-Makan-Context': session.revision },
      })
    ).json();
    const w = spaces.find((row) => row.role === role);
    const r = await context.request.post(origin + '/api/client/backend/api/v1/workspaces/select', {
      headers: { ...headers, 'X-Makan-Context': session.revision },
      data: { workspaceType: 'Organization', membershipId: w.membershipId, role: w.role },
    });
    if (!r.ok()) throw Error('Fixture workspace ' + r.status());
  }
}
async function call(context, url, body, method) {
  const session = await (await context.request.get(origin + '/api/client/session')).json();
  const r = await context.request.fetch(origin + '/api/client/backend' + url, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { Origin: origin, 'X-Makan-Context': session.revision },
    ...(body === undefined ? {} : { data: body }),
  });
  const value = await r.json().catch(() => null);
  if (!r.ok()) throw Error('Setup API ' + url + ' ' + r.status());
  return value;
}
async function actor(role, work) {
  const ctx = await browser.newContext();
  try {
    await login(ctx, role, true);
    return await work(ctx);
  } finally {
    await ctx.close();
  }
}
const b = (page, name) => page.getByRole('button', { name, exact: typeof name === 'string' }),
  field = (page, name) => page.getByLabel(name, { exact: true });
async function settle(page) {
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.bootstrap').waitFor({ state: 'hidden', timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  let old = -1;
  for (let n = 0; n < 20; n++) {
    await page.waitForTimeout(100);
    const count = await page.locator('main [class*="skeleton"], .bootstrap').count();
    if (count === 0 && old === 0) break;
    old = count;
  }
  await page.waitForTimeout(220);
}
async function evalPrepare(context, release = false) {
  const url = `/api/v1/academic/submission-attempts/${ids.attempt}/evaluation`;
  const value = await call(
    context,
    url,
    {
      score: 17.5,
      learnerFeedback: 'پاسخ شما با روش درست حل شده است.',
      guardianVisibleFeedback: 'روند یادگیری مناسب است.',
      teacherPrivateNote: 'یادداشت داخلی ارزیاب برای بازبینی',
      expectedRowVersion: null,
    },
    'PUT',
  );
  if (release) await call(context, url + '/release', { expectedRowVersion: value.rowVersion });
  return value;
}
async function gradePrepare(context, complete = false, release = false) {
  const base = `/api/v1/academic/exam-attempts/${ids.examAttempt}`;
  let grade = await call(context, base + '/grading', {});
  if (complete) {
    grade = await call(
      context,
      base + '/grading/questions/' + ids.question,
      {
        awardedScore: 18,
        learnerFeedback: 'روش حل مناسب است.',
        evaluatorPrivateNote: 'یادداشت داخلی تصحیح',
        expectedGradeRowVersion: grade.rowVersion,
      },
      'PATCH',
    );
    grade = await call(context, base + '/grading/complete', {
      learnerFeedback: 'نتیجهٔ نهایی آزمون',
      guardianVisibleFeedback: 'نتیجهٔ منتشرشده برای والد',
      evaluatorPrivateNote: 'یادداشت ارزیاب',
      expectedGradeRowVersion: grade.rowVersion,
    });
    if (release)
      await call(context, base + '/grade/release', {
        clientOperationId: crypto.randomUUID(),
        expectedGradeRowVersion: grade.rowVersion,
      });
  }
  return grade;
}
async function createExam(context) {
  const command = make('CreateExamDraftCommand', {
    title: 'آزمون فصل معادله‌ها',
    description: 'آزمون نمونه برای نمایش رابط محصول',
    availableFromUtc: '2026-11-01T06:30:00Z',
    availableUntilUtc: '2026-12-01T06:30:00Z',
    durationMinutes: 30,
    maxAttempts: 2,
    maxScore: 20,
  });
  return call(context, `/api/v1/academic/classes/${ids.class}/exams`, command);
}
async function createLesson(page) {
  await field(page, 'عنوان درس و جزوه').fill('حل معادله‌های خطی');
  await field(page, 'متن درس').fill(
    'با انجام عمل یکسان روی دو طرف معادله، مقدار مجهول را پیدا می‌کنیم. مثال: دو برابر یک عدد به‌علاوهٔ چهار برابر دوازده است.',
  );
  await b(page, 'ذخیرهٔ پیش‌نویس').click();
  await page.waitForURL(/\/lessons\/.+\/review$/);
}
async function selectAssistantTab(page, name) {
  const tab = page.getByRole('tab', { name, exact: true });
  if (await tab.isVisible()) await tab.click();
}
async function action(page, context, entry) {
  const name = entry.action;
  if (!name) return;
  if (name === 'evaluation-correction') return;
  if (name === 'grading-correction') return;
  if (name === 'attachment-options') {
    await b(page, 'افزودن پیوست').click();
    return;
  }
  if (name === 'leave-confirm') {
    await b(page, 'ترک گروه').click();
    return;
  }
  if (name.startsWith('source-') && name.endsWith('-confirm')) {
    await field(page, 'دلیل تغییر').fill('بازبینی و تأیید در محیط نمونه');
    await b(
      page,
      {
        'source-publish-confirm': 'انتشار منبع',
        'source-archive-confirm': 'بایگانی منبع',
        'source-visibility-confirm': 'عمومی‌کردن منبع',
      }[name],
    ).click();
    return;
  }
  if (name === 'quiet-hours') {
    await field(page, 'ساعت سکوت').check();
    return;
  }
  if (name === 'exam-descriptive') {
    await b(page, 'شروع آزمون').click();
    await field(page, 'انتخاب پیوست پاسخ آزمون').setInputFiles(pdf);
    await page.getByRole('button', { name: /دریافت جزوه/ }).waitFor({ state: 'visible' });
    return;
  }
  if (name === 'install-help') {
    await b(page, 'نصب پنل روی دستگاه').click();
    return;
  }
  if (name === 'otp') {
    await field(page, 'شماره همراه').fill('09120000101');
    await b(page, 'دریافت کد ورود').click();
    await expect(page.getByRole('heading', { name: 'کد تأیید را وارد کنید' })).toBeVisible();
    return;
  }
  if (name === 'workspace-dialog') {
    const button = page.getByRole('button', { name: 'ماکان؛ تغییر نقش و فضای کار', exact: true });
    if (await button.isVisible()) await button.click();
    else {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await b(page, 'ماکان؛ انتخاب نقش و فضای کار').click();
    }
    return;
  }
  if (name === 'profile-calendar') {
    await page.getByRole('button', { name: 'باز کردن تقویم شمسی' }).first().click();
    return;
  }
  if (name === 'profile-photo') {
    await field(page, 'انتخاب عکس پروفایل').setInputFiles({
      name: 'عکس-نمونه.png',
      mimeType: 'image/png',
      buffer: png,
    });
    return;
  }
  if (name === 'profile-save-error') {
    await field(page, 'نام').fill('نام ویرایش‌شده');
    await fixturePost('fault', { path: '/profile', method: 'PATCH', status: 503 });
    await b(page, 'ثبت تغییرات').click();
    return;
  }
  if (name === 'device-detail') {
    await page.locator('main a[href*="/devices/"]').first().click();
    return;
  }
  if (name === 'logout-dialog') {
    await b(page, 'خروج از این دستگاه').click();
    return;
  }
  if (name.startsWith('contact-')) {
    if (name === 'contact-add') {
      await b(page, 'مخاطب جدید').click();
      return;
    }
    if (name === 'contact-search') {
      await b(page, 'جستجوی افراد').click();
      await field(page, 'عبارت جستجوی مخاطب').fill('maryam');
      await page.getByRole('main').getByRole('button', { name: 'جستجو', exact: true }).click();
      return;
    }
    if (name === 'contact-edit') {
      await page
        .getByRole('button', { name: /^مدیریت / })
        .first()
        .click();
      return;
    }
  }
  if (name === 'inbox-menu') {
    await b(page, 'ایجاد گفت‌وگو یا مخاطب').click();
    return;
  }
  if (['message-menu', 'message-reply'].includes(name)) {
    await page
      .getByRole('button', { name: /گزینه‌های پیام/ })
      .first()
      .click();
    if (name === 'message-reply') {
      await page.getByRole('menuitem', { name: 'پاسخ به پیام', exact: true }).click();
      await field(page, 'متن پیام').fill('پاسخ در حال آماده‌سازی به پیام انتخاب‌شده');
    }
    return;
  }
  if (name === 'message-file') {
    await field(page, 'انتخاب فایل از دستگاه').setInputFiles(pdf);
    return;
  }
  if (name === 'member-add') {
    await b(page, 'افزودن عضو').click();
    return;
  }
  if (name === 'member-manage') {
    await b(page, 'صفحهٔ بعد').click();
    await page
      .getByRole('button', { name: /^مدیریت عضو/ })
      .first()
      .click();
    return;
  }
  if (name === 'group-photo') {
    await field(page, 'انتخاب تصویر جدید').setInputFiles({
      name: 'تصویر-گفتگو.png',
      mimeType: 'image/png',
      buffer: png,
    });
    return;
  }
  if (name === 'invite-new') {
    await b(page, 'لینک جدید').click();
    return;
  }
  if (['create-step2', 'initial-pending'].includes(name)) {
    await page
      .getByRole('textbox', { name: /^نام (گروه|کانال)$/ })
      .fill(entry.title.includes('کانال') ? 'کانال درس و جزوه' : 'گروه مطالعهٔ ریاضی');
    await b(page, 'انتخاب مخاطبین').click();
    if (name === 'initial-pending') {
      await page.getByRole('checkbox').first().check();
      await b(page, 'ساخت گروه').click();
      await page.waitForURL(/\/messages\/[a-f0-9-]{36}$/);
    }
    return;
  }
  if (['topic-seed', 'topic-dialog'].includes(name)) {
    await field(page, 'نام موضوع').fill('پرسش‌های جلسهٔ امروز');
    await b(page, 'ایجاد موضوع').click();
    await expect(page.getByText('پرسش‌های جلسهٔ امروز', { exact: true })).toBeVisible();
    if (name === 'topic-dialog') await b(page, 'بستن').click();
    return;
  }
  if (['join-preview', 'join-pending'].includes(name)) {
    const link = await actor('Student', (ctx) =>
      call(
        ctx,
        `/api/v1/conversations/${ids.group}/invite-links`,
        make('CreateInviteLinkCommand', {
          clientLinkId: crypto.randomUUID(),
          maximumUses: 20,
          requiresApproval: true,
          expiresAtUtc: '2099-11-09T00:00:00Z',
        }),
      ),
    );
    const token = link.token ?? link.inviteToken ?? link.url?.split('token=')[1];
    if (!token) throw Error('Invite setup token missing');
    await page.goto(origin + '/personal/messages/join#token=' + encodeURIComponent(token));
    await field(page, 'کد دعوت').fill(token);
    await b(page, 'پیوستن به گفتگو').waitFor({ state: 'visible' });
    if (name === 'join-pending') await b(page, 'پیوستن به گفتگو').click();
    return;
  }
  if (name === 'session-review') {
    await field(page, 'عنوان جلسه').fill('مرور معادله‌های خطی');
    await field(page, 'شروع جلسه').fill('1405/08/12 10:00');
    await field(page, 'پایان جلسه').fill('1405/08/12 11:00');
    await b(page, 'بازبینی اطلاعات').click();
    return;
  }
  if (name === 'session-cancel') {
    await b(page, 'لغو جلسه').click();
    return;
  }
  if (['lesson-edit', 'lesson-review'].includes(name)) {
    await createLesson(page);
    if (name === 'lesson-edit')
      await page.getByRole('link', { name: 'ویرایش پیش‌نویس', exact: true }).click();
    return;
  }
  if (name.startsWith('submission-')) {
    await b(page, 'شروع پاسخ جدید').click();
    await field(page, 'پاسخ تکلیف').fill(
      'برای حل معادله، ابتدا مقدار ثابت را از دو طرف کم و سپس دو طرف را بر ضریب مجهول تقسیم می‌کنم.',
    );
    if (name !== 'submission-answer') {
      await b(page, 'ذخیرهٔ پاسخ').click();
      await b(page, 'بازبینی پاسخ').click();
      if (name === 'submission-receipt') await b(page, 'تحویل نهایی تکلیف').click();
    }
    return;
  }
  if (['exam-taking', 'exam-review', 'exam-receipt'].includes(name)) {
    await b(page, 'شروع آزمون').click();
    const descriptive = page.getByRole('textbox', { name: /پاسخ پرسش/ }).first();
    if (await descriptive.count())
      await descriptive.fill('حل معادله با انجام عمل یکسان روی دو طرف');
    else await page.getByRole('radio').first().check();
    await page
      .getByRole('button', { name: /ذخیرهٔ پاسخ/ })
      .first()
      .click();
    if (name !== 'exam-taking') {
      const jump = page.getByRole('button', { name: /رفتن به پرسش/ });
      if (await jump.count()) await jump.last().click();
      await b(page, 'مرور پاسخ‌ها').click();
      if (name === 'exam-receipt') await b(page, 'ثبت نهایی آزمون').click();
    }
    return;
  }
  if (['exam-author-edit', 'exam-question', 'exam-publish'].includes(name)) {
    const created = await createExam(context);
    const exam = created.id;
    if (name === 'exam-publish') {
      const command = make('AddExamQuestionCommand', {
        prompt: 'روش حل معادله را توضیح دهید.',
        questionType: 'Descriptive',
        maxScore: 20,
        displayOrder: 1,
        options: [],
        expectedVersionRowVersion: created.versionRowVersion,
      });
      await call(context, `/api/v1/academic/exams/${exam}/questions`, command);
    }
    await page.goto(
      origin +
        `/personal/education/exams/${exam}/` +
        (name === 'exam-question' ? 'questions/new' : name === 'exam-publish' ? 'review' : 'edit'),
    );
    return;
  }
  if (name === 'evaluation-review') {
    await evalPrepare(context);
    await page.goto(origin + `/personal/education/submissions/${ids.attempt}/evaluation-review`);
    return;
  }
  if (name === 'assignment-result') return;
  if (['grading', 'grading-question', 'grading-review', 'exam-result'].includes(name)) {
    if (name === 'exam-result') {
      await page.goto(origin + `/personal/education/exam-submissions/${ids.examAttempt}/result`);
    } else {
      await gradePrepare(context, name === 'grading-review');
      await page.goto(
        origin +
          `/personal/education/exam-submissions/${ids.examAttempt}/` +
          (name === 'grading-question'
            ? 'questions/' + ids.question
            : name === 'grading-review'
              ? 'grading-review'
              : 'grading'),
      );
    }
    return;
  }
  if (name === 'class-review') {
    await field(page, 'نام کلاس').fill('کلاس ریاضی - فصل پاییز');
    await field(page, 'ظرفیت کلاس').fill('24');
    await field(page, 'درس از کاتالوگ').selectOption({ label: 'ریاضی' });
    await field(page, 'دوره از کاتالوگ').selectOption({ label: 'دورهٔ نمونه' });
    await b(page, 'بازبینی اطلاعات').click();
    return;
  }
  if (name === 'person-edit') {
    await field(page, 'نام').fill('رضا');
    await field(page, 'نام خانوادگی').fill('دانشور');
    await field(page, 'دلیل ثبت یا تغییر پرونده').fill('ایجاد پروندهٔ نمونه برای نمایش رابط');
    await b(page, 'بازبینی اطلاعات').click();
    await b(page, 'تأیید و ثبت').click();
    await page.getByRole('link', { name: 'ویرایش پرونده', exact: true }).click();
    return;
  }
  if (name.startsWith('source-scope-')) {
    const scope = name.slice('source-scope-'.length);
    await page.getByRole('combobox', { name: 'فضای منابع', exact: true }).selectOption(scope);
    if (scope === 'Class')
      await page.getByRole('combobox', { name: 'کلاس منبع', exact: true }).selectOption(ids.class);
    return;
  }
  if (['source-file', 'source-pending'].includes(name)) {
    await field(page, 'عنوان منبع').fill('جزوهٔ معادله‌های خطی');
    await field(page, 'دلیل ثبت').fill('مطالعهٔ شخصی');
    await field(page, 'فایل منبع').setInputFiles(pdf);
    if (name === 'source-pending') {
      await fixturePost('next-file-status', { status: 'Pending' });
      await b(page, 'ثبت منبع').click();
    }
    return;
  }
  if (name === 'source-version') {
    const editor = page.getByRole('region', { name: 'نسخهٔ جدید منبع', exact: true });
    await field(editor, 'دلیل ثبت').fill('تکمیل جزوه و مثال‌ها');
    await field(editor, 'فایل منبع').setInputFiles(pdf);
    await editor.scrollIntoViewIfNeeded();
    return;
  }
  if (name === 'source-conflict') {
    await field(page, 'عنوان پیش‌نویس').fill('عنوان ویرایش‌شدهٔ حفظ‌شده');
    await field(page, 'دلیل تغییر').fill('بازبینی متن');
    await call(
      context,
      `/api/v1/sources/${ids.source}/draft`,
      {
        title: 'نسخهٔ تازهٔ سرور',
        description: null,
        reason: 'تغییر هم‌زمان نمونه',
        expectedVersion: 'opaque-source-0',
      },
      'PATCH',
    );
    await b(page, 'ذخیرهٔ پیش‌نویس').click();
    await b(page, 'ادامهٔ ویرایش با نسخهٔ جدید').waitFor({ state: 'visible' });
    return;
  }
  if (name === 'personal-class-detail') {
    await page.getByRole('link', { name: 'ایجاد کلاس شخصی', exact: true }).click();
    await field(page, 'نام کلاس شخصی').fill('گروه مطالعهٔ شخصی');
    await b(page, 'ثبت کلاس شخصی').click();
    await page.waitForURL(/\/classes\/[a-f0-9-]{36}$/);
    return;
  }
  if (name === 'quote') {
    await page.getByRole('combobox', { name: 'پلن', exact: true }).selectOption({ index: 1 });
    await b(page, 'دریافت برآورد هزینه').click();
    return;
  }
  if (name.startsWith('assistant-')) {
    if (name === 'assistant-base') return;
    if (name === 'assistant-preflight') {
      await selectAssistantTab(page, 'منابع');
      await page
        .getByRole('checkbox', { name: /انتخاب منبع واقعی/ })
        .first()
        .check();
      await b(page, 'بررسی دسترسی منابع').click();
      return;
    }
    await selectAssistantTab(page, 'منابع');
    await b(page, 'دیدن منابع نمونه').click();
    if (name === 'assistant-sources') return;
    if (name === 'assistant-chat') {
      await selectAssistantTab(page, 'گفتگو');
      await field(page, 'پرسش از دستیار').fill('رابطهٔ غشا و هسته را با توجه به منابع توضیح بده.');
      await field(page, 'پرسش از دستیار').press('Enter');
      return;
    }
    await selectAssistantTab(page, 'استودیو');
    if (name === 'assistant-studio') return;
    const title = {
      'assistant-summary': 'خلاصهٔ هوشمند',
      'assistant-cards': 'فلش‌کارت',
      'assistant-quiz': 'خودت را بسنج',
      'assistant-map': 'نقشهٔ مفهومی',
      'assistant-audio': 'مرور شنیداری',
      'assistant-guide': 'راهنمای مطالعه',
    }[name];
    await page
      .getByRole('button', { name: new RegExp(title) })
      .first()
      .click();
    return;
  }
  if (name === 'service-error') return;
  throw Error('Unrecognized capture action ' + name);
}
async function metadata(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body,
      dialog = document.querySelector('[role="dialog"]'),
      root = dialog ?? main;
    const visible = (element) =>
      element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim();
    const unique = (items) => [...new Set(items.filter(Boolean))];
    const label = (element) => {
      if (element.getAttribute('aria-label')) return clean(element.getAttribute('aria-label'));
      const labels = [...(element.labels ?? [])];
      return (
        clean(
          labels
            .map((node) => {
              const copy = node.cloneNode(true);
              copy
                .querySelectorAll('input,select,textarea,button')
                .forEach((child) => child.remove());
              return copy.textContent;
            })
            .join(' '),
        ) ||
        element.getAttribute('placeholder') ||
        element.name ||
        element.type
      );
    };
    return {
      headings: unique(
        [...main.querySelectorAll('h1,h2,h3')]
          .filter(visible)
          .map((node) => clean(node.textContent)),
      ),
      fields: [...root.querySelectorAll('input,select,textarea')]
        .filter((node) => visible(node) && node.type !== 'hidden')
        .map((node) => ({
          label: label(node),
          type: node.tagName === 'SELECT' ? 'select' : (node.type ?? 'textarea'),
          required: node.required,
          disabled: node.disabled,
        })),
      actions: unique(
        [...root.querySelectorAll('button,summary')]
          .filter(visible)
          .map((node) => clean(node.getAttribute('aria-label') || node.textContent)),
      ).filter((text) => text.length < 180),
      links: [...root.querySelectorAll('a[href]')].filter(visible).map((node) => ({
        label: clean(node.getAttribute('aria-label') || node.textContent),
        href: node.getAttribute('href'),
      })),
      alertText: unique(
        [...main.querySelectorAll('[role=alert]')]
          .filter(visible)
          .map((node) => clean(node.textContent)),
      ),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      dialogTitle: dialog ? clean(dialog.querySelector('h2')?.textContent) : null,
    };
  });
}
async function screenshots(page, entry, width, height, label) {
  await page.setViewportSize({ width, height });
  await settle(page);
  const panes = await page.evaluate(() => {
    document
      .querySelectorAll('[data-atlas-scroll]')
      .forEach((node) => node.removeAttribute('data-atlas-scroll'));
    const dialog = document.querySelector('[role=dialog]'),
      main = document.querySelector('main'),
      root = dialog ?? main ?? document.body;
    const nodes = [root, ...root.querySelectorAll('*')].filter((node) => {
      const r = node.getBoundingClientRect(),
        style = getComputedStyle(node);
      return (
        r.width > 150 &&
        r.height > 100 &&
        r.bottom > 0 &&
        r.top < innerHeight &&
        node.scrollHeight > node.clientHeight + 30 &&
        /(auto|scroll)/.test(style.overflowY)
      );
    });
    if (!nodes.length) nodes.push(root);
    const result = nodes.map((node, index) => {
      node.setAttribute('data-atlas-scroll', String(index));
      node.scrollTop = 0;
      return {
        selector: '[data-atlas-scroll="' + index + '"]',
        height: node.clientHeight,
        total: node.scrollHeight,
      };
    });
    window.scrollTo(0, 0);
    return result;
  });
  const shots = [];
  async function snap(pane, top) {
    await page.waitForTimeout(90);
    const file = `${folder}/${entry.id}-${label}-${String(shots.length + 1).padStart(2, '0')}.png`;
    await page.screenshot({
      path: file,
      animations: 'disabled',
      ...(entry.key === 'join-preview'
        ? { mask: [field(page, 'کد دعوت')], maskColor: '#e9edf4' }
        : {}),
    });
    shots.push({
      file,
      width,
      height,
      scrollTop: top,
      scrollHeight: pane.total,
      clientHeight: pane.height,
      pane: pane.selector,
    });
  }
  await snap(panes[0], 0);
  for (const pane of panes) {
    const step = Math.max(1, pane.height - 80),
      max = Math.max(0, pane.total - pane.height);
    if (max <= 30) continue;
    for (let top = Math.min(step, max); ; top = Math.min(top + step, max)) {
      await page.locator(pane.selector).evaluate((node, value) => (node.scrollTop = value), top);
      await snap(pane, top);
      if (top >= max) break;
    }
    await page.locator(pane.selector).evaluate((node) => (node.scrollTop = 0));
  }
  return shots;
}

try {
  for (const entry of entries.filter(
    (entry, index) => index + 1 >= from && index + 1 <= to && (!only || only.includes(entry.key)),
  )) {
    let context, lastPage;
    const started = Date.now();
    try {
      await fixturePost('reset');
      if (entry.seed !== 'exam-descriptive') await fixturePost('design');
      if (entry.seed === 'exam-descriptive')
        await fixturePost('exam-policy', {
          attachmentsAllowed: true,
          textRequired: false,
          allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
          maximumCount: 3,
          maximumTotalBytes: 1048576,
        });
      await fixturePost('education-case', {
        sessions: [
          {
            id: id(300),
            classId: ids.class,
            classTitle: 'ریاضی نهم',
            title: 'مرور معادله‌های خطی',
            startUtc: '2026-11-02T06:30:00Z',
            endUtc: '2026-11-02T07:30:00Z',
            status: 'Scheduled',
            rowVersion: '1',
          },
        ],
        invitations: [
          {
            id: id(400),
            organizationName: 'آموزشگاه آفتاب',
            role: 'Student',
            status: 'Pending',
            expiresAtUtc: '2099-12-01T00:00:00Z',
            requiresPersonLinkConsent: true,
            requiresGuardianConsent: false,
          },
        ],
      });
      if (entry.key === 'overview-Teacher')
        await fixturePost('replay-event', { classTitle: 'ریاضی نهم' });
      if (entry.seed === 'manager') await fixturePost('manager-case');
      if (entry.school && entry.role !== 'Parent') await fixturePost('official-spaces', {});
      if (entry.seed === 'assessments') await fixturePost('assessments');
      if (entry.seed === 'assignment-draft') await fixturePost('assignment-draft');
      if (['Group', 'Channel'].includes(entry.seed))
        await fixturePost('conversation-details', { type: entry.seed, messages: true });
      if (entry.seed === 'saved') await fixturePost('chat-kind', { kind: 'Saved' });
      if (entry.seed === 'official') await fixturePost('official-spaces', {});
      if (entry.action === 'initial-pending')
        await fixturePost('release-154', { pendingInitial: true });
      if (entry.action === 'service-error')
        for (let n = 0; n < 20; n++)
          await fixturePost('fault', { path: '/sources', method: 'GET', status: 503 });
      context = await browser.newContext({
        baseURL: origin,
        viewport: { width: 390, height: 844 },
        timezoneId: 'Asia/Tehran',
        reducedMotion: 'reduce',
      });
      context.setDefaultTimeout(7000);
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (
          ['data:', 'blob:', 'about:'].includes(url.protocol) ||
          ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
        )
          return route.continue();
        return route.abort('blockedbyclient');
      });
      await context.addInitScript((theme) => {
        localStorage.setItem('makan-theme', theme);
        localStorage.setItem('makan:pwa-install-dismissed:v1', '1');
      }, entry.theme ?? 'light');
      await login(context, entry.role, entry.school);
      if (entry.child) await call(context, '/api/v1/guardian/children/' + id(501) + '/select', {});
      const page = await context.newPage(),
        errors = [];
      lastPage = page;
      if (entry.key === 'parent-assignments')
        await page.route('**/api/client/backend/api/v1/reports/parent/assignments?**', (route) =>
          route.fulfill({
            status: 200,
            json: make('ReportPageOfParentAssignmentReportItem', {
              pageNumber: 1,
              pageSize: 30,
              totalCount: 1,
              items: [
                make('ParentAssignmentReportItem', {
                  assignmentId: ids.assignment,
                  classId: ids.class,
                  title: 'تمرین فصل معادله‌ها',
                  classTitle: 'ریاضی نهم',
                  submissionStatus: 'Submitted',
                  releasedScore: 17.5,
                  maximumScore: 20,
                  guardianVisibleFeedback: 'روند یادگیری مناسب است.',
                }),
              ],
            }),
          }),
        );
      if (entry.key === 'parent-exams')
        await page.route('**/api/client/backend/api/v1/reports/parent/exams?**', (route) =>
          route.fulfill({
            status: 200,
            json: make('ReportPageOfParentExamReportItem', {
              pageNumber: 1,
              pageSize: 30,
              totalCount: 1,
              items: [
                make('ParentExamReportItem', {
                  examId: ids.exam,
                  classId: ids.class,
                  title: 'آزمون فصل معادله‌ها',
                  classTitle: 'ریاضی نهم',
                  latestAttemptStatus: 'Finalized',
                  releasedScore: 18,
                  maximumScore: 20,
                  guardianVisibleFeedback: 'نتیجهٔ منتشرشدهٔ قابل مشاهده برای والد.',
                }),
              ],
            }),
          }),
        );

      if (entry.key === 'peer-media')
        await page.route(
          '**/api/client/backend/api/v1/conversations/' + ids.chat + '/media?**',
          (route) =>
            route.fulfill({
              status: 200,
              json: make('ConversationMediaPageResult', { items: [], nextBeforeSequence: null }),
            }),
        );
      page.on('pageerror', (error) => errors.push(error.name));
      const pending = new Set();
      page.on('request', (req) => {
        if (req.url().includes('/api/client/') && !/\/hub|\/realtime\//.test(req.url()))
          pending.add(req);
      });
      page.on('requestfinished', (req) => pending.delete(req));
      page.on('requestfailed', (req) => pending.delete(req));
      if (entry.action === 'assignment-result')
        await actor('Teacher', (ctx) => evalPrepare(ctx, true));
      if (entry.action === 'exam-result')
        await actor('Teacher', (ctx) => gradePrepare(ctx, true, true));
      if (entry.action === 'evaluation-correction') await evalPrepare(context, true);
      if (entry.action === 'grading-correction') await gradePrepare(context, true, true);
      await page.goto(origin + entry.route, { waitUntil: 'domcontentloaded' });
      await settle(page);
      await action(page, context, entry);
      await settle(page);
      const meta = await metadata(page);
      if (!entry.allowErrors && meta.alertText.length)
        throw Error('Unexpected UI alert: ' + meta.alertText.join(' ').slice(0, 160));
      if (errors.length) throw Error('Browser page error: ' + errors.join(','));
      const shots = {
        mobile: await screenshots(page, entry, 390, 844, 'mobile'),
        desktop: await screenshots(page, entry, 1440, 1000, 'desktop'),
      };
      if (entry.tablet) shots.tablet = await screenshots(page, entry, 834, 1194, 'tablet');
      const state = await (await backend.get('/__test__/state')).json();
      const operations = [
        ...new Set(
          state.requests
            .filter(
              (row) =>
                !row.path.includes('/auth/') &&
                !row.path.includes('/workspaces/') &&
                !row.path.includes('/realtime/') &&
                row.path !== '/api/v1/me',
            )
            .map(
              (row) => row.method + ' ' + row.path.replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/{id}'),
            ),
        ),
      ];
      const result = {
        ...entry,
        capturedAtUtc: new Date().toISOString(),
        result: 'captured',
        resolvedRoute: page
          .url()
          .replace(origin, '')
          .replace(/#token=.*/, '#token=[redacted]'),
        metadata: meta,
        dataAdapter: ['peer-media', 'parent-assignments', 'parent-exams'].includes(entry.key)
          ? 'contract-shaped local screenshot response'
          : undefined,
        operations,
        shots,
        durationMs: Date.now() - started,
      };
      report.views = report.views.filter((row) => row.id !== entry.id);
      report.views.push(result);
      console.log(
        entry.id + ' ' + entry.key + ' OK ' + Object.values(shots).flat().length + ' images',
      );
    } catch (error) {
      if (lastPage && !lastPage.isClosed()) {
        await lastPage
          .screenshot({ path: 'tmp/design-atlas/failed-' + entry.id + '.png' })
          .catch(() => {});
        await fs.writeFile(
          'tmp/design-atlas/failed-' + entry.id + '.txt',
          await lastPage
            .locator('main')
            .innerText()
            .catch(() => ''),
        );
      }
      const result = {
        ...entry,
        capturedAtUtc: new Date().toISOString(),
        result: 'capture-failed',
        error: String(error.message).slice(0, 600),
        durationMs: Date.now() - started,
      };
      report.views = report.views.filter((row) => row.id !== entry.id);
      report.views.push(result);
      console.log(entry.id + ' ' + entry.key + ' FAILED ' + result.error.split('\n')[0]);
    } finally {
      if (context) await context.close();
      report.views.sort((a, b) => a.id.localeCompare(b.id));
      const value = report.views.find((row) => row.id === entry.id);
      const individual = 'tmp/design-atlas/records/' + entry.id + '.json';
      await fs.writeFile(individual + '.tmp', JSON.stringify(value, null, 2) + '\n');
      await fs.rename(individual + '.tmp', individual);
      await fs.writeFile(reportFile + '.tmp', JSON.stringify(report, null, 2) + '\n');
      await fs.rename(reportFile + '.tmp', reportFile);
    }
  }
} finally {
  await browser.close();
  await backend.dispose();
}
