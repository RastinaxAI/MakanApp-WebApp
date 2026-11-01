# آپدیت سرور با setup.sh — ۱نوامبر۲۰۲۶

راهنمای اصلی و فرمان انتقال بسته در [readme.md ریشه](../../readme.md) است. سورس جدید را روی نصب موجود جایگزین و از `/var/www/makanapp/app` اجرا کنید:

```bash
sudo bash setup.sh --update
```

این مسیر Compose مستقیمِ `web/compose.yaml` را با پروژهٔ `makan-client` و فایل موجود `web/.env.docker` اجرا می‌کند؛ به include ریشه یا override محلی وابسته نیست. ابتدا build، سپس جایگزینی فقط web با `--no-deps --no-build --wait` انجام می‌شود. حجم نشست و فایل تنظیمات، Nginx، TLS و سرویس‌های جدا تغییر نمی‌کنند. شکست build نسخهٔ قبلی را متوقف نمی‌کند؛ شکست healthcheck خطاست و rollback خودکار ندارد. نصب اولیه فقط `--install` است و اجرای بدون آرگومان، راهنماست.

بررسی Linux این تغییر با Docker ایزوله و فرمان‌های سرویس شبیه‌سازی‌شده انجام می‌شود؛ روی سرور مقصد اجرا نشده است. ساخت واقعی برنامه و بررسی رابط Docker مرحلهٔ قبلی در رسیدهای TELEGRAM_DETAILS_* محفوظ‌اند.

---

# Docker کلاینت ماکان

## بازطراحی پیام‌رسان و اجرای محلی — ۱ نوامبر۲۰۲۶

نسخهٔ محلی Docker با ظاهر مرجع PDF تلگرام روی `http://127.0.0.1:8080/personal/messages` بررسی می‌شود. برای حفظ محیط تست قبلی، `compose.local.yaml` اضافه شد: backend پورت۸۰۹۰، origin محلی و cookie متناسب با HTTP. طبق تأیید تازهٔ کاربر، Compose اصلی و پیش‌فرض کد و ابزارها هم از همین backend پورت۸۰۹۰ استفاده می‌کنند؛ تنظیم HTTPS کلاینت مستقل است. override محلی را در استقرار عمومی استفاده نکنید. ردشدن کد ثابت تست با `OTP_INVALID` در آدرس بدون پورت مربوط به تلاش پیش از این اصلاح است و در شواهد تاریخی حفظ شد.

از پوشهٔ `web/` و با همان فایل خصوصی `.env.docker` موجود:

```powershell
docker compose --env-file .env.docker -p makan-client -f compose.yaml -f compose.local.yaml build web
docker compose --env-file .env.docker -p makan-client -f compose.yaml -f compose.local.yaml up -d --no-deps --no-build --wait --wait-timeout 180 web
```

volume `makan-client_sessions` حفظ می‌شود؛ `down -v` لازم نیست. دریافت اسناد و نتیجهٔ بررسی‌ها: [پیاده‌سازی مرجع](quality/TELEGRAM_PDF_IMPLEMENTATION.md)، [تست‌های مستقل](quality/TELEGRAM_REDESIGN_BROWSER.json)، [چهار حساب واقعی تست](quality/TELEGRAM_DOCKER_ROLE_REVIEW.json) و [رسید نسخهٔ Docker](quality/TELEGRAM_DOCKER_DEPLOYMENT.json). بررسی چهار حساب فقط ورود، انتخاب فضای مجاز و خواندن/ناوبری بود؛ ارسال رسانهٔ دوطرفه در تست fixture بررسی شد. وضعیت‌های پایین تاریخی‌اند و رسید جدید، مرجع نسخهٔ محلی این تحویل است.

## استقرار فعلی روی دامنه اصلی — ۱ نوامبر ۲۰۲۶

Compose اکنون طبق تأیید کاربر بک‌اند تست `http://94.184.32.84:8090`، نشانی عمومی `https://app.makanapp.org` و کوکی امن را در environment سرویس تعیین می‌کند و بر مقادیر قدیمی این گزینه‌ها در `.env.docker` اولویت دارد. صفحه Swagger در `/swagger/index.html` و قرارداد در `/openapi/v1.json` همین بک‌اند هستند؛ Swagger مقصد درخواست ورود نیست. پس از دریافت تغییرات، `docker compose up -d --build --wait --wait-timeout 180` را اجرا و ورود را از دامنه HTTPS بررسی کنید. پورت۸۰۹۰ مرجع فعال بک‌اند تست است؛ APP_ORIGIN نشانی خود کلاینت است و با آدرس سرویس تفاوت دارد.

تحویل جاری دعوت/ورود/واکنش‌گرایی: image `8ace1d457915` ساخته و با `up --no-build --wait` اجرا شد؛ کانتینر healthy و image مطابق tag است. /enter و /sw.js روی8080=200، نشست ناشناس401 و شمارهٔ کوتاه/OTPپنج‌رقمی400 هستند. volume نشست و پنل جداگانهٔ مالک محفوظ‌اند. [رسید](quality/RESPONSIVE_SIGNIN_DOCKER.json)، [بررسی HTTP](quality/RESPONSIVE_SIGNIN_DOCKER_HTTP.json)، [گزارش و حدود نتیجه](quality/RESPONSIVE_SIGNIN_HANDOFF.md).

نسخهٔ بهینه‌سازی سرعت: image `255844d284d1` ساخته و اجرا شد؛ کانتینر healthy، image مطابق tag و /enter=200 روی8080 است. نشست ناشناس401، volume نشست حفظ و مالک جداگانه سالم است. [رسید جاری](quality/PERFORMANCE_DOCKER.json)، [ساخت](quality/PERFORMANCE_DOCKER_BUILD.log) و [اجرا](quality/PERFORMANCE_DOCKER_UP.log).

اصلاح ظاهر دعوت‌ها: image جدید `1a271bec3878` ساخته و با `up --no-build --wait` اجرا شد؛ کانتینر healthy، image مطابق tag و /enter=200 روی8080 است. volume نشست و مالک جداگانه حفظ شدند. [رسید جاری](quality/INVITATIONS_REDESIGN_DOCKER.json)، [ساخت](quality/INVITATIONS_REDESIGN_DOCKER_BUILD.log) و [اجرا](quality/INVITATIONS_REDESIGN_DOCKER_UP.log).

آخرین انتشار محلی42c51a3: image `def659edc78f2` ساخته و با `up --no-build --wait` اجرا شد. کانتینر healthy و image آن مطابق tag تأیید شد؛ /enter روی8080=200، نشست ناشناس401، /sw.js=200 و GET OpenAPI از داخل کانتینر200 با۳۲۷مسیر است. volume نشست حفظ شد و مالک جداگانه روی3000 سالم ماند. شواهد جاری: [رسید Docker](quality/RELEASE_42C51A3_DOCKER.json)، [لاگ ساخت](quality/RELEASE_42C51A3_DOCKER_BUILD.log)، [لاگ اجرا](quality/RELEASE_42C51A3_DOCKER_UP.log). بندهای نتیجهٔ پایین سابقهٔ تحویل پیشین‌اند؛ ادعای جدیدی درباره امنیت سرور یا ارسال رسمی زنده نیستند.

نسخهٔ جدید Next.js روی **http://127.0.0.1:8080/enter** اجرا و کانتینر `makan-client-web-1` سالم بررسی شد. نسخهٔ Vite قدیمی و image آن با درخواست کاربر کنار گذاشته شدند. پنل مالک در پروژه/کانتینر جدا، روی3000 حفظ شده است. اجرای محلی Node روی3130 نیز برقرار است.

## نصب و اجرا

تنظیمات محرمانه در `web/.env.docker` است؛ فایل موجود را بازنویسی نکنید. فقط برای نصب تازه، `.env.docker.example` را به `.env.docker` کپی و SESSION_SECRET را با کلید تصادفی۶۴کاراکتری hex پر کنید. MAKAN_PORT نمونه8080 است. Compose فعلی برای دامنه HTTPS اصلی تنظیم شده است؛ بررسی محلی UI را با launcher توسعه یا fixtureهای ایزوله انجام دهید. مقادیر محرمانه را منتشر نکنید.

از ریشهٔ `Makan Application`:

```powershell
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
docker compose logs -f --tail 100 web
```

Compose ریشه، `web/compose.yaml` را با `web/.env.docker` include می‌کند؛ Docker Compose با پشتیبانی include لازم است (این تحویل باv5.5.1 بررسی شد). اگر از داخلweb اجرا می‌کنید:

```powershell
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 180
```

در ریشه، `docker compose down` برنامه را متوقف و volume نشست را حفظ می‌کند. گزینهٔ `-v` برای توقف عادی لازم نیست. پورت تنها روی127.0.0.1 منتشر می‌شود؛ این استقرار محلی، انتشار عمومی نیست.

## نشست و فایل‌های خصوصی

کانتینر با کاربر1000، filesystem فقط‌خواندنی و volume مستقل `makan-client_sessions` اجرا می‌شود. cache و /tmp موقت‌اند. نشست‌های preview کپی نشده‌اند؛ لازم است در نسخهٔ8080 وارد شوید. کوکی Docker به‌صورت `makan_client_session_8080` از کوکی preview مستقل است؛ تغییر پورت نام کوکی را نیز عوض می‌کند. تغییر SESSION_SECRET نشست‌های قبلی همین استقرار را نامعتبر می‌کند.

allowlist ساخت فقط ورودی‌های لازم برنامه از جمله `design/tokens.json` را می‌گیرد؛ env خصوصی، نشست، node_modules میزبان و خروجی‌های مرورگر وارد image نمی‌شوند. npm ci داخل Linux از package-lock اجرا و Next standalone با یک worker ساخته می‌شود. build به دسترسی registry و منابع کافی Docker نیاز دارد؛ کپی node_modules ویندوز راه جایگزین نیست.

## نتیجهٔ واقعی بررسی — ۳۰ اکتبر ۲۰۲۶

- Docker Engine29.8.0 و Compose5.5.1؛ build نهایی `makan-client:local` موفق، سپس `up --no-build --wait` موفق و healthcheck سالم.
- GET /enter =200 با assetهای Next؛ نشست ناشناس401؛ POST خروج با Origin غیرمجاز403؛ خروج ناشناس از مبدأ مجاز204 با کوکی مستقل. این خروج هیچ نشست واقعی یا عملیات بک‌اند را تغییر نداد.
- /sw.js =200 با cache-control بدون ذخیره و worker فعلی. migration فقط cacheهای شناخته‌شده قدیمی را پاک می‌کند؛ پیش‌نویس/outbox/IndexedDB پاک نمی‌شوند.
- runtime uid1000 و volume نشست قابل نوشتن؛ env خصوصی و نشست preview در image وجود ندارند. GET قرارداد زنده از داخل کانتینر =200 و۳۲۲مسیر.
- کانتینر قدیمی568dcc68217d پس از تأیید نام/پروژه/مسیر و نداشتن mount متوقف و حذف شد؛ image83618194fd34 نیز بدون force حذف شد. volumeها یا imageهای پروژه‌های دیگر حذف نشدند. پنل مالک پس از restart سالم است؛ کانتینرهای دیگری که از قبل متوقف بودند، اجرا نشدند.

موتور ابتدا پاسخ نمی‌داد؛ restart معمول timeout شد و با مجوز صریح کاربر، Desktop و فقط distro مربوط به Docker دوباره راه‌اندازی شدند. تلاش Restart-Service ویندوز مجوز لازم نداشت؛ reset/unregister/delete انجام نشد. پس از بازیابی موتور، نخستین build خطای ورودی مفقود tokens را آشکار کرد؛ اصلاح allowlist و build مجدد موفق شد.

تست کامل UI روی fixture محلی انجام شده است؛ احراز هویت و عملیات تغییردهنده روی سرور8090 در این بررسی Docker اجرا نشدند. اجرای CI میزبانی‌شده و استقرار عمومی تأیید نشده‌اند. لاگ build، اجرا و smoke در `docs/quality/MEMBERS_DOCKER_*` و خلاصه در `MEMBERS_DOCKER.json` هستند.
