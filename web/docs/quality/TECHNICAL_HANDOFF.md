# تحویل فنی کیفیت و معماری ماکان

> این گزارش مربوط به مرحلهٔ معماری پیش از اصلاح نهایی ظاهر است. گزارش جاری طراحی و نتایج۲۰تست مرورگر در [VISUAL_MATCH](VISUAL_MATCH.md) و [VISUAL_RESULTS](VISUAL_RESULTS.json) است. نتیجهٔ نصب تمیز زیر مربوط به همان مرحلهٔ قبلی است و در اصلاح بصری دوباره اجرا نشده است.

تاریخ:۲۹ اکتبر۲۰۲۶. دامنهٔ تغییر: `Makan Application/web` و یک workflow در `.github/workflows/makan-client-quality.yml`. نتیجه:۱۶۴ تست واحد و۱۴ تست مرورگر موفق، صفر شکست/skip/flaky؛ format، lint، typecheck، generated و build موفق. نصب و ساخت کپی تمیز نیز موفق شد. شواهد در `FINAL_RESULTS.json` است؛ محصول، نمونه و بررسی واقعی جدا گزارش می‌شوند.

## ۱. مبنا و حفظ کار قبلی

پروژهٔ فعال Next.js16.4.2/React19.3.1/TypeScript5.9.3 با App Router و npm lockv3 است. Node24.19.0 در بررسی‌های این مرحله استفاده شد. root AGENTS و راهنمای Next نصب‌شده بررسی شدند. Git ریشه از قبل تغییرات فراوان Vite و وابستگی‌ها داشت و `web` در آن untracked بود؛ reset، commit یا push انجام نشد. Vite تاریخی ریشه، پنل جداگانهٔ مالک و سرویس Docker کاربر تغییر/متوقف نشدند. baseline:۱۴۷ تست در۲۵ فایل، typecheck و build و یک تست مهمان موفق؛ lint موجود نبود و۸ declaration بلااستفاده شناسایی شد.

سورس backend و Expo موجود نبود. دو فایل جدید PDF/ZIP مرجع طراحی نسخهٔ۲ هستند؛ SHA و شمار۱۳۰صفحه ثبت شد. Swagger فقط قرارداد خواندنی ارائه کرد:۲۹۱ مسیر با مسیرهای snapshot برابر؛ تطبیق همهٔ DTOها یا صحت اجرای سرویس از آن نتیجه گرفته نمی‌شود.

## ۲. تغییرات واقعی

- منبع واحد route/role/navigation؛ چهار مقصد و guard مسیر catch-all. URL ناشناخته دیگر تصادفاً جزئیات/منابع صفحهٔ دیگری را نمایش نمی‌دهد.
- تفکیک inbox از conversation، مخاطب از تنظیمات privacy/blocked، نویسندگی آزمون از تلاش دانشجو و منطق خالص تکلیف از رندر. مرز UI عمومی/lib با feature و چرخهٔ import با lint بررسی می‌شود.
- S09→S17→S10 با حفظ متن، قفل ارسال هم‌زمان، نسخهٔ معتبر، reconciliation و receipt تأییدشده؛ مسیرهای مستقل ایجاد/ویرایش/بازبینی درس.
- رفع از دست رفتن فرم در visibility revalidation همان نشست؛ تغییر واقعی حساب/زمینه همچنان دادهٔ قبلی را کنار می‌گذارد. محافظ خروج فرم درس/پروفایل و draft محدوده‌دار تکلیف اضافه شد.
- رفع version کهنهٔ انتشار درس: لغو درخواست قبلی و نوشتن پاسخ معتبر ویرایش در cache پیش از بازبینی. پاسخ200 با HTML/JSON خراب اکنون خطای قرارداد است، موفقیت خالی نیست.
- پوستهٔv2: رنگ‌های نرم، sidebar دسکتاپ، داک پایین تبلت و موبایل، nav22 و hit target مستقل؛ حالت متمرکز فرم/چت با footer مستقل. تم از تنظیمات حساب باقی است.
- tokens، prototype مستقل و نگاشت۱۳۰صفحه از source مشخص تولید و drift آنها در check رد می‌شود. registry تکراری حذف شد؛ SDK فقط۱۵۹ عملیات/۳۰۵ schema کلاینت را دارد.
- تست مرورگر کاملاً loopback، خطای تزریقی و reset مستقل هر آزمون؛ هیچ پیام، پرداخت یا تغییر پروفایل روی سرور واقعی ایجاد نشد. CI و clean-checkout gate اضافه شدند.

## ۳. معماری و منابع معتبر

شرح مرزها در `ARCHITECTURE.md` است. منابع: `src/config/navigation.ts`، `contracts/client-surface.json` و `openapi.json`، `design/tokens.json`، `design/screens.json` و `design/implementation-map.json`. generatedها دستی تغییر نمی‌کنند. React Query موجود حفظ شد؛ framework/Router یا dependency تازهٔ تست اضافه نشد. package بلااستفادهٔ react-table و dependency داخلی آن حذف شدند.

## ۴. پوشش تست

baseline واحد۱۴۷ → مجموعهٔ نهایی۱۶۴ در۳۱فایل:۱۷ تست تازه برای route، receipt/context، draft، پاسخ ناسالم API، منع backend خارجی fixture و یکپارچگی مرجع طراحی؛ آزمون‌های قبلی auth/نشست/هم‌زمانی/BFF فایل/تقویم/حریم خصوصی/queue حفظ شدند.

۱۴ سناریوی مرورگر: سطح مهمان و نبود مالک؛ رندر همهٔ۱۳۰شناسه در سه mode و اعتبار مقصد؛ درس ایجاد/ویرایش/انتشار و منع draft برای دانشجو؛ ذخیره/خطای finalize/receipt آزمون؛ پیام دو حساب و بالا آمدن inbox گیرنده؛ دو سناریوی منع چت خصوصی برای Parent و Manager نامرتبط؛ خطای save پروفایل و حفظ input پس از visibility/تم؛ ناوبری۹عرض، footer چت تبلت، Escape/focus و تغییر workspace؛ سه سناریوی پاسخ/بازبینی/رسید، deep-link رسید کاذب و حفظ draft/لغو خروج.

پیام‌رسان fixture مسیر دریافت/refresh فهرست را تست می‌کند؛ این اجرا اثبات اتصال SignalR واقعی یا تضمین تحویل نیست. منع چت خصوصی و حذف یادداشت ارزیاب در fixture/BFF تست می‌شوند و اثبات امنیت backend واقعی نیستند. دوربین، صفحه‌کلید فیزیکی، دستگاه واقعی، همهٔ فایل‌ها و نقش چندفرزند در این مرحله پوشش یکپارچه ندارند.

۱۳ فایل آزمون تاریخی متصل به سرور در `tests/evidence/legacy-live/*.source` با SHA و assertion اصلی محفوظ‌اند؛ این مرحله به علت منع نوشتن روی سرویس واقعی اجرا نشدند. فایل مهمان قدیمی نیز به‌عنوان duplicate در همین evidence نگه داشته شد. تست فعال skip/only ندارد؛ موارد تاریخی را تست موفق یا تست skipشدهٔ همین run حساب نمی‌کنیم.

## ۵. فرمان‌ها و نتایج

| فرمان واقعی | نتیجه و شاهد |
| --- | --- |
| `npm test` مبنا |۱۴۷ موفق، صفر ناموفق،۲۵فایل |
| `npm run typecheck` و `npm run build` مبنا |موفق |
| تست مهمان مبنا |۱موفق |
| `npm run design:build` |HTML مستقل۱۳۰صفحه، tokens CSS و SCREEN_COVERAGE تولید شد |
| `npm run quality` |موفق؛۱۶۴واحد در۳۱فایل و۱۴مرورگر؛ صفر ناموفق/ردشده؛ مرورگر حدود۶۴ثانیه |
| `npm run repro:check` |موفق؛ `npm ci --no-audit --no-fund --prefer-offline`، generated:check، lint، unit۱۶۴ و build همگی exit0؛ بدون env/node_modules/.next قبلی |
| `npx playwright install chromium` با Node24 |موفق؛ مرورگر مدیریت‌شده، بدون مسیر شخصی در config |
| خواندن GET OpenAPI |۲۹۱مسیر؛ بدون نوشتن دادهٔ حساب |

روند اصلاح خطاهای توسعه هم پنهان نشده است: اولین lint تنظیم incremental نامعتبر داشت و اصلاح شد؛ build دو import قدیمی login را گرفت و حذف شدند؛ نصب مرورگر با Node26 ناقص ماند و با Node24 تکمیل شد. اولین run کاربردی مرورگر۱۰موفق/۳ناموفق داشت؛ DTO نسخهٔ fixture، selector تکراری preview/bubble و reset fixture اصلاح شدند. run بعد۱۱موفق/۲ناموفق: cache انتشار درس و تداخل alert با announcer خود Next؛ سپس run هدفمند۶موفق شد. run کامل بعد۱۳موفق/۱ناموفق، selector alert پروفایل با announcer هم‌نام بود؛ selector به alert محتوای main محدود شد، assertion خطا حفظ شد. اولین clean-checkout نصب موفق اما فایل مستند تولیدی را کپی نکرده بود؛ allowlist اصلاح و از staging تازه دوباره اجرا شد. جزئیات اجراهای اولیه در `test-attempts` محفوظ است.

## ۶. پاک‌سازی قابل بازبینی

`file-cleanup.json`: حذف registry تکراری `client-contract.json` با SHA برابر canonical؛ import و مولد اصلاح شدند. حذف DataTable بی‌مصرف پس از اسکن import/dynamic/script و حذف dependency react-table و table-core. ابزار fixture تک‌فایلی قدیمی، ابزارهای audit زنده و تولید PDF تاریخ‌دار به `retired-tools/*.source` منتقل شدند تا نسخهٔ فعلی یا گزارش تاریخی را بازنویسی نکنند. README/DESIGN/PLAN قبلی به‌عنوان سابقه حفظ و فایل مرجع فعلی با نام اصلی بازنویسی شد. manifest آزمون‌های منتقل‌شده جداست.

`css-cleanup.json`:۵۳۸ selector بدون ارجاع در گذر اول و۲۶ selector مرتبط با DataTable در گذر بعد کنار گذاشته شدند. کلاس‌های دینامیک محافظه‌کارانه نگه داشته شدند. جزئیات گذر دوم و خلاصهٔ گذر اول ثبت است؛ backup ماژول‌ها در `tmp/quality-baseline` نگه داشته شد. فهرست کامل selectorهای گذر اول بازسازی/ادعا نشده است. تصاویر و آزمون‌های ابعاد پس از حذف اجرا شدند؛ تصاویر baseline دستی pixel-diff هنوز ندارند.

سه پوشهٔ موقت استخراج طراحی/تصاویر مرجع/رندر PDF، وابستگی فعال ندارند و منبع اصلی/خروجی نهایی محفوظ است؛ اما بازبینی خودکار ابزار، حذف بازگشتی آنها را با پیام «blocked by policy» و بدون دلیل تفصیلی رد کرد. حذف انجام نشد؛ `temp-cleanup.json` صریحاً retained است. backup کیفیت، staging بازتولید، نشست کاربر، node_modules و .next فعال نیز نگه داشته شدند. منابع اصلی، مجوزها، قرارداد، PDF نهایی قبلی و inputهای اصلی کاربر حذف نشدند.

## ۷. دامنهٔ واقعی طراحی و باقی‌مانده

از۱۳۰مرجع:۳۲ دارای پیاده‌سازی،۴۰ جزئی،۴۲ ساخته‌نشده،۵ unavailable و۱۱ مالک خارج از دامنه. این اعداد تعداد صفحهٔ محصول با تطابق کاملv2 یا اتصال زنده نیستند. source/route/شکاف/سطح بررسی هر شناسه در SCREEN_COVERAGE موجود است.

محدودیت‌های اجرایی: upload پاسخ تکلیف جدید هنوز متصل نیست؛ فرم‌های جلسه/مدیر و بخش‌هایی از آزمون/مخاطب هنوز مستقل نیستند؛ ارزیابی/اعلان/دستگاه‌ها و امکانات تکمیلی پیام‌رسان کامل نیستند. AI/پرداخت/منابع شخصی unavailable هستند. همهٔ این موارد باگ backend نامیده نمی‌شوند. تست staging واقعی، امنیت سرور، محدودیت‌های فایل زنده، SignalR واقعی، Expo، Figma، Docker rebuild، CI میزبانی‌شده و استقرار مقصد در این مرحله اجرا نشده‌اند. قیمت، سیاست سن و سهمیه اختراع نشدند.

## ۸. اجرا و خروجی

README روش نصب و env را توضیح می‌دهد. شروع سریع از web: `npm ci`، تنظیم env، `npm run build` و `npm start -- --port 3130`. کنترل روزمره: `npm test`؛ کنترل کامل: `npx playwright install chromium` سپس `npm run quality`. بازتولید از کپی تمیز: `npm run repro:check`.

خروجی‌های اصلی: کد همین `web`، این گزارش، FINAL_RESULTS و SCREEN_COVERAGE، تصاویر `test-results/screenshots`، HTML مستقل `output/design/makan-responsive-prototype.html` و workflow. نتیجهٔ محلی، تعریف CI و انتشار واقعی جدا ارزیابی می‌شوند؛ آمادگی ادامهٔ توسعه به معنی انتشار تأییدشده نیست.

فهرست۲۱ ورودی page و۲۱الگوی بخش آموزشگاه در `ROUTES.json` ثبت است. مجموعهٔ مرجع طراحی و source محصول یکی نیستند. بستهٔ سورس با Python3 استاندارد و `python scripts/package-source.py` ساخته می‌شود؛ خروجی `output/delivery/makan-client-source.zip` شامل web و workflow ریشه است و env خصوصی، نشست، dependency، build cache، trace و evidence تاریخی اجرایی را ندارد. manifest با SHA و بررسی CRC در بسته است. ابزار Python فقط برای بسته‌بندی اختیاری لازم است؛ اجرای برنامه و تست‌های روزمره به آن وابسته نیست.

نسخهٔ تولیدی محلی در پایان روی3130 دوباره راه‌اندازی شد؛ GET /enter برابر200 و GET /api/client/session بدون کوکی برابر401 بود. نشست واقعی کاربر یا ارسال پیام زنده در این smoke بررسی نشد. پس از بسته‌بندی، CRC، manifest۲۴۲فایل و نبود env خصوصی/node_modules/.next/نشست/trace در ZIP نیز بررسی شد.
