// Manual integration review against the explicitly approved remote test service.
// This operator tool creates only labelled QA group/channel artifacts owned by the test Student.
// It is never part of test:browser, test, quality, or CI.
import { scrubReviewError } from './lib/review-errors.mjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
if (process.env.MAKAN_ALLOW_MESSENGER_QA !== '1' || process.env.CI)
  throw Error('Manual test-server review requires explicit opt-in outside CI.');
const origin = 'http://127.0.0.1:8080';
const readOnly = process.env.MAKAN_MESSENGER_READ_ONLY === '1';
const report = {
  environment: origin,
  backend: 'http://94.184.32.84:8090',
  accounts: [],
  artifacts: [],
  checks: [],
  limitations: [],
  cleanup: [],
};
const browser = await chromium.launch({ headless: true });
const clients = [];
await mkdir('output/review/messenger-management-live', { recursive: true });
const clean = scrubReviewError;
const save = () =>
  writeFile(
    readOnly
      ? 'docs/quality/MESSENGER_MANAGEMENT_READ_ONLY.json'
      : 'docs/quality/MESSENGER_MANAGEMENT_LIVE.json',
    JSON.stringify(report, null, 2) + '\n',
  );
async function client(role, phone) {
  const context = await browser.newContext({
    baseURL: origin,
    timezoneId: 'Asia/Tehran',
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => localStorage.setItem('makan:pwa-install-dismissed:v1', '1'));
  const c = { context, role, page: null, session: null };
  clients.push(c);
  const challenge = await context.request.post('/api/client/auth/challenge', {
    headers: { Origin: origin },
    data: { phoneNumber: phone },
  });
  assert.equal(challenge.status(), 202);
  const verify = await context.request.post('/api/client/auth/verify', {
    headers: { Origin: origin },
    data: {
      phoneNumber: phone,
      challengeId: (await challenge.json()).challengeId,
      code: '123456',
      deviceName: 'Manual messenger test-server QA',
    },
  });
  assert.equal(verify.status(), 200);
  c.session = await (await context.request.get('/api/client/session')).json();
  const spaces = await api(c, '/api/v1/workspaces/me');
  const space = spaces.find((v) => v.role === role && v.canEnter !== false);
  assert.ok(space);
  await api(c, '/api/v1/workspaces/select', 'POST', {
    workspaceType: 'Organization',
    membershipId: space.membershipId,
    role,
  });
  c.session = await (await context.request.get('/api/client/session')).json();
  c.page = await context.newPage();
  c.page.setDefaultTimeout(20000);
  const row = { role, login: true, scopes: [], views: [], pageErrors: [] };
  report.accounts.push(row);
  c.row = row;
  c.page.on('pageerror', (e) => row.pageErrors.push(clean(e.message)));
  const status = await api(c, '/api/v1/me/messaging-status');
  row.messagingActions = status.allowedActions;
  row.nextAction = status.nextAction;
  for (const scope of ['Personal', 'Organization']) {
    const values = await api(
      c,
      '/api/v1/conversations?filter=All&page=1&pageSize=100&scope=' + scope,
    );
    row.scopes.push({ scope, count: values.length });
    if (scope === 'Personal') c.personalInbox = values;
  }
  if (role === 'Teacher') {
    try {
      const items = await api(c, '/api/v1/conversations?filter=All&page=1&pageSize=100&scope=All');
      row.undocumentedAllProbe = {
        status: 200,
        count: items.length,
        returnedScopes: [...new Set(items.map((x) => x.scope))],
      };
    } catch (error) {
      row.undocumentedAllProbe = { status: error.status, code: error.code };
    }
  }
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await c.page.setViewportSize({ width, height });
    await c.page.goto('/personal/messages');
    await expect(c.page.getByRole('heading', { name: 'پیام‌ها', exact: true })).toBeVisible();
    await expect(c.page.getByRole('navigation', { name: 'فضای گفتگوها', exact: true })).toHaveCount(
      0,
    );
    await expect(
      c.page.getByRole('navigation', { name: 'نوع گفتگوها', exact: true }),
    ).toBeVisible();
    assert.ok(await c.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const now = await (await context.request.get('/api/client/session')).json();
    assert.deepEqual(now.context, c.session.context);
    assert.equal(now.revision, c.session.revision);
    row.views.push({ width, height, overflow: false, contextRetained: true });
    await c.page.screenshot({
      path: `output/review/messenger-management-live/${role}-${width}.png`,
    });
  }
  return c;
}
async function api(c, path, method = 'GET', body) {
  const response = await c.context.request.fetch('/api/client/backend' + path, {
    method,
    headers: { Origin: origin, 'X-Makan-Context': c.session.revision },
    ...(body !== undefined ? { data: body } : {}),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok()) {
    const e = new Error(
      method +
        ' ' +
        path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id') +
        ' returned ' +
        response.status() +
        ' ' +
        value?.code,
    );
    e.status = response.status();
    e.code = value?.code;
    e.traceId = value?.traceId;
    throw e;
  }
  return value;
}
let student, teacher;
try {
  student = await client('Student', '09120000101');
  teacher = await client('Teacher', '09120000102');
  await client('Parent', '09120000103');
  await client('Manager', '09120000104');
  await save();
  try {
    const existingDirect = student.personalInbox?.find(
      (row) => row.type === 'Direct' && row.otherParticipant?.userId === teacher.session.user.id,
    );
    const reverseDirect =
      existingDirect &&
      teacher.personalInbox?.find(
        (row) =>
          row.conversationId === existingDirect.conversationId &&
          row.otherParticipant?.userId === student.session.user.id,
      );
    if (!readOnly && existingDirect && reverseDirect) {
      const id = existingDirect.conversationId;
      await student.page.goto('/personal/messages/' + id);
      await teacher.page.goto('/personal/messages');
      async function sendText(c, text) {
        const response = c.page.waitForResponse(
          (r) =>
            r.request().method() === 'POST' &&
            new URL(r.url()).pathname.endsWith('/conversations/' + id + '/messages'),
        );
        await c.page.getByRole('textbox', { name: 'متن پیام', exact: true }).fill(text);
        await c.page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
        const reply = await response;
        if (!reply.ok()) {
          const problem = await reply.json().catch(() => ({}));
          const error = new Error(
            c.role + ' direct message returned ' + reply.status() + ' ' + problem.code,
          );
          error.status = reply.status();
          error.code = problem.code;
          error.traceId = problem.traceId;
          throw error;
        }
      }
      const first = 'بررسی پیام ماکان ' + randomUUID().slice(0, 8);
      await sendText(student, first);
      const received = teacher.page
        .getByLabel('فهرست گفتگوها', { exact: true })
        .getByRole('link')
        .filter({ hasText: first });
      await expect(received).toBeVisible();
      report.checks.push({
        name: 'Student-direct-message-updates-Teacher-inbox-without-reload',
        passed: true,
      });
      await received.click();
      await expect(teacher.page.getByLabel('پیام‌های گفتگو', { exact: true })).toContainText(first);
      const second = 'پاسخ بررسی ماکان ' + randomUUID().slice(0, 8);
      await sendText(teacher, second);
      await expect(student.page.getByLabel('پیام‌های گفتگو', { exact: true })).toContainText(
        second,
      );
      report.checks.push({ name: 'Teacher-direct-reply-reaches-open-Student-room', passed: true });
      report.existingDirectMessages = {
        testMessagesRetained: 2,
        conversationId: id,
        recipients: 'only the two explicitly authorized test accounts',
      };
    } else {
      report.directMessagingSkipped = readOnly
        ? 'Read-only review: message exchange intentionally skipped.'
        : 'No mutually verified existing direct conversation for the two test identities; no conversation with another account was used.';
    }
  } catch (error) {
    report.limitations.push({
      message: clean(error.message),
      status: error.status,
      code: error.code,
      traceId: error.traceId,
    });
  }
  const existingGroup = teacher.personalInbox?.find((row) => row.type === 'Group');
  if (existingGroup) {
    const value = await api(teacher, '/api/v1/conversations/' + existingGroup.conversationId);
    await teacher.page.goto('/personal/messages/' + existingGroup.conversationId + '/info');
    await expect(
      teacher.page.getByRole('heading', { name: value.title, exact: true }),
    ).toBeVisible();
    await expect(
      teacher.page.getByRole('heading', {
        name: value.type === 'Channel' ? 'اطلاعات کانال' : 'اطلاعات گروه',
        exact: true,
      }),
    ).toBeVisible();
    await teacher.page.screenshot({
      path: 'output/review/messenger-management-live/existing-group-info.png',
    });
    report.checks.push({ name: 'existing-group-information-renders-from-live-API', passed: true });
  }
  if (
    readOnly ||
    !student.row.messagingActions.some((action) =>
      ['CreatePersonalGroup', 'CreatePrivatePersonalGroup'].includes(action),
    )
  ) {
    report.skippedDomainChecks = [
      'create group/channel',
      'edit information',
      'member add/remove',
      'administrator role changes',
      'two-way group messaging',
    ];
    const error = new Error(
      'Student messaging-status does not permit group creation; prepare authorized test account communication verification before mutation review.',
    );
    error.code = 'QA_ACCOUNT_NOT_READY';
    throw error;
  }
  const label = 'QA پیام‌رسان ماکان ' + new Date().toISOString();
  let group = await api(student, '/api/v1/conversations/groups', 'POST', {
    clientOperationId: randomUUID(),
    scope: 'Personal',
    title: label,
    description: 'گروه اختصاصی آزمون رابط و اتصال؛ دادهٔ آزمایشی.',
    initialParticipantUserIds: [teacher.session.user.id],
    visibility: 'Private',
    groupHistoryPolicy: 'FullHistory',
  });
  report.artifacts.push({ kind: 'Group', id: group.conversationId, owner: 'Student' });
  report.checks.push({ name: 'create-group-with-test-Teacher', passed: true });
  for (const outsider of clients.filter((c) => ['Parent', 'Manager'].includes(c.role))) {
    try {
      await api(outsider, '/api/v1/conversations/' + group.conversationId);
      throw Error(outsider.role + ' unexpectedly read another account private QA group');
    } catch (error) {
      if (![403, 404].includes(error.status)) throw error;
      report.checks.push({
        name: outsider.role + '-private-group-read-denied',
        passed: true,
        status: error.status,
      });
    }
  }

  await teacher.page.goto('/personal/messages');
  await expect(
    teacher.page.getByLabel('فهرست گفتگوها', { exact: true }).getByText(label, { exact: true }),
  ).toBeVisible();
  report.checks.push({ name: 'recipient-group-appears-in-unified-inbox', passed: true });
  await student.page.goto('/personal/messages/' + group.conversationId + '/edit');
  await student.page.getByLabel('نام گروه', { exact: true }).fill(label + ' ویرایش‌شده');
  await student.page.getByRole('button', { name: 'ذخیرهٔ اطلاعات', exact: true }).click();
  await expect(student.page.getByRole('status')).toContainText('اطلاعات گفتگو ذخیره شد.');
  report.checks.push({ name: 'edit-group-information-through-UI', passed: true });
  for (const role of ['Admin', 'Member']) {
    group = await api(
      student,
      '/api/v1/conversations/' +
        group.conversationId +
        '/members/' +
        teacher.session.user.id +
        '/role',
      'PATCH',
      { role },
    );
    assert.equal(
      group.participants.find(
        (m) => m.user.userId === teacher.session.user.id && m.status === 'Active',
      )?.role,
      role,
    );
    report.checks.push({ name: 'set-conversation-role-' + role, passed: true });
  }
  await teacher.page.goto('/personal/messages/' + group.conversationId);
  await student.page.goto('/personal/messages/' + group.conversationId);
  const text = 'پیام بررسی ارتباط دوطرفه ' + randomUUID();
  await student.page.getByRole('textbox', { name: 'متن پیام', exact: true }).fill(text);
  await student.page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  await expect(teacher.page.getByLabel('پیام‌های گفتگو', { exact: true })).toContainText(text);
  report.checks.push({ name: 'Student-to-Teacher-group-message', passed: true });
  const reply = 'پاسخ آزمایشی استاد ' + randomUUID();
  await teacher.page.getByRole('textbox', { name: 'متن پیام', exact: true }).fill(reply);
  await teacher.page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  await expect(student.page.getByLabel('پیام‌های گفتگو', { exact: true })).toContainText(reply);
  report.checks.push({ name: 'Teacher-to-Student-group-reply', passed: true });
  await teacher.page.close();
  teacher.page = null;
  group = await api(
    student,
    '/api/v1/conversations/' + group.conversationId + '/members/' + teacher.session.user.id,
    'DELETE',
  );
  assert.equal(
    group.participants.find((m) => m.user.userId === teacher.session.user.id)?.status,
    'Removed',
  );
  report.checks.push({ name: 'remove-member', passed: true });
  group = await api(student, '/api/v1/conversations/' + group.conversationId + '/members', 'POST', {
    userId: teacher.session.user.id,
  });
  assert.ok(
    group.participants.some(
      (m) => m.user.userId === teacher.session.user.id && m.status === 'Active',
    ),
  );
  report.checks.push({ name: 'add-member', passed: true });
  const channel = await api(student, '/api/v1/conversations/channels', 'POST', {
    clientOperationId: randomUUID(),
    scope: 'Personal',
    title: label + ' کانال',
    description: 'کانال اختصاصی QA',
    initialParticipantUserIds: null,
    visibility: 'Private',
  });
  report.artifacts.push({ kind: 'Channel', id: channel.conversationId, owner: 'Student' });
  report.checks.push({ name: 'create-channel', passed: true });
  await student.page.goto('/personal/messages/' + channel.conversationId + '/info');
  await expect(
    student.page.getByRole('heading', { name: 'اطلاعات کانال', exact: true }),
  ).toBeVisible();
  await student.page.screenshot({
    path: 'output/review/messenger-management-live/channel-info.png',
  });
} catch (error) {
  report.limitations.push({
    message: clean(error.message),
    status: error.status,
    code: error.code,
    traceId: error.traceId,
  });
  process.exitCode = 1;
} finally {
  for (const c of clients)
    if (c.page) {
      await c.page.close().catch(() => {});
      c.page = null;
    }
  if (student)
    for (const artifact of report.artifacts) {
      try {
        if (artifact.kind === 'Group' && teacher)
          await api(
            student,
            '/api/v1/conversations/' + artifact.id + '/members/' + teacher.session.user.id,
            'DELETE',
          ).catch((e) => {
            if (e.status !== 404) throw e;
          });
        await api(student, '/api/v1/conversations/' + artifact.id + '/archive', 'POST');
        report.cleanup.push({
          id: artifact.id,
          archivedForOwner: true,
          invitedTeacherRemoved: artifact.kind === 'Group',
        });
      } catch (e) {
        report.cleanup.push({ id: artifact.id, error: clean(e.message) });
      }
    }
  for (const c of clients) {
    const r = await c.context.request
      .post('/api/client/auth/logout', { headers: { Origin: origin } })
      .catch(() => null);
    if (c.row) c.row.logoutStatus = r?.status();
    await c.context.close();
  }
  await browser.close();
  await save();
}
console.log(
  JSON.stringify({
    accounts: report.accounts.map((r) => ({
      role: r.role,
      views: r.views.length,
      pageErrors: r.pageErrors.length,
      logoutStatus: r.logoutStatus,
    })),
    checks: report.checks,
    limitations: report.limitations,
    cleanup: report.cleanup,
  }),
);
