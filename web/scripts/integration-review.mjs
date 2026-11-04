// A local production-build review connected to the configured Test backend.
// Session encryption material is generated in memory and never printed.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
const root = process.cwd(),
  sessions = mkdtempSync(join(tmpdir(), 'makan-integration-review-'));
const child = spawn(
  process.execPath,
  [
    join(root, 'node_modules/next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3145',
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      APP_ORIGIN: 'http://127.0.0.1:3145',
      SESSION_DIRECTORY: sessions,
      SESSION_SECRET: randomBytes(32).toString('hex'),
      COOKIE_SECURE: 'false',
      MAKAN_REFERENCE_PREVIEW: 'false',
    },
    stdio: 'inherit',
  },
);
let stopped = false;
function stop() {
  if (stopped) return;
  stopped = true;
  child.kill();
  const target = resolve(sessions);
  if (
    dirname(target) !== resolve(tmpdir()) ||
    !basename(target).startsWith('makan-integration-review-')
  )
    throw Error('Unexpected session directory');
  rmSync(target, { recursive: true, force: true });
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, stop);
child.on('exit', (code) => {
  stop();
  process.exitCode = code ?? 1;
});
