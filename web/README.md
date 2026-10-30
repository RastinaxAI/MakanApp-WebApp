# کلاینت پنج‌نقشی ماکان

راهنمای راه‌اندازی جاری در [README ریشه](../readme.md) است. برای استفاده‌کنندهٔ پنل، [راهنمای تصویری PDF](output/pdf/MakanApp_Panel_User_Guide_FA.pdf) و [نسخهٔ مرورگر](docs/user-guide/index.html) ساخته شده‌اند. [روش بازتولید](docs/user-guide/BUILD.md) از سورس واحد، تصاویر نمونه و فونت برند استفاده می‌کند.

بررسی زندهٔ Docker با چهار حساب تست مدیر/استاد/دانشجو/والد انجام شد:۲۰مرحلهٔ نمایش و۸۰جابه‌جایی تب، حفظ نقش بعد از reload، فیلتر دعوت‌ها و جزئیات دعوت پذیرفته‌شدهٔ والد موفق؛ خطای سرویس و مرورگر صفر. پذیرش/رد واقعی به دعوت Pending اختصاصی تست نیاز دارد. [گزارش و روش تکرار اختیاری](docs/quality/DOCKER_FOUR_ROLE_HANDOFF.md). این ابزار در CI و بدون opt-in اجرا نمی‌شود.

مرحلهٔ جاری: دعوت‌های من یک مقصد مشترک دارد؛ نمایش دسکتاپ از۱۰۲۴ و تبلت/موبایل مطابق عرض پنجره است. ورود فقط شمارهٔ۱۱رقمی با09 و کد۶رقمی را می‌پذیرد. JS decoded ورود۱۶٫۷٪ کمتر از تحویل قبلی شد. `npm run quality` با۲۴۸تست واحد و۹۸تست مرورگر، صفرشکست/skip/flaky موفق است. [گزارش تغییر و بررسی](docs/quality/RESPONSIVE_SIGNIN_HANDOFF.md)، [نتیجهٔ ثبت‌شده](docs/quality/RESPONSIVE_SIGNIN_RESULTS.json). بندهای بعدی سابقهٔ مراحل پیشین‌اند.

بررسی تکمیلی۱۰۲۴ و تغییر تب‌ها نیز موفق شد؛ مجموع۹۹سناریوی یکتا در اجرای کامل و تکمیلی بررسی شده‌اند. Docker8080 با image8ace1d457915، حفظ volume نشست و پاسخ سالم به‌روز است؛ [رسید استقرار](docs/quality/RESPONSIVE_SIGNIN_DOCKER.json).

تحویل قبلی، بهینه‌سازی سرعت: GETهای مستقلِ BFF موازی و بررسی‌های هم‌زمان یک نشست ادغام شدند؛ مجوز نتیجه‌شده TTL ندارد و mutation/refresh اختصاصی باقی‌اند. بارگیری کد فرم‌ها و نصب PWA مرحله‌ای شد. در benchmark محلی، JS اولیهٔ آموزشگاه Student۲۳٫۸٪ کمتر و batch سه درخواست۱۰۹۲→۳۵۵ms بود؛ زمان cold rendering متغیر است. quality کامل۲۳۴واحد/۹۵مرورگر موفق؛ preview3130 و Docker8080 به‌روز و سالم‌اند. [گزارش و روش سنجش](docs/quality/PERFORMANCE_HANDOFF.md)، [نتایج](docs/quality/PERFORMANCE_RESULTS.json).

آخرین اصلاح ظاهر: دعوت‌های دریافتی با فیلترهای یکپارچه، شمارش معتبر، حالت خالی قابل اقدام و کارت خواناتر؛ lint، typecheck، build و۸تست مرورگر هدفمند موفق شدند. preview3130 و Docker8080 با حفظ نشست به‌روزند؛ [گزارش](docs/PROGRESS.md) و [شواهد](docs/quality/INVITATIONS_REDESIGN.json). کل مجموعهٔ تست‌ها در این اصلاح دوباره اجرا نشده است.

به‌روزرسانی42c51a3: snapshot فضاها، پیام/فایل/replay شخصی مستقل از نقش آموزشی، زوج رسمی گروه/کانال و کارت فعالیت آموزشی به قرارداد جدید وصل شدند. نگاشت نیازمندی در [برنامه](docs/PLAN.md)، جزئیات طراحی در [طراحی](docs/DESIGN.md) و درخواست‌های باقی‌ماندهٔ بک‌اند در [G19](docs/API_GAPS.md) است. خواندن زندهٔ چهار حساب تست انجام شد؛ زوج‌های رسمی نمونه هنوز Missing و lookup انتشار نمونه404 هستند. [شواهد خواندن زنده](docs/quality/RELEASE_42C51A3_LIVE_READS.json) به معنی موفقیت ارسال رسمی یا اجرای backfill نیست. نتیجهٔ کیفیت و استقرار این مرحله در [گزارش انتشار](docs/quality/RELEASE_42C51A3_HANDOFF.md) ثبت می‌شود؛ بندهای پایین تاریخچهٔ تحویل‌های قبلی‌اند.

کیفیت نهایی این انتشار: `npm run quality` موفق؛۲۲۸تست واحد و۹۳تست مرورگر، صفرشکست/skip/flaky. [لاگ کامل](docs/quality/RELEASE_42C51A3_QUALITY.log).

همین نسخه روی [preview3130](http://127.0.0.1:3130/enter) و [Docker8080](http://127.0.0.1:8080/enter) اجراست؛ کانتینر healthy و نشست‌ها حفظ شده‌اند. [رسید استقرار](docs/quality/RELEASE_42C51A3_DOCKER.json).

آخرین تحویل: بازطراحی اعضای آموزشگاه و پرونده‌های آموزشی، فیلترهای سمت سرور، کارت موبایل/جدول دسکتاپ، ویرایش مجاز و حفظ پیش‌نویس در خطا. `npm run quality` شامل۲۱۴تست واحد و۷۹تست مرورگر موفق است؛ [شواهد](docs/quality/MEMBERS_DOCKER_QUALITY.log) و [گزارش مرحله](docs/quality/MEMBERS_HANDOFF.md). راه‌انداز ریشه فقط همین Next.js را اجرا می‌کند؛ سورس، خروجی و وابستگی‌های Vite قدیمی خارج از پروژه آرشیو شده‌اند. وضعیت واقعی استقرار در [راهنمای Docker](docs/docker.md) ثبت می‌شود.

مرحلهٔ دوم: ارزیابی تکلیف و آزمون، نتیجهٔ امنِ مخاطب، ویرایش/انتشار تکلیف و صفحه‌های اطلاعات/اعضا/رسانه/تنظیمات گفتگو اضافه شدند. [پوشش تمام ورودی‌های فهرست](docs/quality/EXPANSION_COVERAGE.md)، [درخواست‌های بک‌اند G16](docs/API_GAPS.md)، [گزارش اجرا](docs/PROGRESS.md) و [نتیجهٔ نهایی بررسی](docs/quality/EXPANSION_NEXT.json). همهٔ فهرست هنوز تکمیل نشده و تست محلی جای بررسی زندهٔ سرور نیست.

اجرای تازهٔ الگوی صفحه‌های مستقل: فرم‌های مدیر/معلم، پروندهٔ سازمانی و اعضای کلاس، جلسه و آزمون؛ تنظیمات اعلان و دستگاه‌ها و مرکز اعلان به پروژه اضافه شدند. [پوشش دقیق این مرحله](design/figma-expansion/app-implementation.json)، [گزارش اجرا و محدودیت‌ها](docs/PROGRESS.md) و [شواهد بررسی](docs/quality/PROJECT_EXPANSION.json). اتصال‌ها بر قرارداد موجود نوشته شده و با fixture محلی بررسی شده‌اند؛ این تحویل به معنی تکمیل همهٔ ۱۴۶ صفحه یا آزمون موفق عملیات روی سرور واقعی نیست.

آخرین اصلاح: ردیف‌های هم‌تراز حساب و ترجیحات و برنامهٔ **هفتگی** کلاس با قبل/بعد و بازهٔ شمسی؛ [نتیجهٔ کیفیت](docs/quality/PREFERENCES_WEEKLY.json) و [پیشرفت جاری](docs/PROGRESS.md). تصمیم ماهانهٔ مرحلهٔ پیش با درخواست جدید جایگزین شد.

بازطراحی تازهٔ ویرایش پروفایل و آموزشگاه: [پیشرفت](docs/PROGRESS.md) و [نتیجهٔ کیفیت](docs/quality/SCHOOL_REDESIGN.json). آموزشگاه چهار بخش و کلاس صفحهٔ مستقل دارد؛ برنامه ماهانه و دعوت‌ها دارای جزئیات/پذیرش/رد هستند.

تغییرات اخیر پروفایل، جستجوی آموزشگاه و پیوست عکس/PDF تکلیف: [پیشرفت جاری](docs/PROGRESS.md)، [درخواست‌های بک‌اند G14](docs/API_GAPS.md)، [شواهد اسکن و کیفیت](docs/quality/PROJECT_RESCAN.json). فایل آزمون منتظر قرارداد بک‌اند است. گزارش PDF با `node scripts/create-project-rescan-pdf.mjs` بازتولید می‌شود.

آخرین اصلاح ظاهر: [گزارش تطبیق با PDF](docs/quality/VISUAL_MATCH.md)، [نتایج بررسی](docs/quality/VISUAL_RESULTS.json). منو و ناوبری پایین چهار مقصد آموزشگاه، دستیار ماکان، پیام‌ها، پروفایل دارند. پس از ورود، `/personal/workspaces` انتخاب فضای مجاز را نشان می‌دهد؛ `/welcome` معرفی عمومی است. گزارش معماری قبلی تاریخچهٔ همان مرحله را حفظ می‌کند.

مرجع فعلی `Makan Application/web` است. Next.js 16.4.2، React 19.3.1، TypeScript 5.9.3، npm و lockfile نسخهٔ۳ حفظ شدند. بررسی محلی با Node.js 24.19.0 و image با Node.js22 انجام می‌شود. حساب شخصی بدون نقش آموزشی، دانشجو، استاد، والدین و مدیر آموزشگاه دامنهٔ این کلاینت‌اند. پنل مالک در پروژهٔ مستقل MakanManagement حفظ شده است؛ Vite تاریخی ریشه با درخواست صریح کاربر بازنشسته شد.

## شروع سریع

فرمان‌ها را داخل `web` اجرا کنید:

```powershell
npm ci
# فقط برای نصب تازه؛ env موجود را بازنویسی نکنید:
Copy-Item .env.example .env.local
npm run dev -- --port 3130
```

پیش از اجرا، `SESSION_SECRET` را با مقدار تصادفی۶۴رقمی hex پر کنید. `APP_ORIGIN` باید دقیقاً origin مرورگر و `BACKEND_BASE_URL` origin سرویس باشد. env، کوکی و نشست خصوصی منتشر نشوند. [ورود محلی](http://127.0.0.1:3130/enter).

```powershell
npm run build
npm start -- --port 3130
```

اجرای عادی طبق env به سرویس واقعی وصل می‌شود. نام سازگار `preview:upgrade` پورت3130 و سرور آزمایشی94.184.32.84:8090 را صریح انتخاب می‌کند و دادهٔ نمایشی نیست.

## بررسی‌ها

```powershell
npm test
npm run lint
npm run typecheck
npm run generated:check
npx playwright install chromium
npm run quality
npm run repro:check
```

`quality`: format → lint → typecheck → unit → generated → build → browser. `lint` تحلیل declarationهای بلااستفاده با TypeScript و مرز import/چرخه است؛ ESLint معرفی نشده است. `test:e2e`، `test:browser` و نام سازگار `test:personal` همگی fixture محلی را اجرا می‌کنند. پورت‌های3132 و3457 باید آزاد باشند؛ سرور قبلی reuse نمی‌شود. این تست‌ها روی سرور واقعی پیام، پرداخت یا تغییر حساب ایجاد نمی‌کنند. fixture آدرس backend خارجی را رد می‌کند و مسیر ناشناخته موفقیت ساختگی ندارد.

`repro:check` staging تازهٔ `tmp/clean-checkout-*` می‌سازد و بدون env خصوصی، node_modules و build قبلی، نصب از lock، بررسی تولید، lint، unit و build را اجرا می‌کند. گزارش در `test-results/clean-checkout/results.json` است؛ مرورگر در quality جدا بررسی می‌شود. staging پس از ثبت شواهد قابل حذف است.

## منابع معتبر و تولید

- مسیر، نقش و چهار مقصد: `src/config/navigation.ts`؛ مجوز مؤثر از نشست و قرارداد سرور می‌آید، انتخاب UI مجوز ایجاد نمی‌کند.
- قرارداد backend: `contracts/openapi.json`؛ SDK محدود کلاینت: `src/generated/api/schema.d.ts` و `contract.json`، شامل۲۰۵ عملیات و۳۹۰ schema؛ admin تولید نمی‌شود.
- طراحیv2: `design/tokens.json` → `src/design/tokens.css`.
- مرجع۱۳۰صفحه: `design/screens.json`؛ وضعیت واقعی هرکدام: `design/implementation-map.json` → `docs/quality/SCREEN_COVERAGE.json`.
- source مستقل prototype: `design/prototype/*` → `output/design/makan-responsive-prototype.html`؛ تمام اطلاعات و تعامل‌ها نمونه و بدون سرویس واقعی‌اند. صفحه‌های مالک فقط در مرجع آفلاین حفظ شده‌اند.

```powershell
npm run design:build
npm run api:generate
```

خروجی تولیدی را دستی ویرایش نکنید. `generated:check` مغایرت را خطا می‌داند. `api:update` فقط GET قرارداد تازه می‌گیرد؛ diff را بررسی و SDK را دوباره تولید کنید. وجود endpoint اثبات اجرای درست سرویس نیست.

بستهٔ سورس اختیاری با Python3 استاندارد: `python scripts/package-source.py`؛ خروجی `output/delivery/makan-client-source.zip`. نصب/اجرای برنامه و quality به Python وابسته نیستند. ZIP شامل web و workflow ریشه، همراه manifest و بدون env خصوصی، نشست، node_modules، build و trace است. تاریخچه‌های غیرقابل اجرا در workspace محفوظ و از بسته حذف‌اند.

## افزودن قابلیت

route در `src/app` ورودی صفحه باشد؛ orchestration و UI در feature مربوط، قواعد مستقل در model/policy، درخواست در API client موجود و تبدیل امن/مجوز در BFF قرار بگیرد. cache و draft به user/context وابسته باشند. قرارداد پیشنهادی وارد SDK واقعی نشود؛ fixture و تست موفق/خطا و نگاشت پوشش به‌روز شوند. فرم‌های مستقل و receipt فقط طبق تأیید معتبر سرویس ساخته شوند.

## وضعیت و تحویل

[معماری](docs/quality/ARCHITECTURE.md)، [گزارش نهایی](docs/quality/TECHNICAL_HANDOFF.md)، [پوشش طراحی](docs/quality/SCREEN_COVERAGE.json)، [طراحی](docs/DESIGN.md)، [شکاف API](docs/API_GAPS.md)، [پیشرفت](docs/PROGRESS.md)، [Docker](docs/docker.md).

همهٔ۱۳۰ صفحه در محصول پیاده نشده‌اند؛ AI و پرداخت فعال فرض نمی‌شوند. سورس backend و Expo در این دامنه موجود نیست. امنیت سرور، CI میزبانی‌شده، Figma، دستگاه فیزیکی و استقرار مقصد از آزمون محلی نتیجه گرفته نمی‌شود. آزمون‌های تاریخی سرور، بدون حذف assertion در `tests/evidence/legacy-live/*.source` محفوظ و این مرحله اجرا نشده‌اند. سابقهٔ بازیابی کلاینت در `docs/CLIENT_RECOVERY.json` است.
