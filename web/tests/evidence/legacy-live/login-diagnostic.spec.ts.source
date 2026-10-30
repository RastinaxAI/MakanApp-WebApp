import { test, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';

test('entry navigation and visible login-service failure retain the diagnostic trace', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3130',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    const admin = await context.request.get('/admin', { maxRedirects: 0 });
    expect(admin.status()).toBe(404);
    await page.goto('/');
    await expect(page).toHaveURL(/\/enter$/);
    await expect(page.getByRole('heading', { name: 'ورود به ماکان', exact: true })).toBeVisible();
    // Explicit UI-only error fixture: no OTP or login request reaches a real backend.
    const traceId = 'CLIENT-ERROR-FIXTURE-ONLY';
    await page.route('**/api/client/auth/challenge', (route) =>
      route.fulfill({ status: 404, json: { status: 404 } }),
    );
    await page.getByLabel('شماره همراه', { exact: true }).fill('09120000101');
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText(
      'دریافت کد ورود فعلاً ممکن نیست',
    );
    await expect(page.locator('#otp-code')).toHaveCount(0);
    await page.unroute('**/api/client/auth/challenge');
    await page.route('**/api/client/auth/challenge', (route) =>
      route.fulfill({
        status: 202,
        json: {
          challengeId: '11111111-1111-4111-8111-111111111111',
          expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAtUtc: new Date().toISOString(),
        },
      }),
    );
    await page.route('**/api/client/auth/verify', (route) =>
      route.fulfill({ status: 500, json: { status: 500, code: 'UNEXPECTED_ERROR', traceId } }),
    );
    await page.getByLabel('شماره همراه', { exact: true }).fill('09120000101');
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    await page.locator('#otp-code').fill('123456');
    await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText(
      'ورود به‌دلیل خطای سرویس انجام نشد',
    );
    await expect(page.locator('main').getByRole('alert')).toContainText(traceId);
    await expect(page).toHaveURL(/\/enter$/);
    await page.evaluate(() => {
      const notice = document.createElement('div');
      notice.textContent = 'آزمون رابط — پاسخ خطای ساختگی';
      notice.style.cssText =
        'position:fixed;top:4px;left:4px;z-index:99999;background:#fff0ad;color:#422900;padding:6px;font:12px sans-serif';
      document.body.append(notice);
    });
    await mkdir('docs/screenshots/login-diagnostic', { recursive: true });
    await page.screenshot({
      path: 'docs/screenshots/login-diagnostic/personal-error-fixture.png',
      fullPage: true,
    });
    const removedLogin = await context.request.get('/login?access=unavailable');
    expect(removedLogin.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'ورود به پنل مالک پلتفرم' })).toHaveCount(0);
    expect(errors).toEqual([]);
    await writeFile(
      'docs/login-ui-qa-20261029.json',
      JSON.stringify(
        {
          date: '2026-10-29',
          mode: 'Real local page navigation; explicitly intercepted challenge 404/202 and verify 500 for UI only. No real backend login or server permission verification.',
          outcome: 'PASSED',
          checks: [
            'Root opens personal login',
            'Former management page is removed (404)',
            'Missing challenge endpoint does not imply a missing account or claim a code was sent',
            '500 login failure is actionable and does not claim success',
            'Original trace remains visible',
            'Former owner login is removed; no owner link is rendered',
          ],
          pageErrors: errors,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await context.close();
  }
});
