'use client';
import Link from 'next/link';
import { ShieldCheck, ChevronLeft } from 'lucide-react';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import { ReferenceColumns } from '../reference-layout';
import s from './parent-daily.module.css';
import { UpcomingSummary } from './upcoming';
import { nearestUpcoming } from './calendar-model';
type S = components['schemas'];
export function ParentDaily({ child }: { child: S['AuthorizedChildResult'] }) {
  const { session } = usePersonal();
  const q = usePersonalApi<S['ParentDashboardDto']>('/api/v1/dashboards/parent', { poll: 10000 });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (
    q.data.organizationId !== session.context.organizationId ||
    q.data.selectedLearner?.learnerOrganizationPersonId !== child.learnerOrganizationPersonId
  )
    return <ErrorState error={new ApiError(403)} />;
  const d = q.data;
  const nextSession = nearestUpcoming(
      d.upcomingSessions.filter((x) => x.status === 'Scheduled'),
      (x) => x.startUtc,
    ),
    nextAssignment = nearestUpcoming(d.assignments, (x) => x.dueAtUtc),
    nextExam = nearestUpcoming(d.exams, (x) => x.availableFromUtc);
  return (
    <ReferenceColumns sessions={d.upcomingSessions}>
      <p className={s.intro}>همراه رشد او، با اطلاعات آموزشی روشن.</p>
      <div className={s.identity}>
        <span className={s.avatar}>{child.displayName[0]}</span>
        <div>
          <h1>{child.displayName}</h1>
          <p>{child.organizationName}</p>
        </div>
      </div>
      <div className={s.metrics}>
        <div>
          <strong>{d.attendanceSummary.recordedCount.toLocaleString('fa-IR')}</strong>
          <span>حضور ثبت‌شده</span>
        </div>
        <div>
          <strong>{d.assignments.length.toLocaleString('fa-IR')}</strong>
          <span>تکلیف در این نما</span>
        </div>
        <div>
          <strong>{d.attendanceSummary.notRecordedCount.toLocaleString('fa-IR')}</strong>
          <span>ثبت‌نشده</span>
        </div>
      </div>
      <div className={s.notice}>
        <ShieldCheck size={20} />
        <span>اطلاعات آموزشیِ منتشرشدهٔ {child.displayName} را اینجا دنبال کنید.</span>
      </div>
      <UpcomingSummary
        session={
          nextSession
            ? {
                title: nextSession.title,
                classTitle: nextSession.classTitle,
                time: nextSession.startUtc,
                href: `/personal/education/classes/${nextSession.classId}`,
              }
            : null
        }
        assignment={
          nextAssignment
            ? {
                title: nextAssignment.title,
                classTitle: nextAssignment.classTitle,
                time: nextAssignment.dueAtUtc,
                href: `/personal/education/classes/${nextAssignment.classId}?tab=assignments`,
              }
            : null
        }
        exam={
          nextExam
            ? {
                title: nextExam.title,
                classTitle: nextExam.classTitle,
                time: nextExam.availableFromUtc,
                href: `/personal/education/classes/${nextExam.classId}?tab=exams`,
              }
            : null
        }
      />
      <section className={s.activities}>
        <h2>آخرین فعالیت‌ها</h2>
        {d.releasedAssignmentResults.map((item) => (
          <Link
            href={`/personal/education/submissions/${item.submissionAttemptId}/result`}
            className={s.row}
            key={item.submissionAttemptId}
          >
            <span className={s.icon}>ت</span>
            <span>
              <strong>{item.assignmentTitle}</strong>
              <small>
                {item.guardianVisibleFeedback ??
                  `نمرهٔ منتشرشده: ${item.score} از ${item.maximumScore}`}
              </small>
            </span>
          </Link>
        ))}
        {d.assignments.map((item) => (
          <Link key={item.assignmentId} href="/personal/education/assignments" className={s.row}>
            <span className={s.icon}>ت</span>
            <span>
              <strong>{item.title}</strong>
              <small>{date(item.dueAtUtc, true)}</small>
            </span>
            <ChevronLeft size={16} />
          </Link>
        ))}
        {!d.assignments.length && !d.releasedAssignmentResults.length && (
          <EmptyState title="هنوز فعالیتی منتشر نشده است" />
        )}
      </section>
      <Link href="/personal/education/assignments" className="button button-primary">
        دیدن گزارش پیشرفت
      </Link>
      <Link href="/personal/education/exams" className="button button-ghost">
        آزمون‌ها و نتایج فرزند
      </Link>
    </ReferenceColumns>
  );
}
