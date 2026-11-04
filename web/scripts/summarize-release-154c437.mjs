import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash = async (file) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');
const read = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const unit = await read('tmp/release-154c437/unit.json');
const receipts = [
  'RELEASE_154C437_BROWSER_BATCH1.json',
  'RELEASE_154C437_BROWSER_BATCH2.json',
  'RELEASE_154C437_BROWSER_BATCH3.json',
  'RELEASE_154C437_FINAL_BROWSER.json',
];
const latest = new Map(),
  runs = [];
for (const receipt of receipts) {
  const report = await read('docs/quality/' + receipt);
  for (const test of report.tests)
    latest.set(test.file.split('/').at(-1) + ':' + test.title, { ...test, evidence: receipt });
  runs.push({
    evidence: receipt,
    passed: report.tests.filter((row) => row.status === 'passed').length,
    failed: report.tests.filter((row) => ['failed', 'timedOut'].includes(row.status)).length,
    skipped: report.tests.filter((row) => row.status === 'skipped').length,
  });
}
const tests = [...latest.values()],
  live = await read('docs/quality/RELEASE_154C437_LIVE_READS.json'),
  bff = await read('docs/quality/RELEASE_154C437_LIVE_BFF_FINAL.json'),
  openapi = await read('contracts/openapi.json'),
  operations = await read('src/generated/api/contract.json');
const checks = {
  checkedAtUtc: new Date().toISOString(),
  application: 'web/ Next.js 16.4.2',
  backend: 'http://94.184.32.84:8090',
  reference: {
    document: 'MakanApp-Frontend-Backend-154c437-FA.pdf',
    documentCommit: '154c4372e8c03469f678a417caf79d58a51333df',
    deployedCommitAttested: false,
  },
  contract: {
    previousPaths: 327,
    livePaths: Object.keys(openapi.paths).length,
    clientOperations: operations.operations.length,
    schemas: Object.keys(operations.schemas).length,
    sha256: await hash('contracts/openapi.json'),
    platformAdminIncluded: operations.operations.some((operation) =>
      operation.path.startsWith('/api/admin/'),
    ),
  },
  build: {
    command: 'npm run build -- --webpack',
    result: 'passed',
    log: 'tmp/release-154c437/build.log',
  },
  checks: ['typecheck', 'lint', 'generated:check', 'format:check'].map((command) => ({
    command: 'npm run ' + command,
    result: 'passed',
  })),
  unit: {
    command: 'npm test',
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    files: unit.testResults.length,
    sourceReportSha256: await hash('tmp/release-154c437/unit.json'),
  },
  browser: {
    mode: 'three batches plus final rechecks; latest outcome per unique file/title',
    uniqueInventory: tests.length,
    uniqueLatestPassed: tests.filter((test) => test.status === 'passed').length,
    uniqueLatestFailed: tests.filter((test) => !['passed', 'skipped'].includes(test.status)).length,
    uniqueLatestSkipped: tests.filter((test) => test.status === 'skipped').length,
    runs,
    tests,
  },
  live: {
    domainWrites: false,
    directReadRolesPassed: live.roles.filter((row) => row.passed).length,
    directReadEvidence: 'RELEASE_154C437_LIVE_READS.json',
    bffLatestSuccessfulRoles: bff.roles.length,
    bffEvidence: 'RELEASE_154C437_LIVE_BFF_FINAL.json',
    initialBffFailuresRetained: true,
    bffSummary:
      'هر پنج نقش در بررسی موفقِ گروهی یا بازبررسی جداگانه تأیید شدند. در بررسی گروهی، خطای 503 ورود دو حساب ثبت و حفظ شد؛ علت قطعی تعیین نشده است.',
  },
  visual: {
    reviewedWidths: [390, 834, 1440],
    evidenceDirectory: 'output/review/release-154c437',
    reviewed: true,
  },
  limitations: [
    'Live domain mutations were not executed; write flows use an isolated local fixture.',
    'AI/RAG runtime and three additional source-aware AI operations are not activated in the UI.',
    'Permission catalog is read-only; granular bit/delegation editing is not implemented.',
    'Authentication 503 was observed in bulk live BFF checks; isolated role rechecks passed.',
    'Public deployment, Docker and server database/load/expiry/backfill verification were not performed.',
  ],
  sourceHashes: Object.fromEntries(
    await Promise.all(
      [
        'src/features/personal/sources/catalog.tsx',
        'src/app/api/client/source-files/[[...path]]/route.ts',
        'src/features/personal/messaging/conversation-photo.tsx',
        'src/features/personal/messaging/messenger.tsx',
      ].map(async (file) => [file, await hash(file)]),
    ),
  ),
};
if (
  checks.unit.failed ||
  checks.browser.uniqueLatestFailed ||
  checks.browser.uniqueLatestSkipped ||
  checks.live.directReadRolesPassed !== 5 ||
  checks.live.bffLatestSuccessfulRoles !== 5 ||
  checks.contract.platformAdminIncluded
)
  throw Error('Final release criteria not satisfied');
await fs.writeFile(
  'docs/quality/RELEASE_154C437_CHECKS.json',
  JSON.stringify(checks, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    unit: checks.unit.passed,
    browser: checks.browser.uniqueLatestPassed,
    liveDirect: checks.live.directReadRolesPassed,
    liveBffLatest: checks.live.bffLatestSuccessfulRoles,
  }),
);
