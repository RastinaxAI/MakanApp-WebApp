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
sudo ./setup.sh
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

در فایل تنظیمات، `APP_ORIGIN=https://app.makanapp.org` و `COOKIE_SECURE=true` قرار دهید. نشانی درست سرویس موردنیاز برنامه را برای `BACKEND_BASE_URL` تنظیم کنید. مقدار `MAKAN_PORT` باید `8080` باشد تا با Nginx هماهنگ بماند.

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
sudo docker compose up -d --build --wait --wait-timeout 180
sudo docker compose ps
```

برای بررسی خطاها:

```bash
sudo docker compose logs --tail=100 web
```

برای به‌روزرسانی، فایل‌های پروژه را در همان مسیر جایگزین و دستور `sudo docker compose up -d --build --wait --wait-timeout 180` را دوباره اجرا کنید. فایل تنظیمات و volume نشست Docker را حفظ کنید.
