import { test, expect, login, fixture, ids, origin } from './test';
import { mkdir } from 'node:fs/promises';

test('profile exposes identity and age below spaces and moves preference menus to their own page', async ({
  page,
  context,
}) => {
  await login(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal/profile');
  const spaces = page.getByRole('region', { name: 'فضاهای من', exact: true }),
    details = page.getByRole('region', { name: 'مشخصات فردی', exact: true });
  await expect(details).toBeVisible();
  await expect(page.getByRole('region', { name: 'وضعیت سنی', exact: true })).toBeVisible();
  expect((await details.boundingBox())!.y).toBeGreaterThan((await spaces.boundingBox())!.y);
  await expect(page.getByRole('region', { name: 'شناسهٔ حساب', exact: true })).toContainText(
    /[0-9a-f]{8}-/,
  );
  await expect(page.getByRole('button', { name: 'جستجو', exact: true })).toHaveCount(0);
  await mkdir('test-results/profile-school-files', { recursive: true });
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/profile-school-files/profile-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'شناسهٔ حساب', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/profile-school-files/profile-identity-mobile.png' });
  await page.getByRole('button', { name: 'خروج از حساب', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/profile-school-files/profile-logout-mobile.png' });
  await page.getByRole('link', { name: 'حساب و ترجیحات', exact: true }).first().click();
  await expect(page).toHaveURL(/\/profile\/preferences$/);
  await expect(
    page.getByRole('heading', { name: 'حساب و ترجیحات', exact: true, level: 1 }),
  ).toBeVisible();
  for (const name of ['حریم خصوصی', 'اعلان‌ها', 'امنیت و دستگاه‌ها', 'مخاطبین', 'تنظیمات'])
    await expect(
      page
        .getByRole('region', { name: 'حساب و ترجیحات', exact: true })
        .getByText(name, { exact: true }),
    ).toBeVisible();
  await page.goto('/personal/messages');
  await page.getByRole('button', { name: 'ایجاد گفت‌وگو یا مخاطب' }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText([
    'ایجاد گروه',
    'ایجاد کانال',
    'مخاطبین',
    'آرشیو',
    'پیام‌های ذخیره‌شده',
  ]);
  expect(await menu.getByRole('menuitem').locator('svg').count()).toBe(5);
  await page.screenshot({ path: 'test-results/profile-school-files/message-menu-mobile.png' });
  await page.keyboard.press('Escape');
  await page.goto('/personal/assistant');
  await expect(page.getByRole('button', { name: 'جستجو', exact: true })).toHaveCount(0);
});

test('school header searches authorized classes, assignments and published exams without contact navigation', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await page.goto('/personal/education');
  await page.getByRole('button', { name: 'جستجو در آموزشگاه', exact: true }).click();
  await page.getByRole('textbox', { name: 'جستجوی کلاس، تکلیف یا آزمون' }).fill('ریاضی');
  await page.getByRole('button', { name: 'جستجو', exact: true }).click();
  await expect(page.getByRole('link', { name: /کلاس آزمایشی ریاضی/ })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'نوع نتیجهٔ جستجو' })
    .getByRole('link', { name: 'تکلیف‌ها', exact: true })
    .click();
  const results = page
    .locator('main')
    .getByRole('link', { name: /تکلیف‌ها/ })
    .filter({ has: page.locator('h2') });
  await expect(results).toHaveCount(1);
  await page.screenshot({ path: 'test-results/profile-school-files/school-search.png' });
  const requests = (await (await request.get(fixture + '/__test__/state')).json()).requests;
  expect(requests.some((r: { path: string }) => r.path === '/api/v1/people/search')).toBe(false);
});

test('Student attaches a PDF and photo, retries an attachment failure without reuploading and submits a file-only answer', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  const choose = page.getByLabel('افزودن عکس یا PDF به پاسخ', { exact: true });
  const pdf = Buffer.from('%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/attachments', method: 'POST', status: 503 },
  });
  await choose.setInputFiles({ name: 'answer.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(
    page.getByRole('button', { name: 'افزودن فایل آماده‌شده', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'بازبینی پاسخ', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'افزودن فایل آماده‌شده', exact: true }).click();
  await expect(page.getByRole('button', { name: 'دریافت answer.pdf', exact: true })).toBeVisible();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA7sAAAAASUVORK5CYII=',
    'base64',
  );
  await choose.setInputFiles({ name: 'answer.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('button', { name: 'دریافت answer.png', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  let navigationPrompt = false;
  page.on('dialog', async (dialog) => {
    navigationPrompt = true;
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'دریافت answer.pdf', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('answer.pdf');
  expect(navigationPrompt).toBe(false);
  await page.getByRole('button', { name: 'حذف answer.png', exact: true }).click();
  await expect(page.getByRole('button', { name: 'دریافت answer.png', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'بازبینی پاسخ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'دریافت answer.pdf', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'تحویل نهایی تکلیف', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'تکلیف تحویل داده شد', exact: true }),
  ).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(state.attempt.attachments).toHaveLength(1);
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) => r.path === '/api/v1/files' && r.method === 'POST',
    ),
  ).toHaveLength(2);
  await mkdir('test-results/profile-school-files', { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/profile-school-files/receipt-mobile.png' });
});

test('pending file never enables final review and a Parent cannot use the Student file proxy', async ({
  page,
  context,
  request,
  browser,
}) => {
  const state = await login(context);
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  await request.post(fixture + '/__test__/next-file-status', { data: { status: 'Pending' } });
  await page.getByLabel('افزودن عکس یا PDF به پاسخ').setInputFiles({
    name: 'pending.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7 pending'),
  });
  await expect(page.getByRole('button', { name: 'بررسی وضعیت فایل', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'بازبینی پاسخ', exact: true })).toBeDisabled();
  await request.post(fixture + '/__test__/ready-files');
  await page.getByRole('button', { name: 'بررسی وضعیت فایل', exact: true }).click();
  await expect(page.getByRole('button', { name: 'دریافت pending.pdf' })).toBeVisible();
  const parent = await browser.newContext({ baseURL: origin });
  try {
    const p = await login(parent, 'Parent');
    const response = await parent.request.get(
      `/api/client/submission-files/00000000-0000-4000-8000-000000000999/content?attemptId=${ids.attempt}`,
      { headers: { 'X-Makan-Context': p.revision } },
    );
    expect(response.status()).toBe(403);
  } finally {
    await parent.close();
  }
  const stale = await context.request.get(
    `/api/client/submission-files/00000000-0000-4000-8000-000000000999?attemptId=${ids.attempt}`,
    { headers: { 'X-Makan-Context': state.revision + 'stale' } },
  );
  expect(stale.status()).toBe(409);
});
