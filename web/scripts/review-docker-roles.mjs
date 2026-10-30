// Operator-only live review. Never imported by fixture tests or CI.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

if (process.env.MAKAN_ALLOW_TEST_ACCOUNT_REVIEW !== '1' || process.env.CI)
  throw Error('Explicit operator opt-in required; this review is not a CI test.');
const origin = 'http://127.0.0.1:8080';
const screenshots = 'output/review/docker-live-roles';
const reportPath = 'docs/quality/DOCKER_FOUR_ROLE_REVIEW.json';
const accounts = [
  ['Manager', '09120000104', 'مدیر آموزشگاه'],
  ['Teacher', '09120000102', 'استاد'],
  ['Student', '09120000101', 'دانشجو'],
  ['Parent', '09120000103', 'والدین'],
];
const views = [
  [390, 844],
  [834, 1194],
  [1024, 900],
  [1440, 1000],
  [390, 844],
];
const report = {
  environment: origin,
  backend: 'user-approved remote test service behind the Docker BFF',
  scope:
    'UI login, own workspace/session actions, invitation reads and navigation; no invitation acceptance/decline or domain writes',
  roles: [],
};
const clean = (value) =>
  String(value)
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/09\d{9}/g, '[test-phone]');
const identity = (state) => ({
  role: state.context.activeRole,
  organization: state.context.organizationId,
  membership: state.context.membershipId,
  workspace: state.context.workspaceType,
});
async function save() {
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [role, phone, roleLabel] of accounts) {
    const row = {
      role,
      login: false,
      checks: [],
      serviceErrors: [],
      pageErrors: [],
      blockedMutations: [],
    };
    report.roles.push(row);
    const context = await browser.newContext({
      baseURL: origin,
      timezoneId: 'Asia/Tehran',
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => localStorage.setItem('makan:pwa-install-dismissed:v1', '1'));
    let selections = 0;
    let reviewing = true;
    const pending = [];
    await context.route('**/*', (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (!['data:', 'blob:', 'about:'].includes(url.protocol) && url.origin !== origin)
        return route.abort('blockedbyclient');
      if (
        url.pathname.includes('/api/client/backend/') &&
        !['GET', 'HEAD'].includes(request.method()) &&
        !url.pathname.endsWith('/workspaces/select')
      ) {
        row.blockedMutations.push({ path: clean(url.pathname), method: request.method() });
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => row.pageErrors.push(clean(error.message)));
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname.endsWith('/workspaces/select')
      )
        selections++;
    });
    page.on('response', (response) => {
      if (reviewing && response.status() >= 400 && response.url().includes('/api/client/backend/'))
        pending.push(
          response
            .json()
            .then((problem) =>
              row.serviceErrors.push({
                path: clean(new URL(response.url()).pathname),
                status: response.status(),
                code: problem.code,
                traceId: problem.traceId,
              }),
            )
            .catch(() => {}),
        );
    });
    async function state() {
      const response = await context.request.get('/api/client/session');
      assert.equal(response.status(), 200, 'Own session must remain valid');
      return response.json();
    }
    try {
      await page.goto('/enter');
      await page.getByRole('textbox', { name: 'شماره همراه', exact: true }).fill(phone);
      await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
      await page.getByRole('textbox', { name: 'کد ورود', exact: true }).fill('123456');
      await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
      await expect(page).toHaveURL(/\/personal\/workspaces$/);
      const initial = await state();
      const snapshotResponse = await context.request.get(
        '/api/client/backend/api/v1/workspaces/snapshot',
        { headers: { 'X-Makan-Context': initial.revision } },
      );
      assert.equal(snapshotResponse.status(), 200, 'Workspace snapshot must load');
      const snapshot = await snapshotResponse.json();
      const space = snapshot.workspaces.find(
        (item) => item.role === role && item.canEnter && item.isVisible !== false,
      );
      assert.ok(space, 'Test role needs an enterable workspace');
      const choice = page
        .getByRole('main')
        .getByRole('button')
        .filter({ hasText: space.organizationName })
        .filter({ hasText: roleLabel })
        .first();
      await choice.click();
      await expect(page).not.toHaveURL(/\/workspaces$/);
      const selected = await state(),
        baseline = identity(selected);
      assert.equal(baseline.role, role);
      assert.equal(baseline.membership, space.membershipId);
      const initialSelections = selections;
      row.login = true;
      for (const [index, [width, height]] of views.entries()) {
        await page.setViewportSize({ width, height });
        await page.goto('/personal/invitations');
        await expect(page).toHaveURL(/\/personal\/education\/invitations$/);
        const panel = page.getByRole('region', { name: 'دعوت‌های دریافتی', exact: true });
        await expect(panel).toBeVisible();
        await expect(page.getByRole('heading', { name: 'دعوت‌های من', exact: true })).toHaveCount(
          1,
        );
        const reload = page.getByRole('button', { name: 'دریافت دوبارهٔ دعوت‌ها', exact: true });
        await expect(reload).toBeEnabled();
        const loaded = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname.endsWith('/api/v1/invitations') &&
            r.request().method() === 'GET',
        );
        await reload.click();
        const response = await loaded;
        assert.equal(response.status(), 200, 'Invitation service must respond successfully');
        const invitations = await response.json();
        assert.ok(Array.isArray(invitations));
        const filter = panel.getByRole('navigation', { name: 'وضعیت دعوت', exact: true });
        for (const [key, text] of [
          ['all', 'همه'],
          ['Pending', 'در انتظار'],
          ['Accepted', 'پذیرفته‌شده'],
          ['Declined', 'ردشده'],
        ]) {
          await filter.getByRole('button', { name: text, exact: true }).click();
          const expected = invitations.filter(
            (invite) =>
              key === 'all' ||
              (invite.status === 'Pending' && Date.parse(invite.expiresAtUtc) <= Date.now()
                ? 'Expired'
                : invite.status) === key,
          ).length;
          await expect(panel.getByRole('article')).toHaveCount(expected);
          await expect(filter.getByRole('button', { name: text, exact: true })).toHaveAttribute(
            'aria-pressed',
            'true',
          );
        }
        await filter.getByRole('button', { name: 'همه', exact: true }).click();
        if (invitations.length) {
          const details = panel.getByRole('article').first().locator('details');
          await details.locator('summary').click();
          await expect(details).toHaveAttribute('open', '');
        }
        await page.screenshot({ path: `${screenshots}/${role}-${width}-${index}-invitations.png` });
        const check = {
          width,
          height,
          invitations: invitations.length,
          detailsAvailable: invitations.length > 0,
          tabs: [],
        };
        row.checks.push(check);
        for (const label of ['پیام‌ها', 'پروفایل', 'دستیار ماکان', 'آموزشگاه']) {
          const nav = page
            .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
            .filter({ visible: true });
          await expect(nav).toHaveCount(1);
          await expect(nav.getByRole('link')).toHaveCount(4);
          await nav.getByRole('link', { name: label, exact: true }).click();
          await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
            'aria-current',
            'page',
          );
          assert.ok(!page.url().endsWith('/workspaces'), 'Tabs must not reopen role selection');
          await expect(
            page.getByRole('dialog', { name: 'انتخاب فضای کار', exact: true }),
          ).toHaveCount(0);
          assert.deepEqual(
            identity(await state()),
            baseline,
            'Tabs must preserve the selected workspace',
          );
          assert.equal(selections, initialSelections, 'Tabs must not select a workspace again');
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            'No outer horizontal overflow',
          );
          const box = await nav.boundingBox();
          assert.ok(
            width < 1024 ? box.y > height * 0.7 : box.y < height * 0.5,
            'Correct dock/sidebar for the viewport',
          );
          for (const link of await nav.getByRole('link').all()) {
            const bounds = await link.boundingBox();
            assert.ok(
              bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
              'Navigation targets stay visible and usable',
            );
          }
          check.tabs.push(label);
        }
        await page.reload();
        await expect(
          page.getByRole('navigation', { name: 'ناوبری حساب شخصی' }).filter({ visible: true }),
        ).toHaveCount(1);
        assert.deepEqual(
          identity(await state()),
          baseline,
          'Reload must preserve the selected workspace',
        );
        check.reloadPreserved = true;
        await save();
      }
      await Promise.allSettled(pending);
      assert.equal(row.serviceErrors.length, 0, 'Live service calls must not fail during review');
      assert.equal(row.pageErrors.length, 0, 'No browser runtime errors');
      assert.equal(row.blockedMutations.length, 0, 'Review must not attempt domain mutations');
      row.passed = true;
    } catch (error) {
      row.passed = false;
      row.failure = clean(error.message);
      await page.screenshot({ path: `${screenshots}/${role}-failure.png` }).catch(() => {});
    } finally {
      reviewing = false;
      const logout = await context.request
        .post('/api/client/auth/logout', { headers: { Origin: origin } })
        .catch(() => null);
      row.logoutStatus = logout?.status();
      await Promise.allSettled(pending);
      await context.close();
      await save();
      console.log(
        JSON.stringify({
          role,
          passed: row.passed,
          checkedViewports: row.checks.length,
          failure: row.failure,
        }),
      );
    }
  }
} finally {
  await browser.close();
  report.finishedAtUtc = new Date().toISOString();
  await save();
}
if (report.roles.some((row) => !row.passed || row.pageErrors.length)) process.exitCode = 1;
