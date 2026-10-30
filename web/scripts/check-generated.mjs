import { spawnSync } from 'node:child_process';
for (const file of ['scripts/generate-contract.mjs', 'scripts/build-design.mjs']) {
  const r = spawnSync(process.execPath, [file, '--check'], { stdio: 'inherit', windowsHide: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
