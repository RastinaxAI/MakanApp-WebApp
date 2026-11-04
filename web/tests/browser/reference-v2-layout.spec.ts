import { test, expect, login, fixture } from './test';
test('desktop entry puts product information on the right and both login steps on the left', async ({
  page,
}) => {
  for (const width of [834, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/enter');
    const info = page.getByRole('complementary', { name: 'دربارهٔ ماکان' }),
      form = page.getByRole('region', { name: 'ورود به حساب ماکان' });
    await expect(info).toBeVisible();
    const a = (await info.boundingBox())!,
      b = (await form.boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(a.x);
    await page.getByLabel('شماره همراه', { exact: true }).fill('09120000199');
    await page.getByRole('button', { name: 'دریافت کد تأیید', exact: true }).click();
    await expect(page.getByLabel('کد ورود', { exact: true })).toBeVisible();
    await expect(info).toBeVisible();
    expect((await form.boundingBox())!.x).toBe(b.x);
    await page.getByRole('button', { name: /ویرایش شماره/ }).click();
    await expect(page.getByLabel('شماره همراه', { exact: true })).toHaveValue('09120000199');
  }
});
test('education sections keep the same responsive header, navigation and content edges', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Manager');
  for (const width of [390, 834, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    let baseline: { x: number; width: number; height: number } | undefined;
    for (const path of ['', '/classes', '/members', '/guardians', '/invitations', '/reports']) {
      await page.goto('/personal/education' + path);
      const banner = page.getByRole('banner');
      const nav = page.getByRole('navigation', { name: 'بخش‌های آموزشگاه', exact: true });
      await expect(nav).toBeVisible();
      const box = (await nav.boundingBox())!,
        header = (await banner.boundingBox())!;
      if (!baseline) baseline = { x: box.x, width: box.width, height: header.height };
      expect(box.x).toBeCloseTo(baseline.x, 0);
      expect(box.width).toBeCloseTo(baseline.width, 0);
      expect(header.height).toBeCloseTo(baseline.height, 0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      if (path === '/invitations') {
        const inbox = page.getByRole('region', { name: 'دعوت‌های دریافتی', exact: true });
        await expect(inbox).toBeVisible();
        expect((await inbox.boundingBox())!.width).toBeGreaterThan(box.width * 0.95);
      }
    }
  }
});
test('settings uses the content width and theme selection remains functional', async ({
  page,
  context,
}) => {
  await login(context, 'Student');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/personal/settings');
  const sections = page.getByRole('region', { name: 'بخش‌های تنظیمات' }),
    appearance = page.getByRole('region', { name: 'ظاهر برنامه', exact: true });
  await expect(appearance).toBeVisible();
  const a = (await sections.boundingBox())!,
    b = (await appearance.boundingBox())!;
  expect(a.x).toBeGreaterThan(b.x);
  await appearance.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
test('profile switches only authorized workspaces in place and reloads the authoritative context', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/profile-roles');
  await login(context, 'Manager');
  await page.goto('/personal/profile');
  await expect(page.getByRole('heading', { name: 'دربارهٔ شما' })).toBeVisible();
  const choices = page.getByLabel('تغییر نقش و فضای کار', { exact: true });
  await expect(choices.getByRole('button')).toHaveCount(2);
  const teacher = choices.getByRole('button', { name: /مدرس/ });
  await teacher.click();
  await expect(page).toHaveURL(/\/personal\/profile$/);
  await expect(
    page.getByLabel('تغییر نقش و فضای کار', { exact: true }).getByRole('button', { name: /مدرس/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  const current = await (await context.request.get('/api/client/session')).json();
  expect(current.context.activeRole).toBe('Teacher');
  await page.reload();
  await expect(
    page.getByLabel('تغییر نقش و فضای کار', { exact: true }).getByRole('button', { name: /مدرس/ }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('a rejected profile role switch preserves the previous server context', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/profile-roles');
  await login(context, 'Manager');
  await page.goto('/personal/profile');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/workspaces/select', method: 'POST', status: 503 },
  });
  await page
    .getByLabel('تغییر نقش و فضای کار', { exact: true })
    .getByRole('button', { name: /مدرس/ })
    .click();
  await expect(
    page.getByRole('alert').and(page.locator(':not(#__next-route-announcer__)')),
  ).toBeVisible();
  expect((await (await context.request.get('/api/client/session')).json()).context.activeRole).toBe(
    'Manager',
  );
  await page.reload();
  await expect(
    page
      .getByLabel('تغییر نقش و فضای کار', { exact: true })
      .getByRole('button', { name: /مدیر آموزشگاه/ }),
  ).toHaveAttribute('aria-pressed', 'true');
});
