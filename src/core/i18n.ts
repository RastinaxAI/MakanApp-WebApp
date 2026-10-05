/**
 * UI strings. Persian is the source text (keys are the fa strings), so an
 * untranslated string degrades to readable Persian instead of a raw key.
 */

import type { Locale } from './format';

type Dict = Record<string, string>;

const en: Dict = {
  'آموزشگاه': 'Academy',
  'پیام‌رسان': 'Messenger',
  'دستیار': 'Assistant',
  'پروفایل': 'Profile',
  'امروز من': 'My day',
  'برنامه': 'Schedule',
  'کلاس‌ها': 'Classes',
  'تکالیف': 'Assignments',
  'آزمون‌ها': 'Exams',
  'منابع': 'Resources',
  'پیام‌رسان و گفتگو': 'Chats',
  'ادامه': 'Continue',
  'مشاهده': 'View',
  'بستن': 'Close',
  'ذخیره': 'Save',
  'لغو': 'Cancel',
  'تأیید': 'Confirm',
  'ارسال': 'Send',
  'جست‌وجو': 'Search',
  'داشبورد': 'Dashboard',
  'گزارش': 'Report',
  'دانش‌آموز': 'Student',
  'معلم': 'Teacher',
  'مدیر آموزشگاه': 'Academy manager',
  'والد': 'Guardian',
  'ادمین': 'Admin',
  'فضای شخصی': 'Personal space',
  'خروج': 'Sign out',
  'تنظیمات': 'Settings',
  'امور مالی': 'Billing',
  'پشتیبانی': 'Support',
  'نصب برنامه': 'Install app',
  'نصب‌شده': 'Installed',
  'در حال بارگذاری…': 'Loading…',
  'امروز': 'Today',
  'فردا': 'Tomorrow',
  'دیروز': 'Yesterday',
  'همه': 'All',
  'بیشتر': 'More',
  'کمتر': 'Less',
  'بدون داده': 'No data',
  'خطا': 'Error',
  'تلاش دوباره': 'Retry',
  'زبان و ظاهر': 'Language & appearance',
  'حالت روشن': 'Light',
  'حالت تیره': 'Dark',
  'خودکار': 'System',
  'نمایش نقش آزمایشی': 'Demo role switcher',
  'ساختگی': 'Demo data',
  'این نسخه با داده ساختگی کار می‌کند': 'This build runs on mock data',
};

const ar: Dict = {
  'آموزشگاه': 'المدرسة',
  'پیام‌رسان': 'المراسلة',
  'دستیار': 'المساعد',
  'پروفایل': 'الملف الشخصي',
  'امروز من': 'يوم',
  'برنامه': 'الجدول',
  'کلاس‌ها': 'الأصناف',
  'تکالیف': 'الواجبات',
  'آزمون‌ها': 'الاختبارات',
  'منابع': 'المراجع',
  'ادامه': 'متابعة',
  'مشاهده': 'عرض',
  'بستن': 'إغلاق',
  'ذخیره': 'حفظ',
  'لغو': 'إلغاء',
  'تأیید': 'تأكيد',
  'ارسال': 'إرسال',
  'جست‌وجو': 'بحث',
  'خروج': 'تسجيل الخروج',
  'تنظیمات': 'الإعدادات',
  'نصب برنامه': 'تثبيت التطبيق',
  'در حال بارگذاری…': 'جارٍ التحميل…',
};

const DICTS: Record<Locale, Dict> = { fa: {}, ar, en };

export function t(text: string, vars?: Record<string, string | number>): string {
  const locale = currentLocale;
  let out = locale === 'fa' ? text : (DICTS[locale][text] ?? text);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

let currentLocale: Locale = 'fa';

export function setUiLocale(locale: Locale): void {
  currentLocale = locale;
}

export const LOCALES: { id: Locale; label: string; dir: 'rtl' | 'ltr' }[] = [
  { id: 'fa', label: 'فارسی', dir: 'rtl' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
  { id: 'en', label: 'English', dir: 'ltr' },
];