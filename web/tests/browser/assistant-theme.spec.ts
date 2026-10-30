import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';

test('dark theme stays coherent across panels and the assistant gives the answer most of the height', async ({
  page,
  context,
  request,
}) => {
  expect((await request.post(fixture + '/__test__/design')).ok()).toBeTruthy();
  await login(context, 'Student');
  await mkdir('test-results/assistant-theme', { recursive: true });
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [name, url] of [
      ['education', '/personal/education'],
      ['profile', '/personal/profile'],
    ]) {
      await page.goto(url);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      if (name === 'education') {
        await expect(page.locator('[data-education-upcoming] > section')).toHaveCount(3);
        expect(
          await page
            .locator('[data-education-upcoming] > section')
            .first()
            .evaluate((el) => getComputedStyle(el).backgroundColor),
        ).not.toBe('rgb(255, 255, 255)');
      }
      if (name === 'profile')
        await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `test-results/assistant-theme/${name}-dark-${width}.png` });
    }
    await page.goto('/personal/assistant');
    const pane = page.getByLabel('گفتگو با دستیار', { exact: true });
    const field = page.getByRole('textbox', { name: 'پرسش از دستیار' });
    await expect(field).toBeDisabled();
    await expect(pane).toContainText('ارسال واقعی فعلاً فعال نیست');
    await expect(page.getByText('فضای مطالعهٔ شما', { exact: true })).toHaveCount(0);
    if (width <= 1023) await page.getByRole('tab', { name: 'منابع', exact: true }).click();
    await page.getByRole('button', { name: 'دیدن منابع نمونه' }).click();
    if (width <= 1023) await page.getByRole('tab', { name: 'گفتگو', exact: true }).click();
    await field.fill('لطفاً رابطهٔ هسته، غشا و میتوکندری را بر اساس منابع انتخاب‌شده توضیح بده.');
    await field.press('Enter');
    await expect(page.locator('[data-assistant-response]')).toHaveCount(1);
    await expect(field).toHaveValue('');
    await expect(pane).toContainText('این پاسخ نمونه');
    const surface = await pane.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(surface).not.toBe('rgb(255, 255, 255)');
    const body = pane.locator('[class*="chatBody"]');
    const view = await body.boundingBox();
    expect(view!.height).toBeGreaterThan(height * 0.48);
    await body.evaluate((node) => {
      node.scrollTop = 0;
    });
    await expect(page.locator('[data-assistant-response]')).toContainText('پاسخ نمایشی');
    await page.screenshot({ path: `test-results/assistant-theme/assistant-dark-${width}.png` });
    // Personal messaging no longer changes the selected educational workspace.
    await page.goto('/personal/messages');
    await page.goto('/personal/messages/' + ids.chat);
    await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/assistant-theme/chat-dark-${width}.png` });
    await page.goto('/personal/profile');
    await page
      .getByRole('region', { name: 'فضاهای من', exact: true })
      .getByRole('button', { name: /آموزشگاه آفتاب/ })
      .click();
    await expect(page).toHaveURL(/\/personal$/);
    await page.goto('/personal/settings/appearance');
    await expect(page.getByRole('radio', { name: 'تاریک', exact: true })).toBeChecked();
  }
  await page.getByRole('radio', { name: 'روشن', exact: true }).check();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
