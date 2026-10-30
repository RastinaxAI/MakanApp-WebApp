'use client';
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
import { base, Field, Status } from './shared';
import { WorkflowPage, WorkflowDraftConflict, useWorkflowDraft } from './workflow';
import { evaluationLabel, validScore } from './evaluation-model';
import { useAssessmentAction } from './use-assessment-action';
import e from './evaluation.module.css';
import s from './school.module.css';
import { ExamFileDownload } from './exam-files';
type S = components['schemas'];
const roles = ['Teacher', 'Manager'];
const endpoint = (id: string) => '/api/v1/academic/exam-attempts/' + id;
const route = (id: string) => base + '/exam-submissions/' + id;

export function ExamGradingQueue({ examId }: { examId: string }) {
  return (
    <WorkflowPage title="پاسخ‌های آزمون" back={`${base}/exams/${examId}/edit`} roles={roles}>
      <ExamQueue examId={examId} />
    </WorkflowPage>
  );
}
function ExamQueue({ examId }: { examId: string }) {
  const [status, setStatus] = useState('');
  const q = usePersonalApi<S['ExamGradingQueueItemDto'][]>(
    `/api/v1/academic/exams/${examId}/grading` + (status ? '?status=' + status : ''),
    { poll: 15000 },
  );
  return (
    <section className={e.panel}>
      <div className={e.filters}>
        <Field label="وضعیت تصحیح">
          <select value={status} onChange={(ev) => setStatus(ev.target.value)}>
            <option value="">همهٔ وضعیت‌ها</option>
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
              href={route(row.examAttemptId) + '/grading?examId=' + examId}
              key={row.examAttemptId}
            >
              <div>
                <h2>{row.studentDisplayName}</h2>
                <p>{row.examTitle}</p>
                <small>
                  تلاش {row.attemptNumber.toLocaleString('fa-IR')} ·{' '}
                  {date(row.finalizedAtUtc, true)}
                </small>
              </div>
              <Status>{evaluationLabel(row.status)}</Status>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="پاسخی در این وضعیت نیست" />
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
  return (
    <WorkflowPage
      title={
        questionId
          ? 'تصحیح پاسخ سؤال'
          : review
            ? 'بازبینی و انتشار نتیجهٔ آزمون'
            : 'ارزیابی پاسخ‌برگ آزمون'
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
        <h2>شروع تصحیح</h2>
        <p>
          {row.studentDisplayName} · {row.examTitle}
        </p>
        <p className={s.hint}>با شروع تصحیح، نسخهٔ پیش‌نویس ارزیابی در سرویس ایجاد می‌شود.</p>
        <Button
          disabled={a.busy}
          onClick={async () => {
            const value = await a.run<S['ExamGradeDto']>(endpoint(id) + '/grading');
            if (value) setCreated(value);
          }}
        >
          شروع تصحیح پاسخ‌برگ
        </Button>
        {a.feedback}
      </section>
    );
  if (!created && q.isPending) return <LoadingSkeleton />;
  if (!created && q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const value = q.data ?? created;
  if (!value || value.examAttemptId !== id || (validExam && value.examId !== exam))
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
  const correction = useSearchParams().get('correction') === '1';
  if (correction && value.status === 'Released') return <GradeCorrection value={value} />;
  return (
    <div className={e.stack}>
      <section className={e.panel}>
        <h2>{value.examTitle}</h2>
        <div className={e.meta}>
          <span>{value.studentDisplayName}</span>
          <span>تلاش {value.attemptNumber.toLocaleString('fa-IR')}</span>
          <Status>{evaluationLabel(value.status)}</Status>
        </div>
      </section>
      <div className={e.layout}>
        <section className={e.panel}>
          <h2>پاسخ‌برگ و نمرهٔ هر سؤال</h2>
          <div className={e.rows}>
            {[...value.questions]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((q, i) => (
                <article className={e.panel} key={q.examAttemptQuestionId}>
                  <h3>
                    سؤال {(i + 1).toLocaleString('fa-IR')} ·{' '}
                    {q.awardedScore.toLocaleString('fa-IR')} از{' '}
                    {q.maximumScore.toLocaleString('fa-IR')}
                  </h3>
                  <p className={e.answer} dir="auto">
                    {q.prompt}
                  </p>
                  <p className={e.answer} dir="auto">
                    {q.textAnswer ?? q.selectedOptionText ?? 'بدون پاسخ'}
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
                      ? 'تصحیح خودکار'
                      : q.isReviewed
                        ? 'بررسی‌شده'
                        : 'نیازمند بررسی'}
                  </Status>
                  {q.gradingMode === 'Manual' && value.status === 'Draft' && (
                    <div className={e.actions}>
                      <Button variant="outline" asChild>
                        <Link
                          href={
                            route(value.examAttemptId) + '/questions/' + q.examAttemptQuestionId
                          }
                        >
                          تصحیح پاسخ
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
            <h2>وضعیت نتیجه</h2>
            <div className={e.score}>
              <strong>{value.totalScore.toLocaleString('fa-IR')}</strong>
              <span>از {value.maximumScore.toLocaleString('fa-IR')}</span>
            </div>
            <Button asChild>
              <Link href={route(value.examAttemptId) + '/grading-review'}>بازبینی نتیجه</Link>
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
        <h2>سؤال</h2>
        <p className={e.answer} dir="auto">
          {question.prompt}
        </p>
        <h2>پاسخ دانش‌آموز</h2>
        <p className={e.answer} dir="auto">
          {question.textAnswer ||
            (question.attachments?.length
              ? 'پاسخ به‌صورت پیوست ثبت شده است.'
              : 'پاسخ ثبت نشده است.')}
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
        <h2>ارزیابی پاسخ</h2>
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
              router.push(route(value.examAttemptId) + '/grading');
            }
          }}
        >
          <fieldset className={s.form} disabled={a.busy || !d.ready || d.stale}>
            <Field label={`نمره از ${question.maximumScore.toLocaleString('fa-IR')}`}>
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
            <Field label="بازخورد دانش‌آموز">
              <textarea
                value={d.values.feedback}
                onChange={(ev) => d.set('feedback', ev.target.value)}
              />
            </Field>
            <div className={e.private}>
              <Field label="یادداشت خصوصی ارزیاب">
                <textarea
                  value={d.values.private}
                  onChange={(ev) => d.set('private', ev.target.value)}
                />
              </Field>
            </div>
            <div className={e.actions}>
              <Button type="submit" disabled={!validScore(d.values.score, question.maximumScore)}>
                ذخیرهٔ تصحیح سؤال
              </Button>
              <PageBack href={route(value.examAttemptId) + '/grading'} />
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
      <h2>جمع‌بندی ارزیابی</h2>
      <div className={e.score}>
        <strong>{value.totalScore.toLocaleString('fa-IR')}</strong>
        <span>از {value.maximumScore.toLocaleString('fa-IR')}</span>
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
            router.push(route(value.examAttemptId) + '/grading-review');
          }
        }}
      >
        <fieldset className={s.form} disabled={a.busy || !d.ready || d.stale}>
          <Field label="بازخورد دانش‌آموز">
            <textarea
              value={d.values.learner}
              onChange={(ev) => d.set('learner', ev.target.value)}
            />
          </Field>
          <Field label="بازخورد قابل نمایش به والد">
            <textarea
              value={d.values.guardian}
              onChange={(ev) => d.set('guardian', ev.target.value)}
            />
          </Field>
          <div className={e.private}>
            <Field label="یادداشت خصوصی ارزیاب">
              <textarea
                value={d.values.private}
                onChange={(ev) => d.set('private', ev.target.value)}
              />
            </Field>
          </div>
          <div className={e.actions}>
            <Button type="submit" disabled={!ready}>
              تکمیل و بازبینی نتیجه
            </Button>
          </div>
        </fieldset>
      </form>
      {!ready && <p className={s.hint}>ابتدا همهٔ پاسخ‌های تشریحی را بررسی کنید.</p>}
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
  const { call } = usePersonal();
  const operation = useRef(crypto.randomUUID());
  return (
    <section className={e.panel}>
      <h2>
        {value.examTitle} · {value.studentDisplayName}
      </h2>
      <Status>{evaluationLabel(value.status)}</Status>
      <div className={e.score}>
        <strong>{value.totalScore.toLocaleString('fa-IR')}</strong>
        <span>از {value.maximumScore.toLocaleString('fa-IR')}</span>
      </div>
      <dl className={e.summary}>
        <div>
          <dt>بازخورد دانش‌آموز</dt>
          <dd>{value.learnerFeedback || 'ثبت نشده است.'}</dd>
        </div>
        <div>
          <dt>بازخورد والد مجاز</dt>
          <dd>{value.guardianVisibleFeedback || 'ثبت نشده است.'}</dd>
        </div>
      </dl>
      <p className={s.hint}>یادداشت خصوصی ارزیاب در نتیجهٔ دانش‌آموز و والد نمایش داده نمی‌شود.</p>
      <div className={e.actions}>
        <Button asChild variant="outline">
          <Link href={route(value.examAttemptId) + '/grading'}>پاسخ‌برگ ارزیابی</Link>
        </Button>
        {value.status === 'ReadyForRelease' && (
          <ConfirmAction
            title="انتشار نتیجهٔ آزمون"
            description="نمره و بازخوردهای مشخص‌شده برای دانش‌آموز و والد مجاز منتشر شوند؟"
            trigger="انتشار نتیجه"
            confirm="تأیید انتشار"
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
            <Link href={route(value.examAttemptId) + '/grading?correction=1'}>ایجاد اصلاحیه</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
function GradeCorrection({ value }: { value: S['ExamGradeDto'] }) {
  const d = useWorkflowDraft(
      'grade-correction:' + value.examAttemptId,
      { reason: '' },
      value.rowVersion,
    ),
    a = useAssessmentAction(endpoint(value.examAttemptId) + '/grading'),
    router = useRouter();
  return (
    <section className={e.panel}>
      <h2>اصلاح نتیجهٔ منتشرشده</h2>
      <p className={s.hint}>
        نتیجهٔ منتشرشده با ایجاد پیش‌نویس اصلاح، بی‌صدا جایگزین نمی‌شود. اصلاحیه پس از تصحیح و
        انتشار معتبر قابل مشاهده خواهد بود.
      </p>
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
            router.replace(route(value.examAttemptId) + '/grading');
          }
        }}
      >
        <Field label="دلیل اصلاح">
          <textarea
            required
            value={d.values.reason}
            onChange={(ev) => d.set('reason', ev.target.value)}
          />
        </Field>
        <div className={e.actions}>
          <Button disabled={a.busy || !d.ready || !d.values.reason.trim() || d.stale} type="submit">
            ساخت پیش‌نویس اصلاحیه
          </Button>
        </div>
      </form>
      {a.feedback}
      <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
    </section>
  );
}
