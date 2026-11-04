// Summarize observed runs; later targeted browser runs supersede the same case only.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const read = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const batches = process.argv.slice(2);
if (!batches.length) throw Error('Pass the completed browser JSON reports in run order');
const cases = new Map(),
  runs = [];
for (const file of batches) {
  const report = await read(file);
  function visit(suites, parents = []) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? [])
        for (const test of spec.tests) {
          const result = test.results.at(-1);
          if (!result) continue;
          const key = spec.file + ':' + [...parents, spec.title].join(' / ') + ':' + test.projectId;
          cases.set(key, {
            key,
            file: spec.file,
            title: spec.title,
            status: result.status,
            retries: result.retry,
            batch: file,
          });
        }
      visit(suite.suites ?? [], [...parents, suite.title]);
    }
  }
  visit(report.suites);
  runs.push({ file, stats: report.stats, outsideErrors: report.errors.length });
}
const capture = await read('output/review/mk-reference/final/capture.json');
const visual = await read('output/review/mk-reference/final/comparison.json');
const responsive = await read('output/review/mk-reference/responsive/results.json');
const flows = await read('output/review/mk-reference/flows/results.json');
const contract = await read('docs/quality/MK_REFERENCE_CONTRACT.json');
const retention = await read('design/mk-route-retention.json');
const gallery = await read('output/review/mk-reference/gallery-qa.json');
const commands = await read('tmp/mk-reference/checks-final.json');
const unitLog = await fs.readFile('tmp/mk-reference/test-final.log', 'utf8');
const units = Number(unitLog.match(/Tests\s+(\d+) passed/)?.[1] ?? 0);
const browserCases = [...cases.values()];
const browserFailures = browserCases.filter((r) => r.status !== 'passed' || r.retries);
const fingerprint = createHash('sha256');
let sourceFiles = 0;
async function hashDirectory(directory) {
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const file = directory + '/' + entry.name;
    if (entry.isDirectory()) await hashDirectory(file);
    else {
      fingerprint.update(file + '\0').update(await fs.readFile(file));
      sourceFiles++;
    }
  }
}
await hashDirectory('src');
const report = {
  checkedAtUtc: new Date().toISOString(),
  reference: 'MakanApp_Codex_Reference_Pack',
  application: 'web/ only; no deployment or backend modifications',
  source: { files: sourceFiles, sha256: fingerprint.digest('hex') },
  commands,
  units: { passed: units, failed: /Tests.*failed/.test(unitLog) },
  browser: {
    unique: browserCases.length,
    passed: browserCases.filter((r) => r.status === 'passed').length,
    failed: browserFailures,
    runs,
    cases: browserCases,
  },
  flows: {
    passed: flows.passed,
    failed: flows.failed,
    evidence: 'output/review/mk-reference/flows/results.json',
  },
  capture: {
    screens: capture.screens.length,
    failures: capture.screens.filter(
      (s) => s.status !== 200 || !s.fontReady || s.overflow || s.unlabelled || s.errors.length,
    ),
    evidence: 'output/review/mk-reference/final/capture.json',
  },
  visual: {
    meanMae255: visual.meanMae255,
    maxMae255: visual.maxMae255,
    manuallyReviewed:
      '59 views across five contact sheets, overlay/diff; 44px hit areas and native focus intentional',
    evidence: 'output/review/mk-reference/final/comparison.json',
  },
  responsive: {
    checks: responsive.cases,
    failures: responsive.failures,
    evidence: 'output/review/mk-reference/responsive/results.json',
  },
  gallery,
  retainedRoutes: { entries: retention.entries.length, unmapped: retention.unmapped },
  contract,
  live: {
    primary: 'docs/quality/MK_REFERENCE_LIVE_BFF.json',
    followup: 'docs/quality/MK_REFERENCE_LIVE_BFF_TEACHER_MANAGER.json',
    previousManager: 'docs/quality/MK_REFERENCE_LIVE_BFF_MANAGER.json',
    latestManager: '503 UPSTREAM_UNAVAILABLE at OTP verification; not converted to success',
    domainWrites: false,
  },
  limits: [
    'Formation/membership/linked-space backend contracts pending',
    'Independent education flags off',
    'AI runtime/RAG not enabled',
    'Domain mutations tested with local fixture, not live users',
    'No Native device, external CI or production deployment',
  ],
};
await fs.mkdir('docs/quality', { recursive: true });
await fs.writeFile('docs/quality/MK_REFERENCE_CHECKS.json', JSON.stringify(report, null, 2) + '\n');
const invalid =
  browserFailures.length ||
  browserCases.length !== 176 ||
  units !== 344 ||
  flows.failed ||
  report.capture.failures.length ||
  responsive.failures.length ||
  retention.unmapped.length ||
  gallery.missing.length ||
  !contract.equal ||
  commands.some((c) => c.exitCode !== 0);
console.log(
  JSON.stringify({
    unit: units,
    browser: report.browser.passed,
    unique: report.browser.unique,
    browserFailures: browserFailures.map((x) => x.key),
    flows: flows.passed,
    screens: report.capture.screens,
    responsive: responsive.cases,
    valid: !invalid,
  }),
);
if (invalid) process.exitCode = 1;
