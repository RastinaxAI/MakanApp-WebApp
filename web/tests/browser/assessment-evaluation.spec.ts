import { test, expect, login, ids, fixture, origin } from './test';
import { mkdir } from 'node:fs/promises';
const examAttempt = '00000000-0000-4000-8000-000000000007';
const question = '00000000-0000-4000-8000-000000000008';
const file = '00000000-0000-4000-8000-000000000940';
const base = '/personal/education';
const submission = `${base}/submissions/${ids.attempt}`;
const exam = `${base}/exam-submissions/${examAttempt}`;
test('assignment evaluation retains failed drafts, previews audience feedback and releases only after confirmation', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/assessments');
  await login(context, 'Teacher');
  await page.goto(base + '/evaluations');
  await page.getByRole('link', { name: /دانش‌آموز آزمایشی/ }).click();
  await expect(page.getByText('پاسخ کامل دانش‌آموز برای ارزیابی')).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: `/files/${file}/content`, method: 'GET', delay: 1500 },
  });
  await page.getByRole('button', { name: 'دریافت فایل', exact: true }).click();
  await expect(
    page.getByRole('progressbar', { name: 'پیشرفت دریافت پاسخ.pdf', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'لغو دریافت', exact: true }).click();
  await expect(page.getByRole('button', { name: 'دریافت فایل', exact: true })).toBeEnabled();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'دریافت فایل', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('پاسخ.pdf');
  await mkdir('test-results/workspace-child-attachments', { recursive: true });
  await page.screenshot({
    path: 'test-results/workspace-child-attachments/teacher-received-files.png',
  });
  await page.getByLabel('نمره از ۲۰', { exact: true }).fill('17.5');
  await page.getByLabel('بازخورد دانش‌آموز', { exact: true }).fill('بازخورد عمومی دانش‌آموز');
  await page.getByLabel('بازخورد قابل نمایش به والد', { exact: true }).fill('بازخورد ویژه والد');
  await page.getByLabel('یادداشت خصوصی', { exact: true }).fill('SECRET_EVALUATOR_NOTE');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/evaluation', method: 'PUT', status: 503 },
  });
  await page.getByRole('button', { name: 'ذخیره و بازبینی', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('یادداشت خصوصی', { exact: true })).toHaveValue(
    'SECRET_EVALUATOR_NOTE',
  );
  page.once('dialog', (d) => d.accept());
  await page.reload();
  await expect(page.getByLabel('نمره از ۲۰', { exact: true })).toHaveValue('17.5');
  await page.getByRole('button', { name: 'ذخیره و بازبینی', exact: true }).click();
  await expect(page).toHaveURL(/evaluation-review$/);
  await expect(page.getByText('SECRET_EVALUATOR_NOTE')).toHaveCount(0);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/evaluation/release', method: 'POST', status: 409 },
  });
  await page.getByRole('button', { name: 'انتشار ارزیابی', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'انتشار نتیجه', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'انتشار نتیجه', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('main').getByText('منتشرشده', { exact: true })).toBeVisible();
  await login(context, 'Student');
  await page.goto(submission + '/result');
  await expect(page.getByText('بازخورد عمومی دانش‌آموز', { exact: true })).toBeVisible();
  await expect(page.getByText('SECRET_EVALUATOR_NOTE')).toHaveCount(0);
  await expect(page.getByText('بازخورد ویژه والد')).toHaveCount(0);
  await page.goto(`${base}/assignments/${ids.assignment}/history`);
  await expect(page.getByRole('link', { name: 'نتیجهٔ منتشرشده' })).toHaveAttribute(
    'href',
    submission + '/result',
  );
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const save = state.requests.find(
    (r: { method: string; path: string }) => r.method === 'PUT' && r.path.endsWith('/evaluation'),
  );
  expect(save.body.expectedRowVersion).toBeNull();
});
test('exam manual grading separates saving, completion and publication, and supports a correction revision', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/assessments');
  await login(context, 'Teacher');
  await page.goto(`${base}/exams/${ids.exam}/grading`);
  await page.getByRole('link', { name: /دانش‌آموز آزمایشی/ }).click();
  await page.getByRole('button', { name: 'شروع تصحیح پاسخ‌برگ' }).click();
  await expect(page.getByRole('button', { name: 'تکمیل و بازبینی نتیجه' })).toBeDisabled();
  await page.getByRole('link', { name: 'تصحیح پاسخ', exact: true }).click();
  await page.getByLabel('نمره از ۲۰', { exact: true }).fill('18');
  await page.getByLabel('بازخورد دانش‌آموز', { exact: true }).fill('تصحیح سؤال برای دانش‌آموز');
  await page.getByLabel('یادداشت خصوصی ارزیاب', { exact: true }).fill('SECRET_QUESTION_NOTE');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/grading/questions/' + question, method: 'PATCH', status: 503 },
  });
  await page.getByRole('button', { name: 'ذخیرهٔ تصحیح سؤال' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('نمره از ۲۰', { exact: true })).toHaveValue('18');
  await page.getByRole('button', { name: 'ذخیرهٔ تصحیح سؤال' }).click();
  await expect(page).toHaveURL(/\/grading$/);
  await page.getByLabel('بازخورد دانش‌آموز', { exact: true }).fill('نتیجه دانش‌آموز آزمون');
  await page.getByLabel('بازخورد قابل نمایش به والد', { exact: true }).fill('نتیجه والد آزمون');
  await page.getByLabel('یادداشت خصوصی ارزیاب', { exact: true }).fill('SECRET_EXAM_NOTE');
  await page.getByRole('button', { name: 'تکمیل و بازبینی نتیجه' }).click();
  await expect(page).toHaveURL(/grading-review$/);
  const recorded = await (await request.get(fixture + '/__test__/state')).json();
  const completed = recorded.requests.find((r: { path: string }) =>
    r.path.endsWith('/grading/complete'),
  );
  expect(completed.body.learnerFeedback).toBe('نتیجه دانش‌آموز آزمون');
  expect(completed.body.guardianVisibleFeedback).toBe('نتیجه والد آزمون');
  await expect(page.getByText('SECRET_EXAM_NOTE')).toHaveCount(0);
  await page.getByRole('button', { name: 'انتشار نتیجه', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید انتشار' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'ایجاد اصلاحیه', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ساخت پیش‌نویس اصلاحیه' })).toBeDisabled();
  await page.getByLabel('دلیل اصلاح', { exact: true }).fill('بررسی مجدد پاسخ');
  await page.getByRole('button', { name: 'ساخت پیش‌نویس اصلاحیه' }).click();
  await expect(page).toHaveURL(/\/grading$/);
  await login(context, 'Student');
  await page.goto(exam + '/result');
  await expect(page.getByText('نتیجه دانش‌آموز آزمون', { exact: true })).toBeVisible();
  await expect(page.getByText(/SECRET_/)).toHaveCount(0);
  await expect(page.getByText('نتیجه والد آزمون')).toHaveCount(0);
  await page.goto(`${base}/exams/${ids.exam}/history`);
  await expect(page.getByRole('link', { name: 'وضعیت نتیجه' })).toHaveAttribute(
    'href',
    exam + '/result',
  );
});
test('student and parent cannot open author data; unpublished results and unrelated attachments do not masquerade as success', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/assessments');
  let session = await login(context, 'Student');
  await page.goto(submission + '/evaluate');
  await expect(page.getByText('پاسخ کامل دانش‌آموز برای ارزیابی')).toHaveCount(0);
  await page.goto(exam + '/grading');
  await expect(page.getByRole('button', { name: 'شروع تصحیح پاسخ‌برگ' })).toHaveCount(0);
  await page.goto(exam + '/result');
  await expect(page.getByText('نتیجه هنوز منتشر نشده است')).toBeVisible();
  await page.goto(submission + '/result');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByText('ارزیابی منتشرشده', { exact: true })).toHaveCount(0);
  session = await login(context, 'Teacher');
  const fileUrl = origin + `/api/client/submission-files/${file}/content?attemptId=${ids.attempt}`;
  expect(
    (await context.request.get(fileUrl, { headers: { 'X-Makan-Context': 'outdated' } })).status(),
  ).toBe(409);
  expect(
    (
      await context.request.get(fileUrl.replace(file, ids.class), {
        headers: { 'X-Makan-Context': session.revision },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await context.request.get(fileUrl.replace(ids.attempt, ids.class), {
        headers: { 'X-Makan-Context': session.revision },
      })
    ).status(),
  ).toBe(404);
  await login(context, 'Parent');
  await page.goto(submission + '/evaluate');
  await expect(page.getByText('پاسخ کامل دانش‌آموز برای ارزیابی')).toHaveCount(0);
  await page.goto(submission + '/result');
  await expect(page.getByText('ابتدا فرزند را انتخاب کنید')).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(state.requests.some((r: { path: string }) => r.path.endsWith('/guardian-result'))).toBe(
    false,
  );
});
test('new assessment pages remain readable without overflow at three viewports', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/assessments');
  const session = await login(context, 'Teacher');
  await mkdir('output/review/assessment-expansion', { recursive: true });
  const capture = async (name: string, url: string, label?: string, text?: string) => {
    await page.goto(url);
    if (label) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    if (text) await expect(page.getByText(text, { exact: true })).toBeVisible();
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await page.locator('form form').count()).toBe(0);
      await page.screenshot({ path: `output/review/assessment-expansion/${name}-${width}.png` });
    }
  };
  for (const [name, url] of [
    ['queue', base + '/evaluations'],
    ['evaluate', submission + '/evaluate'],
  ]) {
    await page.goto(url);
    await expect(
      page.getByText(name === 'queue' ? 'دانش‌آموز آزمایشی' : 'پاسخ کامل دانش‌آموز برای ارزیابی', {
        exact: true,
      }),
    ).toBeVisible();
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await page.locator('form form').count()).toBe(0);
      await page.screenshot({ path: `output/review/assessment-expansion/${name}-${width}.png` });
    }
  }
  const headers = { Origin: origin, 'X-Makan-Context': session.revision };
  const backend = origin + '/api/client/backend/api/v1/academic/';
  expect(
    (
      await context.request.put(backend + 'submission-attempts/' + ids.attempt + '/evaluation', {
        headers,
        data: {
          score: 12,
          learnerFeedback: 'بازخورد ویژه بازبینی نتیجه',
          guardianVisibleFeedback: null,
          teacherPrivateNote: null,
          expectedRowVersion: null,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await capture(
    'evaluation-review',
    submission + '/evaluation-review',
    undefined,
    'بازخورد ویژه بازبینی نتیجه',
  );
  await request.post(fixture + '/__test__/assignment-draft');
  await capture('assignment-edit', `${base}/assignments/${ids.assignment}/edit`, 'عنوان تکلیف');
  await capture(
    'assignment-publication',
    `${base}/assignments/${ids.assignment}/publish-review`,
    undefined,
    'شرح پیش‌نویس',
  );
  const initialized = await context.request.post(
    backend + 'exam-attempts/' + examAttempt + '/grading',
    { headers },
  );
  expect(initialized.ok()).toBeTruthy();
  const grade = await initialized.json();
  await capture('exam-grade', exam + '/grading', undefined, 'پاسخ‌برگ و نمرهٔ هر سؤال');
  await capture('exam-question', exam + '/questions/' + question, 'نمره از ۲۰');
  const marked = await context.request.patch(
    backend + 'exam-attempts/' + examAttempt + '/grading/questions/' + question,
    {
      headers,
      data: {
        awardedScore: 16,
        learnerFeedback: 'پاسخ بررسی شد',
        evaluatorPrivateNote: null,
        expectedGradeRowVersion: grade.rowVersion,
      },
    },
  );
  expect(marked.ok()).toBeTruthy();
  const markedGrade = await marked.json();
  expect(
    (
      await context.request.post(backend + 'exam-attempts/' + examAttempt + '/grading/complete', {
        headers,
        data: {
          learnerFeedback: 'بازخورد نهایی آزمون',
          guardianVisibleFeedback: null,
          evaluatorPrivateNote: null,
          expectedGradeRowVersion: markedGrade.rowVersion,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await capture('exam-publication', exam + '/grading-review', undefined, 'بازخورد نهایی آزمون');
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await page.goto(exam + '/grading-review');
  await expect(page.getByText('بازخورد نهایی آزمون', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'output/review/assessment-expansion/exam-publication-dark-390.png',
  });
});

test('editing and publishing a homework draft uses versioned review and retains a failed save', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/assignment-draft');
  await login(context, 'Teacher');
  await page.goto(`${base}/assignments/${ids.assignment}/edit`);
  await page.getByLabel('عنوان تکلیف', { exact: true }).fill('تکلیف بازبینی‌شده');
  await page.getByLabel('شرح تکلیف', { exact: true }).fill('شرح تازه برای انتشار');
  await page.getByRole('button', { name: 'بازبینی اطلاعات', exact: true }).click();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/assignments/' + ids.assignment, method: 'PATCH', status: 409 },
  });
  await page.getByRole('button', { name: 'تأیید و ذخیرهٔ پیش‌نویس', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'بازگشت و ویرایش', exact: true }).click();
  await expect(page.getByLabel('عنوان تکلیف', { exact: true })).toHaveValue('تکلیف بازبینی‌شده');
  await page.getByRole('button', { name: 'بازبینی اطلاعات', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید و ذخیرهٔ پیش‌نویس', exact: true }).click();
  await expect(page).toHaveURL(/publish-review$/);
  await expect(page.getByRole('heading', { name: 'تکلیف بازبینی‌شده', exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/publish', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'انتشار تکلیف برای کلاس', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'تأیید انتشار تکلیف', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'تأیید انتشار تکلیف', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('main').getByText('منتشرشده', { exact: true })).toBeVisible();
  await login(context, 'Student');
  await page.goto(`${base}/assignments/${ids.assignment}/edit`);
  await expect(page.getByLabel('عنوان تکلیف', { exact: true })).toHaveCount(0);
});

test('a server version change preserves the local evaluation draft until explicit replacement', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/assessments');
  const session = await login(context, 'Teacher');
  const url =
    origin +
    '/api/client/backend/api/v1/academic/submission-attempts/' +
    ids.attempt +
    '/evaluation';
  const headers = { Origin: origin, 'X-Makan-Context': session.revision };
  const first = await context.request.put(url, {
    headers,
    data: {
      score: 10,
      learnerFeedback: null,
      guardianVisibleFeedback: null,
      teacherPrivateNote: null,
      expectedRowVersion: null,
    },
  });
  expect(first.ok()).toBeTruthy();
  const value = await first.json();
  await page.goto(submission + '/evaluate');
  await page.getByLabel('نمره از ۲۰', { exact: true }).fill('16');
  expect(
    (
      await context.request.put(url, {
        headers,
        data: {
          score: 12,
          learnerFeedback: 'نسخهٔ تازه سرویس',
          guardianVisibleFeedback: null,
          teacherPrivateNote: null,
          expectedRowVersion: value.rowVersion,
        },
      })
    ).ok(),
  ).toBeTruthy();
  page.once('dialog', (d) => d.accept());
  await page.reload();
  await expect(page.getByLabel('نمره از ۲۰', { exact: true })).toHaveValue('16');
  await expect(page.getByRole('button', { name: 'ذخیره و بازبینی', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'استفاده از نسخهٔ سرویس', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'جایگزینی اطلاعات فرم', exact: true })
    .click();
  await expect(page.getByLabel('نمره از ۲۰', { exact: true })).toHaveValue('12');
  await expect(page.getByLabel('بازخورد دانش‌آموز', { exact: true })).toHaveValue(
    'نسخهٔ تازه سرویس',
  );
  await expect(page.getByRole('button', { name: 'ذخیره و بازبینی', exact: true })).toBeEnabled();
});

test('parent result uses the selected child relation and guardian feedback without author notes', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await request.post(fixture + '/__test__/assessments');
  const teacher = await login(context, 'Teacher'),
    endpoint =
      origin +
      '/api/client/backend/api/v1/academic/submission-attempts/' +
      ids.attempt +
      '/evaluation';
  const headers = { Origin: origin, 'X-Makan-Context': teacher.revision };
  const saved = await context.request.put(endpoint, {
    headers,
    data: {
      score: 15,
      learnerFeedback: 'LEARNER_ONLY_FEEDBACK',
      guardianVisibleFeedback: 'بازخورد منتشرشده برای والد',
      teacherPrivateNote: 'PRIVATE_FOR_AUTHOR_ONLY',
      expectedRowVersion: null,
    },
  });
  expect(saved.ok()).toBeTruthy();
  const version = (await saved.json()).rowVersion;
  expect(
    (
      await context.request.post(endpoint + '/release', {
        headers,
        data: { expectedRowVersion: version },
      })
    ).ok(),
  ).toBeTruthy();
  await login(context, 'Parent');
  await page.goto('/personal/education');
  await page
    .getByRole('combobox', { name: 'انتخاب فرزند', exact: true })
    .selectOption('00000000-0000-4000-8000-000000000501');
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
  await page.goto(submission + '/result');
  await expect(page.getByText('بازخورد منتشرشده برای والد', { exact: true })).toBeVisible();
  await expect(page.getByText('LEARNER_ONLY_FEEDBACK')).toHaveCount(0);
  await expect(page.getByText('PRIVATE_FOR_AUTHOR_ONLY')).toHaveCount(0);
});
