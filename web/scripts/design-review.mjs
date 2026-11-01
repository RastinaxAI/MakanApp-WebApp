import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const mode = process.argv.includes('--production') ? 'start' : 'dev';
const child = spawn(process.execPath, [next, mode, '--hostname', '127.0.0.1', '--port', '3130'], {
  cwd: root,
  env: {
    ...process.env,
    // Use the same backend as the deployed client.
    BACKEND_BASE_URL: 'http://94.184.32.84',
    APP_ORIGIN: 'http://127.0.0.1:3130',
    SESSION_DIRECTORY: join(root, '.makan-qa-sessions'),
  },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
