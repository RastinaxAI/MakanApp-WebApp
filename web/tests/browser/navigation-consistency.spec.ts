import { test, expect, login } from './test';

for (const theme of ['light', 'dark']) {
  test(`${theme}: messages and assistant share one navigation geometry and icon family through live transitions`, async ({
    page,
    context,
  }) => {
    await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
    const initial = await login(context, 'Personal', false);
    for (const width of [320, 390, 834, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/personal/messages');
      const nav = page.getByRole('navigation', { name: 'ناوبری حساب شخصی', exact: true });
      await expect(nav).toHaveCount(1);
      await expect(nav.getByRole('link')).toHaveCount(5);
      const baseline = await nav.evaluate((el) => ({
        rect: el.getBoundingClientRect().toJSON(),
        background: getComputedStyle(el).backgroundColor,
        icons: [...el.querySelectorAll('svg')].map((svg) => svg.innerHTML),
      }));
      await nav.getByRole('link', { name: 'دستیار', exact: true }).click();
      await expect(page).toHaveURL(/\/personal\/assistant$/);
      await expect(nav).toHaveCount(1);
      await expect(nav.locator('[aria-current="page"]')).toHaveAccessibleName('دستیار');
      const assistant = await nav.evaluate((el) => ({
        rect: el.getBoundingClientRect().toJSON(),
        background: getComputedStyle(el).backgroundColor,
        icons: [...el.querySelectorAll('svg')].map((svg) => svg.innerHTML),
      }));
      expect(assistant).toEqual(baseline);
      for (const link of await nav.getByRole('link').all()) {
        const box = (await link.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        await expect(link).toBeInViewport();
        const glyph = await link.locator('svg').boundingBox();
        expect(glyph?.width).toBe(24);
        expect(glyph?.height).toBe(24);
      }
      await nav.getByRole('link', { name: 'پیام‌ها', exact: true }).click();
      await expect(page).toHaveURL(/\/personal\/messages$/);
      await expect(nav.locator('[aria-current="page"]')).toHaveAccessibleName('پیام‌ها');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    const after = await (await context.request.get('/api/client/session')).json();
    expect(after.context).toEqual(initial.context);
  });
}

test('bottom navigation stays readable with enlarged text, a safe area and a short viewport', async ({
  page,
  context,
}) => {
  await login(context, 'Personal', false);
  await page.setViewportSize({ width: 320, height: 500 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 34 } });
  for (const path of ['/personal/messages', '/personal/assistant']) {
    await page.goto(path);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    const nav = page.getByRole('navigation', { name: 'ناوبری حساب شخصی', exact: true });
    await expect(nav).toBeVisible();
    for (const link of await nav.getByRole('link').all()) {
      const box = (await link.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height).toBeLessThanOrEqual(500 - 34);
      await expect(link).toBeInViewport();
      await link.focus();
      expect(
        await link.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth)),
      ).toBeGreaterThanOrEqual(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (path.endsWith('assistant')) {
      const input = page.getByRole('textbox', { name: 'سؤال از دستیار', exact: true });
      await input.focus();
      const box = (await input.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual((await nav.boundingBox())!.y);
    }
  }
  await cdp.detach();
});
