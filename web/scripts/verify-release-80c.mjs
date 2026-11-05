// Operator-only live read review. No messages, invitations, orders or other domain writes.
import fs from 'node:fs/promises';
if (process.env.MAKAN_TEST_READ_SMOKE !== '1' || process.env.CI)
  throw Error('Explicit local operator opt-in required');
const base =
    process.env.BACKEND_BASE_URL ||
    JSON.parse(await fs.readFile(new URL('../config/network.json', import.meta.url), 'utf8'))
      .backendOrigin,
  writes = new Set([
    '/api/v1/auth/otp/challenges',
    '/api/v1/auth/otp/verify',
    '/api/v1/workspaces/select',
    '/api/v1/auth/logout',
  ]);
const report = {
  checkedAtUtc: new Date().toISOString(),
  environment: base,
  domainWrites: false,
  roles: [],
};
for (const [role, phone] of [
  ['Student', '09120000101'],
  ['Teacher', '09120000102'],
  ['Parent', '09120000103'],
  ['Manager', '09120000104'],
  ['Personal', '09120000199'],
]) {
  let token;
  const row = { role, requests: [], passed: false };
  async function call(path, body) {
    if (body !== undefined && !writes.has(path)) throw Error('Domain write rejected');
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
    const value = await response.json().catch(() => null),
      record = {
        operation: path.split('?')[0].replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/{id}'),
        method: body === undefined ? 'GET' : 'POST',
        status: response.status,
      };
    const code = value?.code ?? value?.extensions?.code;
    if (typeof code === 'string' && /^[A-Z0-9_]{1,100}$/.test(code)) record.code = code;
    row.requests.push(record);
    return { response, value };
  }
  try {
    const c = await call('/api/v1/auth/otp/challenges', { phoneNumber: phone });
    if (c.response.status !== 202 || !c.value?.challengeId)
      throw Error('Test challenge unavailable');
    const v = await call('/api/v1/auth/otp/verify', {
      phoneNumber: phone,
      challengeId: c.value.challengeId,
      code: '123456',
      deviceName: 'Makan 80c2e61 read verification',
    });
    token = v.value?.accessToken;
    if (!v.response.ok || !token) throw Error('Test authentication unavailable');
    await call('/api/v1/me');
    const snapshot = await call('/api/v1/workspaces/snapshot');
    if (!Array.isArray(snapshot.value?.workspaces)) throw Error('Workspace snapshot unavailable');
    const space = snapshot.value.workspaces.find((w) =>
      role === 'Personal'
        ? w.workspaceType === 'Personal' && w.canEnter
        : w.role === role && w.canEnter,
    );
    row.workspaceAvailable = !!space;
    if (space)
      await call('/api/v1/workspaces/select', {
        workspaceType: space.workspaceType,
        membershipId: space.membershipId,
        role: space.role,
      });
    const before = await call('/api/v1/workspaces/current');
    const status = await call('/api/v1/me/messaging-status');
    row.allowedActions = status.value?.allowedActions;
    const inbox = await call('/api/v1/conversations/account?filter=All&limit=5');
    row.inbox = {
      serverPage: Array.isArray(inbox.value?.items),
      hasMore: inbox.value?.hasMore,
      loaded: inbox.value?.items?.length ?? 0,
      scopes: [...new Set(inbox.value?.items?.map((x) => x.scope) ?? [])],
    };
    const managed = inbox.value?.items?.find((x) => ['Group', 'Channel'].includes(x.type));
    if (managed) {
      const d = await call('/api/v1/conversations/' + managed.conversationId);
      row.sampleManaged = {
        type: d.value?.type,
        effectiveCapabilities: d.value?.effectiveCapabilities,
        memberCapabilities: d.value?.memberCapabilities,
        managementPolicy: d.value?.managementPolicy,
      };
    }
    const p = await call('/api/v1/conversations/permissions');
    row.permissionCatalogCount = Array.isArray(p.value) ? p.value.length : 0;
    for (const path of [
      '/api/v1/realtime/account-inbox/changes?limit=5',
      '/api/v1/contacts?page=1&pageSize=5&favoritesOnly=false',
      '/api/v1/commerce/personal/subscription',
      '/api/v1/personal-classes/page?page=1&pageSize=5',
      '/api/v1/personal-class-requests?page=1&pageSize=5',
      '/api/v1/personal-classes/invitations/page?page=1&pageSize=5',
      '/api/v1/personal-classes/join-requests?page=1&pageSize=5',
      '/api/v1/personal-classes/manager-transfers?page=1&pageSize=5',
      '/api/v1/sources?Scope=Personal&Page=1&PageSize=5',
    ])
      await call(path);
    if (space?.workspaceType === 'Organization' && role === 'Manager')
      await call('/api/v1/organization/official-spaces');
    if (space?.workspaceType === 'Organization' && role !== 'Parent') {
      const classes = await call('/api/v1/academic/classes');
      const id = Array.isArray(classes.value) ? classes.value[0]?.id : undefined;
      if (id) {
        await call('/api/v1/organization/classes/' + id + '/official-spaces');
        await call('/api/v1/sources?Scope=Class&ClassId=' + id + '&Page=1&PageSize=5');
      }
    }
    const after = await call('/api/v1/workspaces/current');
    row.contextPreserved =
      before.response.ok &&
      after.response.ok &&
      JSON.stringify(before.value) === JSON.stringify(after.value);
    row.passed =
      row.requests.every((x) => x.status < 400) && row.contextPreserved && row.inbox.serverPage;
  } catch (e) {
    row.error =
      e instanceof Error && /^(Test |Workspace )/.test(e.message)
        ? e.message
        : 'Connection or response validation failed';
  } finally {
    if (token)
      await call('/api/v1/auth/logout', {}).catch(() => {
        row.logoutUnconfirmed = true;
      });
  }
  report.roles.push(row);
  await fs.mkdir('docs/quality', { recursive: true });
  await fs.writeFile(
    process.env.MAKAN_TEST_REPORT || 'docs/quality/RELEASE_80C_LIVE_READS.json',
    JSON.stringify(report, null, 2) + '\n',
  );
}
console.log(
  JSON.stringify({
    environment: base,
    domainWrites: false,
    roles: report.roles.map((r) => ({
      role: r.role,
      passed: r.passed,
      failures: r.requests.filter((x) => x.status >= 400),
    })),
  }),
);
