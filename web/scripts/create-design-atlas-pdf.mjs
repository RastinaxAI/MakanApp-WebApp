import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { entries } from './design-atlas-manifest.mjs';
process.chdir(path.resolve(fileURLToPath(new URL('..', import.meta.url))));
const preview = process.argv.includes('--preview'),
  capture = JSON.parse(await fs.readFile('tmp/design-atlas/captures.json', 'utf8'));
const byId = new Map(capture.views.map((view) => [view.id, view]));
if (!preview) {
  const missing = entries.filter((entry) => byId.get(entry.id)?.result !== 'captured');
  if (missing.length)
    throw Error('Views not captured: ' + missing.map((view) => view.key).join(', '));
}
const views = entries
  .map((entry) => (byId.has(entry.id) ? { ...byId.get(entry.id), ...entry } : undefined))
  .filter((view) => view?.result === 'captured')
  .slice(0, preview ? 6 : entries.length);
const outDir = preview ? 'tmp/pdfs/design-atlas-preview' : 'tmp/pdfs/design-atlas';
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir('output/pdf', { recursive: true });
const sections = {
  public: 'معرفی و ورود',
  account: 'پروفایل، حساب و تنظیمات',
  contacts: 'مخاطبین و ارتباطات',
  messaging: 'پیام‌رسان، گروه و کانال',
  school: 'آموزشگاه، یادگیری و ارزیابی',
  manager: 'مدیریت آموزشگاه',
  parent: 'پنل والد و فرزند',
  sources: 'منابع آموزشی',
  commerce: 'کلاس شخصی، اشتراک و مصرف',
  assistant: 'دستیار ماکان',
  states: 'حالت خالی، خطا و تعارض',
  themes: 'تم تاریک و تبلت',
};
const roles = {
  Student: 'دانشجو',
  Teacher: 'استاد',
  Parent: 'والد',
  Manager: 'مدیر آموزشگاه',
  Personal: 'حساب شخصی بدون نقش آموزشی',
  Public: 'عمومی',
};
const statuses = {
  connected: 'رابط پیاده‌شده و متصل به API',
  limited: 'پیاده‌شده با محدودیت مشخص',
  demo: 'نمونهٔ تعاملی با برچسب روشن',
  state: 'حالت محصول و پاسخ به وضعیت',
};
const common = {
  public: 'ورود با پیامک، تأیید حساب و معرفی عمومی محصول.',
  account: 'هویت و اطلاعات حساب، تنظیمات و کنترل نشست‌های خود کاربر.',
  contacts: 'دفترچه، هویت مجاز مخاطب و شروع ارتباط طبق مجوز سرور.',
  messaging: 'صندوق یکپارچهٔ حساب، چت مستقیم، گروه و کانال با الگوی بصری Telegram در فارسی RTL.',
  school: 'نمای مستقل نقش‌ها، کلاس، جلسه، درس، تکلیف، آزمون، پاسخ و ارزیابی.',
  manager: 'اعضا، پرونده‌ها، رابطهٔ کلاس، کاتالوگ و گزارش‌های آموزشگاهِ فعال.',
  parent: 'فرزند انتخاب‌شده با رابطهٔ معتبر و اطلاعات آموزشی منتشرشدهٔ مجاز.',
  sources: 'فایل، منبع و آمادگی هوش مصنوعی وضعیت‌های مستقل دارند.',
  commerce: 'کلاس شخصی مستقل از آموزشگاه و مصرف/سفارش با وضعیت واقعی سرویس.',
  assistant: 'رابط منابع، گفتگو و استودیو؛ نمونه‌ها با خروجی واقعی AI تفکیک شده‌اند.',
  states: 'حالت‌های روشن برای نبود داده، قطع سرویس، دسترسی محدود و تغییر نسخه.',
  themes: 'همان اجزا و قابلیت‌ها در رنگ‌بندی تاریک؛ نمونه‌های تبلت برای بررسی پاسخ‌گرایی.',
};
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const fa = (value) => Number(value).toLocaleString('fa-IR');
const unique = (values) => [...new Set(values.filter(Boolean))];
const list = (values) => `<ul>${values.map((value) => `<li>${esc(value)}</li>`).join('')}</ul>`;
const text = (title, body) => `<div class="info"><h3>${esc(title)}</h3>${body}</div>`;
const typeLabels = {
  text: 'متن',
  textarea: 'متن چندخطی',
  select: 'انتخاب',
  checkbox: 'گزینهٔ انتخابی',
  radio: 'انتخاب یکتا',
  file: 'انتخاب فایل',
  number: 'عدد',
  tel: 'شماره',
  search: 'جستجو',
  button: 'کنترل',
  date: 'تاریخ',
  time: 'زمان',
  'datetime-local': 'تاریخ و زمان',
};
const pages = [];
function add(title, body, options = {}) {
  pages.push({ title, body, ...options });
  return pages.length;
}
const shotsCount = views.reduce(
  (count, view) => count + Object.values(view.shots).flat().length,
  0,
);
const features = unique(views.flatMap((view) => view.features ?? []));
add(
  'اطلس کامل رابط پیاده‌شدهٔ ماکان',
  `<div class="cover"><div class="eyebrow">MAKAN · IMPLEMENTED PRODUCT ATLAS</div><h1>همهٔ نماهای ثبت‌شدهٔ محصول<br>با جزئیات پیاده‌سازی</h1><p class="lead">نسخهٔ جاری وب · فارسی و راست‌به‌چپ · ۲ نوامبر ۲۰۲۶</p><div class="metrics"><div><strong>${fa(views.length)}</strong><span>نما و حالت محصول</span></div><div><strong>${fa(shotsCount)}</strong><span>تصویر از برنامهٔ واقعی</span></div><div><strong>۵</strong><span>نوع حساب و نقش</span></div><div><strong>۱۲</strong><span>بخش محصول</span></div></div><p>پروفایل، پیام‌رسان، گروه و کانال، آموزشگاه، مدیریت، والد، منابع، دستیار، اشتراک و تنظیمات؛ همراه با فرم‌ها، پنجره‌ها، حالت‌های خطا و ادامهٔ صفحه‌های بلند.</p><aside>تصاویر از همان کد محصول با دادهٔ آزمایشی در محیط محلی ایزوله گرفته شده‌اند. هیچ اطلاعات شخصی واقعی یا توکن نشست در این سند قرار ندارد.</aside><div class="coverFooter">مرجع بصری جاری: الگوی Telegram با هویت ماکان و تایپوگرافی فارسی</div></div>`,
  { kind: 'cover' },
);
add(
  'راهنمای خواندن این مجموعه',
  `<div class="prose"><h2>هر نما چه اطلاعاتی دارد؟</h2>${list(['عنوان و شناسهٔ ثابت برای ارجاع دقیق؛ نقش نمونه و مسیر واقعی صفحه.', 'تصویر موبایل ۳۹۰×۸۴۴ و دسکتاپ ۱۴۴۰×۱۰۰۰؛ تصاویر تبلت ۸۳۴×۱۱۹۴ در بخش مربوط.', 'صفحه‌های ادامه با اسکرول واقعی؛ هدر و نوارهای ثابت در تصویر حفظ شده‌اند.', 'قابلیت‌ها، فیلدها و اقدام‌های موجود. موارد پرجزئیات یک صفحهٔ مشخصات مستقل دارند.', 'وضعیت پیاده‌سازی صریح؛ نمونهٔ دستیار و قابلیت خاموش سرویس به‌عنوان اجرای واقعی معرفی نمی‌شوند.'])}<h2>معنای برچسب‌ها</h2><div class="legend">${Object.entries(
    statuses,
  )
    .map(
      ([key, title]) =>
        `<div><b class="badge ${key}">${title}</b><p>${{ connected: 'رابط و مسیر درخواست API در محصول وجود دارد؛ تصویر با سرویس محلی آزمون تهیه شده است.', limited: 'رابط موجود است اما محدودیت سرویس یا قرارداد، دامنهٔ عملکرد را مشخص می‌کند.', demo: 'تعامل نمونه در خود محصول با برچسب نمونه اجرا می‌شود؛ تولید واقعی AI نیست.', state: 'نمای خالی، خطا، تعارض یا محدودیت دسترسی؛ محتوای موفقِ ساختگی نشان داده نمی‌شود.' }[key]}</p></div>`,
    )
    .join(
      '',
    )}</div><h2>نسخه و اعتبار شواهد</h2><p>این سند وضعیت فعلی برنامهٔ فعال web/ را ثبت می‌کند. آزمون‌های آخرین تحویل اتصال: ۳۰۱ تست واحد و ۱۷۱ سناریوی یکتای مرورگر موفق. تهیهٔ این اطلس یک بازبینی تصویری مستقل است و این اعداد را افزایش نمی‌دهد.</p><p>مرجع ۱۳۰ صفحه‌ای تاریخی، به‌تنهایی وضعیت جاری را نشان نمی‌دهد. این اطلس از مسیرها و اجزای فعلی، تب‌ها، فرم‌ها و پنجره‌های موجود استخراج شده است. پنل مالک پلتفرم در پروژهٔ دیگری قرار دارد.</p></div>`,
  { kind: 'guide' },
);
const tokens = JSON.parse(await fs.readFile('design/tokens.json', 'utf8'));
const colorKeys = [
  'primary',
  'primary-soft',
  'bg',
  'surface',
  'soft',
  'text',
  'muted',
  'border',
  'chat-outgoing',
  'success',
  'warning',
  'danger',
];
const colorTitles = {
  primary: 'رنگ عمل اصلی',
  'primary-soft': 'زمینهٔ عمل',
  bg: 'زمینهٔ صفحه',
  surface: 'سطح کارت',
  soft: 'سطح نرم',
  text: 'متن اصلی',
  muted: 'متن فرعی',
  border: 'خط و مرز',
  'chat-outgoing': 'پیام ارسالی',
  success: 'موفقیت',
  warning: 'هشدار',
  danger: 'خطر و حذف',
};
add(
  'رنگ‌ها و اجزای بصری مشترک',
  `<div class="paletteColumns">${['light', 'dark'].map((mode) => `<section class="palette"><h2>${mode === 'light' ? 'تم روشن' : 'تم تاریک'}</h2><div class="swatches">${colorKeys.map((key) => `<div><span style="background:${tokens[mode][key]}"></span><strong>${colorTitles[key]}</strong><code dir="ltr">${tokens[mode][key]}</code></div>`).join('')}</div></section>`).join('')}</div><aside>مقادیر دقیق از design/tokens.json نسخهٔ ${tokens.version} خوانده شده‌اند. اجزای اختصاصی مانند پیام، فرم و نوار ناوبری در CSS خود جزئیات محلی هم دارند؛ تصاویر هر نما رفتار نهایی را نشان می‌دهند.</aside>`,
  { kind: 'foundation' },
);
add(
  'تایپوگرافی، ابعاد و الگوی مشترک',
  `<div class="prose"><h2>زبان بصری جاری</h2><p>فونت رابط فارسی Vazirmatn، جهت راست‌به‌چپ، گروه‌بندی اطلاعات، ردیف‌های پیوسته و عمل‌های آبی در سراسر محصول استفاده شده‌اند. در چت مستقیم حباب جهت‌دار و در گروه/کانال ردیف متکی بر هویت فرستنده دیده می‌شود.</p><h2>مقادیر مرجع چیدمان</h2><table><thead><tr><th>توکن</th><th>مقدار در مرجع</th><th>کاربرد</th></tr></thead><tbody><tr><td>mobileMax</td><td>${tokens.layout.mobileMax}px</td><td>حد مرجع موبایل</td></tr><tr><td>tabletMax</td><td>${tokens.layout.tabletMax}px</td><td>حد مرجع تبلت</td></tr><tr><td>navIcon</td><td>${tokens.layout.navIcon}px</td><td>آیکون ناوبری</td></tr><tr><td>icon</td><td>${tokens.layout.icon}px</td><td>آیکون عمومی</td></tr><tr><td>touchTarget</td><td>${tokens.layout.touchTarget}px</td><td>هدف مرجع تعامل لمسی</td></tr><tr><td>dockHeight</td><td>${tokens.layout.dockHeight}px</td><td>توکن مرجع نوار ناوبری</td></tr><tr><td>radius</td><td>${tokens.light.radius}</td><td>گردی مرجع مشترک</td></tr></tbody></table><h2>رفتار پاسخ‌گرا</h2>${list(['موبایل: یک ستون، ناوبری پایین و فرم/چت با فضای عمل اختصاصی.', 'دسکتاپ: ناوبری سمت راست و ستون خواندن/فرم؛ پیام‌رسان در صورت نیاز دو پنجره دارد.', 'تمرکز بر وظیفه: مسیرهای پاسخ، ویرایش و آزمون فضای مناسب دکمه‌های خود را نگه می‌دارند.', 'وضعیت‌ها: آماده‌سازی، ثبت‌نشده، ثبت‌شده، خطا و تعارض با متن و کنترل واقعی نمایش داده می‌شوند.'])}<aside>این جدول توکن‌های مرجع را ثبت می‌کند؛ اندازهٔ نهایی هر جزء ممکن است در CSS همان بخش تنظیم شده باشد. قاب سیستم‌عامل و صفحه‌کلید ساختگی به تصاویر وب اضافه نشده است.</aside></div>`,
  { kind: 'foundation' },
);

// Reserve linked index sheets. Page destinations are filled after visual pagination.
const tocIndices = [];
for (let start = 0; start < views.length; start += 44) {
  tocIndices.push(pages.length);
  add('فهرست نماها - ' + fa(Math.floor(start / 44) + 1), '', { kind: 'index', tocStart: start });
}
const destinations = new Map(),
  chapters = [];
function fieldNames(view) {
  return unique(
    (view.metadata.fields ?? []).map(
      (field) =>
        field.label +
        (field.required ? ' *' : '') +
        (field.disabled ? ' (غیرفعال در این حالت)' : ''),
    ),
  );
}
function actionNames(view) {
  return unique(view.metadata.actions ?? []);
}
function links(view) {
  return unique((view.metadata.links ?? []).map((link) => link.label).filter(Boolean));
}
function needsSpecs(view) {
  return (
    fieldNames(view).join(' ').length + actionNames(view).join(' ').length > 490 ||
    fieldNames(view).length > 9 ||
    actionNames(view).length > 12 ||
    links(view).length > 15
  );
}
function basicInfo(view, full) {
  const fields = fieldNames(view),
    actions = actionNames(view);
  return `<div class="facts">${text('قابلیت و محدوده', list(view.features) + `<p class="small">${esc(common[view.section])}</p>`)}${text('فیلدهای موجود', full ? (fields.length ? `<p>${esc(fields.join(' • '))}</p>` : '<p>فرم ورودی مستقل ندارد.</p>') : `<p>${fa(fields.length)} فیلد؛ فهرست کامل در صفحهٔ مشخصات همین شناسه.</p>`)}${text('اقدام‌های رابط', full ? `<p>${esc(actions.join(' • ') || 'ناوبری و مشاهدهٔ محتوا')}</p>` : `<p>${fa(actions.length)} اقدام؛ نام کنترل‌ها و پیوندها در صفحهٔ مشخصات آمده است.</p>`)}</div>`;
}
function visual(view, mobile, desktop, continuation = false) {
  return `<div class="viewMeta"><span class="badge ${view.status}">${statuses[view.status]}</span><span>حساب نمونه: ${roles[view.role]} · ${view.role === 'Public' ? 'عمومی' : view.school ? 'فضای آموزشگاه' : 'فضای شخصی'}</span><code dir="ltr">${esc(view.resolvedRoute ?? view.route)}</code></div><div class="screens">${[
    { shot: mobile, label: 'موبایل · ۳۹۰ × ۸۴۴' },
    { shot: desktop, label: 'دسکتاپ · ۱۴۴۰ × ۱۰۰۰' },
  ]
    .map(
      (item) =>
        `<figure class="${item.shot?.width < 800 ? 'phone' : 'desktop'}"><figcaption>${item.label}${continuation ? ' · ادامهٔ اسکرول' : ''}</figcaption>${item.shot ? `<img data-local-image="${esc(item.shot.file)}" alt="${esc(view.title + ' - ' + item.label)}">` : '<div class="noContinuation">این نما در این اندازه، ادامهٔ دیگری ندارد.</div>'}</figure>`,
    )
    .join(
      '',
    )}</div>${continuation ? `<p class="continuationNote">ادامهٔ همان صفحه؛ اسکرول واقعی محتوای محصول، بدون تغییر چیدمان رابط.</p>` : basicInfo(view, !needsSpecs(view))}`;
}
for (const section of Object.keys(sections)) {
  const items = views.filter((view) => view.section === section);
  if (!items.length) continue;
  const chapterItems = items.length > 36 ? items.slice(0, 30) : items;
  const chapterPage = add(
    sections[section],
    `<div class="chapter"><div class="eyebrow">MAKAN · ${section.toUpperCase()}</div><h1>${sections[section]}</h1><p class="lead">${common[section]}</p><div class="chapterMetrics"><strong>${fa(items.length)}</strong><span>نما و حالت ثبت‌شده در این بخش</span></div><div class="chapterList">${chapterItems.map((view) => `<div><code>${view.id}</code><span>${esc(view.title)}</span></div>`).join('')}</div><aside>نام‌ها، پیام‌ها، فایل‌ها، نمره‌ها، قیمت‌ها و آمار داخل تصاویر، دادهٔ آزمایشی برای نمایش رابط‌اند.${chapterItems.length < items.length ? ' ادامهٔ فهرست نماها در صفحهٔ بعد آمده است.' : ''}</aside></div>`,
    { kind: 'chapter', section },
  );
  chapters.push({ title: sections[section], page: chapterPage, section });
  if (chapterItems.length < items.length)
    add(
      'ادامهٔ فهرست ' + sections[section],
      `<div class="chapter"><p class="lead">شناسه‌های ادامهٔ این بخش</p><div class="chapterList">${items
        .slice(chapterItems.length)
        .map((view) => `<div><code>${view.id}</code><span>${esc(view.title)}</span></div>`)
        .join('')}</div></div>`,
      { kind: 'chapter-continuation', section },
    );
  for (const view of items) {
    const page = add(
      view.id + ' · ' + view.title,
      visual(view, view.shots.mobile[0], view.shots.desktop[0]),
      { kind: 'view', section, id: view.id },
    );
    destinations.set(view.id, page);
    if (needsSpecs(view)) {
      const actions = actionNames(view),
        specParts = Math.max(1, Math.ceil(actions.length / 18));
      for (let part = 0; part < specParts; part++)
        add(
          view.id +
            ' · مشخصات دقیق ' +
            view.title +
            (specParts > 1 ? ` · ${fa(part + 1)} از ${fa(specParts)}` : ''),
          `<div class="viewMeta"><span class="badge ${view.status}">${statuses[view.status]}</span><span>${roles[view.role]}</span><code dir="ltr">${esc(view.resolvedRoute ?? view.route)}</code></div><div class="specColumns"><div>${part === 0 ? text('قابلیت‌های پیاده‌شده', list(view.features)) + text('فیلدها', fieldNames(view).length ? list(fieldNames(view)) : '<p>فرم مستقل ندارد.</p>') : text('ادامهٔ مشخصات', '<p>ادامهٔ اقدام‌های همان نما؛ قابلیت‌ها و فیلدها در صفحهٔ قبل ثبت شده‌اند.</p>')}</div>${text(part ? 'ادامهٔ اقدام‌های موجود' : 'اقدام‌های موجود', list(actions.slice(part * 18, (part + 1) * 18)))}${part === 0 ? text('پیوندهای همین نما', list(links(view))) : ''}</div><aside class="specNote">* فیلد لازم؛ «غیرفعال در این حالت» وضعیت همان تصویر است. فهرست کامل مسیرهای API مشاهده‌شده در محیط آزمون و داده‌های این اطلس به‌صورت پیوست ماشین‌خوان داخل PDF قرار دارد.</aside>`,
          { kind: 'spec', section, id: view.id },
        );
    }
    const count = Math.max(view.shots.mobile.length, view.shots.desktop.length);
    for (let index = 1; index < count; index++)
      add(
        view.id + ' · ادامهٔ ' + view.title,
        visual(view, view.shots.mobile[index], view.shots.desktop[index], true),
        { kind: 'continuation', section, id: view.id },
      );
    if (view.shots.tablet)
      for (let index = 0; index < view.shots.tablet.length; index += 2)
        add(
          view.id + ' · تبلت ' + view.title,
          `<div class="tabletShots">${view.shots.tablet
            .slice(index, index + 2)
            .map(
              (shot) =>
                `<figure><figcaption>تبلت · ۸۳۴ × ۱۱۹۴ · اسکرول ${fa(shot.scrollTop)}</figcaption><img data-local-image="${esc(shot.file)}"></figure>`,
            )
            .join(
              '',
            )}</div><p class="continuationNote">همان صفحه و همان داده در عرض تبلت؛ ناوبری و اجزای پاسخ‌گرا از خود برنامه هستند.</p>`,
          { kind: 'tablet', section, id: view.id },
        );
  }
}
for (const index of tocIndices) {
  const page = pages[index],
    items = views.slice(page.tocStart, page.tocStart + 44);
  page.body = `<div class="tocColumns">${[items.slice(0, 22), items.slice(22)].map((column) => `<table><thead><tr><th>شناسه</th><th>نما</th><th>صفحه</th></tr></thead><tbody>${column.map((view) => `<tr data-destination="${destinations.get(view.id)}"><td><code>${view.id}</code></td><td>${esc(view.title)}</td><td>${fa(destinations.get(view.id))}</td></tr>`).join('')}</tbody></table>`).join('')}</div><p class="small">نشانک‌های PDF برای فصل‌ها و نماها در دسترس‌اند. شناسهٔ هر نما در تصویر، مشخصات و پیوست مشترک است.</p>`;
}
add(
  'مرز پیاده‌سازی و قابلیت‌های خاموش',
  `<div class="prose"><h2>چه چیزهایی در این نسخه با محدودیت مشخص دیده می‌شوند؟</h2>${list(['دستیار: پوسته، منابع، preflight و تعامل‌های نمونه موجودند. OCR، embedding، بازیابی و اجرای واقعی AI هنوز فعال‌سازی سرور می‌خواهند.', 'کتابخانه: نمایش metadata منابع عمومی منتشرشده؛ دریافت فایل و استفاده در AI در این بخش فعال نیست.', 'کلاس شخصی: ایجاد، فهرست، اعضا و بایگانی؛ امکانات درسی مستقل این نوع کلاس هنوز ارائه نشده‌اند.', 'اشتراک: مصرف، کاتالوگ، برآورد و سفارش طبق وضعیت API؛ پرداخت موفق از پاسخ callback یا نمایش UI حدس زده نمی‌شود.', 'گفتگو: تماس/پخش زنده، پیام خوشامد و واکنش سراسریِ بدون قرارداد کامل، با توضیح روشن در رابط محدودند.', 'کاتالوگ مجوز گفتگو خواندنی است؛ ویرایش جزئی bitها و delegation مدیریتی در UI این مرحله اضافه نشده است.'])}<h2>دامنهٔ بررسی</h2><p>این PDF یک ثبت تصویری از پیاده‌سازی رابط است. نوشتن‌های لازم برای ساخت حالت‌های تصویر در سرویس محلی آزمون انجام شده‌اند. رسید، مجوز، فایل و وضعیت از همان پاسخ‌های سازگار با قرارداد وارد رابط می‌شوند؛ تصاویر به‌تنهایی اثبات رفتار backend عمومی، تراکنش DB، آزمون بار یا استقرار مقصد نیستند.</p><p>در نمای رسانهٔ چت مستقیم و دو گزارش والد، پاسخ نمایشی با DTO معتبر محلی فراهم شده است؛ این نماها اثبات اجرای سرویس عمومی نیستند. پنل مالک MakanManagement و برنامهٔ قدیمی بازنشسته‌شده خارج از دامنهٔ این اطلس‌اند. مسیرهای alias مانند /personal/ai و /personal/privacy به‌جای تصویر تکراری با مسیر مرجع خود پوشش داده شده‌اند.</p><h2>ردگیری و بازتولید</h2><p>فهرست نماها: scripts/design-atlas-manifest.mjs؛ ثبت تصاویر و مشخصات: scripts/capture-design-atlas.mjs؛ تولید PDF: scripts/create-design-atlas-pdf.mjs. تصاویر اصلی در output/review/design-atlas و رسید پوشش در docs/quality/IMPLEMENTED_DESIGN_ATLAS.json قرار می‌گیرد.</p><aside>پیوست داخلی PDF شامل فیلدها، اقدام‌ها، پیوندها و مسیرهای API مشاهده‌شده برای هر شناسه است؛ دادهٔ ورود، توکن نشست و اطلاعات خصوصی واقعی در آن ثبت نشده است.</aside></div>`,
  { kind: 'limits' },
);
const arabic = await fs.readFile(
    'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2',
  ),
  latin = await fs.readFile(
    'node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2',
  );
const css = `@font-face{font-family:V;src:url(data:font/woff2;base64,${arabic.toString('base64')}) format('woff2');font-weight:100 900}@font-face{font-family:V;src:url(data:font/woff2;base64,${latin.toString('base64')}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF}@page{size:A3 landscape;margin:0}*{box-sizing:border-box}body{margin:0;color:#203248;font:15px/1.85 V,Arial;background:white}.page{width:420mm;height:297mm;padding:12mm 15mm 17mm;position:relative;break-after:page}.page:last-child{break-after:auto}.running{display:flex;justify-content:space-between;color:#697b90;border-bottom:1px solid #dce4ed;font-size:12px;padding-bottom:7px;margin-bottom:10px}.pageTitle{font-size:27px;line-height:1.5;margin:0 0 8px;color:#164c82}.viewMeta{display:flex;align-items:center;gap:20px;font-size:12px;margin-bottom:9px;white-space:normal}.viewMeta code{margin-right:auto;max-width:62%;font-size:11.5px;overflow-wrap:anywhere}code{font:12px/1.8 V,monospace;unicode-bidi:isolate;color:#275a8b;overflow-wrap:anywhere}.badge{display:inline-block;border-radius:5px;padding:3px 9px;font-size:12px}.connected{background:#e8f4ee;color:#176145}.limited{background:#e9f1fb;color:#215e99}.demo{background:#fff0df;color:#855116}.state{background:#eef0f5;color:#536174}.screens{display:grid;grid-template-columns:340px minmax(0,1fr);gap:28px;direction:rtl;height:680px;align-items:start}figure{margin:0;display:flex;flex-direction:column;align-items:center;min-width:0}figcaption{color:#667b91;font-size:12px;margin-bottom:8px}.screens img{height:auto;max-height:647px;max-width:100%;object-fit:contain;border:1px solid #d8e0eb;border-radius:7px}.noContinuation{border:1px dashed #d5dfeb;border-radius:8px;padding:30px;color:#728498;font-size:14px;margin-top:100px}.facts{display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:23px;border-top:1px solid #e0e6ef;padding-top:12px;margin-top:4px}.facts h3{font-size:15px;margin:0 0 6px;color:#275a8b}.facts p,.facts li{font-size:13px;line-height:1.8;margin:3px 0}.facts ul{padding-right:18px;margin:0}.small{font-size:12px;color:#738194}.info{min-width:0;overflow-wrap:anywhere}footer{position:absolute;bottom:7mm;right:15mm;left:15mm;display:flex;justify-content:space-between;border-top:1px solid #dce4ed;padding-top:7px;color:#718398;font-size:11px}.continuationNote{font-size:14px;color:#526e88;padding:18px 20px;background:#f2f6fb;margin-top:14px}.specColumns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;margin-top:22px}.specColumns h3{font-size:20px;color:#235c92;margin:10px 0}.specColumns ul{font-size:15px;line-height:1.85;padding-right:20px}.specColumns li{margin:4px 0}.specNote{margin-top:20px}.tabletShots{display:flex;gap:35px;justify-content:center;height:830px}.tabletShots img{max-height:790px;max-width:650px;border:1px solid #d8e0eb;border-radius:7px}.prose{font-size:20px;line-height:1.9;max-width:1380px}.prose h2{font-size:25px;color:#235c92;margin:24px 0 10px}.prose li{margin:10px 0}.prose p{margin:12px 0}aside{padding:16px 22px;background:#eff5fb;border-right:4px solid #3f8acb;color:#315a7e;font-size:16px;margin:24px 0}.legend{display:grid;grid-template-columns:1fr 1fr;gap:20px}.legend p{font-size:17px}.legend .badge{font-size:17px}.cover{padding:30px 20px}.eyebrow{font-size:15px;letter-spacing:2px;direction:ltr;text-align:right;color:#65809e}.cover h1,.chapter h1{font-size:56px;line-height:1.65;color:#174e83;margin:25px 0}.lead{font-size:24px;color:#597795}.cover p{font-size:23px;max-width:1300px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin:50px 0}.metrics>div{padding:25px 30px;background:#f1f6fc;border-radius:13px;display:grid;gap:4px}.metrics strong{font-size:47px;color:#146bab}.metrics span{font-size:18px}.coverFooter{margin-top:40px;color:#71839a;font-size:20px}.chapter{padding:20px}.chapter h1{font-size:46px;margin:20px 0}.chapterMetrics{display:flex;gap:20px;align-items:center;margin:20px 0}.chapterMetrics strong{font-size:44px;color:#1673b9}.chapterList{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 25px;font-size:14px;margin:20px 0}.chapterList>div{display:flex;gap:12px;min-width:0}.chapter aside{font-size:15px}.tocColumns{display:grid;grid-template-columns:1fr 1fr;gap:30px}table{width:100%;border-collapse:collapse;font-size:15px;table-layout:fixed}th,td{text-align:right;padding:9px 10px;border-bottom:1px solid #dfe6ef;line-height:1.6}th{background:#235c92;color:white}td:first-child,th:first-child{width:90px}td:last-child,th:last-child{width:70px}.tocColumns+.small{margin-top:20px}.tocColumns table{font-size:14px}.tocColumns th,.tocColumns td{padding:7px 10px;line-height:1.55}.paletteColumns{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:24px}.palette h2{font-size:27px;color:#235c92}.swatches{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}.swatches>div{display:grid;gap:6px;padding:14px;border:1px solid #dee6ef;border-radius:8px}.swatches span{height:75px;border-radius:6px;border:1px solid #dce3eb}.swatches strong{font-size:16px}.prose table th:first-child,.prose table td:first-child{width:25%}.prose table th:last-child,.prose table td:last-child{width:45%}.page[data-kind=foundation] aside{margin:18px 0}.page[data-kind=foundation] .prose li{margin:7px 0}`;
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-dev-shm-usage'],
});
const layout = [],
  tocLinks = [];
try {
  for (let offset = 0; offset < pages.length; offset += 14) {
    const batch = pages.slice(offset, offset + 14);
    let html = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>اطلس رابط پیاده‌شدهٔ ماکان</title><style>${css}.page[data-kind=foundation] td,.page[data-kind=foundation] th{padding-block:8px}</style><body>${batch.map((page, index) => `<section class="page" data-page="${offset + index + 1}" data-kind="${page.kind}"><div class="running"><span>ماکان · اطلس رابط پیاده‌شده</span><span>۲ نوامبر ۲۰۲۶ · ${page.id ?? ''}</span></div><main>${page.kind === 'cover' ? '' : `<h1 class="pageTitle">${esc(page.title)}</h1>`}${page.body}</main><footer><span>تصاویر محصول با دادهٔ آزمایشی · ${page.id ?? 'مرجع جاری وب'}</span><span>${fa(offset + index + 1)} / ${fa(pages.length)}</span></footer></section>`).join('')}</body></html>`;
    const files = unique(
      [...html.matchAll(/data-local-image="([^"]+)"/g)].map((match) => match[1]),
    );
    for (const file of files) {
      const data = await fs.readFile(file);
      html = html.replaceAll(
        `data-local-image="${file}"`,
        `src="data:image/png;base64,${data.toString('base64')}"`,
      );
    }
    const tab = await browser.newPage();
    await tab.setContent(html, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    const checks = await tab.locator('.page').evaluateAll((nodes) =>
      nodes.map((node) => ({
        page: Number(node.dataset.page),
        kind: node.dataset.kind,
        overflow:
          node.querySelector('main').getBoundingClientRect().bottom + 10 >
          node.querySelector('footer').getBoundingClientRect().top,
        horizontalOverflow: node.scrollWidth > node.clientWidth,
        actualBottom:
          node.querySelector('main').getBoundingClientRect().bottom -
          node.getBoundingClientRect().top,
        footerTop:
          node.querySelector('footer').getBoundingClientRect().top -
          node.getBoundingClientRect().top,
        brokenImages: [...node.querySelectorAll('img')].filter(
          (image) => !image.complete || !image.naturalWidth,
        ).length,
      })),
    );
    layout.push(...checks);
    tocLinks.push(
      ...(await tab.locator('tr[data-destination]').evaluateAll((nodes) =>
        nodes.map((node) => {
          const page = node.closest('.page'),
            p = page.getBoundingClientRect(),
            r = node.getBoundingClientRect();
          return {
            page: Number(page.dataset.page),
            destination: Number(node.dataset.destination),
            x: r.left - p.left,
            y: r.top - p.top,
            width: r.width,
            height: r.height,
            pageHeight: p.height,
          };
        }),
      )),
    );
    if (checks.some((row) => row.overflow || row.horizontalOverflow || row.brokenImages)) {
      await fs.writeFile(outDir + '/layout-failures.json', JSON.stringify(checks, null, 2));
      for (const item of checks.filter(
        (row) => row.overflow || row.horizontalOverflow || row.brokenImages,
      )) {
        await tab
          .locator('.page[data-page="' + item.page + '"]')
          .screenshot({ path: outDir + '/failure-' + item.page + '.png' });
      }
      throw Error(
        'PDF layout failed: ' +
          JSON.stringify(
            checks.filter((row) => row.overflow || row.horizontalOverflow || row.brokenImages),
          ),
      );
    }
    await tab.pdf({
      path: outDir + '/chunk-' + String(offset / 14 + 1).padStart(3, '0') + '.pdf',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    });
    await tab.close();
    console.log(
      'PDF pages ' + (offset + 1) + '-' + Math.min(offset + 14, pages.length) + ' verified',
    );
  }
} finally {
  await browser.close();
}
await fs.writeFile(outDir + '/layout.json', JSON.stringify(layout, null, 2));
await fs.writeFile(
  outDir + '/index.json',
  JSON.stringify(
    {
      preview,
      pages: pages.map((page, index) => ({
        page: index + 1,
        title: page.title,
        kind: page.kind,
        section: page.section,
        id: page.id,
      })),
      chapters,
      destinations: Object.fromEntries(destinations),
      views: views.map((view) => ({
        id: view.id,
        title: view.title,
        page: destinations.get(view.id),
      })),
      images: shotsCount,
      tocLinks,
    },
    null,
    2,
  ) + '\n',
);
await fs.writeFile(
  outDir + '/inventory.json',
  JSON.stringify({ createdAtUtc: new Date().toISOString(), syntheticData: true, views }, null, 2) +
    '\n',
);
console.log(
  JSON.stringify({ pages: pages.length, views: views.length, images: shotsCount, outDir }),
);
