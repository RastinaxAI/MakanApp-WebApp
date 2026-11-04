'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonalApi } from '../provider';
import { Status } from './shared';
import { WorkflowPage } from './workflow';
import { evaluationLabel } from './evaluation-model';
import e from './evaluation.module.css';
import s from './school.module.css';
type S = components['schemas'];
export function AssessmentHistory({ id, exam = false }: { id: string; exam?: boolean }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={exam ? uiText.text_47d0719f27c1 : uiText.text_5592e226d3dc}
      back={`${base}/${exam ? 'exams' : 'assignments'}/${id}`}
      roles={['Student']}
    >
      {exam ? <ExamHistory id={id} /> : <AssignmentHistory id={id} />}
    </WorkflowPage>
  );
}
function AssignmentHistory({ id }: { id: string }) {
  const scope = useAcademicScope();
  const { base } = useAcademicScope();
  const q = usePersonalApi<S['SubmissionAttemptResult'][]>(
    `/api/v1/academic/assignments/${id}/attempts/me`,
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.some((x) => x.assignmentId !== id || !scope.matches(x)))
    return <ErrorState error={new ApiError(502)} />;
  return (
    <section className={e.panel}>
      {q.data.length ? (
        <div className={e.rows}>
          {q.data.map((row) => (
            <article className={e.row} key={row.id}>
              <div>
                <h2>
                  {uiText.text_6fd4ea2ac138}
                  {row.attemptNumber.toLocaleString('fa-IR')}
                </h2>
                <small>
                  {row.status === 'Draft' ? uiText.text_410c47c7f8b7 : uiText.text_5b81f53beda1}
                  {uiText.text_78887da22764} {date(row.submittedAtUtc, true)}
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
                  {row.status === 'Draft' ? uiText.text_24e566f7905f : uiText.text_9ea506c7898d}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={uiText.text_28a910fd0f3f} />
      )}
    </section>
  );
}
function ExamHistory({ id }: { id: string }) {
  const { base } = useAcademicScope();
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
                <h2>
                  {uiText.text_1447bc999cc2}
                  {row.attemptNumber.toLocaleString('fa-IR')}
                </h2>
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
                  {row.status === 'InProgress'
                    ? uiText.text_cb86a53fa7a6
                    : uiText.text_e82ba27cb37f}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={uiText.text_7dee19807d8f} />
      )}
    </section>
  );
}
export function AssessmentResult({ id, exam = false }: { id: string; exam?: boolean }) {
  const { base } = useAcademicScope();
  const scope = useAcademicScope();
  return (
    <WorkflowPage
      title={exam ? uiText.text_e53e2ee5f402 : uiText.text_321d09514a3f}
      back={base}
      roles={['Student', 'Parent']}
    >
      {scope.parent && !scope.hasChild ? (
        <EmptyState title={uiText.text_f3bcbf2e028e} description={uiText.text_8dc330a401b6} />
      ) : exam ? (
        <ExamResult id={id} parent={scope.parent} />
      ) : (
        <AssignmentResult id={id} parent={scope.parent} />
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
        <h2>{uiText.text_993184c04686}</h2>
        <p className={s.hint}>{uiText.text_06cb849dea5b}</p>
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
      <Status>{uiText.text_e4f1cf0d1e04}</Status>
      <h2>{uiText.text_4be8404a5b20}</h2>
      <div className={e.score}>
        <strong>{score === null ? uiText.text_f07a81a06253 : score.toLocaleString('fa-IR')}</strong>
        <span>
          {maximum === null
            ? uiText.text_de1696e646ee
            : uiText.text_928bdfd562d1 + maximum.toLocaleString('fa-IR')}
        </span>
      </div>
      <h3>{uiText.text_6310111c0383}</h3>
      <p className={e.answer} dir="auto">
        {feedback || uiText.text_a592243bf557}
      </p>
      <p className={s.hint}>
        {date(released, true)}
        {revision !== null ? uiText.format_838449e97408(revision.toLocaleString('fa-IR')) : ''}
      </p>
    </section>
  );
}
