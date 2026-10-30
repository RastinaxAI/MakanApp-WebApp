import { test, expect, login, ids, fixture } from './test';
import { mkdir } from 'node:fs/promises';

const shots = 'output/review/assessment-settings';
test('assignment answer sheet has context, stages and in-flow actions at all supported widths', async ({
  page,
  context,
}) => {
  await login(context);
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'پاسخ‌نامهٔ تکلیف', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'مراحل تحویل تکلیف' })).toContainText('نوشتن پاسخ');
  const answer = page.getByLabel('پاسخ تکلیف', { exact: true });
  await answer.fill('پاسخ مفصل من\nخط دوم پاسخ؛ متن باید در تغییر اندازه باقی بماند.');
  await mkdir(shots, { recursive: true });
  for (const width of [320, 390, 834, 1440]) {
    await page.setViewportSize({ width, height: width >= 834 ? 1000 : 844 });
    await answer.scrollIntoViewIfNeeded();
    await expect(answer).toHaveValue(/خط دوم پاسخ/);
    expect(await answer.evaluate((el) => getComputedStyle(el).minHeight)).toMatch(
      /260px|290px|320px/,
    );
    expect(
      await page
        .getByRole('button', { name: 'ذخیرهٔ پاسخ', exact: true })
        .evaluate((el) => getComputedStyle(el.parentElement!).position),
    ).toBe('static');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `${shots}/assignment-${width}.png` });
  }
});

test('exam answer map preserves edits on failed refresh, reviews only saved answers and adapts to each width', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context);
  await page.goto(`/personal/education/exams/${ids.exam}`);
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  const nav = page.getByRole('complementary', { name: 'پاسخ‌برگ آزمون' });
  await nav.getByRole('button', { name: /رفتن به پرسش ۳؛/ }).click();
  await page.getByRole('radio', { name: '۴', exact: true }).check();
  await expect(nav.getByRole('button', { name: /رفتن به پرسش ۳؛ ذخیره‌نشده/ })).toHaveAttribute(
    'data-state',
    'dirty',
  );
  await page.getByText('وضعیت ذخیرهٔ پاسخ‌ها', { exact: true }).click();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/answers', method: 'GET', status: 503 },
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'بازخوانی پاسخ‌های ثبت‌شده', exact: true }).click();
  await expect(page.getByRole('radio', { name: '۴', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'ذخیرهٔ پاسخ 3', exact: true }).click();
  await expect(nav.getByRole('button', { name: /رفتن به پرسش ۳؛ ذخیره‌شده/ })).toHaveAttribute(
    'data-state',
    'saved',
  );
  await expect(page.getByRole('timer')).toContainText(/\d{2}:\d{2}/);
  await mkdir(shots, { recursive: true });
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('radio', { name: '۴', exact: true }).scrollIntoViewIfNeeded();
    const timer = await page.getByRole('timer').boundingBox();
    expect(timer!.y).toBeGreaterThanOrEqual(0);
    expect(timer!.x + timer!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page
        .locator('[data-exam-room] > footer')
        .evaluate((el) => getComputedStyle(el).position),
    ).toBe('static');
    await page.screenshot({ path: `${shots}/exam-${width}.png` });
  }
  await page.getByRole('button', { name: 'مرور و تحویل آزمون', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'پرسش ۳' })).toContainText('۴');
  await expect(page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true })).toBeEnabled();
  await page.screenshot({ path: `${shots}/exam-review-desktop.png` });
});

test('exam countdown expires from server time, locks writing and never fabricates final submission', async ({
  page,
  context,
  request,
}) => {
  await page.clock.install();
  const server = '2026-10-29T12:00:00Z',
    deadline = '2026-10-29T12:00:30Z';
  await page.route(
    '**/api/client/backend/api/v1/academic/exams/*/attempts/start',
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({
        response,
        json: { ...body, serverNowUtc: server, effectiveDeadlineUtc: deadline },
      });
    },
  );
  await page.route(
    '**/api/client/backend/api/v1/academic/exam-attempts/*/answers',
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({
        response,
        json: { ...body, writeLease: { ...body.writeLease, serverNowUtc: server } },
      });
    },
  );
  await login(context);
  await page.goto(`/personal/education/exams/${ids.exam}`);
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  const answer = page.getByLabel('پاسخ پرسش 1', { exact: true });
  await expect(answer).toBeEnabled();
  await answer.fill('پاسخ هنوز ارسال نشده است');
  await page.clock.fastForward(31000);
  await expect(page.getByRole('timer')).toContainText('00:00');
  await expect(answer).toBeDisabled();
  await expect(answer).toHaveValue('پاسخ هنوز ارسال نشده است');
  await expect(page.getByRole('button', { name: 'ذخیرهٔ پاسخ 1', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'آزمون ثبت نهایی شد' })).toHaveCount(0);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(state.requests.filter((r: { path: string }) => r.path.endsWith('/finalize'))).toHaveLength(
    0,
  );
});

test('privacy save stays inside its form, retains failed edits and uses returned versions for later saves', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await page.goto('/personal/settings/privacy');
  const select = page.getByLabel('دریافت پیام مستقیم', { exact: true });
  const save = page.getByRole('button', { name: 'ثبت تنظیمات', exact: true });
  await expect(save).toBeDisabled();
  await select.selectOption('Nobody');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/messaging/privacy', method: 'PUT', status: 503 },
  });
  await save.click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(select).toHaveValue('Nobody');
  await expect(page.getByText('تنظیمات در سرور ثبت شد.', { exact: true })).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'دریافت نسخهٔ تازه', exact: true }).click();
  await expect(select).toHaveValue('Nobody');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/messaging/privacy', method: 'PUT', delay: 350 },
  });
  await save.click();
  await expect(page.getByRole('button', { name: 'در حال ثبت…', exact: true })).toBeDisabled();
  await expect(page.getByText('تنظیمات در سرور ثبت شد.', { exact: true })).toBeVisible();
  await select.selectOption('Contacts');
  await save.click();
  await expect(save).toBeDisabled();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const puts = state.requests.filter(
    (r: { path: string; method: string }) =>
      r.path.endsWith('/messaging/privacy') && r.method === 'PUT',
  );
  expect(puts).toHaveLength(3);
  expect(puts.at(-1).body.expectedVersion).toBe('2');
  await mkdir(shots, { recursive: true });
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await save.scrollIntoViewIfNeeded();
    expect(
      await page.locator('[data-privacy-actions]').evaluate((el) => getComputedStyle(el).position),
    ).toBe('static');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `${shots}/privacy-${width}.png` });
  }
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await page.goto('/personal/settings/privacy');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'ثبت تنظیمات', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/privacy-dark-mobile.png` });
});
