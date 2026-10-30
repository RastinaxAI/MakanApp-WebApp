'use client';
import { isRecord } from '@/lib/api/errors';
import { date, number } from '@/lib/formatting';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, label, StatusBadge } from './states';
export const fieldLabels: Record<string, string> = {
  startDate: 'تاریخ شروع',
  endDate: 'تاریخ پایان',
  verifiedBirthDate: 'تاریخ تولد بررسی‌شده',
  classification: 'رده سن ارتباطی',
  verificationStatus: 'وضعیت بررسی',
  startUtc: 'شروع جلسه',
  endUtc: 'پایان جلسه',
  timeZoneId: 'منطقه زمانی',
  effectiveFrom: 'شروع اعتبار الگو',
  effectiveUntil: 'پایان اعتبار الگو',
  applyFromDate: 'اعمال از تاریخ',
  durationMinutes: 'مدت جلسه (دقیقه)',
  localStartTime: 'زمان محلی شروع',
  localDayOfWeek: 'روز هفته',
  finalStatus: 'وضعیت نهایی ثبت‌نام',
  correctionReason: 'دلیل اصلاح حضور',
  entries: 'ردیف‌های حضور',
  managers: 'مدیران',
  memberships: 'عضویت‌ها',
  administrativeHistory: 'سوابق مدیریتی',
  teachers: 'معلمان',
  revisions: 'اصلاحات حضور',
  id: 'شناسه',
  name: 'نام',
  displayName: 'نام نمایشی',
  title: 'عنوان',
  status: 'وضعیت',
  createdAtUtc: 'تاریخ ایجاد',
  updatedAtUtc: 'آخرین تغییر',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  organizationId: 'شناسه سازمان',
  userId: 'شناسه حساب کاربری',
  personId: 'شناسه شخص',
  organizationPersonId: 'شناسه پرونده سازمانی',
  membershipId: 'شناسه عضویت',
  enrollmentId: 'شناسه ثبت‌نام',
  classId: 'شناسه کلاس',
  academicPeriodId: 'شناسه دوره',
  courseId: 'شناسه درس',
  activeClassCount: 'کلاس فعال',
  enrolledLearnerCount: 'فراگیر ثبت‌نام‌شده',
  teacherCount: 'تعداد معلم',
  activeMemberCount: 'عضو فعال',
  activeManagerCount: 'مدیر فعال',
  totalCount: 'تعداد کل',
  activeCount: 'تعداد فعال',
  totalCapacity: 'ظرفیت کل',
  scheduled: 'برنامه‌ریزی‌شده',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
  total: 'مجموع',
  present: 'حاضر',
  absent: 'غایب',
  late: 'با تأخیر',
  excused: 'موجه',
  totalRecords: 'تعداد رکورد',
  totalAssignments: 'کل تکالیف',
  publishedAssignments: 'تکالیف منتشرشده',
  totalExams: 'کل آزمون‌ها',
  publishedExams: 'آزمون‌های منتشرشده',
  pendingCount: 'در انتظار',
  processingCount: 'در حال پردازش',
  deferredCount: 'به تعویق افتاده',
  failedCount: 'ناموفق',
  oldestQueuedAgeSeconds: 'عمر قدیمی‌ترین مورد در صف (ثانیه)',
  pushProviderAvailability: 'وضعیت سرویس Push',
  smsProviderAvailability: 'وضعیت سرویس پیامک',
  recentFailures: 'خطاهای اخیر',
  counts: 'تعداد پردازش‌ها',
  oldestPendingAtUtc: 'قدیمی‌ترین مورد در انتظار',
  dependencies: 'وابستگی‌ها',
  notifications: 'اعلان‌ها',
  jobs: 'پردازش‌ها',
  observedAtUtc: 'زمان مشاهده',
  aiIntegrationStatus: 'وضعیت اتصال AI',
  activeMembershipCount: 'عضویت فعال',
  activeSubscriptionCount: 'اشتراک فعال',
  pendingInvitationCount: 'دعوت در انتظار',
  pendingProvisioningCount: 'درخواست ایجاد در انتظار',
  lastMembershipCreatedAtUtc: 'آخرین ایجاد عضویت',
  lastClassCreatedAtUtc: 'آخرین ایجاد کلاس',
  lastAdministrativeActionAtUtc: 'آخرین اقدام مدیریتی',
  guardianUserId: 'شناسه حساب سرپرست',
  learnerOrganizationPersonId: 'شناسه پرونده فراگیر',
  validFromUtc: 'شروع اعتبار',
  endedAtUtc: 'تاریخ پایان',
  capacity: 'ظرفیت',
  courseTitle: 'درس',
  academicPeriodTitle: 'دوره آموزشی',
  isAccountLinked: 'حساب متصل است',
  canEditNames: 'امکان ویرایش نام',
  phoneNumber: 'شماره همراه',
  maskedPhone: 'شماره همراه',
  username: 'نام کاربری',
  mobileVerified: 'شماره تأییدشده',
  accountStatus: 'وضعیت حساب',
  suspendedAtUtc: 'تاریخ تعلیق',
  startsAtUtc: 'شروع',
  endsAtUtc: 'پایان',
  startAtUtc: 'شروع',
  endAtUtc: 'پایان',
  amount: 'مبلغ',
  currency: 'واحد پول',
  orderId: 'شناسه سفارش',
  planVersionId: 'شناسه نسخه پلن',
  purchaserUserId: 'شناسه خریدار',
  paidAtUtc: 'زمان پرداخت',
  cancelledAtUtc: 'زمان لغو',
  paymentAttempts: 'تلاش‌های پرداخت',
  payment: 'اطلاعات پرداخت',
  code: 'کد',
  key: 'کلید',
  value: 'مقدار',
  limit: 'سقف',
  currentUsage: 'مصرف فعلی',
  isOverQuota: 'عبور از سهمیه',
  usage: 'مصرف',
  planCode: 'کد پلن',
  planName: 'نام پلن',
  subscriptionId: 'شناسه اشتراک',
  versionNumber: 'شماره نسخه',
  version: 'نسخه',
  rowVersion: 'نسخه پرونده',
  personRowVersion: 'نسخه شخص',
  reason: 'دلیل',
  internalNote: 'یادداشت داخلی',
  action: 'اقدام',
  occurredAtUtc: 'زمان رویداد',
  result: 'نتیجه',
  targetType: 'نوع منبع',
  targetId: 'شناسه منبع',
  beforeSummary: 'خلاصه پیش از اقدام',
  afterSummary: 'خلاصه پس از اقدام',
  correlationId: 'شناسه پیگیری',
  actorUserId: 'شناسه عامل',
  actorPersonId: 'شناسه شخص عامل',
  actorSessionId: 'شناسه نشست عامل',
  sessionId: 'شناسه نشست',
  expiresAtUtc: 'انقضا',
  isActive: 'فعال است',
  revokedAtUtc: 'ابطال',
  deviceName: 'دستگاه',
  isCurrent: 'نشست جاری',
  activeRoles: 'نقش‌های فعال',
  role: 'نقش',
  roleKey: 'کلید نقش',
  roleId: 'شناسه نقش',
  roleDisplayName: 'عنوان نقش',
  grantedAtUtc: 'زمان انتساب',
  grantedByUserId: 'عامل انتساب',
  endedByUserId: 'عامل پایان',
  assignmentId: 'شناسه انتساب',
  classTitle: 'عنوان کلاس',
  priority: 'اولویت',
  source: 'منبع',
  caseId: 'شناسه پرونده',
  conversationId: 'شناسه گفتگو',
  type: 'نوع',
  scope: 'محدوده',
  visibility: 'نمایانی',
  moderationCaseCount: 'تعداد پرونده رسیدگی',
  assignedReviewerUserId: 'بررسی‌کننده',
  reviewStartedAtUtc: 'شروع بررسی',
  resolvedAtUtc: 'زمان رسیدگی',
  dismissedAtUtc: 'زمان رد',
  contentSnapshot: 'شاهد محتوایی مجاز پرونده',
  description: 'توضیحات',
  messageKind: 'نوع پیام',
  messageId: 'شناسه پیام',
  reportedUserId: 'حساب گزارش‌شده',
  reporterUserId: 'گزارش‌دهنده',
  reportId: 'شناسه گزارش',
  incidentId: 'شناسه رخداد',
  decision: 'تصمیم',
  riskLevel: 'سطح ریسک',
  policyCodes: 'کد سیاست',
  text: 'متن مجاز در محدوده پرونده',
  sentAtUtc: 'زمان ارسال',
  senderUserId: 'شناسه فرستنده',
  sequence: 'ترتیب',
  kind: 'نوع',
  organizationName: 'نام سازمان',
  clientOperationId: 'شناسه عملیات',
  failureCode: 'کد خطا',
  replayed: 'پاسخ تکرار همان عملیات',
  organization: 'سازمان',
  teacherAssignmentId: 'شناسه انتساب معلم',
  activeTeacherCount: 'معلم فعال',
  activeLearnerCount: 'فراگیر فعال',
  enrolledAtUtc: 'تاریخ ثبت‌نام',
  assignedAtUtc: 'تاریخ انتساب',
  publishedAtUtc: 'زمان انتشار',
  currentTitle: 'عنوان جاری',
  currentVersionNumber: 'شماره نسخه جاری',
  currentMaxScore: 'نمره کل',
  priceAmount: 'مبلغ',
  entitlements: 'امکانات پلن',
  quotas: 'سهمیه‌ها',
  enabled: 'فعال',
  subscriptionCount: 'تعداد اشتراک',
  versionsTruncated: 'فهرست نسخه‌ها محدود شده',
  totalAsGuardian: 'روابط سرپرستی',
  totalAsLearner: 'روابط فراگیر',
  dataAsOfUtc: 'زمان داده گزارش',
  operationalCounts: 'شمارش عملیاتی',
  upcomingSessions: 'جلسات آینده',
  attendancePending: 'حضور ثبت‌نشده',
  assignmentGradingQueue: 'صف ارزیابی تکلیف',
  examGradingQueue: 'صف تصحیح آزمون',
  onboarding: 'وضعیت راه‌اندازی',
  meetingUrl: 'پیوند جلسه',
  sessionTitle: 'عنوان جلسه',
  attendanceStatus: 'وضعیت حضور',
  learnerDisplayName: 'نام فراگیر',
  teacherDisplayName: 'نام معلم',
  sessionCount: 'تعداد جلسات',
  attendanceCount: 'تعداد حضور',
  learnerCount: 'تعداد فراگیر',
  classCount: 'تعداد کلاس',
  assessmentCount: 'تعداد ارزیابی',
  averageScore: 'میانگین نمره',
  count: 'تعداد',
  available: 'در دسترس',
  health: 'سلامت',
  component: 'بخش',
  detail: 'توضیح',
};
export function IdCopy({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <>—</>;
  return (
    <span className="id-copy" dir="ltr">
      <span>{value}</span>
      <button
        aria-label="کپی شناسه"
        onClick={() =>
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          })
        }
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  );
}
export function Value({ value, name = '' }: { value: unknown; name?: string }) {
  if (value == null) return <span className="text-muted">—</span>;
  if (typeof value === 'boolean') return <span>{value ? 'بله' : 'خیر'}</span>;
  if (typeof value === 'number') return <>{number(value)}</>;
  if (typeof value === 'string') {
    if (['phoneNumber', 'maskedPhone'].includes(name.split('.').pop() ?? name))
      return (
        <bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>
          {value || '—'}
        </bdi>
      );
    if (
      /(?:AtUtc|FromUtc|ToUtc|UntilUtc|startUtc|endUtc|deadlineUtc|startDate|endDate)$/.test(name)
    )
      return <>{date(value, true)}</>;
    if (
      /^(?:status|accountStatus|role|activeRole|type|scope|visibility)$/.test(
        name.split('.').pop() ?? name,
      )
    )
      return <StatusBadge value={value} />;
    if (/Id$/.test(name) || name === 'id') return <IdCopy value={value} />;
    return <span style={{ whiteSpace: 'pre-wrap' }}>{label(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted">موردی ثبت نشده است</span>;
    return (
      <div>
        {value.map((v, i) =>
          isRecord(v) ? (
            <div className="nested-block" key={i}>
              <DataView value={v} />
            </div>
          ) : (
            <span className="badge badge-neutral me-1 mb-1" key={i}>
              {String(v)}
            </span>
          ),
        )}
      </div>
    );
  }
  if (isRecord(value)) return <DataView value={value} />;
  return <>—</>;
}
export function DataView({
  value,
  fields,
  hide = [],
}: {
  value: unknown;
  fields?: string[];
  hide?: string[];
}) {
  if (!isRecord(value)) return <EmptyState title="اطلاعاتی ثبت نشده است" />;
  const entries = Object.entries(value).filter(
    ([key]) =>
      (!fields || fields.includes(key)) &&
      !hide.includes(key) &&
      !['accessToken', 'refreshToken', 'setupUri', 'recoveryCodes'].includes(key),
  );
  return (
    <div className="view-grid">
      {entries.map(([key, v]) => (
        <div
          key={key}
          className={`view-field ${typeof v === 'object' && v !== null ? 'wide' : ''}`}
        >
          <span>{fieldLabels[key] ?? key}</span>
          <Value value={v} name={key} />
        </div>
      ))}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
