# معماری و ادامهٔ توسعه

App Router و استک فعلی حفظ شدند؛ framework و ابزار تست تازه اضافه نشد. React Query، Radix، Zod، Vitest و Playwright موجود به کار رفتند. PDF/ZIP مرجع طراحی‌اند؛ backend و Expo در مخزن در دسترس نیستند.

| لایه | مسئولیت |
| --- | --- |
| `src/app` | route/layout و ورودی BFF؛ feature محل رفتار محصول است |
| `src/config/navigation.ts` | چهار مقصد، نقش، مسیرهای فرایند و اعتبار catch-all |
| `src/features/auth` | OTP، فرم و خطای ورود |
| `personal/provider.tsx` | نشست، QueryClient، generation/context guard و تغییر workspace |
| `personal/shell.*` | پوستهٔ سه‌اندازه‌ای و انتخاب زمینه |
| `messaging/messenger.tsx` | inbox و فیلتر/صفحه‌بندی |
| `messaging/conversation-room.tsx` | پیام‌های گفت‌وگو؛ media و queue مدل‌های جدا دارند |
| `messaging/contacts.tsx` / `privacy.tsx` | دفترچه، کشف حساب؛ حریم خصوصی و Block جدا |
| `school/exams.tsx` / `exam-taking.tsx` | نویسندگی آزمون جدا از تلاش دانشجو |
| `school/submission-model.ts` / `submission-flow.tsx` | قواعد خالص و فرایند پاسخ، بازبینی و رسید |
| `school/lessons.tsx` | ایجاد/ویرایش/بازبینی مستقل درس و فایل مجاز |
| `components/ui` / `components/hooks` | کنترل عمومی، فرم، draft و محافظ خروج؛ بدون وابستگی به feature |
| `lib/api` | request، contract، خطا و انتقال فایل قابل لغو |
| `lib/server` | نشست HttpOnly، قفل، allowlist، مجوز/زمینه و حذف دادهٔ نامجاز |
| `contracts` / `generated/api` | snapshot سند کامل؛ SDK اجرایی محدود کلاینت و یک registry |
| `design` / `scripts/build-design.mjs` | source طراحی، مولد tokens/prototype/نگاشت پوشش |
| `tests/unit` / `browser` / `fixtures` | منطق و BFF، رفتار مرورگر، سرویس نمونهٔ loopback |

تفکیک بر اساس مسئولیت انجام شد؛ همهٔ توابع به فایل مصنوعی منتقل نشدند. فایل‌های مدیر و برخی فرم‌های قدیمی برای مهاجرت مرحله‌ای باقی‌اند. lint، importهای ایستا را برای چرخه و وابستگی lib/UI عمومی به feature کنترل می‌کند؛ تحلیل کامل runtime ادعا نمی‌شود.

## نشست و cache

کلید دادهٔ شخصی `['personal',userId,revision,path]` است. تغییر workspace داده و درخواست قبلی را پاک/لغو می‌کند و guard پاسخ دیررس را رد می‌کند. BroadcastChannel تغییر نشست را منتشر می‌کند. برگشت به تب همان هویت/revision را در پس‌زمینه تأیید می‌کند؛ فرم همان زمینه دوباره mount نمی‌شود. هویت/revision متفاوت همچنان tree/cache قبلی را کنار می‌گذارد. انقضای نشست داده را پاک می‌کند.

پاسخ معتبر ویرایش درس قبل از رفتن به بازبینی در cache جزئیات نوشته و درخواست قبلی لغو می‌شود؛ انتشار version کهنه نمی‌خواند. عنوان نقش/پلن منبع مجوز نیست.

## فرایند و پیش‌نویس

S09 ذخیرهٔ draft → S17 بازبینی persisted content → POST نهایی با rowVersion → S10 فقط با Submitted معتبر. ref جلوی عملیات هم‌زمان را می‌گیرد؛ شکست شبکه receipt نمی‌سازد. پاسخ گم‌شده فقط با خواندن حالت معتبر سرور reconcile می‌شود؛ idempotency فرضی به API اضافه نشد.

draft متنی با user/context/attempt در sessionStorage ذخیره و در logout موفق پاک می‌شود. فرم درس و پروفایل هنگام خطای save در حافظه حفظ می‌شوند و خروج لینک/بستن صفحه هشدار دارد؛ ذخیرهٔ دائمی آن دو ادعا نمی‌شود. crash، browser back و تغییر حساب ضمانت حفظ همهٔ فرم‌ها ندارند. upload پاسخ تکلیف در جریان جدید هنوز کامل نیست.

## مرز داده و آزمون

اجرای عادی از BFF به سرور تنظیم‌شده می‌رود. fixture فقط loopback و مسیرهای مشخص دارد؛ مسیر ناشناخته404 است. prototype مستقل هیچ API واقعی ندارد. unavailable با mock موفق پوشانده نمی‌شود. Parent/Manager در fixture و BFF به چت خصوصی دیگری دسترسی ندارند؛ این نتیجه ممیزی دیتابیس یا backend واقعی نیست. دادهٔ خصوصی ارزیاب از پاسخ دانشجو حذف و در DOM نمایش داده نمی‌شود.

## تولید و نگهداشت

lockfile منبع نصب است؛ generated:check خروجی را بدون نوشتن تأیید می‌کند. رنگ‌های مشترک prototype و محصول از tokens.json ساخته می‌شوند. همهٔ۱۳۰صفحه در SCREEN_COVERAGE وضعیت جدا دارند. ابزارهای تاریخی سرور/گزارش به source غیرقابل اجرا منتقل شده‌اند تا شواهد تاریخ‌دار را بازنویسی نکنند. CSS دینامیک بدون اثبات نگه داشته شد؛ pruning بخشی از CI نیست و audit/backup نگه می‌دارد. چرخهٔ معمول: contract/model → adapter/BFF → fixture → UI → تست رفتاری → نگاشت و مستندات.
