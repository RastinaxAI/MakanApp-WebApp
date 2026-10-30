import { expect, test } from '@playwright/test';

test('local login aliases redirect before OTP while foreign and missing origins stay blocked', async ({
  request,
  baseURL,
}) => {
  const canonical = new URL(baseURL!);
  const alias = canonical.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  const response = await request.get('/enter', {
    headers: { Host: `${alias}:${canonical.port}` },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(new URL('/enter', canonical).href);
  for (const origin of [
    undefined,
    'https://foreign.example',
    `http://${alias}:${canonical.port}`,
  ]) {
    const rejected = await request.post('/api/client/auth/challenge', {
      headers: origin ? { Origin: origin } : {},
      data: {},
    });
    expect(rejected.status()).toBe(403);
    expect((await rejected.json()).code).toBe('ORIGIN_REJECTED');
  }
});

test('production serves its install manifest, worker and no owner handbook', async ({
  request,
  page,
}) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const installed = await manifest.json();
  expect(installed).toMatchObject({
    start_url: '/personal',
    display: 'standalone',
    dir: 'rtl',
  });
  expect(
    installed.icons.every((icon: { src: string }) => icon.src.startsWith('/icons/makan-')),
  ).toBe(true);
  const worker = await request.get('/sw.js');
  expect(worker.ok()).toBe(true);
  expect(worker.headers()['cache-control']).toContain('no-store');
  expect(worker.headers()['service-worker-allowed']).toBe('/');
  expect((await request.get('/guides/makan-owner-guide.pdf')).status()).toBe(404);
  await page.goto('/enter');
  await expect(page.locator('.login-brand-panel .brand-mark image')).toHaveAttribute(
    'href',
    '/brand/makan-logo.png',
  );
  const artwork = await request.get('/brand/makan-logo.png');
  expect(artwork.ok()).toBe(true);
  expect(artwork.headers()['content-type']).toContain('image/png');
  await expect(page.getByRole('button', { name: 'نصب پنل روی دستگاه' })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return new URL(registration.active!.scriptURL).pathname;
    }),
  ).toBe('/sw.js');
});

test('container has no public demo routes', async ({ request }) => {
  for (const path of ['/demo', '/demo/admin', '/demo/organization'])
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
});

test('production container serves login and its bundled styles and fonts', async ({ page }) => {
  const failures: string[] = [];
  const assets: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/_next/static/')) {
      assets.push(response.url());
      if (!response.ok()) failures.push(`Static asset returned ${response.status()}`);
    }
  });
  const response = await page.goto('/enter');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'مشاهده نسخه نمایشی بدون حساب' })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(assets.some((url) => url.includes('.css'))).toBe(true);
  expect(assets.some((url) => url.includes('.woff'))).toBe(true);
  expect(failures).toEqual([]);
});

test('container keeps real pages and APIs protected without a session', async ({ request }) => {
  const page = await request.get('/admin', { maxRedirects: 0 });
  expect(page.status()).toBe(307);
  expect(page.headers().location).toBe('/enter');
  const session = await request.get('/api/session');
  expect(session.status()).toBe(401);
  expect(session.headers()['cache-control']).toContain('no-store');
  expect(session.headers()['set-cookie'] ?? '').not.toContain('makan_session=');
});

test('failed OTP delivery preserves the phone and recovers only after an explicit retry', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/client/auth/challenge', async (route) => {
    calls++;
    if (calls === 1) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 502,
          code: 'OTP_SERVICE_UNAVAILABLE',
          traceId: 'otp-support-id',
        }),
      });
    } else {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          challengeId: '00000000-0000-4000-8000-000000000001',
          expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAtUtc: new Date(Date.now() + 30000).toISOString(),
        }),
      });
    }
  });
  await page.goto('/enter');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09100000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  const alert = page.locator('.login-form .form-message[role="alert"]');
  await expect(alert).toContainText('سرویس ارسال کد ورود');
  await expect(alert).toContainText('otp-support-id');
  await expect(page.getByLabel('شماره همراه', { exact: true })).toHaveValue('09100000000');
  await expect(page.getByRole('button', { name: 'دریافت کد ورود', exact: true })).toBeEnabled();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await expect(page.getByLabel('کد ورود', { exact: true })).toBeVisible();
  await expect(alert).toHaveCount(0);
  expect(calls).toBe(2);
});
