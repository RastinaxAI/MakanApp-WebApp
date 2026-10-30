# ماکان — کلاینت وب

تنها اپلیکیشن فعال این مخزن، Next.js/React در `web/` است. نسخهٔ Vite قدیمی از پروژه و مسیر اجرا کنار گذاشته شده است. حساب شخصی، دانشجو، استاد، والد و مدیر آموزشگاه پنج نقش این کلاینت‌اند؛ پنل مالک پروژهٔ جداگانه است.

## اجرای Docker

تنظیمات محلی و کلید نشست در `web/.env.docker` قرار دارند و وارد Git یا image نمی‌شوند. در نصب تازه، فایل نمونهٔ `web/.env.docker.example` را کپی و کلید تصادفی ۶۴کاراکتری hex تولید کنید. فایل تنظیمات موجود را بازنویسی نکنید.

از همین پوشه:

```powershell
docker compose up -d --build --wait --wait-timeout 180
```

آدرس نسخهٔ جدید: http://127.0.0.1:8080/enter

```powershell
docker compose ps
docker compose logs -f --tail 100 web
docker compose down
```

دستور down، volume نشست‌ها را حفظ می‌کند. پورت و APP_ORIGIN در فایل تنظیمات باید با آدرس مرورگر یکسان باشند. راهنمای تفصیلی: [Docker](web/docs/docker.md).

## توسعه و بررسی

```powershell
npm --prefix web ci
npm run dev
npm run quality
```

پیش‌نمایش Node روی3130 و Docker روی8080 است. سورس و مستندات محصول در `web/src` و `web/docs` قرار دارند. راهنمای نصب و نتیجهٔ بررسی‌ها در [README کلاینت](web/README.md) و [PROGRESS](web/docs/PROGRESS.md) ثبت می‌شوند.

پوشه‌های طبقه‌بندی‌نشدهٔ `packages/toolkit` و `.freebuff` و فایل `malikam_excel.json` به‌دلیل نامشخص‌بودن ارتباطشان با کارهای دیگر حفظ شدند. سابقهٔ Git بازنویسی نشده است. آرشیو نسخهٔ قبلی خارج از پروژه نگهداری می‌شود؛ مسیر و فهرست آن در `web/docs/quality/LEGACY_RETIREMENT_MANIFEST.json` ثبت شده است.
