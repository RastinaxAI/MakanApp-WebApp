// Explicit live read review through the browser-facing BFF. Credentials stay in memory.
import fs from 'node:fs/promises';
import { request, chromium } from '@playwright/test';
if (process.env.MAKAN_TEST_READ_SMOKE !== '1' || process.env.CI)
  throw Error('Local operator opt-in required');
const origin = 'http://127.0.0.1:3133',
  report = {
    checkedAtUtc: new Date().toISOString(),
    origin,
    backend: 'http://94.184.32.84:8090',
    domainWrites: false,
    roles: [],
  };
const selectedRoles = process.argv[2]?.split(',');
if (
  selectedRoles?.some(
    (role) => !['Student', 'Teacher', 'Parent', 'Manager', 'Personal'].includes(role),
  )
)
  throw Error('Unknown role');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [role, phone] of [
    ['Student', '09120000101'],
    ['Teacher', '09120000102'],
    ['Parent', '09120000103'],
    ['Manager', '09120000104'],
    ['Personal', '09120000199'],
  ]) {
    if (selectedRoles && !selectedRoles.includes(role)) continue;
    const api = await request.newContext({ baseURL: origin }),
      row = { role, checks: [], passed: false };
    let revision;
    async function get(path) {
      const r = await api.get(path, {
          headers: revision ? { 'X-Makan-Context': revision } : {},
          timeout: 20000,
        }),
        data = await r.json().catch(() => null);
      row.checks.push({ path: path.split('?')[0], method: 'GET', status: r.status() });
      if (!r.ok()) throw Error('Read unavailable');
      return data;
    }
    async function post(path, data) {
      if (
        ![
          '/api/client/auth/challenge',
          '/api/client/auth/verify',
          '/api/client/auth/logout',
          '/api/client/backend/api/v1/workspaces/select',
        ].includes(path)
      )
        throw Error('Domain write rejected');
      const r = await api.post(path, {
          headers: { Origin: origin, ...(revision ? { 'X-Makan-Context': revision } : {}) },
          data,
          timeout: 20000,
        }),
        value = await r.json().catch(() => null);
      row.checks.push({
        path,
        method: 'POST',
        status: r.status(),
        ...(!r.ok() && /^[A-Z0-9_]{1,100}$/.test(value?.code ?? '') ? { code: value.code } : {}),
      });
      if (!r.ok()) throw Error('Session action unavailable');
      return value;
    }
    try {
      const c = await post('/api/client/auth/challenge', { phoneNumber: phone });
      await post('/api/client/auth/verify', {
        phoneNumber: phone,
        challengeId: c.challengeId,
        code: '123456',
        deviceName: 'Makan release 154c437 BFF read review',
      });
      let session = await get('/api/client/session');
      revision = session.revision;
      const spaces = await get('/api/client/backend/api/v1/workspaces/snapshot'),
        space = spaces.workspaces.find(
          (w) =>
            w.canEnter && (role === 'Personal' ? w.workspaceType === 'Personal' : w.role === role),
        );
      if (space) {
        await post('/api/client/backend/api/v1/workspaces/select', {
          workspaceType: space.workspaceType,
          membershipId: space.membershipId,
          role: space.role,
        });
        session = await get('/api/client/session');
        revision = session.revision;
      }
      const before = JSON.stringify(session.context);
      for (const path of [
        '/api/v1/me/messaging-status',
        '/api/v1/conversations/account?Filter=All&Limit=5',
        '/api/v1/conversations/permissions',
        '/api/v1/realtime/account-inbox/changes?limit=5',
        '/api/v1/sources?Scope=Personal&Page=1&PageSize=5',
        '/api/v1/sources?Scope=Library&Page=1&PageSize=5',
      ])
        await get('/api/client/backend' + path);
      const context = await browser.newContext({
        storageState: await api.storageState(),
        viewport: { width: 390, height: 844 },
      });
      await context.addInitScript(() =>
        localStorage.setItem('makan:pwa-install-dismissed:v1', '1'),
      );
      const page = await context.newPage();
      const failures = [];
      context.on('request', (r) => {
        const u = new URL(r.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && !u.pathname.includes('/hub'))
          failures.push('Unexpected domain write');
      });
      for (const path of ['/personal/messages', '/personal/resources']) {
        const r = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.getByRole('main').waitFor({ state: 'visible' });
        if (path.endsWith('/resources'))
          await page
            .getByRole('heading', { name: 'منابع آموزشی', exact: true })
            .waitFor({ state: 'visible' });
        else await page.getByLabel('فهرست گفتگوها', { exact: true }).waitFor({ state: 'visible' });
        row.checks.push({ path, method: 'GET', status: r.status() });
        if (r.status() !== 200 || (await page.locator('main [role=alert]').count()))
          throw Error('Live UI read error');
      }
      row.contextPreserved = before === JSON.stringify((await get('/api/client/session')).context);
      row.unexpectedWrites = failures.length;
      await context.close();
      if (!row.contextPreserved || failures.length) throw Error('Context or write guard failed');
      row.passed = true;
    } catch {
      row.failure = 'Live BFF/UI check did not complete';
    } finally {
      try {
        await post('/api/client/auth/logout', {});
      } catch {}
      await api.dispose();
    }
    report.roles.push(row);
    console.log(role + ': ' + (row.passed ? 'passed' : 'failed'));
  }
} finally {
  await browser.close();
}
await fs.writeFile(
  new URL(
    '../docs/quality/RELEASE_154C437_LIVE_BFF' +
      (selectedRoles ? '_' + selectedRoles.join('_').toUpperCase() : '') +
      '.json',
    import.meta.url,
  ),
  JSON.stringify(report, null, 2) + '\n',
);
if (report.roles.some((row) => !row.passed)) process.exitCode = 1;
