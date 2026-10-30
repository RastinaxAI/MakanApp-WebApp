import { test, expect, login, ids, fixture } from './test';
test('S09 → S17 → S10 persists drafts, retains text on save failure and submits once', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  const answer = page.getByLabel('پاسخ تکلیف', { exact: true });
  await answer.fill('پاسخ ذخیره‌نشدهٔ آزمایشی');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/draft', method: 'PATCH', status: 503 },
  });
  await page.getByRole('button', { name: 'ذخیرهٔ پاسخ', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(answer).toHaveValue('پاسخ ذخیره‌نشدهٔ آزمایشی');
  await expect(page.getByRole('button', { name: 'بازبینی پاسخ', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 834, height: 1194 });
  await expect(answer).toHaveValue('پاسخ ذخیره‌نشدهٔ آزمایشی');
  await page.getByRole('button', { name: 'ذخیرهٔ پاسخ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'بازبینی پاسخ', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'بازبینی پاسخ', exact: true }).click();
  await expect(page).toHaveURL(/\/review\?attempt=/);
  await expect(
    page.getByRole('heading', { name: 'بازبینی پاسخ تکلیف', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'بازگشت و ویرایش پاسخ', exact: true }).click();
  await expect(answer).toHaveValue('پاسخ ذخیره‌نشدهٔ آزمایشی');
  await page.getByRole('button', { name: 'بازبینی پاسخ', exact: true }).click();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/submit', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'تحویل نهایی تکلیف', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/review\?attempt=/);
  await expect(page.getByRole('heading', { name: 'تکلیف تحویل داده شد' })).toHaveCount(0);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/submit', method: 'POST', delay: 400 },
  });
  const post = page.waitForRequest((r) => r.url().endsWith('/submit') && r.method() === 'POST');
  await page.getByRole('button', { name: 'تحویل نهایی تکلیف', exact: true }).click();
  await post;
  await expect(page.getByRole('button', { name: /در حال بررسی و تحویل/ })).toBeDisabled();
  await expect(
    page.getByRole('heading', { name: 'تکلیف تحویل داده شد', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/receipt\?attempt=/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'تکلیف تحویل داده شد', exact: true }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText('PRIVATE EVALUATOR NOTE');
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) => r.path.endsWith('/submit') && r.method === 'POST',
    ),
  ).toHaveLength(2);
});
test('a receipt deep link cannot announce success before actual submission', async ({
  page,
  context,
}) => {
  await login(context);
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  await expect(page).toHaveURL(/\/answer\?attempt=/);
  await page.goto(
    `/personal/education/assignments/${ids.assignment}/receipt?attempt=${ids.attempt}`,
  );
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'هنوز توسط سرویس تأیید نشده',
  );
  await expect(page.getByRole('heading', { name: 'تکلیف تحویل داده شد' })).toHaveCount(0);
});
test('unsaved draft survives reload and cancelled link navigation', async ({ page, context }) => {
  await login(context);
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  const answer = page.getByLabel('پاسخ تکلیف', { exact: true });
  await answer.fill('پیش‌نویس خصوصی من');
  page.once('dialog', (d) => d.dismiss());
  await page.locator('aside').getByRole('link', { name: 'حساب من', exact: true }).first().click();
  await expect(answer).toHaveValue('پیش‌نویس خصوصی من');
  page.once('dialog', (d) => d.accept());
  await page.reload();
  await expect(answer).toHaveValue('پیش‌نویس خصوصی من');
});
