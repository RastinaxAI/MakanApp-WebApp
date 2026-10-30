# ماکان — کلاینت وب

تنها اپلیکیشن فعال این مخزن، Next.js/React در `web/` است. نسخهٔ Vite قدیمی از پروژه و مسیر اجرا کنار گذاشته شده است. حساب شخصی، دانشجو، استاد، والد و مدیر آموزشگاه پنج نقش این کلاینت‌اند؛ پنل مالک پروژهٔ جداگانه است.

## راهنمای استفاده‌کنندهٔ پنل

- [راهنمای تصویری فارسی PDF](web/output/pdf/MakanApp_Panel_User_Guide_FA.pdf)
- [نسخهٔ تصویری در مرورگر](web/docs/user-guide/index.html)

این راهنما ورود، انتخاب نقش، آموزشگاه، پیام‌ها، دعوت‌ها و تنظیمات را توضیح می‌دهد. تصاویر با دادهٔ نمونه تهیه می‌شوند و اطلاعات ورود واقعی در راهنما نیست. آدرس دسترسی پنل را مدیر سامانه به کاربران می‌دهد؛ آدرس‌های محلی این README برای همان دستگاه میزبان‌اند.

## پیش‌نیازها

برای روش پیشنهادی Docker، Docker Desktop باید روشن و در حالت Linux containers باشد. Compose v2 با پشتیبانی از `include` لازم است. در این روش، Node روی میزبان لازم نیست. برای توسعه، Node مطابق `web/.nvmrc`، فعلاً 24.19.0، و npm لازم است. قفل وابستگی معتبر `web/package-lock.json` است.

دستورها PowerShell هستند و از ریشهٔ همین مخزن اجرا می‌شوند، مگر اینکه خلاف آن نوشته شود. سلامت ابزار را بررسی کنید:

```powershell
docker version
docker compose version
```

## اجرای Docker

تنظیمات محلی و کلید نشست در `web/.env.docker` قرار دارند و وارد Git یا image نمی‌شوند. در نصب تازه، فایل نمونهٔ `web/.env.docker.example` را کپی و کلید تصادفی ۶۴کاراکتری hex تولید کنید. فایل تنظیمات موجود را بازنویسی نکنید.

این قطعه فایل را فقط اگر وجود ندارد می‌سازد و کلید را بدون چاپ‌کردن در آن می‌نویسد:

```powershell
if (-not (Test-Path -LiteralPath 'web/.env.docker')) {
    $taskRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $taskBytes = New-Object byte[] 32
    $taskRng.GetBytes($taskBytes)
    $taskRng.Dispose()
    $taskSecret = ($taskBytes | ForEach-Object { $_.ToString('x2') }) -join ''
    $taskConfig = Get-Content -LiteralPath 'web/.env.docker.example' -Raw
    $taskConfig = $taskConfig -replace '(?m)^SESSION_SECRET=.*$', ('SESSION_SECRET=' + $taskSecret)
    $taskPath = Join-Path (Get-Location) 'web/.env.docker'
    [System.IO.File]::WriteAllText($taskPath, $taskConfig, (New-Object System.Text.UTF8Encoding $false))
    Remove-Variable taskSecret, taskBytes, taskConfig
}
```

| متغیر | مقدار نمونه یا قاعده |
| --- | --- |
| `MAKAN_PORT` | `8080`، پورت محلی وب |
| `APP_ORIGIN` | `http://127.0.0.1:8080`؛ دقیقاً همسان با آدرس مرورگر |
| `BACKEND_BASE_URL` | پیش‌فرض نمونه `http://94.184.32.84:8090`، سرویس تست؛ برای محیط دیگر تغییر دهید |
| `SESSION_SECRET` | ۶۴ کاراکتر hex تصادفی؛ در ارتقای معمول عوض نشود |
| `COOKIE_SECURE` | برای HTTP محلی `false` و برای HTTPS برابر `true` |

فایل محیط و کلید نشست خصوصی‌اند. Compose ریشه همین فایل `web/.env.docker` را می‌خواند؛ کپی تنظیمات دیگری در ریشه لازم نیست. تغییر پورت به تغییر هماهنگ `MAKAN_PORT` و `APP_ORIGIN` نیاز دارد.

از همین پوشه:

```powershell
docker compose up -d --build --wait --wait-timeout 180
```

آدرس نسخهٔ جدید: http://127.0.0.1:8080/enter

پس از موفقیت build، وضعیت سرویس باید `healthy` شود. ساخت نخست به دریافت image و وابستگی‌ها نیاز دارد و ممکن است چند دقیقه زمان ببرد. برای اجرای image موجود، بدون ساخت تازه:

```powershell
docker compose up -d --no-build --wait --wait-timeout 180
```

پس از دریافت تغییرات سورس، همان فرمان `up --build` را دوباره اجرا و تب مرورگر را تازه‌سازی کنید.

```powershell
docker compose ps
docker compose logs -f --tail 100 web
docker compose down
```

دستور down، volume نشست‌ها را حفظ می‌کند. پورت و APP_ORIGIN در فایل تنظیمات باید با آدرس مرورگر یکسان باشند. راهنمای تفصیلی: [Docker](web/docs/docker.md).

برای توقف یا ارتقای معمول از `down -v` استفاده نکنید؛ volume نشست‌ها نباید حذف شود. بایند Compose فعلی فقط loopback میزبان است. گوشی با آدرس 127.0.0.1 به کامپیوتر شما وصل نمی‌شود؛ دسترسی شبکه یا عمومی نیازمند میزبانی و origin صحیح است. انتشار عمومی به HTTPS، دامنه، reverse proxy و تنظیم cookie صحیح نیاز دارد و از اجرای محلی نتیجه گرفته نمی‌شود.

## توسعه و بررسی

ابتدا نسخهٔ Node را بررسی کنید. فقط در نصب تازه، قطعهٔ زیر `web/.env.local` را از `web/.env.example` با کلید مستقل و تصادفی می‌سازد. تنظیمات موجود حفظ می‌شود؛ کلید در خروجی چاپ نمی‌شود. `APP_ORIGIN` این حالت `http://127.0.0.1:3130` است.

```powershell
if (-not (Test-Path -LiteralPath 'web/.env.local')) {
    $taskLocalSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
    if ($LASTEXITCODE -ne 0) { throw 'Node secret generation failed' }
    $taskLocalConfig = Get-Content -LiteralPath 'web/.env.example' -Raw
    $taskLocalConfig = $taskLocalConfig -replace '(?m)^SESSION_SECRET=.*$', ('SESSION_SECRET=' + $taskLocalSecret)
    $taskLocalPath = Join-Path (Get-Location) 'web/.env.local'
    [System.IO.File]::WriteAllText($taskLocalPath, $taskLocalConfig, (New-Object System.Text.UTF8Encoding $false))
    Remove-Variable taskLocalSecret, taskLocalConfig
}
```

```powershell
npm --prefix web ci
npm run dev
npm run quality
```

`npm run dev` ریشه، پیش‌نمایش اختصاصی سرور تست `94.184.32.84:8090` را روی ۳۱۳۰ و با نشست‌های `.makan-qa-sessions` اجرا می‌کند. برای استفاده از backend دلخواه داخل `web/.env.local`، اجرای معمول را انتخاب کنید:

```powershell
node --version
npm --prefix web run dev -- --port 3130
```

ساخت و اجرای تولیدی بدون Docker:

```powershell
npm --prefix web run build
npm --prefix web run start -- --port 3130
```

همان فایل محیط برای runtime لازم است. دو سرویس را هم‌زمان روی یک پورت اجرا نکنید؛ پنل جداگانهٔ مالک روی ۳۰۰۰ را متوقف نکنید.

برای اجرای آزمون مرورگر، Chromium پروژه را پیش از `quality` نصب کنید:

```powershell
npm --prefix web exec playwright install chromium
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web test
npm run quality
```

`quality` شامل format، lint، typecheck، تست واحد، کنترل فایل‌های تولیدشده، build و تست مرورگر است. آزمون خودکار عادی روی fixture محلی ۳۱۳۲/۳۴۵۷ اجرا می‌شود. بررسی واقعی حساب‌های تست روی Docker، اختیاری و مستقل از CI است؛ [روش و محدودیت‌ها](web/docs/quality/DOCKER_FOUR_ROLE_HANDOFF.md) را بخوانید. نتیجهٔ تست قبلی، تضمین اجرای تازه یا صحت همهٔ سرویس‌ها نیست.

## ورود و رفع خطاهای رایج

شمارهٔ همراه دقیقاً ۱۱ رقم و با شروع `09` و کد ورود دقیقاً شش رقم است. پس از ورود یک فضای مجاز انتخاب کنید؛ جابه‌جایی تب‌ها نباید نقش را عوض کند. چهار مقصد اصلی آموزشگاه، دستیار ماکان، پیام‌ها و پروفایل هستند.

| مشکل | بررسی و اقدام |
| --- | --- |
| `unhealthy` یا بازنشدن پنل | `docker compose logs --tail 100 web`، فایل محیط، origin، کلید نشست و سلامت Docker را بررسی کنید. |
| اشغال پورت | پورت سرویس دیگر را شناسایی و پورت و origin برنامه را هماهنگ تغییر دهید. |
| ردشدن origin | `localhost` و `127.0.0.1` را مخلوط نکنید؛ آدرس مرورگر و `APP_ORIGIN` باید یکی باشند. |
| خطای سرویس یا «در دسترس نیست» | سلامت backend، مقدار `BACKEND_BASE_URL` و شناسهٔ پیگیری را بررسی کنید؛ ۴۰۴ به‌تنهایی اثبات نبود شماره یا حساب نیست. |
| نبود نقش یا آموزشگاه | عضویت، وضعیت نقش و امکان ورود باید از سرویس معتبر باشند؛ فرانت‌اند مجوز تازه ایجاد نمی‌کند. |
| نمایش کوچک‌تر روی دسکتاپ | زیر۷۶۸ موبایل،۷۶۸تا۱۰۲۳ تبلت و از۱۰۲۴ دسکتاپ است؛ عرض پنجره و zoom مرورگر مؤثرند. |

## تولید دوبارهٔ راهنمای تصویری

مراحل تهیهٔ تصاویر نمونه و تولید PDF در [راهنمای ساخت سند](web/docs/user-guide/BUILD.md) آمده است. این کار مستقل از build برنامه است و هیچ کد یا توکن ورود واقعی در خروجی قرار نمی‌دهد.

پیش‌نمایش Node روی3130 و Docker روی8080 است. سورس و مستندات محصول در `web/src` و `web/docs` قرار دارند. راهنمای نصب و نتیجهٔ بررسی‌ها در [README کلاینت](web/README.md) و [PROGRESS](web/docs/PROGRESS.md) ثبت می‌شوند.

پوشه‌های طبقه‌بندی‌نشدهٔ `packages/toolkit` و `.freebuff` و فایل `malikam_excel.json` به‌دلیل نامشخص‌بودن ارتباطشان با کارهای دیگر حفظ شدند. سابقهٔ Git بازنویسی نشده است. آرشیو نسخهٔ قبلی خارج از پروژه نگهداری می‌شود؛ مسیر و فهرست آن در `web/docs/quality/LEGACY_RETIREMENT_MANIFEST.json` ثبت شده است.
