import { test, expect, login, origin, fixture } from './test';
import { mkdir } from 'node:fs/promises';

for (const role of ['Student', 'Teacher', 'Parent', 'Manager']) {
  test(`${role} keeps the selected role across tabs, reload and another browser tab`, async ({
    page,
    context,
  }) => {
    const original = await login(context, role);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/personal/education');
    const changes: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/workspaces/select'))
        changes.push(request.url());
    });
    for (const name of ['دستیار ماکان', 'پیام‌ها', 'پروفایل', 'آموزشگاه', 'پیام‌ها', 'آموزشگاه']) {
      await page
        .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
        .filter({ visible: true })
        .getByRole('link', { name, exact: true })
        .click();
      await expect(page.getByRole('dialog', { name: 'انتخاب فضای کار' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'کجا ادامه می‌دهید؟' })).toHaveCount(0);
      const current = await (await context.request.get(origin + '/api/client/session')).json();
      expect(current.context).toEqual(original.context);
      expect(current.revision).toBe(original.revision);
    }
    await page.reload();
    const second = await context.newPage();
    await second.goto('/personal/messages');
    await expect(second.getByRole('navigation', { name: 'نوع گفتگوها' })).toBeVisible();
    expect(
      (await (await context.request.get(origin + '/api/client/session')).json()).context,
    ).toEqual(original.context);
    expect(changes).toEqual([]);
    await second.close();
    await page.getByRole('button', { name: 'ماکان؛ تغییر نقش و فضای کار', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'انتخاب فضای کار' })).toBeVisible();
  });
}

test('assistant uses the full viewport and readable sample outputs without the extra header', async ({
  page,
  context,
  request,
}) => {
  expect((await request.post(fixture + '/__test__/design')).ok()).toBeTruthy();
  await login(context, 'Student');
  await mkdir('test-results/navigation-experience', { recursive: true });
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/personal/assistant');
    await expect(page.getByText('جایی برای عمیق‌تر یاد گرفتن', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'گشت در نمونه', exact: true })).toHaveCount(0);
    await expect(page.getByText('فضای مطالعهٔ شما', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        'دستیار مبتنی بر منابع هنوز در دسترس نیست. می‌توانید محیط نمونه را بررسی کنید.',
        { exact: true },
      ),
    ).toHaveCount(0);
    if (width <= 1023) await page.getByRole('tab', { name: 'منابع', exact: true }).click();
    await page.getByRole('button', { name: 'دیدن منابع نمونه' }).click();
    if (width <= 1023) await page.getByRole('tab', { name: 'گفتگو', exact: true }).click();
    const answerPane = page.getByLabel('گفتگو با دستیار', { exact: true });
    expect((await answerPane.boundingBox())!.height).toBeGreaterThan(height * 0.54);
    await page
      .getByRole('textbox', { name: 'پرسش از دستیار' })
      .fill('ارتباط هسته و غشای یاخته را با استفاده از هر سه منبع توضیح بده.');
    await page.getByRole('button', { name: 'ارسال پرسش نمونه' }).click();
    const answer = page.locator('[data-assistant-response]');
    await expect(answer).toContainText('این پاسخ نمونه');
    expect(
      await answer.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const composer = await page.getByRole('textbox', { name: 'پرسش از دستیار' }).boundingBox();
    await expect(page.getByRole('textbox', { name: 'پرسش از دستیار' })).toHaveAttribute(
      'type',
      'text',
    );
    const composerForm = await answerPane.locator('form').boundingBox();
    const sendRow = await page.getByRole('button', { name: 'ارسال پرسش نمونه' }).boundingBox();
    expect(composerForm!.height).toBeLessThanOrEqual(62);
    expect(
      Math.abs(composer!.y + composer!.height / 2 - sendRow!.y - sendRow!.height / 2),
    ).toBeLessThanOrEqual(2);
    const dock = await page
      .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
      .filter({ visible: true })
      .boundingBox();
    if (width < 1024) expect(composer!.y + composer!.height).toBeLessThanOrEqual(dock!.y);
    if (width < 1024) {
      const send = await page.getByRole('button', { name: 'ارسال پرسش نمونه' }).boundingBox();
      expect(send!.y + send!.height).toBeLessThanOrEqual(dock!.y);
    }
    await page.screenshot({ path: `test-results/navigation-experience/assistant-${width}.png` });
    if (width <= 1023) await page.getByRole('tab', { name: 'استودیو', exact: true }).click();
    await page.getByRole('button', { name: /خلاصهٔ هوشمند/ }).click();
    const dialog = page.getByRole('dialog', { name: 'خلاصهٔ هوشمند' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(Math.min(900, width - 40));
    await page.keyboard.press('Escape');
    await page.goto('/personal/messages');
    await expect(page.getByText('گفتگوهای شخصی شما', { exact: true })).toHaveCount(0);
    await expect(page.getByText('گفتگوهای آموزشگاه انتخاب‌شده', { exact: true })).toHaveCount(0);
  }
});

test('PWA install offer has a persistent close control and manual installation help', async ({
  page,
  context,
}) => {
  await login(context, 'Student', true, { showInstallOffer: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal/education');
  const offer = page.getByLabel('پیشنهاد نصب ماکان', { exact: true });
  await expect(offer).toBeVisible();
  await page.screenshot({ path: 'test-results/navigation-experience/pwa-offer-390.png' });
  await expect(page.getByText('نسخه جدید پنل آماده است')).toHaveCount(0);
  await offer.getByRole('button', { name: 'نصب ماکان', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'نصب برنامهٔ ماکان' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Safari');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'بستن پیشنهاد نصب ماکان' }).click();
  await expect(offer).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('makan:pwa-install-dismissed:v1'))).toBe(
    '1',
  );
  await page.reload();
  await expect(
    page.getByRole('navigation', { name: 'ناوبری حساب شخصی' }).filter({ visible: true }),
  ).toBeVisible();
  await expect(offer).toHaveCount(0);
  const second = await context.newPage();
  await second.goto('/personal/assistant');
  await expect(second.locator('[data-assistant]')).toBeVisible();
  await expect(second.getByLabel('پیشنهاد نصب ماکان', { exact: true })).toHaveCount(0);
  await second.close();
});

test('PWA installation calls the browser prompt only after a click and does not reload the app', async ({
  page,
  context,
}) => {
  await login(context, 'Student', true, { showInstallOffer: true });
  await page.goto('/personal/education');
  await expect(page.getByLabel('پیشنهاد نصب ماکان', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(window, { testInstallCalls: 0 });
    Object.assign(event, {
      prompt: async () => {
        (window as unknown as { testInstallCalls: number }).testInstallCalls++;
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(event);
  });
  expect(
    await page.evaluate(() => (window as unknown as { testInstallCalls: number }).testInstallCalls),
  ).toBe(0);
  await page
    .getByLabel('پیشنهاد نصب ماکان', { exact: true })
    .getByRole('button', { name: 'نصب ماکان', exact: true })
    .click();
  await expect(page.getByLabel('پیشنهاد نصب ماکان', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { testInstallCalls: number }).testInstallCalls),
  ).toBe(1);
  await expect(page).toHaveURL(/\/personal\/education$/);
});
