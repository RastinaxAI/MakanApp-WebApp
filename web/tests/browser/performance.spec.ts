import { test, expect, login, fixture, origin } from './test';
import { mkdir, writeFile } from 'node:fs/promises';

test('records cold entry and school payloads plus a controlled concurrent read benchmark', async ({
  page,
  context,
  request,
}) => {
  const metrics: Record<string, unknown> = {
    environment: 'isolated local fixture; synthetic latency; not production latency',
  };
  async function assets() {
    return page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const scripts = resources.filter((r) => new URL(r.name).pathname.endsWith('.js'));
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        javascriptRequests: scripts.length,
        javascriptDecodedBytes: scripts.reduce((sum, r) => sum + r.decodedBodySize, 0),
        documentTtfbMs: Math.round(nav.responseStart - nav.requestStart),
        firstContentfulPaintMs: Math.round(
          performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0,
        ),
      };
    });
  }
  await page.goto('/enter');
  await expect(page.getByRole('textbox', { name: 'شماره همراه', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  metrics.entry = await assets();
  const selected = await login(context);
  const schoolStart = Date.now();
  await page.goto('/personal/education');
  await expect(page.getByRole('heading', { name: 'نمای آموزشگاه', exact: true })).toBeVisible();
  metrics.schoolReadyMs = Date.now() - schoolStart;
  metrics.school = await assets();
  await page.goto('/enter'); // Stop private-page polling before measuring API concurrency.
  const before = await (await request.get(fixture + '/__test__/state')).json();
  const paths = ['/api/v1/contacts', '/api/v1/invitations', '/api/v1/workspaces/snapshot'];
  for (const path of paths)
    await request.post(fixture + '/__test__/fault', { data: { path, method: 'GET', delay: 300 } });
  const started = Date.now();
  const responses = await Promise.all(
    paths.map((path) =>
      context.request.get(origin + '/api/client/backend' + path, {
        headers: { 'X-Makan-Context': selected.revision },
      }),
    ),
  );
  metrics.concurrentBatchMs = Date.now() - started;
  for (const response of responses) expect(response.status()).toBe(200);
  const after = await (await request.get(fixture + '/__test__/state')).json();
  const calls = after.requests.slice(before.requests.length) as { path: string }[];
  metrics.identityReads = calls.filter((r) => r.path === '/api/v1/me').length;
  metrics.contextReads = calls.filter((r) => r.path === '/api/v1/workspaces/current').length;
  const tag = process.env.MAKAN_PERFORMANCE_TAG ?? 'latest';
  if (!/^[a-z0-9-]+$/.test(tag)) throw new Error('Invalid performance report tag');
  await mkdir('docs/quality', { recursive: true });
  await writeFile(`docs/quality/PERFORMANCE_${tag}.json`, JSON.stringify(metrics, null, 2));
});
