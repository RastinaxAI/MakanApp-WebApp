// Manual Test-only audit. Session actions and non-billable preflight are the only POSTs.
// Responses, tokens, phone numbers and resource IDs never enter the public evidence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
if (process.env.MAKAN_TEST_READ_SMOKE !== '1' || process.env.CI)
  throw Error('Explicit local operator opt-in is required.');
const base = JSON.parse(await fs.readFile('config/network.json', 'utf8')).backendOrigin;
if (base !== 'http://94.184.32.84:8090')
  throw Error('Only the designated Test backend is allowed.');
const output = 'docs/quality/BACKEND_AUDIT_20261104_READINESS.json';
const report = {
  checkedAtUtc: new Date().toISOString(),
  backend: base,
  domainWrites: false,
  allowedPosts: [
    'auth challenge/verify/logout',
    'own workspace selection',
    'source/quota preflight',
  ],
  roles: [],
};
const safeCode = (value) =>
  typeof value === 'string' && /^[A-Z0-9_]{1,100}$/.test(value) ? value : undefined;
const posts = new Set([
  '/api/v1/auth/otp/challenges',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/logout',
  '/api/v1/workspaces/select',
  '/api/v1/ai/sources/preflight',
  '/api/v1/commerce/ai/simple-text/preflight',
]);
for (const [role, phone] of [
  ['Manager', '09120000104'],
  ['Teacher', '09120000102'],
  ['Student', '09120000101'],
  ['Parent', '09120000103'],
  ['Personal', '09120000199'],
]) {
  let token;
  const row = { role, requests: [], passed: false };
  async function call(path, expected, body) {
    if (body !== undefined && !posts.has(path)) throw Error('Domain mutation is forbidden.');
    const started = performance.now();
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    const value = await response.json().catch(() => null);
    const record = {
      path: path.split('?')[0].replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/{id}'),
      method: body === undefined ? 'GET' : 'POST',
      status: response.status,
      expected,
      milliseconds: Math.round(performance.now() - started),
      code: safeCode(value?.code ?? value?.extensions?.code),
    };
    row.requests.push(record);
    assert(expected.includes(response.status), 'Unexpected HTTP status');
    return value;
  }
  try {
    await call('/api/v1/me', [401]);
    const challenge = await call('/api/v1/auth/otp/challenges', [202], { phoneNumber: phone });
    const auth = await call('/api/v1/auth/otp/verify', [200], {
      phoneNumber: phone,
      challengeId: challenge.challengeId,
      code: '123456',
      deviceName: 'Makan backend readiness read audit',
    });
    token = auth.accessToken;
    assert(token, 'Test session unavailable');
    const snapshot = await call('/api/v1/workspaces/snapshot', [200]);
    const space = snapshot.workspaces.find(
      (w) => w.canEnter && (role === 'Personal' ? w.workspaceType === 'Personal' : w.role === role),
    );
    assert(space, 'Required test workspace unavailable');
    await call('/api/v1/workspaces/select', [200], {
      workspaceType: space.workspaceType,
      membershipId: space.membershipId,
      role: space.role,
    });
    const before = await call('/api/v1/workspaces/current', [200]);
    const messaging = await call('/api/v1/me/messaging-status', [200]);
    row.messaging = { allowedActions: messaging.allowedActions, nextAction: messaging.nextAction };
    const push = await call('/api/v1/notifications/devices/web-push/configuration', [200]);
    row.push = Object.fromEntries(
      Object.entries(push ?? {}).filter(
        ([key, value]) => /available|configured|enabled/i.test(key) && typeof value === 'boolean',
      ),
    );
    const classes =
      role === 'Parent' || role === 'Personal'
        ? await call('/api/v1/academic/classes', [403])
        : await call('/api/v1/academic/classes', [200]);
    if (role === 'Student' || role === 'Teacher')
      await call('/api/v1/organization/people?page=1&pageSize=1', [403]);
    if (role === 'Manager') {
      const pair = await call('/api/v1/organization/official-spaces', [200]);
      row.organizationSpaces = {
        group: pair.group?.state,
        channel: pair.channel?.state,
        groupAttempts: pair.group?.attemptCount,
        channelAttempts: pair.channel?.attemptCount,
      };
      await call('/api/v1/organization/members?Page=1&PageSize=1', [200]);
      const relations = await call('/api/v1/organization/guardian-relations?Page=1&PageSize=1', [
        200,
      ]);
      const first = relations.items?.[0];
      row.guardianRelationSample = {
        available: !!first,
        hasGuardianName: first
          ? Object.keys(first).some((k) => /guardian.*(name|identity)/i.test(k))
          : null,
      };
    }
    if (Array.isArray(classes) && classes.length) {
      const id = classes[0].id;
      const pair = await call('/api/v1/organization/classes/' + id + '/official-spaces', [200]);
      row.classSpaces = {
        sampleCount: 1,
        group: pair.group?.state,
        channel: pair.channel?.state,
        groupAttempts: pair.group?.attemptCount,
        channelAttempts: pair.channel?.attemptCount,
      };
      const assignments = await call('/api/v1/academic/classes/' + id + '/assignments', [200]);
      const assignment = (
        Array.isArray(assignments) ? assignments : (assignments.items ?? [])
      ).find((a) => a.status === 'Published' && a.versionId);
      if (assignment) {
        const delivery = await call(
          '/api/v1/organization/classes/' +
            id +
            '/official-spaces/activities?kind=Assignment&sourceVersionId=' +
            encodeURIComponent(assignment.versionId),
          [200, 404],
        );
        row.publishedAssignmentDelivery = {
          sampleCount: 1,
          status: row.requests.at(-1).status,
          code: row.requests.at(-1).code,
          states: Array.isArray(delivery)
            ? delivery.map((d) => ({ purpose: d.purpose, state: d.state }))
            : [],
        };
      } else
        row.publishedAssignmentDelivery = {
          sampleCount: 0,
          reason: 'No existing published assignment in sampled class',
        };
    }
    if (role === 'Personal') {
      const sources = await call('/api/v1/sources?Scope=Personal&Page=1&PageSize=5', [200]);
      const source = sources.items?.find((s) => typeof s.id === 'string');
      const preflight = await call('/api/v1/ai/sources/preflight', [200], {
        operation: 'Chat',
        selectedSourceIds: source ? [source.id] : [],
      });
      row.sourcePreflight = {
        selectedExistingSource: !!source,
        authorized: preflight.authorized,
        retrievalAvailable: preflight.retrievalAvailable,
        errorCode: safeCode(preflight.errorCode),
        commercialStatus: preflight.commercialStatus,
      };
      const quota = await call('/api/v1/commerce/ai/simple-text/preflight', [200], {
        contextType: 'Personal',
        payer: 'Individual',
      });
      row.quotaPreflight = {
        allowed: quota.allowed,
        errorCode: safeCode(quota.errorCode),
        authorizesEducationalData: quota.authorizesEducationalData,
      };
    }
    const after = await call('/api/v1/workspaces/current', [200]);
    row.contextPreserved = JSON.stringify(before) === JSON.stringify(after);
    assert(row.contextPreserved, 'Workspace changed during read audit');
    row.passed = true;
  } catch {
    row.failure =
      'An expected status, response prerequisite or connection check failed; inspect sanitized requests.';
  } finally {
    if (token)
      await call('/api/v1/auth/logout', [204], {}).catch(() => {
        row.logoutUnconfirmed = true;
      });
  }
  report.roles.push(row);
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(role + ': ' + (row.passed ? 'passed' : 'failed'));
}
if (report.roles.some((r) => !r.passed)) process.exitCode = 1;
