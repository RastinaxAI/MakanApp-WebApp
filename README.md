# نصب و آپدیت ماکان‌اپ روی سرور

نسخهٔ تحویل: طراحی آبی V3 و اتصال API راهنمای 80c2e61، ۴ نوامبر ۲۰۲۶. برنامهٔ فعال فقط `web/` است. دامنهٔ فعلی کلاینت `https://app.makanapp.org` و پورت داخلی Nginx برابر `127.0.0.1:8080` است.

## آپدیت سروری که قبلاً نصب شده است

دو فایل `makan-client-source.zip` و `makan-client-source.zip.sha256` را از `web/output/delivery/` به `/tmp/` سرور منتقل کنید. بسته شامل `setup.sh`، این راهنما و سورس کامل `web/` است؛ فایل محیطی خصوصی، نشست‌ها، node_modules و خروجی build در آن نیستند.

روی سرور:

```bash
cd /tmp
sha256sum -c makan-client-source.zip.sha256
sudo unzip -o /tmp/makan-client-source.zip -d /var/www/makanapp/app
cd /var/www/makanapp/app
sudo bash setup.sh --check
sudo bash setup.sh --update
```

خروجی دستور اول باید `OK` باشد. اگر `--check` خطا داشت، تنظیمات را طبق بخش بعد اصلاح کنید؛ هنوز سرویس قبلی جایگزین نشده است. فایل‌های جدید را می‌توانید با SFTP هم منتقل کنید؛ در آن صورت از ریشهٔ نصب فقط `sudo bash setup.sh --update` کافی است. `--update` خودش تمام بررسی‌های `--check` را انجام می‌دهد.

اگر محل نصب فرق دارد یا از پوشه‌ای دیگر اجرا می‌کنید:

```bash
sudo bash /path/to/app/setup.sh --update --app-dir /path/to/app
```

## تنظیمات اتصال و نشست

فایل خصوصیِ نصب موجود `web/.env.docker` را حفظ کنید. برای بررسی و ویرایش روی خود سرور:

```bash
sudo nano /var/www/makanapp/app/web/.env.docker
sudo chmod 600 /var/www/makanapp/app/web/.env.docker
```

| گزینه | مقدار و رفتار |
|---|---|
| `SESSION_SECRET` | کلید تصادفی ۶۴کاراکتری hex؛ کلید معتبر موجود را تغییر ندهید تا نشست‌ها حفظ شوند. |
| `BACKEND_BASE_URL` | خالی: استفاده از `web/config/network.json`؛ مقدار غیرخالی همین فایل محیطی بر آن تقدم دارد. |
| `MAKAN_PORT` | برای Nginx همین نصب `8080`؛ تغییر آن مستلزم هماهنگ‌کردن پورت proxy است. |

پیش‌فرض `config/network.json` همان بک‌اند تست `http://94.184.32.84:8090` است. اگر فایل محیطی قدیمی مقدار دیگری، مثلاً آدرس بدون `:8090` دارد، برای اتصال به همین تست آن را خالی یا برابر `http://94.184.32.84:8090` بگذارید. آدرس باید فقط مبدأ سرور باشد؛ `/swagger/index.html` و `/api/v1` را به آن اضافه نکنید.

`APP_ORIGIN=https://app.makanapp.org` و `COOKIE_SECURE=true` در Compose اصلی تعیین می‌شوند. `APP_ORIGIN` نشانی خود فرانت‌اند است، نه بک‌اند. پس از استقرار از دامنهٔ HTTPS وارد شوید؛ IP، HTTP و آدرس پیش‌نمایش محلی با این تنظیم مبدأ یکسان نیستند. برای این انتشار `compose.local.yaml` استفاده نمی‌شود.

## رفتار اسکریپت

- `--check`: بررسی فایل‌های لازم، Docker/Compose، کلید، مبدأها، کوکی و volume؛ بدون build یا جایگزینی سرویس.
- `--update`: ابتدا ساخت image در حالی که کانتینر قبلی کار می‌کند، سپس جایگزینی فقط `web` و انتظار برای healthcheck. شکست ساخت نسخهٔ قبلی را متوقف نمی‌کند.
- نام پروژه `makan-client` و volume همان `makan-client_sessions` است. فایل محیطی، کلید و نشست‌ها بازنویسی یا حذف نمی‌شوند. تغییر هم‌زمان env هنگام build باعث توقف استقرار می‌شود.
- آپدیت هم‌زمان دوم اجرا نمی‌شود. پیام موفقیت فقط پس از healthcheck است؛ سلامت `/enter` گواهی همهٔ عملیات بک‌اند نیست.
- ماژول قدیمیِ مشخص `web/src/features/personal/theme.ts` در صورت وجود جایگزین `theme.tsx`، به `.deployment-backups/update-*/theme.ts.retired` منتقل می‌شود. این کار جلوی انتخاب فایل قدیمی پس از آپلود ZIP را می‌گیرد؛ فایل پشتیبان باقی می‌ماند. سایر فایل‌های قدیمی یا ناشناخته حذف نمی‌شوند.
- در حالت آپدیت، Nginx، TLS، فایروال و برنامهٔ جداگانهٔ مالک تغییر نمی‌کنند. rollback خودکار image پس از خطای سلامت وجود ندارد.

Node و npm میزبان برای این مسیر لازم نیستند؛ Docker از lockfile داخل `web/` استفاده می‌کند. ابزارهای Docker Engine، افزونهٔ Compose با پشتیبانی `--wait` و JSON config، Python 3، unzip و sha256sum باید روی سرور موجود باشند. ساخت به منابع کافی و دسترسی registry نیاز دارد.

## بررسی پس از آپدیت و خطایابی

```bash
cd /var/www/makanapp/app
sudo docker compose --env-file web/.env.docker -p makan-client -f web/compose.yaml ps web
sudo docker compose --env-file web/.env.docker -p makan-client -f web/compose.yaml logs --tail=100 web
curl -fsS http://127.0.0.1:8080/enter -o /dev/null
curl -fsS https://app.makanapp.org/enter -o /dev/null
```

سپس صفحه را تازه کنید و ورود، پیام‌ها و فوق‌برنامه را با حساب خود بررسی کنید. خطای `SESSION_SECRET` یا Origin در پیش‌بررسی باید پیش از تعویض کانتینر اصلاح شود. خطای build به معنی نیاز به بررسی لاگ ساخت است؛ فقط دو فایل sh و md را به‌جای بستهٔ کامل آپلود نکنید. برای به‌روزرسانی از حذف volume یا تولید دوبارهٔ کلید استفاده نکنید.

اگر Nginx نصب قدیمی فایل‌های بیش از ۱ مگابایت را با `413` رد می‌کند، در بلوک همین سایت مقدار زیر را تنظیم کنید. قالب نصب تازه این تنظیم و زمان انتظار SignalR را دارد، اما `--update` عمداً تنظیم Nginx موجود را بازنویسی نمی‌کند:

```nginx
client_max_body_size 12m;
```

پس از ویرایش، فقط با موفقیت بررسی reload کنید:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## نصب اولیه روی سرور تازه

برای سروری که همین حالا برنامه دارد، بخش آپدیت کافی است. برای نصب تازه:

1. DNS دامنهٔ `app.makanapp.org` را به IP واقعی همین سرور متصل کنید و دسترسی پورت‌های ۸۰/۴۴۳ را برقرار کنید. Docker Engine/Compose و Python 3 را نصب کنید؛ `--install` نصب‌کنندهٔ Docker نیست.
2. ZIP را در `/var/www/makanapp/app` باز کنید.
3. تنظیمات تازه را با بلوک زیر بسازید. اگر فایل محیطی وجود داشته باشد، بدون تغییر حفظ می‌شود و هیچ کلیدی چاپ نمی‌شود.

```bash
cd /var/www/makanapp/app
sudo python3 - <<'PYCODE'
from pathlib import Path
import os
import secrets

path = Path('web/.env.docker')
if path.exists():
    print('فایل محیطی موجود حفظ شد.')
else:
    text = Path('web/.env.docker.example').read_text()
    if text.count('SESSION_SECRET=\n') != 1:
        raise SystemExit('فایل نمونهٔ تنظیمات معتبر نیست.')
    text = text.replace('SESSION_SECRET=\n', 'SESSION_SECRET=' + secrets.token_hex(32) + '\n', 1)
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(text)
    print('فایل محیطی و کلید نشست ساخته شدند؛ کلید چاپ نشد.')
PYCODE
sudo bash setup.sh --install
sudo bash setup.sh --check
sudo bash setup.sh --update
```

`--install` برای همین دامنه، Nginx/UFW/TLS را آماده می‌کند و در صورت وجود تنظیم Nginx ماکان، آن را بازنویسی نمی‌کند. قانون SSH آن `OpenSSH` است؛ اگر SSH شما پورت دیگری دارد، پیش از فعال‌کردن فایروال دسترسی همان پورت را برقرار کنید. اجرای این حالت به‌تنهایی برنامه را deploy نمی‌کند؛ دستور `--update` مرحلهٔ ساخت و اجرای برنامه است. سرور نصب‌شده دوباره به `--install` نیاز ندارد.

## شواهد نسخه و حدود بررسی

رابط/API این نسخه ۴۴۷ آزمون واحد و آخرین نتیجهٔ موفق ۲۰۹ سناریوی مرورگر دارد؛ [گزارش اتصال](web/docs/RELEASE_80C_INTEGRATION_FA.md). نتیجهٔ بررسی اختصاصی راه‌اندازی، بسته و ساخت مستقل در `web/docs/quality/DEPLOYMENT_80C_CHECKS.json` ثبت شده است. استقرار سرور مقصد یا گرفتن گواهی TLS از محیط توسعه اجرا نشده است؛ دستورهای بالا برای اجرای خود شما روی سرور هستند.
