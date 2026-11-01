import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
if (process.env.MAKAN_ALLOW_TEST_ACCOUNT_REVIEW !== '1' || process.env.CI)
  throw Error('Explicit operator opt-in required');
const origin = 'http://127.0.0.1:8080';
const report = {
  date: '2026-11-01',
  account: 'User',
  backend: 'http://94.184.32.84:8090',
  scope:
    'Own test login, personal workspace, read-only navigation; no messages or domain mutations',
  checks: [],
  pageErrors: [],
  serviceErrors: [],
  blockedMutations: [],
};
const out = 'docs/quality/USER_PERSONAL_ACCOUNT_REVIEW.json';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  baseURL: origin,
  viewport: { width: 390, height: 844 },
  timezoneId: 'Asia/Tehran',
});
await context.addInitScript(() => localStorage.setItem('makan:pwa-install-dismissed:v1', '1'));
await context.route('**/*', (route) => {
  const r = route.request(),
    u = new URL(r.url());
  if (!['blob:', 'data:', 'about:'].includes(u.protocol) && u.origin !== origin)
    return route.abort('blockedbyclient');
  if (
    u.pathname.startsWith('/api/client/backend/') &&
    !['GET', 'HEAD'].includes(r.method()) &&
    !u.pathname.endsWith('/workspaces/select')
  ) {
    report.blockedMutations.push({
      method: r.method(),
      path: u.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id'),
    });
    return route.abort('blockedbyclient');
  }
  return route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.on('pageerror', (e) => report.pageErrors.push(e.message.replace(/09\d{9}/g, '[test-phone]')));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/client/backend/'))
    report.serviceErrors.push({
      status: r.status(),
      path: new URL(r.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id'),
    });
});
let selections = 0;
page.on('request', (r) => {
  if (r.method() === 'POST' && r.url().endsWith('/workspaces/select')) selections++;
});
async function session() {
  const r = await context.request.get('/api/client/session');
  assert.equal(r.status(), 200);
  return r.json();
}
function identity(s) {
  return {
    workspaceType: s.context.workspaceType,
    activeRole: s.context.activeRole,
    organizationId: s.context.organizationId,
    membershipId: s.context.membershipId,
  };
}
try {
  await page.goto('/enter');
  await page.getByRole('textbox', { name: 'شماره همراه', exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
  await page.getByRole('textbox', { name: 'کد ورود', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/workspaces$/);
  const initial = await session();
  const s = await context.request.get('/api/client/backend/api/v1/workspaces/snapshot', {
    headers: { 'X-Makan-Context': initial.revision },
  });
  assert.equal(s.status(), 200);
  const snapshot = await s.json();
  report.personalWorkspaceVisible = snapshot.personalWorkspaceVisible;
  assert.equal(snapshot.personalWorkspaceVisible, true);
  assert.ok(
    snapshot.workspaces.some(
      (w) => w.workspaceType === 'Personal' && w.canEnter && w.isVisible !== false,
    ),
  );
  await page.getByRole('main').getByRole('button').filter({ hasText: 'حساب شخصی' }).first().click();
  await expect(page).not.toHaveURL(/\/workspaces$/);
  const baseline = await session();
  assert.deepEqual(identity(baseline), {
    workspaceType: 'Personal',
    activeRole: null,
    organizationId: null,
    membershipId: null,
  });
  report.context = identity(baseline);
  report.login = true;
  const initialSelections = selections;
  await mkdir('output/review/user-personal', { recursive: true });
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    const row = { width, height, tabs: [] };
    for (const name of ['آموزشگاه', 'دستیار ماکان', 'پیام‌ها', 'پروفایل']) {
      const nav = page
        .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
        .filter({ visible: true });
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'انتخاب فضای کار' })).toHaveCount(0);
      const now = await session();
      assert.deepEqual(identity(now), identity(baseline));
      assert.equal(now.revision, baseline.revision);
      assert.equal(selections, initialSelections);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      row.tabs.push(name);
    }
    await page.reload();
    assert.deepEqual(identity(await session()), identity(baseline));
    await page.screenshot({ path: `output/review/user-personal/profile-${width}.png` });
    row.reloadPreserved = true;
    report.checks.push(row);
  }
  const status = await context.request.get('/api/client/backend/api/v1/me/messaging-status', {
    headers: { 'X-Makan-Context': baseline.revision },
  });
  assert.equal(status.status(), 200);
  const m = await status.json();
  report.messaging = {
    status: status.status(),
    nextAction: m.nextAction,
    allowedActions: m.allowedActions,
  };
  const denied = await context.request.get(
    '/api/client/backend/api/v1/academic/classes?page=1&pageSize=20',
    { headers: { 'X-Makan-Context': baseline.revision } },
  );
  report.schoolAccessStatus = denied.status();
  assert.equal(denied.status(), 403);
  assert.equal(report.pageErrors.length, 0);
  assert.equal(report.serviceErrors.length, 0);
  assert.equal(report.blockedMutations.length, 0);
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = String(e.message)
    .replace(/09\d{9}/g, '[test-phone]')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
  await page.screenshot({ path: 'output/review/user-personal/failure.png' }).catch(() => {});
} finally {
  await page.close().catch(() => {});
  const r = await context.request
    .post('/api/client/auth/logout', { headers: { Origin: origin } })
    .catch(() => null);
  report.logoutStatus = r?.status();
  await context.close();
  await browser.close();
  if (report.serviceErrors.length || report.pageErrors.length || report.blockedMutations.length)
    report.passed = false;
  await writeFile(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
}
