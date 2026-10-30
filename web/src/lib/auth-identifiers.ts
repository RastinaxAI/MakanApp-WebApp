import { latinDigits } from './formatting';

export const phoneInputMessage = 'شماره همراه باید ۱۱ رقم باشد و با ۰۹ شروع شود.';
export const otpInputMessage = 'کد ورود باید دقیقاً ۶ رقم باشد.';
export const normalizeAuthDigits = (value: string) => latinDigits(value).replace(/[\s-]/g, '');
export const validLoginPhone = (value: string) => /^09\d{9}$/.test(normalizeAuthDigits(value));
export const validLoginOtp = (value: string) => /^\d{6}$/.test(normalizeAuthDigits(value));
