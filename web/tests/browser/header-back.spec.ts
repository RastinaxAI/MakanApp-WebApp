import { test, expect, login, ids } from './test';
import { mkdir } from 'node:fs/promises';
test('class entry is a filled navigation button and lesson direct entry has one contextual back arrow in the header', async ({
  page,
  context,
}) => {
  await login(context, 'Teacher');
  await mkdir('output/review/header-back', { recursive: true });
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/personal/education/classes');
    const enter = page.getByRole('link', {
      name: 'ورود به کلاس کلاس آزمایشی ریاضی با نام بلند برای بررسی واکنش‌گرایی',
      exact: true,
    });
    await expect(enter).toBeVisible();
    await expect(enter).toHaveClass(/button-primary/);
    expect(await enter.locator('svg').count()).toBe(0);
    expect((await enter.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `output/review/header-back/classes-${width}.png` });
    await page.goto(`/personal/education/lessons/${ids.lesson}`);
    await expect(
      page.getByRole('heading', { name: 'درس منتشرشدهٔ آزمایشی', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('بازگشت به محتوای کلاس', { exact: true })).toHaveCount(0);
    const back = page.getByRole('banner').getByRole('link', { name: 'بازگشت', exact: true });
    await expect(back).toHaveAttribute(
      'href',
      `/personal/education/classes/${ids.class}?tab=lessons`,
    );
    await expect(back.locator('svg')).toBeVisible();
    expect((await back.innerText()).trim()).toBe('');
    await page.screenshot({ path: `output/review/header-back/lesson-${width}.png` });
    await back.click();
    await expect(page).toHaveURL(new RegExp(`/classes/${ids.class}\\?tab=lessons$`));
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'بازگشت', exact: true }),
    ).toHaveAttribute('href', '/personal/education/classes');
  }
});
test('the header arrow respects unsaved edits and each settings page keeps its own parent destination', async ({
  page,
  context,
}) => {
  await login(context, 'Student');
  await page.goto('/personal/profile/edit');
  const name = page.getByLabel('نام نمایشی', { exact: true });
  await name.fill('پیش‌نویس حفظ‌شده');
  const back = page.getByRole('banner').getByRole('link', { name: 'بازگشت', exact: true });
  await expect(back).toHaveAttribute('href', '/personal/profile');
  page.once('dialog', (d) => d.dismiss());
  await back.click();
  await expect(page).toHaveURL(/\/profile\/edit$/);
  await expect(name).toHaveValue('پیش‌نویس حفظ‌شده');
  page.once('dialog', (d) => d.accept());
  await back.click();
  await expect(page).toHaveURL(/\/personal\/profile$/);
  await page.goto('/personal/settings/privacy');
  await expect(page.getByRole('main').getByText('بازگشت به تنظیمات', { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'بازگشت', exact: true }),
  ).toHaveAttribute('href', '/personal/settings');
  await page.goto('/personal/settings/notifications/Messages');
  await expect(page.getByLabel('اعلان دستگاه', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'بازگشت', exact: true }),
  ).toHaveAttribute('href', /\/settings\/notifications/);
});
