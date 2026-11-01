# آپدیت نسخهٔ نصب‌شدهٔ ماکان روی سرور

مسیر نصب فعلی `/var/www/makanapp/app` است. برای اعمال تغییرات رابط و برنامه، ابتدا بستهٔ سورس جدید شامل `setup.sh` و پوشهٔ `web/` را روی سرور منتقل کنید. اجرای حالت آپدیت به نصب مجدد سیستم، Nginx یا گواهی نیاز ندارد.

## روش اصلی: انتقال بستهٔ سورس و آپدیت

بستهٔ آمادهٔ پروژه در `web/output/delivery/makan-client-source.zip` است. این بسته تنظیمات محرمانه، نشست‌ها، `node_modules` و خروجی build را ندارد؛ `setup.sh` و راهنمای جدید را هم همراه دارد.

۱. فایل ZIP جدید را روی سرور در `/tmp/makan-client-source.zip` آپلود کنید.
۲. روی سرور اجرا کنید:

```bash
cd /var/www/makanapp/app
sudo unzip -o /tmp/makan-client-source.zip -d .
sudo bash setup.sh --update
```

اگر فایل‌های جدید را قبلاً با SFTP یا روش خودتان در مسیر نصب جایگزین کرده‌اید، فقط دستور زیر لازم است:

```bash
cd /var/www/makanapp/app
sudo bash setup.sh --update
```

برای اجرای اسکریپت از مسیری دیگر:

```bash
sudo bash /var/www/makanapp/app/setup.sh --update --app-dir /var/www/makanapp/app
```

در نصب مبتنی بر Git، دریافت سورس را پیش از اجرای `--update` با روند معمول مخزن انجام دهید. اسکریپت خودش Git را pull/reset نمی‌کند و تغییرات سورس شما را بازنویسی نمی‌کند.

## رفتار آپدیت

- وجود سورس، فایل `web/.env.docker`، Docker و Compose بررسی می‌شود.
- فقط image برنامهٔ `web` ساخته می‌شود؛ هنگام build کانتینر قبلی اجرا می‌ماند. شکست build باعث توقف نسخهٔ قبلی نمی‌شود.
- پس از build، فقط سرویس `web` با نام پروژهٔ ثابت `makan-client` جایگزین می‌شود و اسکریپت تا موفقیت healthcheck منتظر می‌ماند.
- فایل تنظیمات و `SESSION_SECRET` تغییر نمی‌کنند؛ volume فعلی `makan-client_sessions` حفظ می‌شود. اگر فایل تنظیمات هنگام build تغییر کند، استقرار متوقف می‌شود تا تنظیمات بررسی شوند.
- بسته‌های سیستم، فایروال، تنظیمات Nginx و گواهی TLS در حالت آپدیت تغییر نمی‌کنند. کانتینرهای پنل مالک و سرویس‌های دیگر هم دست‌نخورده می‌مانند.
- دو آپدیت هم‌زمان اجرا نمی‌شوند. پیام موفقیت فقط پس از پایان موفق healthcheck نمایش داده می‌شود؛ این بررسی سلامت به معنی آزمون همهٔ عملیات بک‌اند نیست.

بعد از پیام موفقیت، `https://app.makanapp.org/enter` را باز و صفحه را تازه‌سازی کنید. Compose اصلی فعلاً به بک‌اند تست `http://94.184.32.84:8090` وصل است؛ `APP_ORIGIN=https://app.makanapp.org` و کوکی امن در همان فایل Compose تعریف شده‌اند. تنظیم محلی `compose.local.yaml` در این روش بارگذاری نمی‌شود.

## مشاهدهٔ وضعیت و خطا

از ریشهٔ پروژه روی سرور:

```bash
sudo docker compose --env-file web/.env.docker -p makan-client -f web/compose.yaml ps web
sudo docker compose --env-file web/.env.docker -p makan-client -f web/compose.yaml logs --tail=100 web
```

اگر healthcheck ناموفق شد، اسکریپت خطا می‌دهد و پیام موفقیت نشان نمی‌دهد؛ لاگ را بررسی و پس از رفع علت دوباره `--update` را اجرا کنید. بازگشت خودکار به image قبلی در این نسخه پیاده نشده است. برای آپدیت، حذف volume یا تولید دوبارهٔ کلید نشست لازم نیست.

اجرای `bash setup.sh --help` یا اجرای بدون آرگومان، فقط راهنما را نمایش می‌دهد.

---

# نصب اولیهٔ سرور جدید

بخش زیر برای آماده‌سازی یک سرور جدید است. سروری که همین حالا برنامه را اجرا می‌کند از جریان `--update` بالا استفاده می‌کند. حالت `--install` در صورت وجود تنظیمات فعلی Nginx ماکان، از بازنویسی آن‌ها جلوگیری می‌کند.

# راه‌اندازی سرور وب‌اپلیکیشن ماکان

پروژه با Next.js و Docker اجرا می‌شود. Nginx درخواست‌ها را به کانتینر روی `127.0.0.1:8080` هدایت می‌کند و پیش از آماده‌شدن کانتینر صفحه آزمایشی نشان می‌دهد.

## مرحله ۱: تنظیمات DNS

پیش از اجرای اسکریپت، رکورد زیر را تنظیم کنید و منتظر انتشار آن بمانید:

| نوع | نام | مقدار |
|---|---|---|
| A | app | 89.46.217.168 |

پورت‌های ۸۰ و ۴۴۳ باید از اینترنت به سرور دسترسی داشته باشند.

## مرحله ۲: اجرای اسکریپت

برای ساخت فایل، دستور زیر را اجرا کنید و محتوای `setup.sh` پروژه را در آن قرار دهید:

```bash
nano setup.sh
```

پس از ذخیره فایل:

```bash
chmod +x setup.sh
sudo bash setup.sh --install
```

در صورت موفقیت، صفحه آزمایشی در `https://app.makanapp.org` در دسترس است. Docker و افزونه Docker Compose باید جداگانه روی سرور نصب باشند.

## مرحله ۳: آپلود و اجرای وب‌اپ

فایل‌های پروژه، شامل `compose.yaml` و پوشه `web`، را با حفظ ساختار در مسیر زیر قرار دهید:

```text
/var/www/makanapp/app
```

برای نصب تازه، فایل نمونه تنظیمات را کپی و ویرایش کنید. اگر فایل تنظیمات از قبل وجود دارد، آن را حفظ کنید:

```bash
cd /var/www/makanapp/app
cp -n web/.env.docker.example web/.env.docker
nano web/.env.docker
```

نشانی اتصال بک‌اند `http://94.184.32.84:8090` است. مسیر `/swagger/index.html` صفحه مستندات است؛ درخواست‌های برنامه به مسیرهای `/api/v1/…` همین سرور ارسال می‌شوند.

Compose مقادیر `BACKEND_BASE_URL=http://94.184.32.84:8090`، `APP_ORIGIN=https://app.makanapp.org` و `COOKIE_SECURE=true` را برای استقرار اصلی اعمال می‌کند؛ بنابراین مقادیر قدیمی این سه گزینه در فایل محیطی دیگر اتصال و ورود را تغییر نمی‌دهند. مقدار `MAKAN_PORT` باید `8080` باشد تا با Nginx هماهنگ بماند.

برای ساخت کلید نشست فقط در صورتی که مقدار آن خالی است، دستور زیر را اجرا کنید. کلید موجود تغییر نمی‌کند و در خروجی نمایش داده نمی‌شود:

```bash
sudo python3 - <<'PYCODE'
from pathlib import Path
import os
import re
import secrets

path = Path('web/.env.docker')
text = path.read_text()
pattern = r'^SESSION_SECRET=([^\r\n]*)$'
matches = list(re.finditer(pattern, text, re.MULTILINE))
if len(matches) != 1:
    raise SystemExit('فایل تنظیمات باید دقیقاً یک خط SESSION_SECRET داشته باشد.')
value = matches[0].group(1).strip()
if not value:
    text = text[:matches[0].start(1)] + secrets.token_hex(32) + text[matches[0].end(1):]
    path.write_text(text)
    os.chmod(path, 0o600)
    print('کلید نشست ساخته شد.')
elif re.fullmatch(r'[0-9a-fA-F]{64}', value):
    print('کلید نشست موجود معتبر است و حفظ شد.')
else:
    raise SystemExit('کلید موجود نامعتبر است؛ آن را در فایل تنظیمات اصلاح کنید.')
PYCODE
```

تغییر کلید موجود باعث نامعتبر شدن نشست‌های قبلی می‌شود. محتوای فایل تنظیمات و کلید را منتشر نکنید.

سپس برنامه را بسازید و اجرا کنید:

```bash
sudo bash setup.sh --update
```

برای بررسی خطاها:

```bash
sudo docker compose logs --tail=100 web
```

برای به‌روزرسانی‌های بعدی از دستور `sudo bash setup.sh --update` مطابق ابتدای این راهنما استفاده کنید. فایل تنظیمات و volume نشست Docker حفظ می‌شوند.

پس از به‌روزرسانی، صفحه ورود را با نشانی `https://app.makanapp.org/enter` باز کنید. استفاده از HTTP، IP سرور یا localhost با تنظیمات امن دامنه اصلی سازگار نیست. کنترل تطابق مبدأ درخواست برای حفاظت از ورود و عملیات حساب فعال است.
