'use client';
import Link from '@/components/ui/app-link';
import { roleLabels } from '@/config/navigation';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { AlertCircle, Inbox, LockKeyhole, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './button';
export function LoadingSkeleton() {
  return (
    <div className="skeleton-wrap" role="status" aria-label="در حال دریافت اطلاعات">
      <div className="skeleton h-12" />
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className="skeleton h-16" />
      ))}
    </div>
  );
}
export function EmptyState({
  title = 'موردی پیدا نشد',
  description = 'فیلترها را تغییر دهید یا بعداً دوباره بررسی کنید.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="state">
      <Inbox />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const err = error instanceof ApiError ? error : new ApiError(503);
  const [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const at = err.problem.retryAfter ? Date.now() + err.problem.retryAfter * 1000 : 0;
    setRetryAt(at);
    if (at <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [error]);
  const Icon =
    err.status === 403 ? LockKeyhole : err.problem.code === 'NETWORK_ERROR' ? WifiOff : AlertCircle;
  return (
    <div className="state error-state" role="alert">
      <Icon />
      <h3>
        {err.status === 403
          ? 'دسترسی محدود است'
          : err.status === 401
            ? 'ورود مجدد لازم است'
            : 'اطلاعات دریافت نشد'}
      </h3>
      <p>{err.message}</p>
      {err.problem.code === 'PERMISSION_MAPPING_UNVERIFIED' && (
        <p>نگاشت مجوز این عملیات هنوز توسط تیم Backend تأیید نشده است.</p>
      )}
      {err.problem.retryAfter && <p>زمان انتظار: {err.problem.retryAfter} ثانیه</p>}
      {err.problem.traceId && <small dir="ltr">شناسه پیگیری: {err.problem.traceId}</small>}
      {err.status === 401 ? (
        <Button asChild>
          <Link href="/enter">ورود به حساب</Link>
        </Button>
      ) : (
        onRetry &&
        err.status !== 403 && (
          <Button variant="outline" disabled={now < retryAt} onClick={onRetry}>
            <RefreshCw size={16} />
            دریافت دوباره
          </Button>
        )
      )}
    </div>
  );
}
const statuses: Record<string, string> = {
  Active: 'فعال',
  Suspended: 'معلق',
  Inactive: 'غیرفعال',
  Ended: 'پایان‌یافته',
  Pending: 'در انتظار',
  Accepted: 'پذیرفته‌شده',
  Declined: 'ردشده',
  Completed: 'تکمیل‌شده',
  Withdrawn: 'انصراف از کلاس',
  NeedsAttention: 'نیازمند رسیدگی',
  Requested: 'درخواست ثبت‌شده',
  OrganizationCreated: 'سازمان ساخته شد',
  SubscriptionAssigned: 'اشتراک تخصیص یافت',
  ManagerInvitationCreated: 'دعوت مدیر ایجاد شد',
  Published: 'منتشرشده',
  Draft: 'پیش‌نویس',
  Submitted: 'تحویل‌شده',
  InProgress: 'در حال انجام',
  Finalized: 'ثبت نهایی‌شده',
  Closed: 'بسته‌شده',
  Archived: 'بایگانی‌شده',
  Descriptive: 'تشریحی',
  ObjectiveSingleChoice: 'چهارگزینه‌ای',
  Revoked: 'لغوشده',
  Expired: 'منقضی',
  PendingPayment: 'در انتظار پرداخت',
  NotStarted: 'شروع نشده',
  SubscriptionActivationPending: 'در انتظار فعال‌سازی اشتراک',
  SubscriptionActivated: 'اشتراک فعال شد',
  ProvisioningPending: 'در انتظار ارائهٔ خدمت',
  Paid: 'پرداخت‌شده',
  Failed: 'ناموفق',
  Open: 'باز',
  InReview: 'در حال بررسی',
  Resolved: 'رسیدگی‌شده',
  Dismissed: 'ردشده',
  ...roleLabels,
  Personal: 'شخصی',
  Organization: 'سازمانی',
  Direct: 'مستقیم',
  Group: 'گروه',
  Channel: 'کانال',
  Scheduled: 'برنامه‌ریزی‌شده',
  Cancelled: 'لغوشده',
  Present: 'حاضر',
  Absent: 'غایب',
  Late: 'با تأخیر',
  Excused: 'موجه',
};
export function label(value: string) {
  return statuses[value] ?? value;
}
export function StatusBadge({ value }: { value: unknown }) {
  const text = String(value ?? 'نامشخص');
  const tone = ['Active', 'Completed', 'Published', 'Paid', 'Resolved', 'Present'].includes(text)
    ? 'success'
    : ['Suspended', 'Failed', 'Revoked', 'Cancelled', 'Absent'].includes(text)
      ? 'danger'
      : ['Pending', 'NeedsAttention', 'Open', 'InReview', 'Requested', 'Late'].includes(text)
        ? 'warning'
        : 'neutral';
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {label(text)}
    </span>
  );
}
export function UpdatedAt({ at }: { at: number }) {
  return at > 0 ? (
    <span className="updated">آخرین دریافت موفق: {date(new Date(at).toISOString(), true)}</span>
  ) : null;
}
