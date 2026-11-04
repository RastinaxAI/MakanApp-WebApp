// Isolated screenshot environment; it never connects to the public backend.
import { fixtureBackend } from '../tests/fixtures/backend/server.mjs';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url))),
  dir = path.join(root, 'tmp/design-atlas');
await fs.mkdir(path.join(dir, 'sessions'), { recursive: true, mode: 0o700 });
const backend = await fixtureBackend(3460);
const app = spawn(
  process.execPath,
  [
    path.join(root, 'node_modules/next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3140',
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      MAKAN_TEST_MODE: 'fixture',
      APP_ORIGIN: 'http://127.0.0.1:3140',
      BACKEND_BASE_URL: 'http://127.0.0.1:3460',
      SESSION_DIRECTORY: path.join(dir, 'sessions'),
      SESSION_SECRET: randomBytes(32).toString('hex'),
      CLIENT_COOKIE_NAME: 'makan_design_atlas',
      COOKIE_SECURE: 'false',
    },
    stdio: 'inherit',
  },
);
let stopped = false;
function stop() {
  if (stopped) return;
  stopped = true;
  app.kill('SIGTERM');
  backend.close();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
app.on('exit', (code) => {
  stop();
  process.exitCode = code ?? 1;
});
console.log('Design capture fixture: 3140 / 3460; isolated synthetic data.');
