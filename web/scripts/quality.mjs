import { spawnSync } from 'node:child_process';
const steps = ['format:check', 'lint', 'typecheck', 'test', 'generated:check', 'build', 'test:e2e'];
for (const step of steps) {
  console.log('\nQUALITY STEP: ' + step);
  const r = spawnSync(process.execPath, [process.env.npm_execpath, 'run', step], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
