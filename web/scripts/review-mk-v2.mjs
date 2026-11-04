import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const phase = process.argv[2] ?? 'after';
if (!['before', 'after'].includes(phase)) throw Error('Unknown phase');
const origin = 'http://127.0.0.1:3144',
  fixture = 'http://127.0.0.1:3464';
const directory = process.env.MK_REVIEW_OUTPUT ?? 'output/review/mk-v3/' + phase;
await fs.mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function login(context) {
  const headers = { Origin: origin };
  const c = await context.request.post(origin + '/api/client/auth/challenge', {
    headers,
    data: { phoneNumber: '09120000104' },
  });
  const v = await context.request.post(origin + '/api/client/auth/verify', {
    headers,
    data: {
      phoneNumber: '09120000104',
      challengeId: (await c.json()).challengeId,
      code: '123456',
      deviceName: 'V2 isolated visual review',
    },
  });
  if (!v.ok()) throw Error('Fixture login failed');
  const state = await (await context.request.get(origin + '/api/client/session')).json();
  const rows = await (
    await context.request.get(origin + '/api/client/backend/api/v1/workspaces/me', {
      headers: { 'X-Makan-Context': state.revision },
    })
  ).json();
  const w = rows.find((x) => x.role === 'Manager');
  const selected = await context.request.post(
    origin + '/api/client/backend/api/v1/workspaces/select',
    {
      headers: { ...headers, 'X-Makan-Context': state.revision },
      data: { workspaceType: 'Organization', membershipId: w.membershipId, role: w.role },
    },
  );
  if (!selected.ok()) throw Error('Fixture workspace failed');
}
try {
  for (const theme of phase === 'after' ? ['light', 'dark'] : ['light']) {
    for (const width of phase === 'after' ? [320, 390, 834, 1024, 1440, 1920] : [390, 834, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 834 ? 1112 : 960 },
        locale: 'fa-IR',
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      await context.addInitScript((theme) => {
        localStorage.setItem('makan:pwa-install-dismissed:v1', '1');
        localStorage.setItem('makan-theme', theme);
      }, theme);
      await context.request.post(fixture + '/__test__/reset');
      await context.request.post(fixture + '/__test__/design');
      await login(context);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const area of [
        'education',
        'education/classes',
        'education/members',
        'education/guardians',
        'education/invitations',
        'education/reports',
        'settings',
        'profile',
      ]) {
        await page.goto(origin + '/personal/' + area, { waitUntil: 'domcontentloaded' });
        await page.getByRole('main').waitFor();
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(250);
        const key = area.replaceAll('/', '-');
        await page.screenshot({ path: directory + '/' + key + '-' + width + '-' + theme + '.png' });
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          header: document.querySelector('header')?.getBoundingClientRect().toJSON(),
          main: document.querySelector('main,[role="main"]')?.getBoundingClientRect().toJSON(),
        }));
        results.push({ area, width, theme, errors: [...errors], ...metrics });
      }
      await context.close();
      const auth = await browser.newContext({
        viewport: { width, height: 960 },
        locale: 'fa-IR',
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      await auth.addInitScript((theme) => localStorage.setItem('makan-theme', theme), theme);
      const p = await auth.newPage();
      await p.goto(origin + '/enter');
      await expect(p.locator('html')).toHaveAttribute('data-theme', theme);
      await p.evaluate(() => document.fonts.ready);
      await p.getByLabel('شماره همراه', { exact: true }).fill('09120000199');
      await p.screenshot({ path: directory + '/phone-' + width + '-' + theme + '.png' });
      await p.getByRole('button', { name: 'دریافت کد تأیید', exact: true }).click();
      await expect(p.getByLabel('کد ورود', { exact: true })).toBeVisible();
      await p.screenshot({ path: directory + '/otp-' + width + '-' + theme + '.png' });
      await auth.close();
      console.log('Captured ' + width + ' / ' + theme);
    }
  }
} finally {
  await browser.close();
  await fs.writeFile(directory + '/results.json', JSON.stringify(results, null, 2) + '\n');
}
