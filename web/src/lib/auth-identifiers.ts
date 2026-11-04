import * as uiText from '@/content/fa';
import { latinDigits } from './formatting';

export const phoneInputMessage = uiText.text_5d42ae33c835;
export const otpInputMessage = uiText.text_551172e4a77d;
export const normalizeAuthDigits = (value: string) => latinDigits(value).replace(/[\s-]/g, '');
export const validLoginPhone = (value: string) => /^09\d{9}$/.test(normalizeAuthDigits(value));
export const validLoginOtp = (value: string) => /^\d{6}$/.test(normalizeAuthDigits(value));
