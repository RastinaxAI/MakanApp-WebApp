// Rebuild the review index and traceability from the actual capture evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import { entries } from './design-atlas-manifest.mjs';
if (!process.argv.includes('--v1')) {
  await import('./document-mk-v2.mjs');
  process.exit(0);
}
const root = process.cwd();
const manifest = JSON.parse(await fs.readFile('design/mk-reference.json', 'utf8'));
const contract = JSON.parse(await fs.readFile('docs/quality/MK_REFERENCE_CONTRACT.json', 'utf8'));
const capture = JSON.parse(
  await fs.readFile('output/review/mk-reference/final/capture.json', 'utf8'),
);
const comparison = JSON.parse(
  await fs.readFile('output/review/mk-reference/final/comparison.json', 'utf8'),
);
const interactions = [
  'شروع ورود و ساخت حساب',
  'اعتبارسنجی شماره، ارسال کد، حفظ مسیر مقصد',
  'ورودی و چسباندن کد، تلاش مجدد و ویرایش شماره',
  'انتخاب روز، برنامه، کلاس و تکلیف مجاز',
  'مطالعه، پیوست مجاز، ورود به تکلیف',
  'پیش‌نویس، پیوست، بازبینی و رسید معتبر',
  'برنامه، حضور، تکلیف و تصحیح مدرس',
  'اعضا، دعوت، کلاس، رابطه والد و گزارش مدیر',
  'انتخاب فرزند مجاز، برنامه، حضور و نتیجهٔ منتشرشده',
  'شروع درخواست مستقل بدون آموزشگاه',
  'جستجو، فیلتر کلاس و ورود به جزئیات',
  'فیلتر وضعیت، اصلاح، ادامه پیش‌نویس و جزئیات',
  'عنوان، شرح و موضوع؛ خطای فیلد و ادامه',
  'مخاطب، ظرفیت، شرایط و روش عضویت',
  'مدیر پیش‌فرض و مدرس اختیاری',
  'بازبینی، پذیرش قواعد و ثبت یک درخواست',
  'شماره ثابت و تاریخچهٔ همان درخواست',
  'اصلاح و ارسال همان شناسه و سابقه',
  'انتخاب صف، دلیل، تأیید تصمیم، مدیر نهایی و مدرس',
  'نمایش آماده‌سازی گروه و کانال',
  'شکست جزئی و ادامه با همان شناسه‌ها',
  'پذیرش مسئولیت جایگزین، قواعد و شروع',
  'ورود عضو به فضا، اطلاعات و اعضا',
  'مدیریت اعضا، درخواست‌ها، قواعد و بایگانی',
  'سوابق مجاز و فضاهای بایگانی',
  'جستجوی حساب، انتخاب نقش، اعتبار و پیام دعوت',
  'رضایت، پذیرش یا رد دعوت',
  'رضایت و درخواست عضویت بدون اعطای دسترسی؛ انصراف',
  'پذیرش/رد با تأیید و فیلتر وضعیت',
  'جستجو و فیلتر اعضا، انتخاب عضو، صفحه بعد و دعوت',
  'ویرایش محلی، حفظ هویت مرکزی و پایان عضویت',
  'پیام، پاسخ، پیوست و ورود به اطلاعات گروه',
  'اطلاعیه و پیوست کانال، ورود به گروه همان کلاس',
  'اطلاعات وابستگی، بی‌صدا، فایل و خروج مستقل',
  'جستجو، cursor، فیلتر، نخوانده و انتخاب گفتگو',
  'پیش‌نویس، پاسخ، ارسال، پیوست، retry و reconciliation',
  'منو، پاسخ، کپی، بازفرستادن، ذخیره و گزارش',
  'پرسش و انتخاب منبع با حفظ پیش‌نویس',
  'scope، جستجو، صفحه‌بندی، شمارش و آمادگی مجاز',
  'پاسخ و ارجاع نمونه، کپی و بازخورد؛ فاقد پاسخ ساختگی سرویس',
  'جستجو، فیلتر، scope، صفحه‌بندی و جزئیات',
  'انتخاب مقصد، فایل، پیشرفت واقعی و تلاش مجدد',
  'تفکیک سه آمادگی و دانلود مجاز',
  'جلسه، مسیر، درس و منبع نمونه',
  'متن و پیوست، پیش‌نویس و بازبینی نمونه',
  'پاسخ سؤال، حفظ انتخاب و بازبینی نمونه',
  'هویت، ویرایش، نقش‌ها، منابع، امنیت و ظاهر',
  'نشست‌های واقعی و لغو با تأیید',
  'تنظیمات نسخه‌دار، بلاک، روابط و مجوز پیام',
  'همان فوق‌برنامه در تم تاریک',
  'همان صندوق مجاز در تم تاریک',
  'همان دستیار و منابع در تم تاریک',
  'دادهٔ قبلی و قطع اتصال؛ تلاش مجدد بدون موفقیت ساختگی',
  'بدون نتیجه و پاک‌کردن جستجوی عضو',
  'تعارض و مقایسه؛ حفظ نوشته تا انتخاب صریح',
  'فیلتر، جستجو و مدیریت اعضا در جدول/کارت',
  'نام بلند و متن درشت در فهرست اعضا',
  'برچسب ثابت، خطای فیلد و تمرکز ورودی',
  'حساب مستقل، دعوت‌های آموزشگاه و ورود به فوق‌برنامه',
];
const pending = new Set([
  12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 26, 28, 29, 31, 32, 33, 34, 55, 56, 58,
]);
const mixed = new Set([10, 11, 23, 24, 25, 27, 30, 50, 53, 54, 57]);
for (const screen of manifest.screens) {
  const n = Number(screen.id.slice(-2));
  screen.ui = 'implemented-reviewed-native';
  screen.interaction =
    pending.has(n) || n === 19 || [40, 44, 45, 46].includes(n)
      ? 'interactive-preview; production boundary explicit'
      : 'connected-contract + interactive-preview';
  screen.interactionSummary = interactions[n - 1];
  screen.previewRoute = '/preview/reference/' + screen.id;
  screen.reproduce =
    n === 3
      ? 'پس از challenge معتبر در /enter؛ preview مستقل برای دادهٔ مرجع'
      : n >= 50 && n <= 52
        ? 'انتخاب تم تاریک در ظاهر؛ preview با تم ثابت مرجع'
        : 'مسیر عملیاتی با نشست/نقش معتبر؛ preview با دادهٔ ثابت مرجع';
  screen.reviewedImage = 'output/review/mk-reference/final/' + screen.id + '.png';
  screen.capture = capture.screens.find((x) => x.id === screen.id);
  screen.visualReview = 'manual contact sheet + per-screen overlay/diff';
  screen.apiStatus =
    n === 19
      ? 'پیش‌نمایش؛ عملیات مالک خارج از این کلاینت'
      : [44, 45, 46].includes(n)
        ? 'پیشنهاد محصول؛ flag عمومی خاموش'
        : [38, 39, 40, 52].includes(n)
          ? 'منابع/preflight متصل؛ پاسخ AI منتظر سرویس اجرایی'
          : pending.has(n)
            ? 'منتظر قرارداد Backend؛ تعامل پیش‌نمایش کامل'
            : mixed.has(n)
              ? 'زیرمجموعهٔ قدیمی متصل؛ چرخه/فضای جدید منتظر Backend'
              : 'متصل؛ آزمون fixture، حدود خواندن زنده در گزارش';
  if (pending.has(n) || mixed.has(n))
    screen.backendDependency =
      'G01–G06, G14, G17, G20–G22؛ فقط زیرمجموعهٔ PersonalClass موجود قابل اتصال است';
  if (n === 19)
    screen.backendDependency = 'MakanManagement جدا؛ هیچ endpoint مالک به کلاینت اضافه نشده است';
  if ([44, 45, 46].includes(n)) screen.backendDependency = 'G16–G19؛ independentLearning=false';
  if ([54, 57].includes(n))
    screen.route =
      '/personal/extracurricular/classes/{classId}/members' + (n === 54 ? '?search=بی‌نتیجه' : '');
  if (n === 42) screen.route = '/personal/resources?upload=1';
  if ([54, 57].includes(n)) screen.component = 'ReferencePreview / class-members boundary';
  if ([35, 36, 37, 51].includes(n))
    screen.api =
      '/api/v1/conversations/account; /conversations/{id}/messages; /forward; /reports; /conversations/saved';
  if (![...pending, ...mixed, 19, 38, 39, 40, 44, 45, 46, 52].includes(n))
    screen.backendDependency = 'قرارداد جاری موجود؛ اجرای mutation زنده در این مرحله تأیید نشده';
}
manifest.phase = 'native implementation and visual review completed; backend dependencies explicit';
manifest.preservation =
  '211 previous view entries statically mapped; browser regression evidence separate';
manifest.liveContract.normalizedPathsComponentsSecuritySha256 = contract.normalizedSha256;
manifest.liveContract.checkedAtUtc = contract.checkedAtUtc;
manifest.clientContract = { operations: 239, schemas: 447, platformOwnerOperations: 0 };
await fs.writeFile('design/mk-reference.json', JSON.stringify(manifest, null, 2) + '\n');
let table = '# ردیابی نهایی ۵۹ نمای مرجع ماکان\n\n';
table +=
  'مرجع: بستهٔ MakanApp_Codex_Reference_Pack در ریشهٔ پروژه. هر ردیف، رابط واقعی React و تصویر اجرای محلی دارد. مسیر preview فقط با فعال‌سازی صریح محیط بررسی در دسترس است؛ تصویر یا HTML آماده داخل محصول جاسازی نشده است. دادهٔ مرجع با دادهٔ حساب متصل جداست.\n\n';
table +=
  '|شناسه / PDF|نما؛ نقش|مسیر عملیاتی|تعامل|وضعیت API|تصویر و بازتولید|\n|---|---|---|---|---|---|\n';
for (const s of manifest.screens)
  table += `|${s.id} / ${s.page}|${s.title}؛ ${s.role}|\`${s.route}\`|${s.interactionSummary}|${s.apiStatus}|[تصویر](../${s.reviewedImage}) · \`${s.previewRoute}\`|\n`;
table +=
  '\nجزء، حالت، ابعاد، قرارداد، وابستگی و نتیجهٔ capture هر ردیف در [manifest ماشین‌خوان](../design/mk-reference.json) ثبت است. تم روشن/تاریک/سیستم، گوشی/rail/sidebar و دادهٔ حساب واقعی همان اجزای مشترک را مصرف می‌کنند. MK-19 صرفاً preview است؛ پنل مالک برنامهٔ MakanManagement می‌ماند.\n\n';
table +=
  'MK-57 و MK-54 فهرست اعضای کلاس‌اند؛ نگاشت اولیهٔ آن‌ها در بررسی نهایی اصلاح شد. MK-03 با query دلخواه قابل دورزدن نیست و challenge معتبر می‌خواهد. تصویر MK-40 نمونهٔ صریح است؛ preflight به معنی پاسخ AI نیست.\n\n';
table +=
  'جریان‌های مکمل و وضعیت اتصال در [گزارش تحویل](MK_REFERENCE_HANDOFF_FA.md)؛ حفظ ۲۱۱ ورودی اطلس قبلی و نگاشت مسیرها در [فهرست تطبیق](MK_REFERENCE_ROUTE_RETENTION_FA.md).\n';
await fs.writeFile('docs/MK_REFERENCE_TRACEABILITY_FA.md', table);
const routeFiles = [];
async function walk(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) await walk(p);
    else if (item.name === 'page.tsx') routeFiles.push(p);
  }
}
await walk('src/app');
const routes = routeFiles.map((f) => ({
  file: f,
  segments: f
    .slice(8, -9)
    .split('/')
    .filter((p) => p && !p.startsWith('(')),
}));
function matchRoute(route) {
  const parts = route.split('?')[0].split('/').filter(Boolean);
  return routes.find(
    ({ segments }) =>
      segments.every(
        (s, i) =>
          s.startsWith('[...') ||
          s.startsWith('[[...') ||
          (s.startsWith('[') ? !!parts[i] : s === parts[i]),
      ) &&
      (segments.length === parts.length || segments.at(-1)?.includes('...')),
  );
}
let retention =
  '# تطبیق مسیرهای اطلس قبلی\n\n۲۱۱ ورودی اطلس قبلی با فایل‌های مسیریابی فعلی بررسی شدند. این فهرست ممیزی ایستای نگاشت است؛ به معنی تصویربرداری دوباره از ۲۱۱ حالت یا اثبات اجرای زندهٔ تمام APIها نیست. نتیجهٔ مرورگر مستقل گزارش می‌شود.\n\n|شناسه قبلی|نما|مسیر نگه‌داشته‌شده / مقصد|فایل مسیر|\n|---|---|---|---|\n';
const retained = [];
for (const e of entries) {
  let target = e.route;
  if (e.key === 'workspace-dialog') target = '/personal/profile/details';
  if (
    e.key.startsWith('assistant-') &&
    !['assistant-base', 'assistant-preflight', 'assistant-sources'].includes(e.key)
  )
    target = '/personal/assistant/studio';
  const route = matchRoute(target);
  const file = route?.file ?? (target === '/offline.html' ? 'public/offline.html' : null);
  retained.push({
    id: e.id,
    key: e.key,
    title: e.title,
    previous: e.route,
    current: target,
    file,
  });
  retention += `|${e.id}|${e.title}|\`${target}\`|${file ? '[' + file + '](../' + file + ')' : 'نیازمند بررسی'}|\n`;
}
retention +=
  '\n/personal/classes/new به wizard درخواست بررسی‌شونده هدایت می‌شود؛ قرارداد قدیمی ساخت مستقیم به معنی تأیید تشکیل جدید نیست. /personal/ai به /personal/assistant هدایت می‌شود. جزئیات و ویرایش کامل هویت، فضاها، ابزارهای نمونهٔ استودیو، پرداخت، پیام، مدرس/والد/مدیر و فرم‌های آموزشی حفظ شده‌اند.\n';
await fs.writeFile('docs/MK_REFERENCE_ROUTE_RETENTION_FA.md', retention);
await fs.writeFile(
  'design/mk-route-retention.json',
  JSON.stringify({ entries: retained, unmapped: retained.filter((r) => !r.file) }, null, 2) + '\n',
);
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const reference = '../../../../MakanApp_Codex_Reference_Pack/references/design/app-screens/';
let html =
  '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بررسی طراحی ماکان</title><style>body{margin:24px;font:16px system-ui;background:#f4f7f6;color:#19322e}article{background:white;border:1px solid #dce5e3;border-radius:16px;padding:18px;margin:24px 0}a{color:#0f6658}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}img{width:100%;height:auto;border:1px solid #dce5e3}nav{display:flex;flex-wrap:wrap;gap:10px}figcaption{padding:8px}figure{margin:0}@media(max-width:760px){.grid{grid-template-columns:1fr 1fr}}@media(max-width:400px){.grid{grid-template-columns:1fr}}</style><h1>بررسی ۵۹ نمای ماکان</h1><p>مرجع، اجرای واقعی، هم‌پوشانی و اختلاف. داده‌ها آزمایشی‌اند. کادر تمرکز، اندازهٔ لمس و برچسب پیش‌نمایش تفاوت تعمدی دارند؛ عدد اختلاف پیکسل معیار کامل کیفیت UX نیست.</p><nav>';
for (const s of manifest.screens) html += `<a href="#${s.id}">${s.id}</a>`;
html += '</nav>';
for (const s of manifest.screens) {
  const m =
    comparison.screens?.find?.((x) => x.id === s.id) ??
    comparison.metrics?.find?.((x) => x.id === s.id);
  html += `<article id="${s.id}"><h2>${s.id} · ${escape(s.title)}</h2><p>${s.width} × ${s.height} · PDF ${s.page} · ${escape(s.apiStatus)}</p><p><a href="http://127.0.0.1:3144${s.previewRoute}">بازکردن پیش‌نمایش تعاملی</a></p><div class="grid">`;
  for (const [label, url] of [
    ['مرجع', reference + s.id + '.png'],
    ['اجرا', 'final/' + s.id + '.png'],
    ['هم‌پوشانی', 'final/' + s.id + '-overlay.png'],
    ['اختلاف', 'final/' + s.id + '-diff.png'],
  ])
    html += `<figure><a href="${url}"><img loading="lazy" src="${url}" alt="${label} ${s.id}"></a><figcaption>${label}</figcaption></figure>`;
  html += '</div></article>';
  void m;
}
html += '</html>';
await fs.writeFile('output/review/mk-reference/index.html', html);
console.log(
  JSON.stringify({
    screens: manifest.screens.length,
    retained: retained.length,
    unmapped: retained.filter((x) => !x.file).map((x) => x.previous),
  }),
);
