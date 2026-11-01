import { test, expect, login, fixture, origin } from './test';
import { mkdir } from 'node:fs/promises';

const output = 'output/review/instagram-experience';
for (const theme of ['light', 'dark']) {
  for (const role of ['Student', 'Teacher', 'Parent', 'Manager', 'Personal']) {
    test(`Instagram-style four-tab shell: ${role} ${theme}`, async ({ page, context, request }) => {
      test.setTimeout(90000);
      await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
      await request.post(fixture + '/__test__/design');
      const before = await login(context, role, role !== 'Personal');
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('/personal/education');
      await mkdir(output, { recursive: true });
      for (const width of [320, 390, 834, 1024, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        for (const [label, area] of [
          ['آموزشگاه', 'education'],
          ['دستیار ماکان', 'assistant'],
          ['پیام‌ها', 'messages'],
          ['پروفایل', 'profile'],
        ]) {
          const nav = page.getByRole('navigation', { name: 'ناوبری حساب شخصی', exact: true });
          await expect(nav).toHaveCount(1);
          await expect(nav.getByRole('link')).toHaveCount(4);
          await nav.getByRole('link', { name: label, exact: true }).click();
          await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
            'aria-current',
            'page',
          );
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          if (area === 'education' && role === 'Student' && width < 768) {
            const card = page.locator('[data-education-upcoming] > section').first();
            await expect(card).toBeVisible();
            expect((await card.boundingBox())!.width).toBeGreaterThanOrEqual(width - 48);
          }
          await expect(
            page.getByRole('dialog', { name: 'انتخاب فضای کار', exact: true }),
          ).toHaveCount(0);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          for (const link of await nav.getByRole('link').all()) {
            const box = (await link.boundingBox())!;
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
          const navBox = (await nav.boundingBox())!;
          expect(width < 1024 ? navBox.y > 700 : navBox.y < 500).toBe(true);
          if (role === 'Student' && [390, 834, 1440].includes(width)) {
            await page.evaluate(() => document.fonts.ready);
            await page.screenshot({ path: `${output}/${area}-${theme}-${width}.png` });
          }
        }
      }
      const after = await (await context.request.get(origin + '/api/client/session')).json();
      expect(after.context).toEqual(before.context);
      expect(errors).toEqual([]);
      await expect(page.getByRole('link', { name: 'ویرایش پروفایل', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'شناسهٔ حساب', exact: true })).toBeVisible();
    });
  }

  test(`theme ${theme} is applied before the application JavaScript can hydrate`, async ({
    page,
    context,
  }) => {
    await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/_next/**/*.js', async (route) => {
      await ready;
      await route.continue();
    });
    try {
      await page.goto('/enter', { waitUntil: 'commit' });
      await expect(page.locator('body')).toBeAttached();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe(
        theme === 'dark' ? '#000000' : '#ffffff',
      );
    } finally {
      release();
    }
    await page.waitForLoadState('domcontentloaded');
  });
}

test('temporary inbox failure retains known conversations; permission denial removes them', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal/messages');
  const inbox = page.getByLabel('فهرست گفتگوها', { exact: true });
  const row = inbox.getByRole('link').filter({ hasText: 'مریم رضایی' });
  await expect(row).toBeVisible();
  let status = 503;
  await page.route('**/api/client/backend/api/v1/conversations?**', (route) =>
    route.fulfill({ status, json: { code: 'UPSTREAM_UNAVAILABLE', traceId: 'fixture-only' } }),
  );
  await expect(inbox.getByRole('alert')).toBeVisible();
  await expect(row).toBeVisible();
  status = 403;
  await inbox.getByRole('button', { name: 'دریافت دوباره', exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(inbox.getByRole('alert')).toBeVisible();
});
