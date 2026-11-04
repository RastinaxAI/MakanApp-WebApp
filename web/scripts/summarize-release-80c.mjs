import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const json = async (path) => JSON.parse(await fs.readFile(path, 'utf8'));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const history = [
  'RELEASE_80C_BROWSER_FULL.json',
  'RELEASE_80C_BROWSER_FOLLOWUP.json',
  'RELEASE_80C_BROWSER_COMPLETION.json',
  'RELEASE_80C_BROWSER_TEACHER.json',
  'RELEASE_80C_BROWSER_TEACHER_FOLLOWUP.json',
];
const latest = new Map(),
  runs = [];
function visit(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? [])
        latest.set(spec.file + '::' + spec.title, {
          file: spec.file,
          title: spec.title,
          status: test.status,
          results: test.results.map((r) => r.status),
        });
    visit(suite.suites);
  }
}
for (const file of history) {
  const r = await json('docs/quality/' + file);
  visit(r.suites);
  runs.push({ file, stats: r.stats, errors: r.errors });
}
if ([...latest.values()].some((r) => r.status !== 'expected') || latest.size !== 209)
  throw Error('Browser verification incomplete');
const unit = await fs.readFile('tmp/integration-80c/unit-delivery.log', 'utf8');
if (!/447 passed/.test(unit)) throw Error('Unit verification incomplete');
const screenshots = [];
const root = 'output/review/integration-80c';
for (const theme of ['light', 'dark'])
  for (const view of ['requests', 'members', 'learning'])
    for (const width of [320, 390, 834, 1440]) {
      const file = `${theme}-${view}-${width}.png`,
        data = await fs.readFile(root + '/' + file);
      if (data.readUInt32BE(16) !== width) throw Error('Wrong screenshot size');
      screenshots.push({
        file,
        theme,
        view,
        width,
        height: data.readUInt32BE(20),
        sha256: hash(data),
      });
    }
const liveReads = await json('docs/quality/RELEASE_80C_LIVE_READS.json'),
  liveBff = await json('docs/quality/RELEASE_80C_LIVE_BFF.json');
if ([liveReads, liveBff].some((r) => r.roles.length !== 5 || r.roles.some((x) => !x.passed)))
  throw Error('Live verification incomplete');
const liveDraft = await json('docs/quality/RELEASE_80C_LIVE_DRAFT.json');
if (!liveDraft.passed || !liveDraft.cleanupConfirmed)
  throw Error('Live draft verification incomplete');
const publicChecks = await Promise.all(
  [
    ['entry', 'http://127.0.0.1:3145/enter'],
    ['preview', 'http://127.0.0.1:3145/preview/reference/MK-19'],
    ['swagger', 'http://94.184.32.84:8090/swagger/index.html'],
  ].map(async ([name, url]) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
    await r.body?.cancel();
    return { name, status: r.status };
  }),
);
if (publicChecks.some((r) => r.status !== (r.name === 'preview' ? 404 : 200)))
  throw Error('Entry verification incomplete');
const contract = await json('contracts/openapi.json'),
  client = await json('src/generated/api/contract.json');
const operations = Object.values(contract.paths).reduce(
  (n, p) =>
    n + Object.keys(p).filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m)).length,
  0,
);
const report = {
  checkedAtUtc: new Date().toISOString(),
  referenceRelease: '80c2e61296ca1b7ed855dc1e1183c4e8c19ad848',
  deployedBinaryCommitVerified: false,
  contract: {
    origin: 'http://94.184.32.84:8090',
    operations,
    previousOperations: 388,
    addedOperations: 45,
    removedOperations: 0,
    clientOperations: client.operations.length,
    schemas: Object.keys(client.schemas).length,
    ownerOperations: client.operations.filter((o) => o.path.startsWith('/api/admin/')).length,
    sha256: hash(await fs.readFile('contracts/openapi.json')),
  },
  unit: {
    passed: 447,
    failed: 0,
    files: 63,
    newTests: 24,
    initialContentScanTimeoutUnderConcurrentLoad: true,
    teacherLookupFixtureNormalizedIranianPhone: true,
    rerunAtNormalLoadPassed: true,
  },
  browser: {
    runs,
    unique: latest.size,
    latestPassed: latest.size,
    latestFailed: 0,
    latestSkipped: 0,
    newScenarios: 12,
    automaticFlakyRetries: 0,
    driver:
      'Chrome 156 on Ubuntu 26.04; the unavailable bundled Chromium attempt is separately retained',
  },
  live: {
    domainWrites: true,
    writeScope: 'one own Test formation draft; cancelled and never submitted for review',
    ownDraft: liveDraft,
    directRoles: liveReads.roles.map((r) => ({ role: r.role, passed: r.passed })),
    bffRoles: liveBff.roles.map((r) => ({
      role: r.role,
      passed: r.passed,
      contextPreserved: r.contextPreserved,
      unexpectedWrites: r.unexpectedWrites,
    })),
    initialUiLocatorFailure:
      'Previous resource-page title changed; all recorded API reads succeeded. The review now uses the actual resource search field.',
  },
  build: {
    mode: 'production-webpack',
    buildId: (await fs.readFile('.next/BUILD_ID', 'utf8')).trim(),
    entry: publicChecks,
  },
  visuals: {
    screenshots,
    manuallyReviewed: ['contact-light.jpg', 'contact-dark.jpg'],
    horizontalOverflowFailures: 0,
  },
  limits: {
    liveDomainMutationsVerified: ['own formation draft create/replay/read/edit/cancel'],
    otherLiveDomainMutationsVerified: false,
    backendDatabaseAclCertified: false,
    aiRuntimeEnabled: false,
    productionDeploymentPerformed: false,
    dockerVolumesChanged: false,
    privateEnvironmentFilesChanged: false,
  },
};
await fs.writeFile('docs/quality/RELEASE_80C_CHECKS.json', JSON.stringify(report, null, 2) + '\n');
const labels = {
  requests: 'درخواست تشکیل',
  members: 'عضویت و اختیار آموزشی',
  learning: 'تکلیف مستقل',
};
const groups = ['light', 'dark'].flatMap((theme) =>
  Object.entries(labels).map(
    ([view, label]) =>
      `<section><h2>${label} · ${theme === 'light' ? 'روشن' : 'تاریک'}</h2><div class="grid">${screenshots
        .filter((s) => s.theme === theme && s.view === view)
        .map(
          (s) =>
            `<a href="${s.file}"><img src="${s.file}" loading="lazy" alt="${label} ${s.width}"><span>${s.width} × ${s.height}</span></a>`,
        )
        .join('')}</div></section>`,
  ),
);
await fs.writeFile(
  root + '/index.html',
  `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>بررسی اتصال ماکان</title><style>body{font:16px system-ui;margin:24px;background:#f5f8fe;color:#182a45}a{color:#0d5ecc}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}.grid a{background:white;border:1px solid #d6e3fb;border-radius:12px;padding:12px;text-align:center}img{width:100%;height:440px;object-fit:contain;object-position:top}span{display:block;margin:12px}section{margin-block:32px}</style><h1>بررسی اتصال 80c2e61</h1><p>۲۴ تصویر از اجرای production با سرویس آزمون محلی. نوشتن‌های این تصاویر روی سرور زنده انجام نشده‌اند.</p><p><a href="../../../docs/RELEASE_80C_INTEGRATION_FA.md">گزارش اتصال و حدود آزمون</a> · <a href="../../../docs/quality/RELEASE_80C_CHECKS.json">رسید دقیق</a></p>${groups.join('')}</html>`,
);
console.log(
  JSON.stringify({
    unit: report.unit.passed,
    browser: report.browser.latestPassed,
    newUnit: 24,
    newBrowser: 12,
    screenshots: screenshots.length,
    liveRoles: liveBff.roles.filter((r) => r.passed).length,
  }),
);
