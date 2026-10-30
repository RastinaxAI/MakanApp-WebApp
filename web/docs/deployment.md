# استقرار کلاینت پنج‌نقشی

مرجع این کلاینت، پوشهٔ web در Makan Application است. MakanManagement را برای کار کلاینت بازنویسی نکنید. فرد عادی یعنی Personal context بدون نقش آموزشی؛ فقط Student/Teacher/Parent/Manager از workspace معتبر پذیرفته می‌شوند.

- Browser → Next.js در انتشار باید HTTPS باشد. APP_ORIGIN دقیق و COOKIE_SECURE=true تنظیم شوند.
- Next.js → Backend از BACKEND_BASE_URL محیط صحیح استفاده می‌کند؛ launcher محلی QA عمداً به8090 می‌رود. خطای API باعث انتقال خودکار به سرور دیگر یا موفقیت ساختگی نمی‌شود.
- کلید SESSION_SECRET مستقل و64 رقمی hex تصادفی است. cookie تصادفی HttpOnly و SameSite=Strict است و توکن‌ها فقط در نشست رمزگذاری‌شدهٔ سرور نگهداری می‌شوند.
- این نسخه با یک process Node و پوشهٔ پایدار نشست کار می‌کند؛ چند replica بدون session store مشترک، پشتیبانی‌شده اعلام نشود.
- APIهای فعال فقط /api/client هستند؛ احراز هویت، فایل و SignalR مسیرهای اختصاصی دارند. backend مرجع مجوز هر منبع، حریم خصوصی، سن، Block و سهمیه است.
- تاریخ جلالی فقط نمایش/ورودی است؛ تاریخ بدون ساعت برای API به YYYY-MM-DD تبدیل می‌شود. timestamp جلسه/تکلیف/آزمون با timezone محلی به UTC تبدیل می‌شود.
- کلاس و عضویت، داده‌های شخصی و نقش مدیریتی گفت‌وگو مستقل‌اند. خروج از یک زمینه نباید دادهٔ زمینهٔ قبلی را قابل نمایش یا استفاده نگه دارد.

راهنمای Docker در [docker.md](docker.md)، وضعیت بررسی در [PROGRESS.md](PROGRESS.md) و قراردادهای آماده‌نشده در [API_GAPS.md](API_GAPS.md) هستند.
