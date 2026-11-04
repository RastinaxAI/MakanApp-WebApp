// Local connected build review with its own ephemeral session key and directory.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd(),
  directory = path.join(root, 'tmp/mk-reference/live-sessions');
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const network = JSON.parse(await fs.readFile(path.join(root, 'config/network.json'), 'utf8'));
const app = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3145'],
  {
    cwd: root,
    env: {
      ...process.env,
      BACKEND_BASE_URL: process.env.BACKEND_BASE_URL ?? network.backendOrigin,
      APP_ORIGIN: 'http://127.0.0.1:3145',
      MAKAN_TEST_MODE: '',
      MAKAN_REFERENCE_PREVIEW: 'false',
      SESSION_DIRECTORY: directory,
      SESSION_SECRET: randomBytes(32).toString('hex'),
      CLIENT_COOKIE_NAME: 'makan_mk_connected_review',
      COOKIE_SECURE: 'false',
    },
    stdio: 'inherit',
  },
);
process.on('SIGTERM', () => app.kill('SIGTERM'));
process.on('SIGINT', () => app.kill('SIGTERM'));
app.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
