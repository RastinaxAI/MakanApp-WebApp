import { test, expect, login, fixture, ids, origin } from './test';
const root = '/personal/education',
  attempt = '00000000-0000-4000-8000-000000000007',
  question = '00000000-0000-4000-8000-000000000008';
test('background session checks do not cancel a foreground child selection', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Parent');
  await page.goto(root);
  await expect(page.getByRole('combobox', { name: 'انتخاب فرزند', exact: true })).toBeVisible();
  await page.waitForResponse(
    (r) => r.url().includes('/realtime/changes?') && new URL(r.url()).searchParams.has('cursor'),
  );
  let start!: () => void, release!: () => void;
  const started = new Promise<void>((r) => {
      start = r;
    }),
    blocked = new Promise<void>((r) => {
      release = r;
    });
  let foregroundRequests = 0;
  await page.route('**/api/client/session', async (route) => {
    foregroundRequests++;
    start();
    await blocked;
    await route.continue();
  });
  try {
    await page
      .getByRole('combobox', { name: 'انتخاب فرزند', exact: true })
      .selectOption('00000000-0000-4000-8000-000000000501');
    await started;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(foregroundRequests).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
});
test('account replay refreshes a school snapshot without navigation or a page polling timer', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await page.goto(root + '/classes');
  await expect(
    page.getByRole('heading', {
      name: 'کلاس آزمایشی ریاضی با نام بلند برای بررسی واکنش‌گرایی',
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForResponse(
    (r) => r.url().includes('/realtime/changes?') && new URL(r.url()).searchParams.has('cursor'),
  );
  let navigations = 0;
  page.on('request', (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations++;
  });
  await request.post(fixture + '/__test__/replay-event', {
    data: {
      userId: '00000000-0000-4000-8000-000000000101',
      classTitle: 'کلاس تغییرکرده از رویداد',
    },
  });
  await expect(
    page.getByRole('heading', { name: 'کلاس تغییرکرده از رویداد', exact: true }),
  ).toBeVisible();
  expect(navigations).toBe(0);
});
test('exam file-only answer waits for Ready, enforces policy, handles conflict and downloads private bytes', async ({
  page,
  context,
  request,
  browser,
}) => {
  await request.post(fixture + '/__test__/exam-policy', {
    data: {
      attachmentsAllowed: true,
      textRequired: false,
      allowedContentTypes: ['application/pdf'],
      maximumCount: 1,
      maximumTotalBytes: 1024,
    },
  });
  await login(context);
  await page.goto(`${root}/exams/${ids.exam}`);
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  const input = page.getByLabel('انتخاب پیوست پاسخ آزمون', { exact: true });
  await input.setInputFiles({
    name: 'wrong.png',
    mimeType: 'image/png',
    buffer: Buffer.from('image'),
  });
  await expect(page.getByRole('main').getByRole('alert')).toContainText('نوع فایل');
  await request.post(fixture + '/__test__/next-file-status', { data: { status: 'Pending' } });
  await input.setInputFiles({
    name: 'answer.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-fixture'),
  });
  await expect(
    page.getByText('فایل در حال بررسی است؛ هنوز به پاسخ وصل نشده.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'مرور پاسخ‌ها', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'بازگشت به پاسخ‌ها', exact: true }).click();
  await request.post(fixture + '/__test__/ready-files');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/attachments', method: 'POST', status: 409 },
  });
  await page.getByRole('button', { name: 'بررسی وضعیت فایل', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'دریافت نسخهٔ جدید پاسخ', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'دریافت نسخهٔ جدید پاسخ', exact: true }).click();
  await page.getByRole('button', { name: 'بررسی و ثبت همین پیوست', exact: true }).click();
  const download = page.getByRole('button', { name: 'دریافت answer.pdf', exact: true });
  await expect(download).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await download.click();
  expect((await downloadEvent).suggestedFilename()).toBe('answer.pdf');
  const parent = await browser.newContext({ baseURL: origin });
  try {
    const state = await login(parent, 'Parent');
    expect(
      (
        await parent.request.get(
          `${origin}/api/client/exam-files/not-a-file/content?attemptId=${attempt}&questionId=${question}`,
          { headers: { 'X-Makan-Context': state.revision } },
        )
      ).status(),
    ).toBe(404);
    const requests = (await (await request.get(fixture + '/__test__/state')).json()).requests;
    const fileId = requests.find(
      (r: { path: string; body?: { fileAssetId: string } }) =>
        r.path.endsWith('/attachments') && r.body?.fileAssetId,
    )?.body.fileAssetId;
    expect(fileId).toBeTruthy();
    expect(
      (
        await parent.request.get(
          `${origin}/api/client/exam-files/${fileId}/content?attemptId=${attempt}&questionId=${question}`,
          { headers: { 'X-Makan-Context': state.revision } },
        )
      ).status(),
    ).toBe(403);
  } finally {
    await parent.close();
  }
  await page.getByRole('button', { name: 'مرور پاسخ‌ها', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'آزمون ثبت نهایی شد', exact: true }),
  ).toBeVisible();
  await request.post(fixture + '/__test__/assessments');
  const teacher = await browser.newContext({ baseURL: origin });
  try {
    const state = await login(teacher, 'Teacher');
    expect(
      (
        await teacher.request.post(
          `${origin}/api/client/backend/api/v1/academic/exam-attempts/${attempt}/grading`,
          { headers: { Origin: origin, 'X-Makan-Context': state.revision } },
        )
      ).ok(),
    ).toBe(true);
    const p = await teacher.newPage();
    await p.goto(`${root}/exam-submissions/${attempt}/grading`);
    const received = p.waitForEvent('download');
    await p.getByRole('button', { name: 'دریافت answer.pdf', exact: true }).click();
    expect((await received).suggestedFilename()).toBe('answer.pdf');
  } finally {
    await teacher.close();
  }
});
test('personal commerce shows unknown usage honestly and an order never activates subscription', async ({
  page,
  context,
}) => {
  await login(context, 'Personal', false);
  await page.goto('/personal/subscription');
  await expect(
    page.getByRole('heading', { name: 'اشتراک و مصرف شخصی', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('باقی‌مانده: هنوز گزارش نشده', { exact: true })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'پلن', exact: true })
    .selectOption({ label: 'پلن آزمون محلی · ۱۰۰ تومان' });
  await page.getByRole('button', { name: 'دریافت برآورد هزینه', exact: true }).click();
  await page.getByRole('button', { name: 'ساخت سفارش در انتظار پرداخت', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ثبت سفارش', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'سفارش ثبت شد', exact: true })).toBeVisible();
  await expect(page.getByText('بدون اشتراک', { exact: true })).toBeVisible();
  await expect(page.getByText(/وضعیت: در انتظار پرداخت/)).toBeVisible();
  await page.goto('/personal/subscription?scope=organization');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('دسترسی محدود');
});
test('personal class invitation needs recipient acceptance and grants no organization role', async ({
  page,
  context,
  browser,
}) => {
  await login(context, 'Teacher', false);
  await page.goto('/personal/classes/new');
  await page.getByLabel('نام کلاس شخصی', { exact: true }).fill('کلاس شخصی محلی');
  await page.getByRole('button', { name: 'ثبت کلاس شخصی', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'کلاس شخصی محلی', exact: true })).toBeVisible();
  await page.getByLabel('شماره یا نام کاربری', { exact: true }).fill('@test.Student');
  await page.getByRole('button', { name: 'پیدا کردن حساب', exact: true }).click();
  await page.getByRole('button', { name: 'ارسال دعوت کلاس شخصی', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'عضوی در کلاس ثبت نشده است', exact: true }),
  ).toBeVisible();
  const student = await browser.newContext({ baseURL: origin });
  try {
    await login(student, 'Student', false);
    const p = await student.newPage();
    await p.goto('/personal/classes');
    await p.getByRole('button', { name: 'پذیرش دعوت کلاس شخصی', exact: true }).click();
    await expect(p.getByRole('heading', { name: 'کلاس شخصی محلی', exact: true })).toBeVisible();
    const state = await (await student.request.get(origin + '/api/client/session')).json();
    expect(state.context.workspaceType).toBe('Personal');
    expect(state.context.activeRole).toBeNull();
  } finally {
    await student.close();
  }
  await page.reload();
  await expect(page.getByText('عضو ۱ · فعال', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'پایان عضویت ۱', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByText('عضو ۱ · پایان‌یافته', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'بایگانی کلاس', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByText('کلاس بایگانی‌شده', { exact: true })).toBeVisible();
});
