import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3130';
const checks = [
  { path: '/', expected: 307, location: '/personal' },
  { path: '/personal', expected: 307, location: '/enter' },
  { path: '/admin', expected: 404 },
  { path: '/enter', expected: 200 },
  { path: '/api/client/session', expected: 401 },
  { path: '/api/session', expected: 404 },
  { path: '/login', expected: 404 },
  { path: '/api/auth/challenge', method: 'POST', expected: 404, origin: base, body: '{}' },
  { path: '/api/backend/api/admin/v1/me', expected: 404 },
  { path: '/api/client/backend/api/v1/me', expected: 401 },
  { path: '/api/client/backend/api/admin/v1/me', expected: 404 },
  { path: '/api/client/hub?id=unbound-test-connection', expected: 401 },
  {
    path: '/api/client/hub/negotiate?negotiateVersion=1',
    method: 'POST',
    expected: 401,
    origin: base,
  },
  {
    path: '/api/client/auth/verify',
    method: 'POST',
    expected: 403,
    origin: 'https://untrusted.invalid',
    body: '{}',
  },
];
const results = await Promise.allSettled(
  checks.map(async (check) => {
    const response = await fetch(base + check.path, {
      method: check.method ?? 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: check.origin
        ? { Origin: check.origin, 'Content-Type': 'application/json' }
        : undefined,
      body: check.body,
    });
    await response.arrayBuffer();
    const location = response.headers.get('location');
    return {
      path: check.path,
      method: check.method ?? 'GET',
      status: response.status,
      expected: check.expected,
      location,
      passed:
        response.status === check.expected && (!check.location || location === check.location),
    };
  }),
);
const report = {
  checkedAt: new Date().toISOString(),
  base,
  authentication: 'No cookies or tokens; no OTP request or upstream write.',
  checks: results.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : { path: checks[index].path, passed: false, error: String(result.reason) },
  ),
};
await writeFile(
  new URL('../docs/upgrade-live-route-check.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
for (const check of report.checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.path}`);
if (report.checks.some((check) => !check.passed)) process.exitCode = 1;
