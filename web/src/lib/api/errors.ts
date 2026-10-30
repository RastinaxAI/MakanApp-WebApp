export type Problem = {
  status?: number;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  retryAfter?: number;
  retryable?: boolean;
  requiredAction?: 'KEEP_DRAFT_NO_AUTO_RETRY';
};
export const errorMessages: Record<number, string> = {
  400: 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.',
  401: 'نشست شما پایان یافته است. دوباره وارد شوید.',
  403: 'اجازه انجام این کار را ندارید.',
  404: 'این مورد در دسترس نیست.',
  409: 'وضعیت تغییر کرده یا با این اقدام تعارض دارد. اطلاعات تازه را بررسی کنید.',
  410: 'این دعوت یا منبع پایان یافته است.',
  412: 'اطلاعات توسط کاربر دیگری تغییر کرده است. نسخه تازه را بررسی کنید.',
  413: 'حجم فایل از حد مجاز سرویس بیشتر است. فایل کوچک‌تری انتخاب کنید.',
  415: 'این نوع فایل توسط سرویس پذیرفته نمی‌شود.',
  422: 'این اقدام با سیاست‌های سامانه سازگار نیست.',
  429: 'درخواست‌ها بیش از حد مجاز است. کمی صبر کنید.',
  502: 'ارتباط با سرویس برقرار نشد.',
  503: 'سرویس موقتاً در دسترس نیست.',
  504: 'زمان پاسخ‌گویی تمام شد. پیش از تکرار اقدام، نتیجه را بررسی کنید.',
};
const serviceMessages: Record<string, string> = {
  FILE_SIZE_MISMATCH: 'دریافت فایل کامل نشد. دوباره تلاش کنید.',
  FILE_TRANSFER_UNAVAILABLE: 'انتقال فایل انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.',
  OTP_SERVICE_UNAVAILABLE:
    'سرویس ارسال کد ورود موقتاً در دسترس نیست. کمی بعد دوباره «دریافت کد ورود» را بزنید.',
  OTP_REQUEST_TIMEOUT:
    'پاسخ سرویس ارسال کد ورود طول کشید. اگر کدی دریافت نکردید، کمی بعد دوباره درخواست بدهید.',
  OTP_RESPONSE_INVALID:
    'پاسخ سرویس ارسال کد ورود قابل پردازش نیست. کد پیگیری را برای پشتیبانی بفرستید.',
  CONTRACT_MISMATCH: 'پاسخ سرویس قابل پردازش نیست. کد پیگیری را برای پشتیبانی بفرستید.',
  UPSTREAM_UNAVAILABLE: 'ارتباط پنل با سرویس اصلی موقتاً قطع است. کمی بعد دوباره تلاش کنید.',
  NETWORK_ERROR: 'ارتباط مرورگر با پنل قطع شده است. اتصال را بررسی و دوباره تلاش کنید.',
};
const actionMessages: Record<string, string> = {
  FILE_EMPTY: 'فایل خالی است؛ فایل دیگری انتخاب کنید.',
  DIRECT_RECIPIENT_NOT_AVAILABLE:
    'این مخاطب در حال حاضر برای شروع گفت‌وگو در دسترس نیست. مخاطب دیگری را انتخاب کنید یا وضعیت ارتباطی حساب‌ها را از پشتیبانی پیگیری کنید.',
  CONVERSATION_NOT_FOUND:
    'این گفتگو در حساب یا فضای فعلی در دسترس نیست. به فهرست پیام‌ها برگردید و گفتگو را دوباره انتخاب کنید.',
  PROFILE_PHOTO_TYPE_NOT_ALLOWED: 'برای عکس پروفایل فقط فایل JPEG یا PNG انتخاب کنید.',
  PROFILE_VALIDATION_FAILED:
    'اطلاعات پروفایل معتبر نیست. تاریخ تولد و فیلدهای مشخص‌شده را بررسی کنید.',
  ORGANIZATION_WORKSPACE_REQUIRED:
    'برای این فعالیت، آموزشگاه و نقش آموزشی خود را از انتخاب فضای کار مشخص کنید.',
  MESSAGE_SAFETY_REVIEW_REQUIRED:
    'این پیام برای ارسال به بررسی ایمنی نیاز دارد. برای پیگیری با پشتیبانی تماس بگیرید.',
  FILE_TYPE_NOT_ALLOWED: 'سرویس این قالب فایل را نمی‌پذیرد. فایل دیگری انتخاب کنید.',
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: Problem = {},
  ) {
    super(
      (problem.code && actionMessages[problem.code]) ||
        (problem.code === 'PERSONAL_WORKSPACE_REQUIRED'
          ? 'برای این پیوست، از انتخاب فضای کار به فضای شخصی بروید.'
          : problem.code === 'ORIGIN_REJECTED'
            ? 'نشانی صفحه ورود با تنظیمات پنل یکسان نیست. صفحه را از نشانی اصلی پنل باز کنید.'
            : (status >= 500 && problem.code && serviceMessages[problem.code]) ||
              errorMessages[status] ||
              'دریافت اطلاعات با مشکل روبه‌رو شد.'),
    );
    this.name = 'ApiError';
  }
}
export function retryAfter(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds)
    ? Math.max(0, seconds)
    : Math.max(0, Math.ceil((Date.parse(value) - now) / 1000)) || undefined;
}
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
export function parseProblem(value: unknown, status: number, retry?: string | null): Problem {
  const p = isRecord(value) ? value : {};
  const errors: Record<string, string[]> = {};
  if (isRecord(p.errors))
    for (const [key, values] of Object.entries(p.errors))
      if (Array.isArray(values))
        errors[key] = values.filter((v): v is string => typeof v === 'string');
  return {
    status,
    code: typeof p.code === 'string' ? p.code : undefined,
    traceId: typeof p.traceId === 'string' ? p.traceId : undefined,
    errors,
    ...(typeof p.retryable === 'boolean' ? { retryable: p.retryable } : {}),
    ...(p.requiredAction === 'KEEP_DRAFT_NO_AUTO_RETRY'
      ? { requiredAction: p.requiredAction }
      : {}),
    retryAfter: retryAfter(retry ?? null),
  };
}
