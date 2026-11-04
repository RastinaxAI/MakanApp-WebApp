import fs from 'node:fs/promises';

const active = JSON.parse(await fs.readFile('design/reference.json', 'utf8'));
const manifest = JSON.parse(await fs.readFile(active.directory + '/screens.json', 'utf8'));
const comparison = JSON.parse(
  await fs.readFile('output/review/mk-v3/native/comparison.json', 'utf8'),
);
const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
let html = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تطبیق ماکان با مرجع آبی نسخهٔ سوم</title><style>body{margin:0;background:#f5f8fe;color:#182a45;font:15px/1.9 Tahoma,sans-serif}main{max-width:1480px;margin:auto;padding:24px}header,article{background:white;border:1px solid #dce5f1;border-radius:16px;padding:20px;margin-bottom:20px}h1{font-size:26px}h2{font-size:21px;margin-top:40px}h3{font-size:16px}p{color:#5c6d85}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0;min-width:0}img{width:100%;height:auto;display:block;border:1px solid #dce5f1;border-radius:8px}figcaption{font-size:12px;color:#5c6d85;margin-top:8px}a{color:#0d5ecc}nav{display:flex;gap:16px;flex-wrap:wrap}.desktop{grid-column:1/-1}.scroll{overflow:auto}small{direction:ltr;display:inline-block}@media(max-width:600px){main{padding:12px}.grid{grid-template-columns:minmax(0,1fr)}}</style><main><header><h1>تطبیق ماکان با مرجع آبی نسخهٔ سوم</h1><p>۸۲ نمای برنامه در اندازهٔ مرجع با اجرای تعاملی مقایسه شدند. قاب گوشی، نوار وضعیت و حاشیه‌های ارائه در مرجع و محصول حذف شده‌اند. داده‌های این گالری ساختگی و مخصوص بررسی‌اند.</p><p>میانگین اختلاف کانال RGB: ${comparison.meanMae255} از ۲۵۵؛ این عدد درصد صحت تجربهٔ کاربری نیست. متن پویا، کنترل بومی، نشان پیش‌نمایش و هدف لمس بزرگ‌تر در اختلاف نقش دارند.</p><nav><a href="../../../docs/MK_V3_ALIGNMENT_FA.md">گزارش و محدودیت‌ها</a><a href="../../../docs/quality/MK_V3_CHECKS.json">نتایج آزمون‌ها</a><a href="http://127.0.0.1:3145/enter">اجرای متصل محلی</a></nav></header><h2>ورود و خوشامد واقعی</h2><p>لوگوی ارسالی و جای دکمهٔ ورود از درخواست صریح قبلی حفظ شده‌اند. کد شش‌خانه‌ای یک ورودی واقعی قابل تکمیل با صفحه‌کلید، چسباندن و پیشنهاد پیامک دارد.</p><div class="grid">`;
for (const [step, title] of [
  ['welcome', 'خوشامد'],
  ['phone', 'شماره همراه'],
  ['otp', 'کد شش‌خانه‌ای'],
])
  for (const width of [390, 1440])
    html += `<article class="${width > 1000 ? 'desktop' : ''}"><h3>${title} · ${width}</h3><div class="pair">${['light', 'dark'].map((theme) => `<figure><a href="auth/${step}-${width}-${theme}.png"><img loading="lazy" src="auth/${step}-${width}-${theme}.png" alt="${title} ${theme}"></a><figcaption>${theme === 'light' ? 'روشن' : 'تاریک'}</figcaption></figure>`).join('')}</div></article>`;
html += '</div><h2>مرجع و اجرای ۸۲ نما</h2><div class="grid">';
for (const screen of manifest.screens) {
  const row = comparison.screens.find((r) => r.id === screen.id);
  html += `<article class="${screen.kind === 'desktop' ? 'desktop' : ''}"><h3>${screen.id} · ${escape(screen.title)}</h3><div class="pair"><figure><a href="../../../${active.directory}/${screen.image}"><img loading="lazy" src="../../../${active.directory}/${screen.image}" alt="مرجع ${screen.id}"></a><figcaption>مرجع · صفحهٔ ${screen.page}</figcaption></figure><figure><a href="native/${screen.id}.png"><img loading="lazy" src="native/${screen.id}.png" alt="اجرای ${screen.id}"></a><figcaption>اجرای تعاملی · <small>${screen.width} × ${screen.height}</small></figcaption></figure></div><p><small>MAE ${row.mae255} / 255</small></p><nav><a href="native/${screen.id}-overlay.png">هم‌پوشانی</a><a href="native/${screen.id}-diff.png">اختلاف</a><a href="http://127.0.0.1:3144/preview/reference/${screen.id}">پیش‌نمایش جدا</a></nav></article>`;
}
html += '</div></main></html>';
await fs.writeFile('output/review/mk-v3/index.html', html);
console.log('Built V3 gallery with 82 comparisons and responsive public entry screenshots.');
