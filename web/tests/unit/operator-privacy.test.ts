import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
it('operator reports strip request logs and embedded credentials while retaining the diagnostic reason', () => {
  const moduleUrl = pathToFileURL(resolve('scripts/lib/review-errors.mjs')).href;
  const samples = [
    'socket hang up\nCall log:\n - cookie: private-value',
    'cookie: private-value',
    'Bearer private-value',
    'makan_client_session_8080=private-value',
    'eyJfake.payload.signature',
    'request rejected for 09120000101',
  ];
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import {scrubReviewError} from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(JSON.parse(process.argv[1]).map(scrubReviewError)));`,
      JSON.stringify(samples),
    ],
    { encoding: 'utf8' },
  );
  expect(child.status).toBe(0);
  const rows = JSON.parse(child.stdout);
  expect(rows[0]).toBe('socket hang up');
  expect(child.stdout).not.toContain('private-value');
  expect(child.stdout).not.toContain('eyJfake');
  expect(child.stdout).not.toContain('09120000101');
  expect(rows[5]).toContain('[test-phone]');
});
