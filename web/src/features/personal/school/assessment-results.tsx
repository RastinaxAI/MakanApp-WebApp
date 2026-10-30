'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { base, Status } from './shared';
import { WorkflowPage } from './workflow';
import { evaluationLabel } from './evaluation-model';
import e from './evaluation.module.css';
import s from './school.module.css';
type S = components['schemas'];
export function AssessmentHistory({ id, exam = false }: { id: string; exam?: boolean }) {
  return (
    <WorkflowPage
      title={exam ? 'تلاش‌های من در آزمون' : 'پاسخ‌های قبلی من'}
      back={`${base}/${exam ? 'exams' : 'assignments'}/${id}`}
      roles={['Student']}
    >
      {exam ? <ExamHistory id={id} /> : <AssignmentHistory id={id} />}
    </WorkflowPage>
  );
}
function AssignmentHistory({ id }: { id: string }) {
  const { session } = usePersonal();
  const q = usePersonalApi<S['SubmissionAttemptResult'][]>(
    `/api/v1/academic/assignments/${id}/attempts/me`,
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (
    q.data.some((x) => x.assignmentId !== id || x.organizationId !== session.context.organizationId)
  )
    return <ErrorState error={new ApiError(502)} />;
  return (
    <section className={e.panel}>
      {q.data.length ? (
        <div className={e.rows}>
          {q.data.map((row) => (
            <article className={e.row} key={row.id}>
              <div>
                <h2>پاسخ شمارهٔ {row.attemptNumber.toLocaleString('fa-IR')}</h2>
                <small>
                  {row.status === 'Draft' ? 'پیش‌نویس' : 'تحویل‌شده'} ·{' '}
                  {date(row.submittedAtUtc, true)}
                </small>
              </div>
              <Button asChild variant="outline">
                <Link
                  href={
                    row.status === 'Draft'
                      ? `${base}/assignments/${id}/answer?attempt=${row.id}`
                      : `${base}/submissions/${row.id}/result`
                  }
                >
                  {row.status === 'Draft' ? 'ادامهٔ پاسخ' : 'نتیجهٔ منتشرشده'}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="هنوز پاسخی ثبت نکرده‌اید" />
      )}
    </section>
  );
}
function ExamHistory({ id }: { id: string }) {
  const q = usePersonalApi<S['StudentExamAttemptSummaryDto'][]>(
    `/api/v1/academic/exams/${id}/attempts/me`,
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <section className={e.panel}>
      {q.data.length ? (
        <div className={e.rows}>
          {q.data.map((row) => (
            <article key={row.examAttemptId} className={e.row}>
              <div>
                <h2>تلاش {row.attemptNumber.toLocaleString('fa-IR')}</h2>
                <small>{date(row.startedAtUtc, true)}</small>
              </div>
              <Button variant="outline" asChild>
                <Link
                  href={
                    row.status === 'InProgress'
                      ? `${base}/exams/${id}`
                      : `${base}/exam-submissions/${row.examAttemptId}/result`
                  }
                >
                  {row.status === 'InProgress' ? 'ادامهٔ آزمون' : 'وضعیت نتیجه'}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="هنوز در این آزمون شرکت نکرده‌اید" />
      )}
    </section>
  );
}
export function AssessmentResult({ id, exam = false }: { id: string; exam?: boolean }) {
  const { session } = usePersonal();
  return (
    <WorkflowPage
      title={exam ? 'نتیجهٔ آزمون' : 'نتیجهٔ تکلیف'}
      back={base}
      roles={['Student', 'Parent']}
    >
      {session.context.activeRole === 'Parent' && !session.context.subjectOrganizationPersonId ? (
        <EmptyState
          title="ابتدا فرزند را انتخاب کنید"
          description="نتیجه در رابطهٔ معتبر همان فرزند قابل مشاهده است."
        />
      ) : exam ? (
        <ExamResult id={id} parent={session.context.activeRole === 'Parent'} />
      ) : (
        <AssignmentResult id={id} parent={session.context.activeRole === 'Parent'} />
      )}
    </WorkflowPage>
  );
}
function AssignmentResult({ id, parent }: { id: string; parent: boolean }) {
  const q = usePersonalApi<S['StudentReleasedResult'] | S['ParentReleasedResult']>(
    `/api/v1/academic/submission-attempts/${id}/${parent ? 'guardian-result' : 'result'}`,
    { poll: 15000 },
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.submissionAttemptId !== id) return <ErrorState error={new ApiError(502)} />;
  // Only the dedicated audience-safe DTO is rendered. Never fetch evaluator data here.
  const feedback = parent
    ? (q.data as S['ParentReleasedResult']).guardianVisibleFeedback
    : (q.data as S['StudentReleasedResult']).learnerFeedback;
  return (
    <ResultCard
      score={q.data.score}
      maximum={q.data.maxScore}
      feedback={feedback}
      released={q.data.releasedAtUtc}
      revision={q.data.evaluationRevisionNumber}
    />
  );
}
function ExamResult({ id, parent }: { id: string; parent: boolean }) {
  const q = usePersonalApi<S['StudentExamResultDto'] | S['GuardianExamResultDto']>(
    `/api/v1/academic/exam-attempts/${id}/${parent ? 'guardian-result' : 'result'}`,
    { poll: 15000 },
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const value = q.data;
  if (value.examAttemptId !== id) return <ErrorState error={new ApiError(502)} />;
  if (value.releaseStatus !== 'Released')
    return (
      <section className={e.panel}>
        <Status>{evaluationLabel(value.releaseStatus)}</Status>
        <h2>نتیجه هنوز منتشر نشده است</h2>
        <p className={s.hint}>پس از انتشار معتبر، نمره و بازخورد مجاز همین‌جا نمایش داده می‌شود.</p>
      </section>
    );
  const feedback = parent
    ? (value as S['GuardianExamResultDto']).guardianVisibleFeedback
    : (value as S['StudentExamResultDto']).learnerFeedback;
  return (
    <ResultCard
      score={value.score}
      maximum={value.maximumScore}
      feedback={feedback}
      released={value.releasedAtUtc}
      revision={value.gradeRevisionNumber}
    />
  );
}
function ResultCard({
  score,
  maximum,
  feedback,
  released,
  revision,
}: {
  score: number | null;
  maximum: number | null;
  feedback: string | null;
  released: string | null;
  revision: number | null;
}) {
  return (
    <section className={e.panel}>
      <Status>منتشرشده</Status>
      <h2>ارزیابی منتشرشده</h2>
      <div className={e.score}>
        <strong>{score === null ? 'نامشخص' : score.toLocaleString('fa-IR')}</strong>
        <span>
          {maximum === null ? 'سقف نمره مشخص نیست' : 'از ' + maximum.toLocaleString('fa-IR')}
        </span>
      </div>
      <h3>بازخورد</h3>
      <p className={e.answer} dir="auto">
        {feedback || 'بازخورد متنی ثبت نشده است.'}
      </p>
      <p className={s.hint}>
        {date(released, true)}
        {revision !== null ? ` · نسخهٔ ${revision.toLocaleString('fa-IR')}` : ''}
      </p>
    </section>
  );
}
