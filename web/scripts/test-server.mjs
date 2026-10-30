import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { join, resolve, dirname, basename } from 'node:path';
import { fixtureBackend } from '../tests/fixtures/backend/server.mjs';
const root = process.cwd(),
  sessions = mkdtempSync(join(tmpdir(), 'makan-isolated-'));
const backend = await fixtureBackend();
const child = spawn(
  process.execPath,
  [
    join(root, 'node_modules/next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3132',
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      MAKAN_TEST_MODE: 'fixture',
      APP_ORIGIN: 'http://127.0.0.1:3132',
      BACKEND_BASE_URL: 'http://127.0.0.1:3457',
      SESSION_DIRECTORY: sessions,
      SESSION_SECRET: randomBytes(32).toString('hex'),
      COOKIE_SECURE: 'false',
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);
let stopped = false;
function stop() {
  if (stopped) return;
  stopped = true;
  child.kill();
  backend.close();
  const target = resolve(sessions);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('makan-isolated-'))
    throw Error('Unexpected test directory');
  rmSync(target, { recursive: true, force: true });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', (code) => {
  stop();
  process.exitCode = code ?? 1;
});
console.log('ISOLATED FIXTURE APP :3132; BACKEND :3457. No external service calls.');
