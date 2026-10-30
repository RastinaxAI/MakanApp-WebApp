import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
fs.mkdirSync('tmp', { recursive: true });
const target = fs.mkdtempSync(path.join(root, 'tmp', 'clean-checkout-'));
if (path.dirname(target) !== path.join(root, 'tmp')) throw Error('Unexpected staging directory');
const sources = [
  'src',
  'public',
  'contracts',
  'design',
  'scripts',
  'tests',
  'output/design',
  'docs/quality/SCREEN_COVERAGE.json',
  'docs/api-matrix.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.ts',
  'next-env.d.ts',
  'postcss.config.mjs',
  'vitest.config.mts',
  'playwright.config.ts',
  '.prettierignore',
  '.prettierrc.json',
  '.env.example',
];
for (const source of sources) {
  if (!fs.existsSync(source)) continue;
  const destination = path.join(target, source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}
// No private .env, cookies, existing dependencies or build output are copied.
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
for (const key of [
  'BACKEND_BASE_URL',
  'APP_ORIGIN',
  'SESSION_SECRET',
  'SESSION_DIRECTORY',
  'COOKIE_SECURE',
  'MAKAN_TEST_MODE',
])
  delete env[key];
const evidence = path.join(root, 'test-results', 'clean-checkout');
fs.mkdirSync(evidence, { recursive: true });
const results = [];
for (const args of [
  ['ci', '--no-audit', '--no-fund', '--prefer-offline'],
  ...['generated:check', 'lint', 'test', 'build'].map((s) => ['run', s]),
]) {
  const name = args[0] === 'ci' ? 'install' : args[1].replace(':', '-');
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: target,
    env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  fs.writeFileSync(
    path.join(evidence, name + '.log'),
    (result.stdout ?? '') + (result.stderr ?? ''),
  );
  results.push({
    command: 'npm ' + args.join(' '),
    exitCode: result.status,
    log: 'test-results/clean-checkout/' + name + '.log',
  });
  fs.writeFileSync(
    path.join(evidence, 'results.json'),
    JSON.stringify({ node: process.version, target, sources, results }, null, 2),
  );
  console.log(name + ': ' + result.status);
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}
console.log('Clean checkout verified without private environment files: ' + target);
