import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export const quotaLabels: Record<S['QuotaKey'], string> = {
  ActiveLearners: 'دانش‌آموزان فعال',
  ActiveClasses: 'کلاس‌های فعال',
  StorageBytes: 'فضای ذخیره‌سازی',
  ReportExports: 'خروجی گزارش',
  AiTextRequests: 'درخواست‌های هوش مصنوعی',
  SourceCount: 'منابع',
  AssignmentFileBytes: 'حجم فایل تکلیف',
};
export const subscriptionLabels: Record<S['SubscriptionDisplayState'], string> = {
  NoSubscription: 'بدون اشتراک',
  PendingPayment: 'در انتظار پرداخت',
  Active: 'فعال',
  QuotaWarning: 'نزدیک سقف مصرف',
  QuotaExceeded: 'سهمیه تمام شده',
  GracePeriod: 'مهلت تمدید',
  Expired: 'منقضی',
  ScheduledDowngrade: 'تغییر پلن برنامه‌ریزی‌شده',
  LegacyPendingContract: 'در انتظار تکمیل قرارداد قبلی',
};
export function quotaRemaining(q: S['CommercialQuotaDto']) {
  if (q.isUnlimited === true) return 'نامحدود';
  if (q.isUsageAvailable !== true || q.remaining === null) return 'هنوز گزارش نشده';
  return q.remaining.toLocaleString('fa-IR') + ' ' + q.unit;
}
export function summaryMatches(
  s: S['CommercialSummaryDto'],
  owner: 'Individual' | 'Organization',
  id: string | null,
) {
  return s.ownerType === owner && !!id && s.ownerId === id;
}
