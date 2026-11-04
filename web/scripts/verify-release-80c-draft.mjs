// Bounded Test-only write verification. One own QA draft, never submitted for review.
// Cancellation retains the server's audit history; tokens stay in memory.
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
if (process.env.MAKAN_TEST_WRITE_SMOKE !== '1' || process.env.CI)
  throw Error('Explicit Test review required');
const backend =
  process.env.BACKEND_BASE_URL ||
  JSON.parse(await fs.readFile('config/network.json', 'utf8')).backendOrigin;
if (new URL(backend).origin !== 'http://94.184.32.84:8090')
  throw Error('Only the documented Test environment is allowed');
const origin = 'http://127.0.0.1:3145',
  api = await request.newContext({ baseURL: origin, timeout: 30000 });
const report = {
  checkedAtUtc: new Date().toISOString(),
  backend,
  steps: [],
  passed: false,
  submittedForReview: false,
  createdClasses: 0,
  createdMessages: 0,
  retainedAuditDraft: true,
};
let token, revision, userId, draftId;
const title = 'QA-80c-' + randomUUID();
async function direct(path, body) {
  const r = await fetch(backend + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  });
  return { status: r.status, value: await r.json().catch(() => null) };
}
async function call(path, body, method = body === undefined ? 'GET' : 'POST') {
  const r = await api.fetch('/api/client/backend' + path, {
    method,
    headers: { Origin: origin, 'X-Makan-Context': revision },
    ...(body === undefined ? {} : { data: body }),
  });
  const value = await r.json().catch(() => null);
  report.steps.push({
    method,
    path: path.replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/g, '{id}'),
    status: r.status(),
    ...(!r.ok() ? { code: value?.code } : {}),
  });
  if (!r.ok()) throw Error('BFF write/read rejected');
  return value;
}
try {
  // Separate credentials are used only to guarantee cleanup if an invalid DTO
  // prevents the BFF from returning a draft ID after the backend accepted it.
  const c = await direct('/api/v1/auth/otp/challenges', { phoneNumber: '09120000199' });
  const v = await direct('/api/v1/auth/otp/verify', {
    phoneNumber: '09120000199',
    challengeId: c.value?.challengeId,
    code: '123456',
    deviceName: 'Makan 80c own-draft cleanup',
  });
  token = v.value?.accessToken;
  if (!token) throw Error('Test authentication unavailable');
  const me = await direct('/api/v1/me');
  userId = me.value?.id;
  if (!userId) throw Error('Test identity unavailable');
  const bc = await api.post('/api/client/auth/challenge', {
    headers: { Origin: origin },
    data: { phoneNumber: '09120000199' },
  });
  const bv = await api.post('/api/client/auth/verify', {
    headers: { Origin: origin },
    data: {
      phoneNumber: '09120000199',
      challengeId: (await bc.json()).challengeId,
      code: '123456',
      deviceName: 'Makan 80c own-draft verification',
    },
  });
  if (!bv.ok()) throw Error('BFF authentication unavailable');
  const session = await (await api.get('/api/client/session')).json();
  revision = session.revision;
  if (session.user.id !== userId || session.context.workspaceType !== 'Personal')
    throw Error('Unexpected account/context');
  const payload = {
    clientOperationId: randomUUID(),
    details: {
      title,
      purpose: 'بررسی ثبت پیش‌نویس از کلاینت',
      description: 'آزمون اتصال؛ این پیش‌نویس ارسال نمی‌شود و لغو خواهد شد.',
      suggestedCapacity: 5,
      suggestedManagerUserId: userId,
      suggestedTeacherUserId: null,
    },
  };
  const created = await call('/api/v1/personal-class-requests', payload);
  draftId = created.id;
  if (created.requesterUserId !== userId || created.status !== 'Draft')
    throw Error('Unexpected draft owner/state');
  const replay = await call('/api/v1/personal-class-requests', payload);
  report.idempotentCreate = replay.id === draftId;
  if (!report.idempotentCreate) throw Error('Duplicate request');
  const read = await call('/api/v1/personal-class-requests/' + draftId);
  const edited = await call(
    '/api/v1/personal-class-requests/' + draftId,
    {
      expectedVersion: read.version,
      details: {
        ...read.details,
        description: 'ویرایش آزمایشی تأیید شد؛ درخواست برای بررسی ارسال نمی‌شود.',
      },
    },
    'PUT',
  );
  report.opaqueVersionChanged = edited.version !== read.version;
  const cancelled = await call('/api/v1/personal-class-requests/' + draftId + '/cancel', {
    expectedVersion: edited.version,
  });
  report.cancelled = cancelled.status === 'Cancelled';
  report.passed = report.idempotentCreate && report.opaqueVersionChanged && report.cancelled;
} catch {
  report.failure = 'Test draft verification did not complete';
} finally {
  try {
    const list = await direct('/api/v1/personal-class-requests?page=1&pageSize=100');
    const owned =
      list.value?.items?.filter(
        (r) => r.requesterUserId === userId && r.details?.title === title,
      ) ?? [];
    for (const row of owned) {
      if (row.status !== 'Cancelled' && row.capabilities?.canCancel)
        await direct('/api/v1/personal-class-requests/' + row.id + '/cancel', {
          expectedVersion: row.version,
        });
    }
    const final = await direct('/api/v1/personal-class-requests?page=1&pageSize=100');
    const matches =
      final.value?.items?.filter(
        (r) => r.requesterUserId === userId && r.details?.title === title,
      ) ?? [];
    report.ownedDraftCount = matches.length;
    report.cleanupConfirmed =
      matches.length === 1 && matches.every((r) => r.status === 'Cancelled');
  } catch {
    report.cleanupConfirmed = false;
  }
  await api
    .post('/api/client/auth/logout', { headers: { Origin: origin }, data: {} })
    .catch(() => {});
  if (token) await direct('/api/v1/auth/logout', {}).catch(() => {});
  await api.dispose();
  await fs.writeFile(
    'docs/quality/RELEASE_80C_LIVE_DRAFT.json',
    JSON.stringify(report, null, 2) + '\n',
  );
}
console.log(JSON.stringify(report));
if (!report.passed || !report.cleanupConfirmed) process.exitCode = 1;
