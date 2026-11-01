import { test, expect, login, fixture, origin } from './test';
import { mkdir } from 'node:fs/promises';

test.use({
  viewport: { width: 390, height: 844 },
  video: { mode: 'on', size: { width: 390, height: 844 } },
  contextOptions: { reducedMotion: 'reduce' },
});
for (const theme of ['light', 'dark']) {
  test(`recorded ${theme}: chat, profile, assistant, dialogs and back remain coherent`, async ({
    page,
    context,
    request,
  }) => {
    await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
    await request.post(fixture + '/__test__/design');
    const initial = await login(context);
    await page.goto('/personal/education');
    const nav = page.getByRole('navigation', { name: 'ناوبری حساب شخصی', exact: true });
    expect(
      await nav
        .getByRole('link')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe('0s');
    await nav.getByRole('link').first().focus();
    await page.keyboard.press('Tab');
    expect(
      await page.locator(':focus').evaluate((el) => ({
        width: getComputedStyle(el).outlineWidth,
        color: getComputedStyle(el).outlineColor,
      })),
    ).toEqual({
      width: '3px',
      color: theme === 'dark' ? 'rgb(165, 180, 252)' : 'rgb(80, 88, 217)',
    });
    await nav.getByRole('link', { name: 'پیام‌ها', exact: true }).click();
    await page.getByRole('button', { name: 'ایجاد گفت‌وگو یا مخاطب', exact: true }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'ایجاد گفت‌وگو یا مخاطب', exact: true }),
    ).toBeFocused();
    await page.getByRole('link').filter({ hasText: 'مریم رضایی' }).click();
    const field = page.getByRole('textbox', { name: 'متن پیام', exact: true });
    await field.fill('پیام نمونهٔ بررسی جریان اینستاگرامی');
    await field.press('Enter');
    await expect(
      page
        .getByLabel('پیام‌های گفتگو', { exact: true })
        .locator('[data-message-state="history"]')
        .filter({ hasText: 'پیام نمونهٔ بررسی جریان اینستاگرامی' }),
    ).toHaveCount(1);
    await page.getByRole('link', { name: 'بازگشت به فهرست گفتگوها', exact: true }).click();
    await nav.getByRole('link', { name: 'پروفایل', exact: true }).click();
    await page.getByRole('link', { name: 'حساب و ترجیحات', exact: true }).first().click();
    await page.locator('a[href="/personal/settings/privacy"]').first().click();
    await expect(page).toHaveURL(/\/settings\/privacy$/);
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/\/profile$/);
    await nav.getByRole('link', { name: 'دستیار ماکان', exact: true }).click();
    await page.getByRole('tab', { name: 'منابع', exact: true }).click();
    await page.getByRole('button', { name: 'دیدن منابع نمونه', exact: true }).click();
    await page.getByRole('tab', { name: 'گفتگو', exact: true }).click();
    const question = page.getByRole('textbox', { name: 'پرسش از دستیار', exact: true });
    await question.fill('نقش هسته چیست؟');
    expect(
      await question.evaluate((el) => ({
        inner: getComputedStyle(el).outlineWidth,
        outer: getComputedStyle(el.closest('form')!).outlineWidth,
        color: getComputedStyle(el.closest('form')!).outlineColor,
      })),
    ).toEqual({
      inner: '0px',
      outer: '2px',
      color: theme === 'dark' ? 'rgb(165, 180, 252)' : 'rgb(80, 88, 217)',
    });
    await question.press('Enter');
    await expect(page.locator('[data-assistant-response]')).toHaveCount(1);
    await mkdir('output/review/instagram-experience', { recursive: true });
    await page.screenshot({
      path: `output/review/instagram-experience/assistant-focused-${theme}-390.png`,
    });
    await page.getByRole('tab', { name: 'استودیو', exact: true }).click();
    const tool = page.getByRole('button', { name: /فلش‌کارت/ }).first();
    await tool.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tool).toBeFocused();
    await nav.getByRole('link', { name: 'آموزشگاه', exact: true }).click();
    const after = await (await context.request.get(origin + '/api/client/session')).json();
    expect(after.context).toEqual(initial.context);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
