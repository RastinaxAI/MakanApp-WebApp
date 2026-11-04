import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const evidence = JSON.parse(await fs.readFile('docs/quality/RELEASE_154C437_CHECKS.json', 'utf8'));
const output = path.resolve('output/pdf/MakanApp_Server_Integration_154c437_FA.pdf'),
  temp = path.resolve('tmp/pdfs/release-154c437');
const esc = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const p = (text) => `<p>${text}</p>`,
  h = (text) => `<h2>${text}</h2>`,
  note = (text) => `<aside>${text}</aside>`,
  code = (text) => `<code dir="ltr">${esc(text)}</code>`;
const ul = (items) => `<ul>${items.map((text) => `<li>${text}</li>`).join('')}</ul>`;
const table = (heads, rows) =>
  `<table><thead><tr>${heads.map((text) => `<th>${text}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((text) => `<td>${text}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const pages = [],
  page = (title, body) => pages.push({ title, body });
page(
  'اتصال سرور و تحویل محصول ماکان',
  `<div class="kicker">CLIENT INTEGRATION · 154C437</div><div class="lead">پیام‌رسان، منابع آموزشی و دستیار</div>` +
    p('گزارش فارسی برای محصول، توسعه و QA • ۲ نوامبر ۲۰۲۶') +
    table(
      ['مورد', 'وضعیت تحویل'],
      [
        [
          'سرور مرجع',
          code('http://94.184.32.84:8090') + '؛ Swagger و OpenAPI زنده خوانده شده‌اند.',
        ],
        [
          'برنامهٔ فعال',
          'Next.js/React در پوشهٔ web؛ حساب شخصی، دانشجو، استاد، والد و مدیر آموزشگاه.',
        ],
        [
          'قرارداد',
          '۳۴۲ مسیر زنده؛ ۱۵ مسیر اضافه نسبت به snapshot قبلی. SDK کلاینت: ۲۳۶ عملیات و ۴۴۱ schema؛ بدون مسیر مالک پلتفرم.',
        ],
        [
          'محصول',
          'صندوق حساب با cursor سرور، کنترل‌های مبتنی بر مجوز مؤثر، عکس گفتگو، منابع متصل، بررسی دسترسی منابع دستیار و رسید انتشار.',
        ],
        [
          'اعتبار آزمون',
          `${evidence.unit.passed.toLocaleString('fa-IR')} آزمون واحد و ${evidence.browser.uniqueLatestPassed.toLocaleString('fa-IR')} سناریوی مرورگر موفق؛ دامنهٔ آزمون زنده و fixture در صفحهٔ ۵ جدا شده‌اند.`,
        ],
        [
          'استقرار',
          'preview محلی به سرور معرفی‌شده وصل است. استقرار روی دامنهٔ عمومی یا تغییر backend انجام نشده است.',
        ],
      ],
    ) +
    h('مرجع مستند و مرجع اجرا') +
    p(
      'PDF ورودی Frontend/Backend قواعد دامنه را توضیح می‌دهد. مسیر و DTO از OpenAPI همین سرور گرفته شده‌اند. شمارهٔ مستند 154c437 است؛ هویت دقیق binary مستقر از سمت سرور اعلام نشده و تأیید نشده است.',
    ) +
    note(
      'این گزارش، آزمون‌های کلاینت و شواهدی را که در این محیط اجرا شده‌اند بیان می‌کند. آمار آزمون‌های بک‌اند در PDF ورودی به نتایج این تحویل اضافه نشده است.',
    ),
);
page(
  'پیام‌رسان و مدیریت گفتگو',
  table(
    ['بخش', 'رفتار پیاده‌شده'],
    [
      [
        'صندوق یکپارچه',
        code('/api/v1/conversations/account') +
          ' با Filter، Search، Limit و Cursor. سرور ترتیب سراسری را تعیین می‌کند؛ مرورگر دو scope را ادغام یا دوباره مرتب نمی‌کند.',
      ],
      [
        'cursor و بلادرنگ',
        'cursor در حافظهٔ همان حساب و نشست است. stream صندوق از stream فضای آموزشی جداست. رویداد، علامت بازخوانی snapshot است؛ unread در کلاینت حدسی زیاد نمی‌شود.',
      ],
      [
        'مجوز مستقل',
        'ویرایش اطلاعات، تنظیمات، اعضا، مدیران، دعوت و موضوعات بر اساس effectiveCapabilities جدا کنترل می‌شوند. عنوان نقش به‌تنهایی مجوز ایجاد نمی‌کند.',
      ],
      [
        'عکس گروه/کانال',
        'فایل JPEG/PNG جدا بارگذاری می‌شود؛ تا Ready قابل اتصال نیست. ثبت و حذف expectedVersion رشته‌ای دارند. دریافت تصویر از BFF احراز‌شده و ACL فایل می‌گذرد.',
      ],
      [
        'عضو اولیه',
        'Added، InvitationPending و NotAvailable جدا نمایش داده می‌شوند. فردِ دعوت‌شده هنوز عضو فعال نیست؛ انقضا دقیقاً از سرور می‌آید.',
      ],
    ],
  ) +
    h('رفتار هنگام خطا') +
    ul([
      'نتیجهٔ نامعلوم ایجاد گروه/کانال با همان ClientOperationId و payload پیگیری می‌شود. انقضا در مرورگر بازتولید نمی‌شود.',
      'خطای نسخه، عکس انتخاب‌شده یا متن ویرایش را پاک نمی‌کند. خطای مجوز، محتوای خصوصیِ لغوشده را از نمایش خارج می‌کند.',
      'در resync معتبر، cursor stream کنار گذاشته و snapshot دوباره دریافت می‌شود. eventId و streamVersion از اعمال تکراری hint جلوگیری می‌کنند.',
    ]) +
    note(
      'سن، تاریخ تولد و وضعیت تأیید هویت، مبنای محدودسازی پیام‌رسان در فرانت‌اند نیستند. allowedActions و مجوز مؤثر سرور مرجع‌اند؛ نقص پروفایل لازم یا محدودیت واقعی سرور همچنان رعایت می‌شود.',
    ),
);
page(
  'مدیریت منابع آموزشی',
  p(
    'مسیر ' +
      code('/personal/resources') +
      ' از صفحهٔ پروفایل قابل دسترسی است. فهرست، جستجو، صفحه‌بندی و جزئیات از API زنده خوانده می‌شوند.',
  ) +
    table(
      ['گام', 'رفتار محصول'],
      [
        [
          '۱ · انتخاب فضا',
          'شخصی، کلاس، آموزشگاه و کتابخانه طبق نقش و فضای فعلی. برای منابع کلاس، کلاس مجاز انتخاب می‌شود.',
        ],
        [
          '۲ · فایل و ثبت',
          'عنوان، فایل و دلیل ثبت وارد می‌شود. upload فایل مستقل از ساخت منبع است. Pending دوباره بررسی می‌شود و فقط Ready وارد فرمان ایجاد می‌شود.',
        ],
        [
          '۳ · پیگیری',
          'فرمان ایجاد با شناسهٔ پایدار و payload ثابت، وابسته به حساب و revision در sessionStorage می‌ماند. پس از reload همان درخواست پیگیری می‌شود.',
        ],
        [
          '۴ · ویرایش',
          'پیش‌نویس با expectedVersion کدر ذخیره می‌شود. در 412، نوشته حفظ و نسخهٔ تازه برای بازبینی دریافت می‌شود؛ ادامه با token جدید انتخاب صریح دارد.',
        ],
        [
          '۵ · انتشار و نسخه',
          'انتشار، بایگانی، تغییر نمایش و نسخهٔ جدید فقط با capability مربوط انجام می‌شوند. اعمال حساس تأیید مشخص دارند.',
        ],
        [
          '۶ · دریافت',
          'revision دقیق منبع، canDownload، fileReady و فایل Ready بررسی می‌شوند. MIME پاسخ با فایل مجاز تطبیق می‌یابد. URL دانلود، جایگزین ACL نیست.',
        ],
      ],
    ) +
    h('سه وضعیت متفاوت') +
    p(
      'آماده‌بودن فایل، آماده‌بودن منبع و آماده‌بودن AI جدا نمایش داده می‌شوند. بارگذاری موفق به معنی OCR، embedding یا آمادگی بازیابی نیست. revision عددیِ محتوا با version رشته‌ایِ هم‌زمانی متفاوت است.',
    ) +
    note(
      'کتابخانه فقط metadata منابع عمومیِ منتشرشده را نشان می‌دهد. فایل، upload مدیریتی کتابخانه و استفادهٔ آن در AI در این کلاینت فعال نیست.',
    ),
);
page(
  'نقش‌ها، دستیار و آموزشگاه',
  table(
    ['دامنه', 'قاعدهٔ دسترسی'],
    [
      [
        'Personal',
        'منابع خود کاربر؛ upload با scope صریح Personal حتی از فضای آموزشی. برای این کار workspace کاربر عوض نمی‌شود.',
      ],
      [
        'Class',
        'خواندن محتوای منتشرشده برای دانشجوی مجاز؛ نوشتن معلم منتسب/مدیر با کنترل نهایی سرور. انتخاب UI مجوز جدید ایجاد نمی‌کند.',
      ],
      [
        'Organization',
        'نوشتن منابع آموزشگاه با دسترسی مدیر؛ والد به‌صورت خودکار دسترسی کلاس یا نوشتن نمی‌گیرد.',
      ],
      [
        'فضای رسمی',
        'رابطهٔ آموزشی معتبر و capability مؤثر مرجع‌اند. نبود Owner/Admin در roster مانع مجوز مؤثر معتبر نیست. GET عملیات repair انجام نمی‌دهد.',
      ],
    ],
  ) +
    h('دستیار و منابع واقعی') +
    p(
      'در تب منابع دستیار، منابع شخصی واقعی قابل انتخاب‌اند. ' +
        code('/api/v1/ai/sources/preflight') +
        ' برای عملیات Chat، مجوز و امکان بازیابی را بدون مصرف اعتبار بررسی می‌کند. در نبود retrieval، انتخاب باقی می‌ماند و پیام روشن نمایش داده می‌شود.',
    ) +
    note(
      'اجرای واقعی AI/RAG روی سرور طبق سند هنوز فعال‌سازی جداگانه می‌خواهد. سه عملیات source-aware دیگر هنوز در UI تولیدی دستیار مصرف نمی‌شوند. بخش نمونه همچنان صریحاً نمونه است.',
    ) +
    h('جلسه و رسید انتشار') +
    p(
      'کارت فعالیت Session، وضعیت جلسه را نشان می‌دهد و به برنامهٔ واقعی کلاس می‌رود. publicationReceipt در پاسخ انتشار مصرف می‌شود. Pending به معنی انتظار درج اعلان است و به Delivered تبدیل نمایشی نمی‌شود. lookup و دسترسی منبع آموزشی، مجوز خود را حفظ می‌کنند.',
    ),
);
page(
  'نتایج آزمون و حدود اثبات',
  table(
    ['لایه', 'نتیجه و شاهد'],
    [
      [
        'واحد و امنیت',
        `${evidence.unit.passed.toLocaleString('fa-IR')} تست در ${evidence.unit.files.toLocaleString('fa-IR')} فایل؛ ${evidence.unit.failed.toLocaleString('fa-IR')} ناموفق. capability، ترتیب سرور، cursor، scope، binding فایل، Origin، MIME و تغییر نشست پوشش داده شده‌اند.`,
      ],
      [
        'مرورگر',
        `${evidence.browser.uniqueLatestPassed.toLocaleString('fa-IR')} سناریوی یکتای موفق در بررسی گسترده و بازاجرای موارد اصلاح‌شده. نتایج هر batch و recheck جدا ثبت شده‌اند؛ همهٔ سناریوها یک اجرای پیوسته نبوده‌اند.`,
      ],
      [
        '۱۲ سناریوی جدید',
        'Pending→Ready، upload یک‌باره، پیگیری پس از reload، تعارض token، انتشار و دانلود منبع، کتابخانه، preflight، مجوز مستقل، عکس و دعوتِ در انتظار.',
      ],
      [
        'زندهٔ مستقیم',
        'پنج نوع حساب موفق؛ auth، me، workspace، allowedActions، صندوق، مجوزها، replay، منابع و داده‌های آموزشیِ مجاز. هیچ دادهٔ دامنه ایجاد نشد.',
      ],
      ['زنده از BFF', evidence.live.bffSummary],
      [
        'کنترل‌های ساخت',
        'build webpack، typecheck، lint، format و تولید قرارداد موفق؛ شواهد فرمان‌ها در CHECKS.json.',
      ],
    ],
  ) +
    h('تفسیر صحیح نتیجه') +
    ul([
      'نوشتن پیام، دعوت، منبع، عکس و تنظیمات در آزمون مرورگر روی fixture محلی ایزوله انجام شده است.',
      'آزمون زنده فقط نشست‌های تست را وارد، انتخاب و خارج کرد؛ پیام، دعوت، فایل، منبع، سفارش یا پرداخت ایجاد نکرد.',
      'موفقیت fixture اثبات اجرای تراکنش DB، سیاست ایمنی، ACL یا mutation سرور واقعی نیست.',
    ]) +
    note(
      'در بررسی اولیهٔ BFF خطای 503 ورود دیده شد و حذف نشده است. جزئیات بازبررسی و نتیجهٔ نهایی در رسیدهای LIVE_BFF ثبت شده‌اند؛ علت قطعی از این شواهد به‌تنهایی قابل نتیجه‌گیری نیست.',
    ),
);
page(
  'اجرا، بازتولید و تحویل',
  p(
    'فرمان‌ها را داخل پوشهٔ ' +
      code('web/') +
      ' اجرا کنید. Node حداقل ۲۲، lockfile موجود و مرورگر تست نصب‌شده لازم‌اند. env موجود را بازنویسی نکنید.',
  ) +
    `<pre dir="ltr">${esc('npm ci\nnpm run generated:check\nnpm run typecheck\nnpm run lint\nnpm test\nnpm run format:check\nnpm run build -- --webpack\nnode scripts/verify-release-browser.mjs 1\nnode scripts/verify-release-browser.mjs 2\nnode scripts/verify-release-browser.mjs 3')}</pre>` +
    p(
      'runner سه‌بخشی Chrome را استفاده می‌کند. پورت‌های ۳۱۳۲ و ۳۴۵۷ باید آزاد باشند. fixture، backend خارجی را رد می‌کند.',
    ) +
    h('خواندن زندهٔ مجاز') +
    `<pre dir="ltr">${esc('MAKAN_TEST_READ_SMOKE=1 node scripts/verify-release-154c437.mjs\nMAKAN_TEST_READ_SMOKE=1 node scripts/verify-release-154c437-bff.mjs')}</pre>` +
    p(
      'بررسی BFF نیازمند preview روی پورت ۳۱۳۳ متصل به backend واقعی است. این فرمان‌ها opt-in محلی دارند و در CI اجرا نمی‌شوند. اطلاعات ورود در مستند عمومی درج نشده است.',
    ) +
    h('تنظیمات اتصال') +
    p(
      code('BACKEND_BASE_URL=http://94.184.32.84:8090') +
        '؛ APP_ORIGIN باید دقیقاً origin مرورگر باشد و SESSION_SECRET کلید تصادفی ۳۲بایتی است. برای انتشار عمومی، HTTPS و cookie امن با دامنهٔ واقعی تنظیم می‌شوند. فایل‌های secret و volume نشست حفظ شوند.',
    ) +
    note(
      'Docker daemon و env استقرار در این محیط حاضر نیستند. این تحویل استقرار روی سرور عمومی را شامل نمی‌شود. پنل مالک و Vite بازنشسته‌شده دست‌کاری نشده‌اند.',
    ),
);
page(
  'محدودیت‌ها و فایل‌های تحویل',
  ul([
    'OCR، extraction، embedding، vector و RAG هنوز فعال‌سازی سرور می‌خواهند؛ کلاینت خروجی AI یا مصرف اعتبار جعل نمی‌کند.',
    'انقضای دعوت، پذیرش توسط مخاطب، backfill اعلان تاریخی، آزمون بار و fault tolerance سرور در این مرحله اجرا نشده‌اند.',
    'کاتالوگ مجوزها خواندنی است؛ ویرایش جزئی bitها و delegation در UI اضافه نشده است.',
    'پیش‌نویس فرمان ایجاد منبع پس از reload بازیابی می‌شود؛ فایل انتخابیِ ثبت‌نشده و فرمان نسخهٔ جدید پس از بستن صفحه تضمین نگهداری ندارند.',
    'پرداخت واقعی، callback و مصرف AI در این تحویل اجرا نشده‌اند.',
  ]) +
    h('راهنمای فایل‌ها') +
    table(
      ['فایل', 'کاربرد'],
      [
        [
          code('docs/RELEASE_154C437_INTEGRATION_FA.md'),
          'شرح کامل قابلیت‌ها، workflow، قواعد نقش، فرمان‌های آزمون و حدود تحویل.',
        ],
        [
          code('docs/quality/RELEASE_154C437_CHECKS.json'),
          'رسید جمع‌بندی ماشین‌خوان؛ نتیجهٔ build و تست و مرجع رسیدهای زنده و مرورگر.',
        ],
        [
          code('docs/quality/RELEASE_154C437_*.json'),
          'نتایج خواندن زنده، BFF، batchها و بازبررسی‌ها بدون توکن و متن خصوصی.',
        ],
        [
          code('contracts/openapi.json') + ' و ' + code('docs/api-matrix.md'),
          'قرارداد زنده و فهرست عملیات کلاینت؛ ورودی admin وارد SDK نشده است.',
        ],
        [
          code('scripts/verify-release-154c437*.mjs'),
          'ابزارهای بررسی زندهٔ کنترل‌شده؛ سناریوهای نوشتن در tests و fixture محلی‌اند.',
        ],
        [
          code('docs/PROGRESS.md'),
          'تغییرات جاری، شواهد و محدودیت‌ها؛ یادداشت‌های پیشین تاریخچه‌اند.',
        ],
      ],
    ) +
    note(
      'این PDF و مستند Markdown، خروجی قابل تحویل همین مرحله‌اند. وضعیت‌های آینده یا قابلیت‌های خاموش به‌عنوان انجام‌شده گزارش نشده‌اند.',
    ),
);
const arabic = await fs.readFile(
    'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2',
  ),
  latin = await fs.readFile(
    'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2',
  );
const html = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>تحویل اتصال سرور ماکان</title><style>
@font-face{font-family:V;src:url(data:font/woff2;base64,${arabic.toString('base64')}) format('woff2');font-weight:100 900}@font-face{font-family:V;src:url(data:font/woff2;base64,${latin.toString('base64')}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF}
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font:13px/1.95 V,Arial,sans-serif;color:#233148;background:#edf1f7}.page{width:210mm;height:297mm;position:relative;background:white;padding:14mm 17mm 20mm;break-after:page}.page:last-child{break-after:auto}.running{display:flex;justify-content:space-between;font-size:10px;color:#64748b;border-bottom:1px solid #dbe2ec;padding-bottom:9px;margin-bottom:18px}h1{font-size:25px;color:#174e88;line-height:1.65;margin:0 0 18px}h2{font-size:16px;color:#174e88;margin:19px 0 8px}.kicker{font:11px/1.5 V,Arial;color:#64748b;letter-spacing:1px;direction:ltr;text-align:right}.lead{font-size:22px;color:#2563a8;margin:15px 0}p{margin:10px 0;text-align:justify}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12.2px;line-height:1.95;margin:14px 0}th{background:#235789;color:white;text-align:right;padding:8px 10px}td{vertical-align:top;padding:10px;border-bottom:1px solid #dbe2ec;overflow-wrap:anywhere}td:first-child,th:first-child{width:23%;font-weight:650}tr:nth-child(even)td{background:#f4f7fb}ul{padding-right:18px;margin:8px 0}li{margin:10px 0}aside{border-right:3px solid #3d81bd;background:#eff6fc;padding:12px 15px;font-size:12px;margin:18px 0;color:#244866}code{font:11.3px/1.8 V,monospace;unicode-bidi:isolate;overflow-wrap:anywhere;color:#24568c}pre{font:11.5px/1.9 V,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f7fb;border:1px solid #e2e8f0;padding:14px 17px;margin:12px 0}footer{position:absolute;bottom:9mm;right:17mm;left:17mm;display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #dbe2ec;color:#64748b;font-size:9.5px}
</style><body>${pages.map((item, index) => `<section class="page" data-page="${index + 1}"><div class="running"><span>ماکان · اتصال و آزمون محصول</span><span>۲ نوامبر ۲۰۲۶</span></div><main><h1>${item.title}</h1>${item.body}</main><footer><span>154c437 · شواهد زنده و سناریویی تفکیک شده‌اند</span><span>صفحهٔ ${(index + 1).toLocaleString('fa-IR')} از ${pages.length.toLocaleString('fa-IR')}</span></footer></section>`).join('')}</body></html>`;
await fs.mkdir(temp, { recursive: true });
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(path.join(temp, 'document.html'), html);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const tab = await browser.newPage();
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const layout = await tab.locator('.page').evaluateAll((nodes) =>
    nodes.map((node) => ({
      page: Number(node.dataset.page),
      overflow:
        node.querySelector('main').getBoundingClientRect().bottom + 14 >
        node.querySelector('footer').getBoundingClientRect().top,
    })),
  );
  await fs.writeFile(path.join(temp, 'layout.json'), JSON.stringify(layout, null, 2));
  if (layout.some((row) => row.overflow))
    throw Error('PDF footer overlap: ' + JSON.stringify(layout));
  await tab.pdf({ path: output, printBackground: true, preferCSSPageSize: true, tagged: true });
  console.log(JSON.stringify({ output, pages: pages.length, overflow: 0 }));
} finally {
  await browser.close();
}
