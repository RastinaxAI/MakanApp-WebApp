import fs from 'node:fs/promises';
const manifest = JSON.parse(await fs.readFile('design/mk-reference.json', 'utf8'));
const quality = JSON.parse(await fs.readFile('docs/quality/MK_V2_CHECKS.json', 'utf8'));
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const areas = [
  ['phone', 'ورود دسکتاپ'],
  ['education', 'آموزشگاه'],
  ['education-classes', 'کلاس‌ها'],
  ['education-members', 'اعضا'],
  ['education-guardians', 'والد و فرزند'],
  ['education-invitations', 'دعوت‌های من'],
  ['education-reports', 'گزارش‌ها'],
  ['settings', 'تنظیمات'],
  ['profile', 'پروفایل'],
];
let html =
  '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بررسی نسخهٔ دوم ماکان</title><style>body{font-family:Tahoma,sans-serif;margin:0;background:#f4f7f6;color:#173536;line-height:1.9}main{max-width:1440px;margin:auto;padding:28px}h1,h2,h3,p{margin:0 0 12px}section{margin-block:32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}article{background:white;border:1px solid #d9e4e2;border-radius:14px;padding:20px;min-width:0}article.desktop{grid-column:1/-1}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;min-width:0}img{width:100%;display:block;border:1px solid #d9e4e2;border-radius:8px}figcaption,small{font-size:12px;color:#536e70}a{color:#0f6658}nav{display:flex;gap:20px;flex-wrap:wrap}.before img{max-height:360px;object-fit:cover;object-position:top}header{padding:24px;border-radius:14px;background:#e2f1eb} @media(max-width:600px){main{padding:16px}.grid{grid-template-columns:minmax(0,1fr)}.pair{gap:6px}}</style><main><header><h1>بررسی نسخهٔ دوم ماکان</h1><p>قبل و بعدِ صفحه‌های برنامه و مقایسهٔ ۸۲ نمای native با مرجع طراحی. داده‌های تصاویر آزمایشی‌اند؛ رسید و نتیجهٔ سرویس واقعی محسوب نمی‌شوند.</p><p>' +
  quality.checks.unit.passed +
  ' آزمون واحد، ' +
  quality.browser.latestPassed +
  ' سناریوی مرورگر و ۸ جریان آموزشی موفق؛ ۹۶ بررسی روشن/تاریک در شش عرض.</p><nav><a href="../../../docs/MK_V2_UPDATE_FA.md">گزارش کامل</a><a href="../../../docs/MK_REFERENCE_TRACEABILITY_FA.md">ردیابی نماها</a><a href="../../../docs/quality/MK_V2_CHECKS.json">نتیجهٔ آزمون‌ها</a><a href="http://127.0.0.1:3145/enter">نسخهٔ محلی متصل</a></nav></header><section><h2>اصلاح‌های درخواست‌شده در دسکتاپ</h2><div class="grid before">';
for (const [key, title] of areas)
  html += `<article><h3>${title}</h3><div class="pair"><figure><a href="before/${key}-1440.png"><img loading="lazy" alt="قبل: ${title}" src="before/${key}-1440.png"></a><figcaption>قبل</figcaption></figure><figure><a href="after/${key}-1440-light.png"><img loading="lazy" alt="بعد: ${title}" src="after/${key}-1440-light.png"></a><figcaption>بعد · ۱۴۴۰ پیکسل</figcaption></figure></div></article>`;
html +=
  '</div></section><section><h2>نماهای مرجع و اجرای واقعی</h2><p>تفاوت‌های تعاملی مانند شمارندهٔ زمان، نشان پیش‌نمایش و الزام تأیید صریح، با سند ایستا متفاوت‌اند. سنجهٔ اختلاف RGB، درصد صحت UX نیست.</p><div class="grid">';
for (const view of manifest.screens)
  html += `<article class="${view.kind === 'desktop' ? 'desktop' : ''}"><h3>${view.id} · ${escape(view.title)}</h3><p><small>${escape(view.apiStatus)}</small></p><div class="pair"><figure><a href="../../../design/reference-v2/${view.image}"><img loading="lazy" alt="مرجع ${view.id}" src="../../../design/reference-v2/${view.image}"></a><figcaption>مرجع طراحی · صفحهٔ ${view.page}</figcaption></figure><figure><a href="native/${view.id}.png"><img loading="lazy" alt="اجرای ${view.id}" src="native/${view.id}.png"></a><figcaption>اجرای native · ${view.width} × ${view.height}</figcaption></figure></div><nav><a href="native/${view.id}-overlay.png">هم‌پوشانی</a><a href="native/${view.id}-diff.png">اختلاف</a><a href="http://127.0.0.1:3144/preview/reference/${view.id}">پیش‌نمایش تعاملی</a></nav></article>`;
html += '</div></section></main></html>';
await fs.writeFile('output/review/mk-v2/index.html', html);
console.log('Built V2 gallery: 9 before/after areas and 82 reference views.');
