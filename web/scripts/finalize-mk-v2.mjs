import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const runs = [];
const latest = new Map();
for (const name of ['INITIAL', 'FOLLOWUP', 'FINAL']) {
  const report = await read('docs/quality/MK_V2_BROWSER_' + name + '.json');
  runs.push({ name, ...report.stats });
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests)
        latest.set(spec.file + ':' + spec.title, {
          file: spec.file,
          title: spec.title,
          status: test.results.at(-1)?.status,
          run: name,
        });
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites) visit(suite);
}
const browserCases = [...latest.values()];
assert(browserCases.every((r) => r.status === 'passed'));
const capture = await read('output/review/mk-v2/native/capture.json');
assert.equal(capture.screens.length, 82);
assert(
  capture.screens.every(
    (s) => s.status === 200 && !s.errors.length && !s.overflow && !s.unlabelled && s.fontReady,
  ),
);
const layouts = await read('output/review/mk-v2/after/results.json');
assert.equal(layouts.length, 96);
assert(layouts.every((s) => !s.errors.length && !s.overflow));
const native = await read('output/review/mk-v2/responsive/results.json'),
  followup = await read('output/review/mk-v2/responsive-followup/results.json');
assert.equal(native.failures.length + followup.failures.length, 0);
const flows = await read('output/review/mk-v2/flows/results.json');
assert.equal(flows.results.length, 8);
assert(flows.results.every((s) => s.passed));
const comparison = await read('output/review/mk-v2/native/comparison.json');
const contract = await read('docs/quality/MK_V2_CONTRACT_READ.json');
assert.equal(contract.status, 200);
assert(contract.matchesInstalledContract);
const logs = {};
for (const name of ['unit', 'lint', 'typecheck', 'format-check', 'generated', 'build'])
  logs[name] = await fs.readFile('tmp/mk-v2/' + name + '.log', 'utf8');
assert(logs.unit.includes('362 passed'));
assert(logs.lint.includes('no cycles'));
assert(logs['format-check'].includes('All matched files'));
assert(logs.generated.includes('239 client-only'));
assert(logs.build.includes('ƒ Proxy'));
assert(!/error TS|Failed to compile|Build error/.test(logs.build + logs.typecheck));
const enter = await fetch('http://127.0.0.1:3145/enter');
assert.equal(enter.status, 200);
assert((await enter.text()).includes('data-auth-layout'));
const preview = await fetch('http://127.0.0.1:3145/preview/reference/MK-82');
assert.equal(preview.status, 404);
const report = {
  checkedAt: new Date().toISOString(),
  buildId: (await fs.readFile('.next/BUILD_ID', 'utf8')).trim(),
  checks: {
    productionBuild: 'passed: NEXT_STANDALONE=true npm run build -- --webpack',
    typecheck: 'passed',
    lint: 'passed',
    generated: 'passed: 239 client operations, 447 schemas, no platform owner',
    format: 'passed',
    unit: { files: 58, passed: 362 },
  },
  browser: {
    uniqueCases: browserCases.length,
    latestPassed: browserCases.filter((c) => c.status === 'passed').length,
    runs,
    cases: browserCases,
  },
  visual: {
    nativeViews: capture.screens.length,
    referencePdfPages: 37,
    updatedDesignViews: 23,
    lightDarkLayoutCases: layouts.length,
    authCaptures: 24,
    responsiveBaseCases: native.cases,
    responsiveFollowupCases: followup.cases,
    failures: 0,
    meanRgbDifference255: comparison.meanMae255,
    maxRgbDifference255: comparison.maxMae255,
    interpretation:
      'RGB difference is not a UX correctness percentage. Runtime timer/progress, explicit preview label and required unchecked review controls intentionally differ from static reference.',
  },
  educationFlows: flows,
  contractRead: contract,
  previewPubliclyEnabled: false,
  independentEducationPubliclyEnabled: false,
  connectedRuntime: { origin: 'http://127.0.0.1:3145', entry: 200, privatePreview: 404 },
  limitations: [
    'Independent-class education and formation require validated backend contracts; no guessed endpoint or production success.',
    'Education preview is a local simulator, not server authorization, receipt, grading or timer proof.',
    'Browser integration uses isolated fixtures; no live domain mutations performed.',
  ],
};
await fs.writeFile('docs/quality/MK_V2_CHECKS.json', JSON.stringify(report, null, 2) + '\n');
const block = `# به‌روزرسانی مرجع V2 و اصلاح تبلت/دسکتاپ — ۳ نوامبر ۲۰۲۶\n\nورود از عرض ۷۶۸ با توضیح برنامه در راست و شماره/کد در چپ اجرا می‌شود. آموزشگاه و صفحه‌های کلاس‌ها، اعضا، والد و فرزند، دعوت‌ها و گزارش‌ها اکنون Shell، سربرگ، ناوبری و عرض مشترک دارند. مدیریت در تبلت/دسکتاپ از ستون‌های پیگیری و کلاس‌های فعال استفاده می‌کند؛ دعوت‌های من تمام عرض بخش را می‌گیرد و تنظیمات کارت‌ها، تم و پروفایل را در ستون‌های کاربردی می‌چیند. پروفایل اطلاعات واقعی حساب و انتخاب نقش/فضای مجاز را در خود صفحه دارد؛ تغییر موفق زمینه از سرور دریافت می‌شود و شکست، نقش قبلی را حفظ می‌کند.\n\nنسخهٔ دوم ۳۷ صفحه و ۸۲ نما دارد: هر۲۳ نمای جدید MK-60–82 و بازطراحی MK-44–46 به اجزای native اضافه شدند. تکلیف و آزمون مستقل مصوب‌اند؛ پیش‌نمایش نوع‌دار برای انتشار، تحویل/رسید نمونه، ارزیابی خصوصی و انتشار جدا، اصلاحیه، زمان و آفلاین، لغو دسترسی و دو میز کار دسکتاپ اجرا شده است. قرارداد واقعی آن‌ها هنوز ناقص است؛ public flag خاموش و مسیرهای عمومی در انتظارند. API سازمانی یا مالک به مستقل تعمیم داده نشده است.\n\nشاهد نهایی: ساخت تولید، typecheck، lint، generated، format و diff موفق؛ ۳۶۲ آزمون واحد در۵۸فایل؛ ${browserCases.length} سناریوی یکتای مرورگر با آخرین نتیجهٔ موفق در اجرای اولیه و پیگیری‌ها، بدونskip/flaky؛۸جریان آموزشی موفق؛۸۲تصویر native و مقایسه/overlay؛۹۶بررسی صفحهٔ متصل در دو تم و شش عرض۳۲۰–۱۹۲۰،۲۴تصویر ورود،${native.cases} بررسی واکنش‌گرایی به‌علاوه${followup.cases} بررسی پس از اصلاح تایپوگرافی، بدونoverflow/frame/error. اجرای اولیه مرورگر۲۰موفق/۱ناموفق، پیگیری۱۸موفق/۳ناموفق و اجرای نهایی۲۱موفق داشت؛ موارد ناموفق نام‌گذاری سربرگ/ناوبری بودند و اصلاح شدند.\n\nGET قرارداد زنده موفق:۳۴۲مسیر،۳۸۸عملیات،۶۵۱schema و hash مطابق snapshot نصب‌شده؛ SDK کلاینت۲۳۹عملیات/۴۴۷schema و بدون عملیات مالک است. هیچ mutation دامنهٔ زنده در آزمون انجام نشد. کار در web محدود ماند؛ برنامه مالک، فایل‌های خصوصی، نشست‌های Docker و سرویس‌های دیگر کاربر دست‌نخورده‌اند.\n\n[گزارش V2](MK_V2_UPDATE_FA.md) · [ردیابی۸۲نما](MK_REFERENCE_TRACEABILITY_FA.md) · [نتیجه دقیق آزمون‌ها](quality/MK_V2_CHECKS.json). اجرای متصل محلی۳۱۴۵ و پیش‌نمایش جدا۳۱۴۴ فعال‌اند.\n\n---\n\n`;
const previous = await fs.readFile('docs/PROGRESS.md', 'utf8');
await fs.writeFile('docs/PROGRESS.md', block + previous);
await fs.appendFile(
  'docs/MK_V2_UPDATE_FA.md',
  `\n## نتیجهٔ نهایی\n\n۳۶۲آزمون واحد، ${browserCases.length} سناریوی یکتای مرورگر با آخرین نتیجهٔ موفق و۸جریان آموزشی موفق شدند. ۸۲نما تصویرگیری و با مرجع مقایسه شد؛۹۶بررسی روشن/تاریک در عرض‌های۳۲۰،۳۹۰،۸۳۴،۱۰۲۴،۱۴۴۰و۱۹۲۰، ${native.cases}+${followup.cases} بررسی واکنش‌گرایی و۲۴تصویر ورود بدون خطای ثبت‌شده‌اند. تفاوت تصویر شامل نشان صریح پیش‌نمایش، زمان پویا و تأییدِ اولیهٔ خاموش است؛ سنجهٔ RGB درصد صحت UX نیست. قرارداد سرور با GET دوباره بررسی شد و با قرارداد نصب‌شده برابر بود. جزئیات و سابقهٔ اجراهای اولیه/پیگیری در [نتیجهٔ ماشین‌خوان](quality/MK_V2_CHECKS.json) آمده است.\n`,
);
console.log(
  JSON.stringify({
    unit: 362,
    browserUnique: browserCases.length,
    nativeViews: 82,
    layoutCases: 96,
    responsive: native.cases,
    followup: followup.cases,
    educationFlows: 8,
    passed: true,
  }),
);
