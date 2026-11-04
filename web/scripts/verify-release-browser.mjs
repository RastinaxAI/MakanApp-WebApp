import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const batch = Number(process.argv[2]);
if (![1, 2, 3].includes(batch)) throw Error('Choose browser batch 1, 2 or 3');
const all = (await fs.readdir('tests/browser')).filter((name) => name.endsWith('.spec.ts')).sort();
const files = all.filter((_, index) => index % 3 === batch - 1);
const child = spawn(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test', ...files.map((name) => 'tests/browser/' + name)],
  { env: { ...process.env, PLAYWRIGHT_CHANNEL: 'chrome' }, stdio: 'inherit' },
);
const code = await new Promise((resolve) => child.once('exit', resolve));
const raw = JSON.parse(await fs.readFile('test-results/browser-results.json', 'utf8'));
const tests = [];
function visit(suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests) {
      const result = test.results.at(-1);
      tests.push({
        file: spec.file,
        title: spec.title,
        status: result?.status ?? test.status,
        durationMs: result?.duration ?? 0,
        attempts: test.results.length,
      });
    }
  for (const sub of suite.suites ?? []) visit(sub);
}
for (const suite of raw.suites ?? []) visit(suite);
const report = {
  checkedAtUtc: new Date().toISOString(),
  batch,
  environment: 'isolated local fixture; no external domain writes',
  files,
  exitCode: code,
  counts: {
    passed: tests.filter((test) => test.status === 'passed').length,
    failed: tests.filter((test) => test.status === 'failed' || test.status === 'timedOut').length,
    skipped: tests.filter((test) => test.status === 'skipped').length,
  },
  tests,
};
await fs.writeFile(
  `docs/quality/RELEASE_154C437_BROWSER_BATCH${batch}.json`,
  JSON.stringify(report, null, 2) + '\n',
);
process.exitCode = code ?? 1;
