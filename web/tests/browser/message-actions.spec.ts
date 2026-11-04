import { test, expect, login, fixture, ids } from './test';
async function message(page: import('@playwright/test').Page) {
  await page.goto('/personal/messages/' + ids.chat);
  await page.getByRole('textbox', { name: 'متن پیام', exact: true }).fill('پیام بررسی منوی ماکان');
  await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  const bubble = page
    .locator('article[data-message-state="history"]')
    .filter({ hasText: 'پیام بررسی منوی ماکان' })
    .first();
  await expect(bubble).toBeVisible();
  return bubble;
}
test('save to self retries one frozen forward operation and receives the real fixture receipt', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  const bubble = await message(page);
  await bubble.getByRole('button', { name: /گزینه‌های پیام/ }).click();
  await page.getByRole('menuitem', { name: 'ذخیره برای خودم', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'ذخیره پیام', exact: true })).toBeEnabled();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/forward', method: 'POST', status: 503 },
  });
  await dialog.getByRole('button', { name: 'ذخیره پیام', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'پیگیری همین درخواست', exact: true }).click();
  await expect(bubble).toContainText('پیام در گفتگوی ذخیره‌شدهٔ شما ثبت شد.');
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const forwards = state.requests.filter((r: { path: string }) => r.path.endsWith('/forward'));
  expect(forwards).toHaveLength(2);
  expect(forwards[0].body).toEqual(forwards[1].body);
});
test('report preserves reason and description after failure and retries the same report id', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  const bubble = await message(page);
  await bubble.getByRole('button', { name: /گزینه‌های پیام/ }).click();
  await page.getByRole('menuitem', { name: 'گزارش پیام', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByLabel('دلیل گزارش', { exact: true }).selectOption('Spam');
  await page.getByLabel('توضیح گزارش', { exact: true }).fill('توضیح نگهداری‌شده در خطا');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/reports', method: 'POST', status: 503 },
  });
  await dialog.getByRole('button', { name: 'ثبت گزارش', exact: true }).click();
  await expect(page.getByLabel('توضیح گزارش', { exact: true })).toHaveValue(
    'توضیح نگهداری‌شده در خطا',
  );
  await dialog.getByRole('button', { name: 'پیگیری همین درخواست', exact: true }).click();
  await expect(bubble).toContainText('گزارش برای بررسی ثبت شد.');
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const reports = state.requests.filter((r: { path: string }) => r.path.endsWith('/reports'));
  expect(reports).toHaveLength(2);
  expect(reports[0].body).toEqual(reports[1].body);
});
