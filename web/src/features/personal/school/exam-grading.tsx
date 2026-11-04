'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { PageBack } from '@/components/navigation/page-back';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { Field, Status } from './shared';
import { WorkflowPage, WorkflowDraftConflict, useWorkflowDraft } from './workflow';
import { evaluationLabel, validScore } from './evaluation-model';
import { useAssessmentAction } from './use-assessment-action';
import e from './evaluation.module.css';
import s from './school.module.css';
import { ExamFileDownload } from './exam-files';
type S = components['schemas'];
const roles = ['Teacher', 'Manager'];
const endpoint = (id: string) => '/api/v1/academic/exam-attempts/' + id;
const route = (base: string, id: string) => base + '/exam-submissions/' + id;

export function ExamGradingQueue({ examId }: { examId: string }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={uiText.text_46ca07730cdf}
      back={`${base}/exams/${examId}/edit`}
      roles={roles}
    >
      <ExamQueue examId={examId} />
    </WorkflowPage>
  );
}
function ExamQueue({ examId }: { examId: string }) {
  const { base } = useAcademicScope();
  const [status, setStatus] = useState('');
  const q = usePersonalApi<S['ExamGradingQueueItemDto'][]>(
    `/api/v1/academic/exams/${examId}/grading` + (status ? '?status=' + status : ''),
    { poll: 15000 },
  );
  return (
    <section className={e.panel}>
      <div className={e.filters}>
        <Field label={uiText.text_a6312a1b83ba}>
          <select value={status} onChange={(ev) => setStatus(ev.target.value)}>
            <option value="">{uiText.text_fa55e47f28bc}</option>
            {(
              [
                'AwaitingGrading',
                'Draft',
                'ReadyForRelease',
                'Released',
                'CorrectionDraft',
              ] as const
            ).map((v) => (
              <option key={v} value={v}>
                {evaluationLabel(v)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length ? (
        <div className={e.rows}>
          {q.data.map((row) => (
            <Link
              className={e.row}
              href={route(base, row.examAttemptId) + '/grading?examId=' + examId}
              key={row.examAttemptId}
            >
              <div>
                <h2>{row.studentDisplayName}</h2>
                <p>{row.examTitle}</p>
                <small>
                  {uiText.text_1447bc999cc2}
                  {row.attemptNumber.toLocaleString('fa-IR')}
                  {uiText.text_78887da22764} {date(row.finalizedAtUtc, true)}
                </small>
              </div>
              <Status>{evaluationLabel(row.status)}</Status>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={uiText.text_d3da6e382b7b} />
      )}
    </section>
  );
}
export function ExamGradingPage({
  id,
  questionId,
  review = false,
}: {
  id: string;
  questionId?: string;
  review?: boolean;
}) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={
        questionId
          ? uiText.text_61f6dd684692
          : review
            ? uiText.text_9fec0601e196
            : uiText.text_97ab3fa3cf71
      }
      back={base + '/exams'}
      roles={roles}
    >
      <GradingLoader id={id} questionId={questionId} review={review} />
    </WorkflowPage>
  );
}
function GradingLoader({
  id,
  questionId,
  review,
}: {
  id: string;
  questionId?: string;
  review: boolean;
}) {
  const scope = useAcademicScope();
  const params = useSearchParams(),
    exam = params.get('examId');
  const validExam = !!exam && /^[0-9a-f-]{36}$/i.test(exam);
  const queue = usePersonalApi<S['ExamGradingQueueItemDto'][]>(
    `/api/v1/academic/exams/${exam}/grading`,
    { enabled: validExam },
  );
  const row = queue.data?.find((x) => x.examAttemptId === id),
    waiting = row?.status === 'AwaitingGrading';
  const q = usePersonalApi<S['ExamGradeDto']>(endpoint(id) + '/grading', {
    enabled: !validExam || (queue.isSuccess && !!row && !waiting),
  });
  const [created, setCreated] = useState<S['ExamGradeDto']>();
  const a = useAssessmentAction(endpoint(id) + '/grading');
  if (validExam && queue.isPending) return <LoadingSkeleton />;
  if (validExam && queue.isError)
    return <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />;
  if (validExam && !row) return <ErrorState error={new ApiError(404)} />;
  if (waiting && !created)
    return (
      <section className={e.panel}>
        <h2>{uiText.text_67bfb548ca56}</h2>
        <p>
          {row.studentDisplayName}
          {uiText.text_588da4105320}
          {row.examTitle}
        </p>
        <p className={s.hint}>{uiText.text_2f8cf11752bd}</p>
        <Button
          disabled={a.busy}
          onClick={async () => {
            const value = await a.run<S['ExamGradeDto']>(endpoint(id) + '/grading');
            if (value) setCreated(value);
          }}
        >
          {uiText.text_9a3574899319}
        </Button>
        {a.feedback}
      </section>
    );
  if (!created && q.isPending) return <LoadingSkeleton />;
  if (!created && q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const value = q.data ?? created;
  if (
    !value ||
    value.examAttemptId !== id ||
    (validExam && value.examId !== exam) ||
    (scope.personal && value.classId !== scope.personal.classId)
  )
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  if (questionId) {
    const question = value.questions.find((x) => x.examAttemptQuestionId === questionId);
    return question ? (
      <GradeQuestion key={questionId ?? value.examAttemptId} value={value} question={question} />
    ) : (
      <ErrorState error={new ApiError(404)} />
    );
  }
  return review ? (
    <GradeReview value={value} refresh={() => q.refetch({ throwOnError: true })} />
  ) : (
    <GradeOverview key={questionId ?? value.examAttemptId} value={value} />
  );
}
function GradeOverview({ value }: { value: S['ExamGradeDto'] }) {
  const { base } = useAcademicScope();
  const correction = useSearchParams().get('correction') === '1';
  if (correction && value.status === 'Released') return <GradeCorrection value={value} />;
  return (
    <div className={e.stack}>
      <section className={e.panel}>
        <h2>{value.examTitle}</h2>
        <div className={e.meta}>
          <span>{value.studentDisplayName}</span>
          <span>
            {uiText.text_1447bc999cc2}
            {value.attemptNumber.toLocaleString('fa-IR')}
          </span>
          <Status>{evaluationLabel(value.status)}</Status>
        </div>
      </section>
      <div className={e.layout}>
        <section className={e.panel}>
          <h2>{uiText.text_a375a0ddd14d}</h2>
          <div className={e.rows}>
            {[...value.questions]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((q, i) => (
                <article className={e.panel} key={q.examAttemptQuestionId}>
                  <h3>
                    {uiText.text_a2c10c627424}
                    {(i + 1).toLocaleString('fa-IR')}
                    {uiText.text_78887da22764} {q.awardedScore.toLocaleString('fa-IR')}
                    {uiText.text_8d6ea6982b74} {q.maximumScore.toLocaleString('fa-IR')}
                  </h3>
                  <p className={e.answer} dir="auto">
                    {q.prompt}
                  </p>
                  <p className={e.answer} dir="auto">
                    {q.textAnswer ?? q.selectedOptionText ?? uiText.text_86657c1093a3}
                  </p>
                  {q.attachments?.map((file) => (
                    <ExamFileDownload
                      key={file.fileAssetId}
                      attemptId={value.examAttemptId}
                      questionId={q.examAttemptQuestionId}
                      file={file}
                    />
                  ))}
                  <Status>
                    {q.gradingMode === 'Objective'
                      ? uiText.text_967b4e9dca84
                      : q.isReviewed
                        ? uiText.text_54753d4394ba
                        : uiText.text_9c641f40e0f6}
                  </Status>
                  {q.gradingMode === 'Manual' && value.status === 'Draft' && (
                    <div className={e.actions}>
                      <Button variant="outline" asChild>
                        <Link
                          href={
                            route(base, value.examAttemptId) +
                            '/questions/' +
                            q.examAttemptQuestionId
                          }
                        >
                          {uiText.text_95612a20d459}
                        </Link>
                      </Button>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </section>
        {value.status === 'Draft' ? (
          <CompleteGrade value={value} />
        ) : (
          <section className={e.panel}>
            <h2>{uiText.text_e82ba27cb37f}</h2>
            <div className={e.score}>
              <strong>{value.totalScore.toLocaleString('fa-IR')}</strong>
              <span>
                {uiText.text_928bdfd562d1}
                {value.maximumScore.toLocaleString('fa-IR')}
              </span>
            </div>
            <Button asChild>
              <Link href={route(base, value.examAttemptId) + '/grading-review'}>
                {uiText.text_69f2db252882}
              </Link>
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
function GradeQuestion({
  value,
  question,
}: {
  value: S['ExamGradeDto'];
  question: S['ExamQuestionGradeDto'];
}) {
  const { base } = useAcademicScope();
  const a = useAssessmentAction(endpoint(value.examAttemptId) + '/grading'),
    router = useRouter();
  const d = useWorkflowDraft(
    'grade-question:' + question.examAttemptQuestionId,
    {
      score: String(question.awardedScore),
      feedback: question.learnerFeedback ?? '',
      private: question.evaluatorPrivateNote ?? '',
    },
    value.rowVersion,
  );
  if (value.status !== 'Draft' || question.gradingMode !== 'Manual')
    return <ErrorState error={new ApiError(409)} />;
  return (
    <div className={e.layout}>
      <section className={e.panel}>
        <h2>{uiText.text_75712d983c36}</h2>
        <p className={e.answer} dir="auto">
          {question.prompt}
        </p>
        <h2>{uiText.text_f587875aa61f}</h2>
        <p className={e.answer} dir="auto">
          {question.textAnswer ||
            (question.attachments?.length ? uiText.text_9dbf97d6d529 : uiText.text_7e1d8f3f9e76)}
        </p>
        {question.attachments?.map((file) => (
          <ExamFileDownload
            key={file.fileAssetId}
            attemptId={value.examAttemptId}
            questionId={question.examAttemptQuestionId}
            file={file}
          />
        ))}
      </section>
      <section className={e.panel}>
        <h2>{uiText.text_7ceceddd5eb1}</h2>
        <form
          onSubmit={async (ev) => {
            ev.preventDefault();
            if (!validScore(d.values.score, question.maximumScore) || d.stale) return;
            const result = await a.run(
              endpoint(value.examAttemptId) +
                '/grading/questions/' +
                question.examAttemptQuestionId,
              {
                awardedScore: Number(d.values.score),
                learnerFeedback: d.values.feedback || null,
                evaluatorPrivateNote: d.values.private || null,
                expectedGradeRowVersion: value.rowVersion,
              },
              'PATCH',
            );
            if (result) {
              d.reset();
              router.push(route(base, value.examAttemptId) + '/grading');
            }
          }}
        >
          <fieldset className={s.form} disabled={a.busy || !d.ready || d.stale}>
            <Field
              label={uiText.format_afd74191ca72(question.maximumScore.toLocaleString('fa-IR'))}
            >
              <input
                required
                type="number"
                min={0}
                max={question.maximumScore}
                step="any"
                value={d.values.score}
                onChange={(ev) => d.set('score', ev.target.value)}
              />
            </Field>
            <Field label={uiText.text_3adafc73e1d2}>
              <textarea
                value={d.values.feedback}
                onChange={(ev) => d.set('feedback', ev.target.value)}
              />
            </Field>
            <div className={e.private}>
              <Field label={uiText.text_f5603f353dad}>
                <textarea
                  value={d.values.private}
                  onChange={(ev) => d.set('private', ev.target.value)}
                />
              </Field>
            </div>
            <div className={e.actions}>
              <Button type="submit" disabled={!validScore(d.values.score, question.maximumScore)}>
                {uiText.text_f4ebeba6baa8}
              </Button>
              <PageBack href={route(base, value.examAttemptId) + '/grading'} />
            </div>
          </fieldset>
        </form>
        {a.feedback}
        <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
      </section>
    </div>
  );
}
function CompleteGrade({ value }: { value: S['ExamGradeDto'] }) {
  const { base } = useAcademicScope();
  const router = useRouter(),
    a = useAssessmentAction(endpoint(value.examAttemptId) + '/grading');
  const d = useWorkflowDraft(
    'grade-complete:' + value.examAttemptId,
    {
      learner: value.learnerFeedback ?? '',
      guardian: value.guardianVisibleFeedback ?? '',
      private: value.evaluatorPrivateNote ?? '',
    },
    value.rowVersion,
  );
  const ready = value.questions.every((q) => q.gradingMode === 'Objective' || q.isReviewed);
  return (
    <section className={e.panel}>
      <h2>{uiText.text_8e1f490a8728}</h2>
      <div className={e.score}>
        <strong>{value.totalScore.toLocaleString('fa-IR')}</strong>
        <span>
          {uiText.text_928bdfd562d1}
          {value.maximumScore.toLocaleString('fa-IR')}
        </span>
      </div>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!ready || d.stale) return;
          const result = await a.run(endpoint(value.examAttemptId) + '/grading/complete', {
            learnerFeedback: d.values.learner || null,
            guardianVisibleFeedback: d.values.guardian || null,
            evaluatorPrivateNote: d.values.private || null,
            expectedGradeRowVersion: value.rowVersion,
          });
          if (result) {
            d.reset();
            router.push(route(base, value.examAttemptId) + '/grading-review');
          }
        }}
      >
        <fieldset className={s.form} disabled={a.busy || !d.ready || d.stale}>
          <Field label={uiText.text_3adafc73e1d2}>
            <textarea
              value={d.values.learner}
              onChange={(ev) => d.set('learner', ev.target.value)}
            />
          </Field>
          <Field label={uiText.text_29b4c343a306}>
            <textarea
              value={d.values.guardian}
              onChange={(ev) => d.set('guardian', ev.target.value)}
            />
          </Field>
          <div className={e.private}>
            <Field label={uiText.text_f5603f353dad}>
              <textarea
                value={d.values.private}
                onChange={(ev) => d.set('private', ev.target.value)}
              />
            </Field>
          </div>
          <div className={e.actions}>
            <Button type="submit" disabled={!ready}>
              {uiText.text_c5b6e5e70c54}
            </Button>
          </div>
        </fieldset>
      </form>
      {!ready && <p className={s.hint}>{uiText.text_d0da8aff4010}</p>}
      {a.feedback}
      <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
    </section>
  );
}
function GradeReview({
  value,
  refresh,
}: {
  value: S['ExamGradeDto'];
  refresh: () => Promise<unknown>;
}) {
  const { base } = useAcademicScope();
  const { call } = usePersonal();
  const operation = useRef(crypto.randomUUID());
  return (
    <section className={e.panel}>
      <h2>
        {value.examTitle}
        {uiText.text_588da4105320}
        {value.studentDisplayName}
      </h2>
      <Status>{evaluationLabel(value.status)}</Status>
      <div className={e.score}>
        <strong>{value.totalScore.toLocaleString('fa-IR')}</strong>
        <span>
          {uiText.text_928bdfd562d1}
          {value.maximumScore.toLocaleString('fa-IR')}
        </span>
      </div>
      <dl className={e.summary}>
        <div>
          <dt>{uiText.text_3adafc73e1d2}</dt>
          <dd>{value.learnerFeedback || uiText.text_7ab236ef6063}</dd>
        </div>
        <div>
          <dt>{uiText.text_1ea90ff0689b}</dt>
          <dd>{value.guardianVisibleFeedback || uiText.text_7ab236ef6063}</dd>
        </div>
      </dl>
      <p className={s.hint}>{uiText.text_12b87e3b4db2}</p>
      <div className={e.actions}>
        <Button asChild variant="outline">
          <Link href={route(base, value.examAttemptId) + '/grading'}>
            {uiText.text_878e832f0570}
          </Link>
        </Button>
        {value.status === 'ReadyForRelease' && (
          <ConfirmAction
            title={uiText.text_03b0d57113ee}
            description={uiText.text_192eea1785f1}
            trigger={uiText.text_9bd14215e24e}
            confirm={uiText.text_daaf8ba1096e}
            onConfirm={async () => {
              await call(endpoint(value.examAttemptId) + '/grade/release', {
                method: 'POST',
                body: JSON.stringify({
                  clientOperationId: operation.current,
                  expectedGradeRowVersion: value.rowVersion,
                }),
              });
              await refresh();
              return true;
            }}
          />
        )}
        {value.status === 'Released' && (
          <Button asChild variant="outline">
            <Link href={route(base, value.examAttemptId) + '/grading?correction=1'}>
              {uiText.text_b6efac56c22b}
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
function GradeCorrection({ value }: { value: S['ExamGradeDto'] }) {
  const { base } = useAcademicScope();
  const d = useWorkflowDraft(
      'grade-correction:' + value.examAttemptId,
      { reason: '' },
      value.rowVersion,
    ),
    a = useAssessmentAction(endpoint(value.examAttemptId) + '/grading'),
    router = useRouter();
  return (
    <section className={e.panel}>
      <h2>{uiText.text_ea8277d04c34}</h2>
      <p className={s.hint}>{uiText.text_47fc73d1bf35}</p>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!d.values.reason.trim() || d.stale) return;
          const result = await a.run(endpoint(value.examAttemptId) + '/grade/corrections', {
            correctionReason: d.values.reason.trim(),
            expectedReleasedGradeRowVersion: value.rowVersion,
          });
          if (result) {
            d.reset();
            router.replace(route(base, value.examAttemptId) + '/grading');
          }
        }}
      >
        <Field label={uiText.text_5a351482a930}>
          <textarea
            required
            value={d.values.reason}
            onChange={(ev) => d.set('reason', ev.target.value)}
          />
        </Field>
        <div className={e.actions}>
          <Button disabled={a.busy || !d.ready || !d.values.reason.trim() || d.stale} type="submit">
            {uiText.text_17ae215bc380}
          </Button>
        </div>
      </form>
      {a.feedback}
      <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
    </section>
  );
}
