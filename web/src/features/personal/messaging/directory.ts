import type { components } from '@/generated/api/schema';
import { latinDigits } from '@/lib/formatting';
export function resolvePersonInput(input: string): components['schemas']['ResolvePersonCommand'] {
  const value = latinDigits(input).trim();
  if (/^[+\d\s()-]+$/.test(value)) {
    let phone = value.replace(/[\s()-]/g, '');
    if (/^09\d{9}$/.test(phone)) phone = '+98' + phone.slice(1);
    if (!/^\+989\d{9}$/.test(phone)) throw new Error('شمارهٔ همراه معتبر وارد کنید.');
    return { username: null, phoneNumber: phone };
  }
  const username = value.replace(/^@/, '');
  if (!/^[a-zA-Z0-9._]{3,32}$/.test(username)) throw new Error('نام کاربری معتبر وارد کنید.');
  return { username, phoneNumber: null };
}
