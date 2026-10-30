# ساخت راهنمای تصویری کاربران

متن معتبر راهنما `content.json` است. HTML و PDF از همان متن و تصاویر یکسان تولید می‌شوند؛ خروجی‌ها را دستی و جداگانه ویرایش نکنید. فونت از بستهٔ موجود Vazirmatn و تصاویر از رابط واقعی کد پروژه با دادهٔ ساختگی محلی می‌آیند. مجوز فونت در `design/Vazirmatn-LICENSE.txt` محفوظ است.

## پیش‌نیازهای اختیاری

این ابزار به runtime برنامه وابستگی تازه اضافه نمی‌کند. علاوه بر Node و وابستگی‌های وب، برای ساخت سند Python۳.۱۱یاجدیدتر و بسته‌های `scripts/panel-guide-requirements.txt` لازم است. از Python محیط مجازی یا Python مناسب خودتان استفاده کنید:

```powershell
cd web
python -m venv .venv-guide
.venv-guide/Scripts/python -m pip install -r scripts/panel-guide-requirements.txt
npm ci
npx playwright install chromium
```

پوشهٔ `.venv-guide` را به Git اضافه نکنید. نصب بسته‌ها به اینترنت نیاز دارد. در سیستم سازنده، بسته‌های اختیاری داخل `tmp/pdf-deps` نصب شدند؛ این مسیر فقط یک گزینهٔ محلی و قابل حذف است و برای کار برنامه لازم نیست.

## گرفتن تصاویر از سورس فعلی

اگر build موجود نیست یا کد UI عوض شده است، ابتدا `npm run build` را اجرا کنید. سپس:

```powershell
npx playwright test --config playwright.guide.config.ts
```

این پیکربندی مستندسازی از تست‌های عادی جداست؛ از fixture پروژه، سرویس محلی۳۴۵۷ و کلاینت۳۱۳۲ استفاده می‌کند و شبکهٔ بیرونی در مرورگر مسدود است. حساب‌ها و دعوت نمونه محلی‌اند و هیچ عملیات آموزشی، پیام یا پذیرش دعوت روی سرور واقعی انجام نمی‌شود. عکس‌ها در `docs/user-guide/images` و فهرست آن‌ها در `captures.json` ساخته می‌شوند. کد ورود واقعی، کوکی یا توکن در تصاویر و گزارش قرار نمی‌گیرد.

## تولید HTML و PDF

```powershell
.venv-guide/Scripts/python scripts/create-panel-guide.py
```

خروجی‌ها:

- `docs/user-guide/index.html`: راهنمای راست‌چین در مرورگر؛ پوشهٔ images باید کنارش بماند.
- `output/pdf/MakanApp_Panel_User_Guide_FA.pdf`: فایل مستقل برای ارسال به استفاده‌کنندهٔ پنل.
- `tmp/pdfs/panel-guide/layout.json`: بررسی هندسی جای متن و یادداشت صفحه.

PDF با ReportLab، فونت تعبیه‌شده و شکل‌دهی حروف فارسی ساخته می‌شود. عنوان‌ها و نشانک‌های فصل‌ها در PDF ثبت می‌شوند. برای تغییر متن، فقط `content.json` را ویرایش و خروجی‌ها را دوباره بسازید. برای تغییر تصویر، مسیر مربوط را در capture اصلاح و دوباره اجرا کنید. پیکربندی capture وارد مجموعهٔ عادی مرورگر و مسیر اجرای محصول نمی‌شود.

## بازبینی الزامی پیش از ارسال

PDF را با Poppler به PNG تبدیل کنید و همهٔ صفحه‌ها را ببینید؛ سالم‌بودن استخراج متن به‌تنهایی کافی نیست:

```powershell
pdftoppm -png -scale-to 1600 output/pdf/MakanApp_Panel_User_Guide_FA.pdf tmp/pdfs/panel-guide/page
pdfinfo output/pdf/MakanApp_Panel_User_Guide_FA.pdf
```

در این سیستم Poppler در runtime اسناد موجود بود؛ در نصب تازه باید ابزارهای Poppler در PATH باشند. خوانایی فارسی، نبود بریدگی و هم‌پوشانی، وضعیت دکمه‌های تصویر، مسیرهای واقعی و وضعیت فعلی سرویس دستیار را بررسی کنید. پس از هر تغییر معنادار PDF را دوباره render کنید. تصاویر نمونه را اثبات اتصال واقعی بک‌اند یا فعال‌بودن همهٔ قابلیت‌ها معرفی نکنید.
