// Operator-invoked remote read smoke. Never part of CI, quality, or automatic tests.
// Only creates/selects/revokes its own test auth sessions; no domain mutations.
import fs from 'node:fs/promises';
if (process.env.MAKAN_TEST_READ_SMOKE !== '1')
  throw Error('Set MAKAN_TEST_READ_SMOKE=1 explicitly.');
const base = 'http://94.184.32.84:8090';
const rows = [];
const authPosts = new Set([
  '/api/v1/auth/otp/challenges',
  '/api/v1/auth/otp/verify',
  '/api/v1/workspaces/select',
  '/api/v1/auth/logout',
]);
for (const [role, phone] of [
  ['Student', '+989120000101'],
  ['Teacher', '+989120000102'],
  ['Parent', '+989120000103'],
  ['Manager', '+989120000104'],
]) {
  let token;
  const row = { role, reads: [], sessionOnlyMutations: [], contextPreserved: null };
  async function call(path, body) {
    if (body !== undefined && !authPosts.has(path)) throw Error('Domain writes forbidden');
    const r = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    const value = await r.json().catch(() => null);
    const record = {
      operation: path.split('?')[0].replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/{id}'),
      status: r.status,
    };
    const code = value?.code ?? value?.extensions?.code;
    if (typeof code === 'string' && /^[A-Z0-9_]{1,100}$/.test(code)) record.code = code;
    (body === undefined ? row.reads : row.sessionOnlyMutations).push(record);
    return { status: r.status, ok: r.ok, value };
  }
  try {
    const challenge = await call('/api/v1/auth/otp/challenges', { phoneNumber: phone });
    if (!challenge.ok || !challenge.value?.challengeId) throw Error('Challenge unavailable');
    const verify = await call('/api/v1/auth/otp/verify', {
      phoneNumber: phone,
      challengeId: challenge.value.challengeId,
      code: '123456',
      deviceName: 'Makan release read smoke',
    });
    token = verify.value?.accessToken;
    if (!verify.ok || !token) throw Error('Test authentication unavailable');
    const initial = await call('/api/v1/workspaces/snapshot');
    if (!initial.ok || !Array.isArray(initial.value?.workspaces))
      throw Error('Workspace snapshot unavailable');
    const space = initial.value.workspaces.find((w) => w.role === role && w.canEnter === true);
    row.workspace = {
      hasEffectiveEducationalRole: initial.value.hasEffectiveEducationalRole,
      personalWorkspaceVisible: initial.value.personalWorkspaceVisible,
      usableRole: !!space,
    };
    if (!space) throw Error('No usable test role');
    const selected = await call('/api/v1/workspaces/select', {
      workspaceType: space.workspaceType,
      membershipId: space.membershipId,
      role: space.role,
    });
    if (!selected.ok) throw Error('Role selection unavailable');
    const before = await call('/api/v1/workspaces/current');
    const inbox = await call('/api/v1/conversations?scope=Personal&page=1&pageSize=5');
    row.personalInbox = {
      status: inbox.status,
      onlyPersonal:
        inbox.ok && Array.isArray(inbox.value)
          ? inbox.value.every((x) => x.scope === 'Personal')
          : null,
    };
    await call('/api/v1/contacts?page=1&pageSize=5&favoritesOnly=false');
    await call('/api/v1/realtime/changes?scope=Personal&limit=2');
    await call('/api/v1/realtime/changes?limit=2');
    if (role === 'Manager') {
      const org = await call('/api/v1/organization/official-spaces');
      row.organizationPair = org.ok
        ? { group: org.value.group?.state, channel: org.value.channel?.state }
        : null;
    }
    if (role !== 'Parent') {
      const classes = await call('/api/v1/academic/classes');
      const classId = Array.isArray(classes.value) ? classes.value[0]?.id : undefined;
      if (classId) {
        const pair = await call(`/api/v1/organization/classes/${classId}/official-spaces`);
        row.classPair = pair.ok
          ? {
              group: pair.value.group?.state,
              channel: pair.value.channel?.state,
              groupCapabilities: pair.value.group?.capabilities,
              channelCapabilities: pair.value.channel?.capabilities,
            }
          : null;
        const assignments = await call(`/api/v1/academic/classes/${classId}/assignments`);
        const published = Array.isArray(assignments.value)
          ? assignments.value.find((x) => x.status === 'Published' && x.versionId)
          : undefined;
        if (published) {
          const deliveries = await call(
            `/api/v1/organization/classes/${classId}/official-spaces/activities?kind=Assignment&sourceVersionId=${encodeURIComponent(published.versionId)}`,
          );
          row.deliveries =
            deliveries.ok && Array.isArray(deliveries.value)
              ? deliveries.value.map((x) => ({ purpose: x.purpose, state: x.state }))
              : null;
          const eventId = deliveries.value?.[0]?.eventId;
          if (eventId)
            await call(
              `/api/v1/organization/classes/${classId}/official-spaces/activities/${eventId}`,
            );
        }
      }
    }
    const after = await call('/api/v1/workspaces/current');
    row.contextPreserved =
      before.ok && after.ok && JSON.stringify(before.value) === JSON.stringify(after.value);
  } catch {
    row.incomplete = true;
  } finally {
    if (token)
      await call('/api/v1/auth/logout', {}).catch(() => {
        row.logoutUnconfirmed = true;
      });
  }
  rows.push(row);
}
const report = {
  checkedAtUtc: new Date().toISOString(),
  environment: base,
  kind: 'remote test read smoke; auth/session mutations only',
  domainWrites: false,
  rows,
};
await fs.mkdir('docs/quality', { recursive: true });
await fs.writeFile(
  'docs/quality/RELEASE_42C51A3_LIVE_READS.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    roles: rows.map((r) => ({
      role: r.role,
      incomplete: r.incomplete ?? false,
      contextPreserved: r.contextPreserved,
      readFailures: r.reads
        .filter((x) => x.status >= 400)
        .map((x) => ({ operation: x.operation, status: x.status })),
    })),
    domainWrites: false,
  }),
);
