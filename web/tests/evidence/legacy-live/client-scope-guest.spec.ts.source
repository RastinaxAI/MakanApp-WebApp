import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
test('client entry, install targets and former platform surfaces', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3130',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const calls: string[] = [];
  const removed: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (r) => calls.push(new URL(r.url()).pathname));
  try {
    await page.goto('/');
    await expect(page).toHaveURL(/\/enter$/);
    await expect(page.getByRole('heading', { name: 'ورود به ماکان', exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('مالک پلتفرم');
    expect(
      await page.locator('a[href^="/admin"],a[href^="/login"],a[href^="/organization"]').count(),
    ).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const path of [
      '/login',
      '/login?access=unavailable',
      '/admin',
      '/admin/users',
      '/organization',
      '/organization/classes',
      '/api/session',
      '/api/backend/api/admin/v1/me',
      '/design-review',
      '/design-review/atlas/plans',
      '/guides/makan-owner-guide.pdf',
    ]) {
      const r = await context.request.get(path, { maxRedirects: 0 });
      removed.push({ path, status: r.status() });
      expect(r.status(), path).toBe(404);
    }
    const oldAuth = await context.request.post('/api/auth/challenge', {
      headers: { Origin: 'http://127.0.0.1:3130' },
      data: {},
    });
    expect(oldAuth.status()).toBe(404);
    const bypass = await context.request.get('/api/client/backend/api/admin/v1/me');
    expect(bypass.status()).toBe(404);
    await context.addCookies([
      {
        name: 'makan_session',
        value: '11111111-1111-4111-8111-111111111111',
        url: 'http://127.0.0.1:3130',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    expect((await context.request.get('/api/client/session')).status()).toBe(401);
    const personal = await context.request.get('/personal', { maxRedirects: 0 });
    expect(personal.status()).toBe(307);
    expect(personal.headers().location).toBe('/enter');
    const manifest = await (await context.request.get('/manifest.webmanifest')).json();
    expect(manifest.start_url).toBe('/personal');
    expect(
      manifest.shortcuts.every((shortcut: { url: string }) =>
        shortcut.url.startsWith('/personal/'),
      ),
    ).toBe(true);
    expect(calls.some((path) => /^\/api\/(auth|session|backend)(\/|$)/.test(path))).toBe(false);
    expect(errors).toEqual([]);
    await mkdir('docs/screenshots/client-only', { recursive: true });
    for (const [width, height, name] of [
      [390, 844, 'mobile'],
      [820, 1180, 'tablet'],
      [1440, 1000, 'desktop'],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({
        path: `docs/screenshots/client-only/login-${name}.png`,
        fullPage: true,
      });
    }
    await writeFile(
      'docs/client-only-scope-qa.json',
      JSON.stringify(
        {
          outcome: 'PASSED',
          mode: 'Real local route/UI/PWA checks without login or backend writes; not authenticated service acceptance.',
          removed,
          oldAuth: oldAuth.status(),
          clientAdminBypass: bypass.status(),
          legacyCookieGrantsPersonalSession: false,
          manifestStart: manifest.start_url,
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
