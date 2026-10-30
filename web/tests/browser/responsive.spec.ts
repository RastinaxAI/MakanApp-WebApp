import { mkdir } from 'node:fs/promises';
import { test, expect, login, ids, origin } from './test';
test('small desktop layout remains a sidebar across manager pages and client-side tab changes', async ({
  page,
  context,
}) => {
  await login(context, 'Manager');
  await mkdir('test-results/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1024, height: 900 });
  for (const area of ['members', 'invitations', 'classes', 'guardians', 'reports']) {
    await page.goto('/personal/education/' + area);
    const navigation = page
      .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
      .filter({ visible: true });
    await expect(navigation).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect((await navigation.boundingBox())!.y).toBeLessThan(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: 'test-results/screenshots/manager-desktop-1024.png' });
  for (const width of [1199, 1024, 834, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const label of ['پیام‌ها', 'پروفایل', 'دستیار ماکان', 'آموزشگاه']) {
      const navigation = page
        .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
        .filter({ visible: true });
      await navigation.getByRole('link', { name: label, exact: true }).click();
      await expect(navigation.getByRole('link', { name: label, exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      if (width < 1024) expect((await navigation.boundingBox())!.y).toBeGreaterThan(700);
      if (width >= 1024) expect((await navigation.boundingBox())!.y).toBeLessThan(500);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
test('V2 navigation stays labeled and clear at mobile, tablet, intermediate and desktop widths', async ({
  page,
  context,
}) => {
  await login(context);
  await page.goto('/personal/education');
  await expect(page.getByRole('heading', { name: 'نمای آموزشگاه', exact: true })).toBeVisible();
  await mkdir('test-results/screenshots', { recursive: true });
  for (const width of [320, 390, 767, 768, 834, 1024, 1199, 1200, 1440, 1920, 390]) {
    await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
    const nav = page
      .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
      .filter({ visible: true });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('link')).toHaveCount(4);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    if (width < 1024) {
      const box = await nav.boundingBox();
      expect(box!.y).toBeGreaterThan(700);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      for (const link of await nav.getByRole('link').all()) {
        const r = await link.boundingBox();
        expect(r!.height).toBeGreaterThanOrEqual(44);
        expect(await link.locator('svg').evaluate((el) => el.getBoundingClientRect().width)).toBe(
          22,
        );
      }
    } else {
      const sidebar = page.getByRole('complementary').filter({ has: nav });
      await expect(sidebar).toBeVisible();
      const box = await nav.boundingBox();
      expect(box!.y).toBeLessThan(500);
    }
    if ([390, 834, 1440].includes(width))
      await page.screenshot({ path: `test-results/screenshots/education-${width}.png` });
  }
});
test('focused chat and independent form reserve their own footer without the tablet dock', async ({
  page,
  context,
}) => {
  await login(context, 'Student', false);
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto('/personal/messages/' + ids.chat);
  const textbox = page.getByRole('textbox', { name: 'متن پیام', exact: true });
  await expect(textbox).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'ناوبری حساب شخصی' }).filter({ visible: true }),
  ).toHaveCount(0);
  const r = await textbox.boundingBox();
  expect(r!.y + r!.height).toBeLessThanOrEqual(1194);
});
test('workspace dialog restores focus and an external context change clears prior role data', async ({
  page,
  context,
}) => {
  const current = await login(context, 'Teacher');
  await page.goto('/personal/education');
  const trigger = page.getByRole('button', { name: /فضای کار:/ });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'انتخاب فضای کار' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /فضای شخصی نمونه/ }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  const changed = await context.request.post(
    origin + '/api/client/backend/api/v1/workspaces/select',
    {
      headers: { Origin: origin, 'X-Makan-Context': current.revision },
      data: { workspaceType: 'Personal', membershipId: null, role: null },
    },
  );
  expect(changed.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'آموزشگاه‌های من', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'میز کار معلم', exact: true })).toHaveCount(0);
});
