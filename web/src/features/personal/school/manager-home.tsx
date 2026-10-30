'use client';
import Link from 'next/link';
import { Plus, ArrowLeft, CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { base, Card } from './shared';
import { ManagerClassCards } from './manager-class-cards';
import { ManagerPageHeader } from './manager-page-header';
import { OfficialSpaces } from './official-spaces';
import s from './manager-workspace.module.css';
type S = components['schemas'];
export function ManagerHome() {
  const { session } = usePersonal();
  const dashboard = usePersonalApi<S['ManagerDashboardDto']>('/api/v1/dashboards/manager', {
    poll: 10000,
  });
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', { poll: 10000 });
  if (dashboard.isPending) return <LoadingSkeleton />;
  if (dashboard.isError)
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data;
  if (
    d.organizationId !== session.context.organizationId ||
    classes.data?.some((c) => c.organizationId !== session.context.organizationId)
  )
    return <ErrorState error={new ApiError(403)} />;
  return (
    <div className={s.stack}>
      <ManagerPageHeader
        title="مدیریت آموزشگاه"
        description="کلاس‌ها، اعضا و پیگیری‌های شما"
        action={
          <Button asChild>
            <Link href={base + '/classes/new'}>
              <Plus size={19} />
              ایجاد کلاس
            </Link>
          </Button>
        }
      />

      <OfficialSpaces />
      <section className={s.stack} aria-label="کلاس‌های آموزشگاه">
        <header className={s.sectionHeading}>
          <h2>کلاس‌های آموزشگاه</h2>
          <Link href={base + '/classes'}>
            همهٔ کلاس‌ها <ArrowLeft size={16} />
          </Link>
        </header>
        {classes.isPending ? (
          <LoadingSkeleton />
        ) : classes.isError ? (
          <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
        ) : classes.data.length ? (
          <>
            <ManagerClassCards items={classes.data.slice(0, 4)} />
            {classes.data.length > 4 && (
              <p className={s.hint}>
                ۴ کلاس از {classes.data.length.toLocaleString('fa-IR')} کلاس؛ برای فهرست کامل «همهٔ
                کلاس‌ها» را انتخاب کنید.
              </p>
            )}
          </>
        ) : (
          <Card>
            <EmptyState
              title="اولین کلاس آموزشگاه را بسازید"
              description="پس از ساخت، معلمان و دانش‌آموزان را در همان کلاس اضافه کنید."
            />
          </Card>
        )}
      </section>
      <dl className={s.compactMetrics} aria-label="آمار آموزشگاه">
        {(
          [
            ['کلاس فعال', d.operationalCounts.activeClassCount],
            ['دانش‌آموز ثبت‌نام‌شده', d.operationalCounts.enrolledLearnerCount],
            ['معلم', d.operationalCounts.teacherCount],
            ['دعوت در انتظار', d.pendingInvitationCount],
          ] as const
        ).map(([name, value]) => (
          <div key={name}>
            <dd>{value.toLocaleString('fa-IR')}</dd>
            <dt>{name}</dt>
          </div>
        ))}
      </dl>
      <section aria-label="پیگیری‌های مدیر" className={s.followups}>
        <Link href={base + '/reports?kind=attendance'}>
          <CalendarDays size={23} />
          <div>
            <strong>ثبت حضور کلاس‌ها</strong>
            <p>
              {d.attendancePending.length
                ? `${d.attendancePending.length.toLocaleString('fa-IR')} جلسه نیازمند پیگیری در این نما`
                : 'مشاهدهٔ گزارش حضور کلاس‌ها'}
            </p>
          </div>
          <ArrowLeft size={18} />
        </Link>
        <Link href={base + '/reports?kind=assessments'}>
          <ClipboardCheck size={23} />
          <div>
            <strong>ارزیابی‌های باقی‌مانده</strong>
            <p>
              {(
                d.assignmentGradingQueue.totalPendingCount + d.examGradingQueue.totalPendingCount
              ).toLocaleString('fa-IR')}{' '}
              مورد در صف ارزیابی
            </p>
          </div>
          <ArrowLeft size={18} />
        </Link>
        <Link href={base + '/members'}>
          <Users size={23} />
          <div>
            <strong>پرونده‌ها و اعضا</strong>
            <p>معلم، دانش‌آموز و والد را پیدا و مدیریت کنید.</p>
          </div>
          <ArrowLeft size={18} />
        </Link>
      </section>
      {d.upcomingSessions.length > 0 && (
        <Card title="جلسه‌های نزدیک">
          {d.upcomingSessions.slice(0, 3).map((row) => (
            <Link
              className={s.sessionRow}
              key={row.sessionId}
              href={`${base}/classes/${row.classId}?tab=sessions`}
            >
              <strong>
                {row.classTitle} · {row.title}
              </strong>
              <span>{date(row.startUtc, true)}</span>
            </Link>
          ))}
        </Card>
      )}
      <p className={s.updated}>اطلاعات آموزشگاه: {date(d.dataAsOfUtc, true)}</p>
    </div>
  );
}
