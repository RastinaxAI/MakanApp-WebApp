import { test, expect, login, fixture } from './test';
test('profile form retains user input after a failed save and persists theme through settings', async ({
  context,
  page,
  request,
}) => {
  await login(context, 'Personal', false);
  await page.goto('/personal/profile/edit');
  await page.getByLabel('نام نمایشی', { exact: true }).fill('نام نمونهٔ بررسی خطا');
  const sessionCheck = page.waitForResponse((r) => r.url().endsWith('/api/client/session'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await sessionCheck;
  await expect(page.getByLabel('نام نمایشی', { exact: true })).toHaveValue('نام نمونهٔ بررسی خطا');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/me/profile', method: 'PATCH', status: 503 },
  });
  await page.getByRole('button', { name: 'ثبت تغییرات', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('نام نمایشی', { exact: true })).toHaveValue('نام نمونهٔ بررسی خطا');
  await page.getByRole('button', { name: 'ثبت تغییرات', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/profile$/);
  await expect(
    page.getByRole('heading', { name: 'نام نمونهٔ بررسی خطا', exact: true }),
  ).toBeVisible();
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک' }).check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
