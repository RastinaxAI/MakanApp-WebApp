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

در فایل تنظیمات، `APP_ORIGIN=https://app.makanapp.org` و `COOKIE_SECURE=true` قرار دهید. یک مقدار تصادفی محرمانه برای `SESSION_SECRET` و نشانی درست سرویس موردنیاز برنامه برای `BACKEND_BASE_URL` تنظیم کنید. مقدار `MAKAN_PORT` باید `8080` باشد تا با Nginx هماهنگ بماند.

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
