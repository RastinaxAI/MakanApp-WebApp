# استقرار نسخهٔ آبی V3 و قرارداد 80c2e61

راهنمای معتبر نصب موجود و نصب تازه در [readme.md ریشه](../../readme.md) است. فایل‌های `setup.sh` و `web/` را از بستهٔ جدید با هم منتقل کنید.

```bash
sudo bash setup.sh --check
sudo bash setup.sh --update
```

پروژهٔ Compose ثابت `makan-client`، سرویس منفرد `web` و volume `makan-client_sessions` حفظ می‌شوند. کلید و فایل خصوصی موجود بازنویسی نمی‌شوند. مقدار غیرخالی `BACKEND_BASE_URL` در env بر `config/network.json` تقدم دارد؛ مقدار خالی اکنون در شروع Docker هم درست پشتیبانی می‌شود. پیش‌فرض بسته بک‌اند تست۸۰۹۰ است؛ origin فرانت‌اند HTTPS دامنهٔ خود برنامه است.

Docker context شامل تنظیمات شبکه، prebuild برند، کاتالوگ متن، فونت‌ها، قرارداد تولیدشده و manifest لازم مرجع است. private env، session، node_modules میزبان و نتایج مرورگر وارد image نمی‌شوند. پردازهٔ واحد standalone با uid1000 و volume نشست پایدار اجرا می‌شود؛ چند replica با همین فایل‌سیستم محلی پشتیبانی‌شده نیستند. تاریخ‌ها در API UTC و ورودی/نمایش جلالی در رابط هستند.

قالب Nginx نصب تازه سقف۱۲MiB و proxy_read_timeout=120s دارد؛ حالت آپدیت Nginx قدیمی را تغییر نمی‌دهد. پیام سلامت فقط دربارهٔ HTTP برنامه است؛ DB/ACL، پرداخت، AI و Push نیازمند وضعیت معتبر بک‌اند هستند. پنل مالک و Vite بازنشسته وارد استقرار کلاینت نمی‌شوند.

شواهد اختصاصی و محدودیت Docker در [DEPLOYMENT_80C_CHECKS.json](quality/DEPLOYMENT_80C_CHECKS.json)، جزئیات برنامه در [گزارش اتصال](RELEASE_80C_INTEGRATION_FA.md) و تاریخچه در [PROGRESS.md](PROGRESS.md) است.
