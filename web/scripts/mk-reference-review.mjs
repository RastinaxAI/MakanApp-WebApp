// Local review only. No public backend writes and no shared user session directory.
import { fixtureBackend } from '../tests/fixtures/backend/server.mjs';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const directory = path.join(root, 'tmp/mk-reference');
await fs.mkdir(path.join(directory, 'sessions'), { recursive: true, mode: 0o700 });
const backend = await fixtureBackend(3464);
const app = spawn(
  process.execPath,
  [
    path.join(root, 'node_modules/next/dist/bin/next'),
    process.argv.includes('--production') ? 'start' : 'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3144',
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      MAKAN_TEST_MODE: 'fixture',
      MAKAN_REFERENCE_PREVIEW: 'true',
      APP_ORIGIN: 'http://127.0.0.1:3144',
      BACKEND_BASE_URL: 'http://127.0.0.1:3464',
      SESSION_DIRECTORY: path.join(directory, 'sessions'),
      SESSION_SECRET: randomBytes(32).toString('hex'),
      CLIENT_COOKIE_NAME: 'makan_mk_reference',
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
console.log('Reference review: 3144 / 3464, synthetic fixture, independent sessions.');
