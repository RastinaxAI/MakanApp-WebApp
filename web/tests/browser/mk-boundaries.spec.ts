import { test, expect, login } from './test';
test('unavailable linked class space cannot render a sample conversation in connected mode', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await page.goto('/personal/extracurricular/classes/00000000-0000-4000-8000-000000000002/group');
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.locator('.bubble,.composer')).toHaveCount(0);
  expect((await request.get('/preview/reference/MK-19')).status()).toBe(404);
  // Next renders a streamed not-found response after the authenticated layout;
  // assert its visible boundary rather than requiring an unstreamed HTTP status.
  await page.goto('/personal/extracurricular/classes/not-a-class/group');
  await expect(
    page.getByRole('heading', { name: 'صفحه در دسترس نیست', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.bubble,.composer')).toHaveCount(0);
});
test('catalog preserves the query and scroll position after Back', async ({ page, context }) => {
  await login(context, 'Student', false);
  await page.setViewportSize({ width: 390, height: 300 });
  await page.goto('/personal/resources');
  await page.getByLabel('جستجوی منابع', { exact: true }).fill('آزمایشی');
  await expect(page.getByRole('link', { name: 'منبع شخصی آزمایشی', exact: true })).toBeVisible();
  const pane = page.locator('.app-body');
  const previous = await pane.evaluate((node) => {
    node.scrollTop = 200;
    return node.scrollTop;
  });
  expect(previous).toBeGreaterThan(0);
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'گزینه‌های بیشتر', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/profile$/);
  await page.goBack();
  await expect(page.getByLabel('جستجوی منابع', { exact: true })).toHaveValue('آزمایشی');
  await expect
    .poll(() => pane.evaluate((node) => node.scrollTop))
    .toBeGreaterThanOrEqual(previous - 2);
});
test('native lesson and answer routes keep authorization and school context', async ({
  page,
  context,
}) => {
  const session = await login(context);
  await page.goto('/personal/education/lessons/00000000-0000-4000-8000-000000000005');
  await expect(page.locator('[data-mk-view="MK-05"]')).toBeVisible();
  await page.goto('/personal/education/assignments/00000000-0000-4000-8000-000000000003/answer');
  await expect(page.locator('[data-mk-view="MK-06"]')).toBeVisible();
  const after = await (await context.request.get('/api/client/session')).json();
  expect(after.context).toEqual(session.context);
});
