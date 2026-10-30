import { ApiError } from './api/errors';

export function loginFailureMessage(error: ApiError, verifying: boolean) {
  // An unstructured 404 from the app/server is not evidence that the phone/account is absent.
  if (error.status === 404 && !error.problem.code)
    return verifying
      ? 'ورود فعلاً ممکن نیست. سرویس ورود در دسترس نیست؛ کمی بعد دوباره تلاش کنید.'
      : 'دریافت کد ورود فعلاً ممکن نیست. سرویس ورود در دسترس نیست؛ کمی بعد دوباره تلاش کنید.';
  if (error.status !== 500 || (error.problem.code && error.problem.code !== 'UNEXPECTED_ERROR'))
    return error.message;
  return verifying
    ? 'ورود به‌دلیل خطای سرویس انجام نشد. کمی بعد دوباره تلاش کنید؛ اگر ادامه داشت، کد پیگیری را به پشتیبانی بدهید.'
    : 'سرویس دریافت کد ورود با خطا مواجه شد. کمی بعد دوباره تلاش کنید؛ اگر ادامه داشت، کد پیگیری را به پشتیبانی بدهید.';
}
