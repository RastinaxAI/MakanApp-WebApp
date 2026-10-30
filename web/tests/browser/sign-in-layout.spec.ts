import { test, expect, login } from './test';

test('phone and OTP enforce exact lengths, normalize Persian digits and reject oversized paste', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/client/auth/')) calls.push(request.url());
  });
  await page.goto('/enter');
  const phone = page.getByRole('textbox', { name: 'شماره همراه', exact: true });
  await expect(phone).toHaveAttribute('maxlength', '11');
  for (const value of ['0912000010', '08120000101']) {
    await phone.fill(value);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
  }
  await phone.fill('');
  await phone.evaluate((node) => {
    const data = new DataTransfer();
    data.setData('text', '091200001019');
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  await expect(phone).toHaveValue('');
  expect(calls).toHaveLength(0);
  await phone.fill('۰۹۱۲۰۰۰۰۱۰۱');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  const otp = page.getByRole('textbox', { name: 'کد ورود', exact: true });
  await expect(otp).toBeVisible();
  await expect(otp).toHaveAttribute('maxlength', '6');
  await otp.fill('12345');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(otp).toHaveAttribute('aria-invalid', 'true');
  await otp.fill('');
  await otp.evaluate((node) => {
    const data = new DataTransfer();
    data.setData('text', '1234567');
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  await expect(otp).toHaveValue('');
  expect(calls.filter((url) => url.endsWith('/verify'))).toHaveLength(0);
  await otp.fill('۱۲۳۴۵۶');
  await page.locator('form').evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page).toHaveURL(/\/personal\/workspaces/);
  expect(calls.filter((url) => url.endsWith('/challenge'))).toHaveLength(1);
  expect(calls.filter((url) => url.endsWith('/verify'))).toHaveLength(1);
});

test('all invitation entry points converge on one inbox', async ({ page, context }) => {
  await login(context);
  await page.goto('/personal/invitations');
  await expect(page).toHaveURL(/\/personal\/education\/invitations$/);
  await expect(page.getByRole('heading', { name: 'دعوت‌های من', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'دعوت‌ها در آموزشگاه', exact: true })).toHaveCount(0);
  await page.goto('/personal/settings');
  const invitationLink = page.getByRole('link', { name: /دعوت‌های من/ });
  await expect(invitationLink).toHaveAttribute('href', '/personal/education/invitations');
  await invitationLink.click();
  await expect(page.getByRole('region', { name: 'دعوت‌های دریافتی', exact: true })).toHaveCount(1);
});

test('entry actions follow viewport size without retaining a mobile layout on desktop', async ({
  page,
}) => {
  await page.goto('/enter');
  for (const width of [390, 834, 1024, 1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const action = page.getByRole('button', { name: 'دریافت کد ورود', exact: true });
    await expect(action).toBeInViewport();
    expect(await action.locator('..').evaluate((node) => getComputedStyle(node).position)).toBe(
      width < 768 ? 'fixed' : 'static',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
