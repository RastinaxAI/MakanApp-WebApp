'use client';
import * as uiText from '@/content/fa';
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
      <p className={s.intro}>{uiText.text_2cb4c38e97eb}</p>
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
          <span>{uiText.text_ecd9b2fba4d5}</span>
        </div>
        <div>
          <strong>{d.assignments.length.toLocaleString('fa-IR')}</strong>
          <span>{uiText.text_265cc9015b07}</span>
        </div>
        <div>
          <strong>{d.attendanceSummary.notRecordedCount.toLocaleString('fa-IR')}</strong>
          <span>{uiText.text_cbf88cdc3070}</span>
        </div>
      </div>
      <div className={s.notice}>
        <ShieldCheck size={20} />
        <span>
          {uiText.text_4d9be597887f}
          {child.displayName}
          {uiText.text_47d16fe93a66}
        </span>
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
        <h2>{uiText.text_3952b94c82be}</h2>
        {d.releasedAssignmentResults.map((item) => (
          <Link
            href={`/personal/education/submissions/${item.submissionAttemptId}/result`}
            className={s.row}
            key={item.submissionAttemptId}
          >
            <span className={s.icon}>{uiText.text_6a9b00bf691b}</span>
            <span>
              <strong>{item.assignmentTitle}</strong>
              <small>
                {item.guardianVisibleFeedback ??
                  uiText.format_056cee574f72(item.score, item.maximumScore)}
              </small>
            </span>
          </Link>
        ))}
        {d.assignments.map((item) => (
          <Link key={item.assignmentId} href="/personal/education/assignments" className={s.row}>
            <span className={s.icon}>{uiText.text_6a9b00bf691b}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{date(item.dueAtUtc, true)}</small>
            </span>
            <ChevronLeft size={16} />
          </Link>
        ))}
        {!d.assignments.length && !d.releasedAssignmentResults.length && (
          <EmptyState title={uiText.text_a94260ec452b} />
        )}
      </section>
      <Link href="/personal/education/assignments" className="button button-primary">
        {uiText.text_50cde0908b00}
      </Link>
      <Link href="/personal/education/exams" className="button button-ghost">
        {uiText.text_2808abe7f9bc}
      </Link>
    </ReferenceColumns>
  );
}
