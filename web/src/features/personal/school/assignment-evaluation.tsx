'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, LockKeyhole, FileText, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import type { TransferProgress } from '@/lib/api/file-transfer';
import { formatFileSize } from '../messaging/media-model';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { base, Field, Status } from './shared';
import { useAssessmentAction } from './use-assessment-action';
import { WorkflowPage, WorkflowDraftConflict, useWorkflowDraft } from './workflow';
import { evaluationLabel, validScore } from './evaluation-model';
import s from './school.module.css';
import e from './evaluation.module.css';
type S = components['schemas'];
const roles = ['Teacher', 'Manager'];
const attemptBase = (id: string) => '/api/v1/academic/submission-attempts/' + id;
const attemptRoute = (id: string) => base + '/submissions/' + id;

export function AssignmentEvaluationQueue({ assignmentId }: { assignmentId?: string }) {
  return (
    <WorkflowPage
      title="ارزیابی تکلیف‌ها"
      back={assignmentId ? base + '/assignments/' + assignmentId : base}
      roles={roles}
    >
      <Queue assignmentId={assignmentId} />
    </WorkflowPage>
  );
}
function Queue({ assignmentId }: { assignmentId?: string }) {
  const [status, setStatus] = useState(''),
    [late, setLate] = useState(false);
  const params = new URLSearchParams();
  if (assignmentId) params.set('assignmentId', assignmentId);
  if (status) params.set('reviewStatus', status);
  if (late) params.set('isLate', 'true');
  const q = usePersonalApi<S['EvaluationQueueItemResult'][]>(
    '/api/v1/academic/evaluations/queue?' + params,
    { poll: 15000 },
  );
  return (
    <section className={e.panel}>
      <div className={e.filters}>
        <Field label="وضعیت ارزیابی">
          <select value={status} onChange={(ev) => setStatus(ev.target.value)}>
            <option value="">همهٔ وضعیت‌ها</option>
            {(['AwaitingEvaluation', 'Draft', 'Released', 'CorrectionDraft'] as const).map((v) => (
              <option key={v} value={v}>
                {evaluationLabel(v)}
              </option>
            ))}
          </select>
        </Field>
        <label className={s.check}>
          <input type="checkbox" checked={late} onChange={(ev) => setLate(ev.target.checked)} />
          فقط تحویل با تأخیر
        </label>
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
              key={row.submissionAttemptId}
              href={attemptRoute(row.submissionAttemptId) + '/evaluate'}
            >
              <div>
                <h2>{row.studentDisplayName}</h2>
                <p>{row.assignmentTitle}</p>
                <small>
                  تلاش {row.attemptNumber.toLocaleString('fa-IR')} ·{' '}
                  {date(row.submittedAtUtc, true)}
                  {row.isLate ? ' · با تأخیر' : ''}
                </small>
              </div>
              <Status>{evaluationLabel(row.reviewStatus)}</Status>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="پاسخی در این وضعیت نیست" />
      )}
    </section>
  );
}
export function AssignmentEvaluationPage({ id, review = false }: { id: string; review?: boolean }) {
  return (
    <WorkflowPage
      title={review ? 'بازبینی و انتشار ارزیابی' : 'ارزیابی پاسخ تکلیف'}
      back={base + '/evaluations'}
      roles={roles}
    >
      <EvaluationLoader id={id} review={review} />
    </WorkflowPage>
  );
}
function EvaluationLoader({ id, review }: { id: string; review: boolean }) {
  const q = usePersonalApi<S['SubmissionForEvaluationResult']>(
    attemptBase(id) + '/evaluation/submission',
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.submissionAttemptId !== id)
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  return <EvaluationState id={id} submission={q.data} review={review} />;
}
function EvaluationState({
  id,
  submission,
  review,
}: {
  id: string;
  submission: S['SubmissionForEvaluationResult'];
  review: boolean;
}) {
  const queue = usePersonalApi<S['EvaluationQueueItemResult'][]>(
    '/api/v1/academic/evaluations/queue?assignmentId=' + submission.assignmentId,
  );
  const row = queue.data?.find((x) => x.submissionAttemptId === id);
  const q = usePersonalApi<S['EvaluatorEvaluationResult']>(attemptBase(id) + '/evaluation', {
    enabled: !!row && row.reviewStatus !== 'AwaitingEvaluation',
  });
  if (queue.isPending || (row && row.reviewStatus !== 'AwaitingEvaluation' && q.isPending))
    return <LoadingSkeleton />;
  if (queue.isError) return <ErrorState error={queue.error} onRetry={() => void queue.refetch()} />;
  if (!row) return <ErrorState error={new ApiError(404)} />;
  if (row.reviewStatus !== 'AwaitingEvaluation' && q.isError)
    return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const value = row.reviewStatus === 'AwaitingEvaluation' ? undefined : q.data;
  if (value && value.submissionAttemptId !== id) return <ErrorState error={new ApiError(502)} />;
  return (
    <div className={e.layout}>
      <SubmissionRead value={submission} />
      {review ? (
        <EvaluationReview
          id={id}
          value={value}
          onRefresh={() => q.refetch({ throwOnError: true })}
        />
      ) : (
        <EvaluationForm key={id} id={id} submission={submission} value={value} />
      )}
    </div>
  );
}
function SubmissionRead({ value }: { value: S['SubmissionForEvaluationResult'] }) {
  return (
    <section className={e.panel}>
      <h2>{value.assignmentTitle}</h2>
      <div className={e.meta}>
        <span>{value.studentDisplayName}</span>
        <span>تلاش {value.attemptNumber.toLocaleString('fa-IR')}</span>
        <span>{date(value.submittedAtUtc, true)}</span>
      </div>
      <p className={e.answer} dir="auto">
        {value.answerText || 'پاسخ متنی ثبت نشده است.'}
      </p>
      <h2>پیوست‌های پاسخ</h2>
      {value.attachments.length ? (
        <div className={e.rows}>
          {value.attachments.map((file) => (
            <EvaluationFile
              key={file.fileAssetId}
              attempt={value.submissionAttemptId}
              file={file}
            />
          ))}
        </div>
      ) : (
        <p className={s.hint}>این پاسخ پیوست ندارد.</p>
      )}
    </section>
  );
}
function EvaluationFile({
  attempt,
  file,
}: {
  attempt: string;
  file: S['SubmissionAttachmentResult'];
}) {
  const { transfer } = usePersonal();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [progress, setProgress] = useState<TransferProgress>();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return (
    <div className={e.row}>
      <div className={e.fileDetails}>
        <span className={e.fileIcon}>
          {file.contentType.startsWith('image/') ? <FileImage size={22} /> : <FileText size={22} />}
        </span>
        <div>
          <strong dir="auto">{file.originalFileName}</strong>
          <small>
            {formatFileSize(file.sizeBytes)} ·{' '}
            {file.fileStatus === 'Ready' ? 'آمادهٔ دریافت' : 'هنوز آماده نیست'}
          </small>
        </div>
      </div>
      <Button
        disabled={busy || file.fileStatus !== 'Ready'}
        onClick={async () => {
          if (controller.current) return;
          setBusy(true);
          setError(undefined);
          setProgress(undefined);
          const activeController = new AbortController();
          controller.current = activeController;
          try {
            const blob = await transfer<Blob>(
              `/api/client/submission-files/${file.fileAssetId}/content?attemptId=${attempt}`,
              {
                binary: true,
                signal: activeController.signal,
                expectedBytes: file.sizeBytes,
                onProgress: setProgress,
              },
            );
            const url = URL.createObjectURL(blob),
              link = document.createElement('a');
            link.href = url;
            link.download = file.originalFileName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (err) {
            if (!(err instanceof Error && err.name === 'AbortError')) setError(err);
          } finally {
            controller.current = null;
            setBusy(false);
          }
        }}
      >
        <Download size={18} />
        {busy ? 'در حال دریافت…' : file.fileStatus === 'Ready' ? 'دریافت فایل' : 'فایل آماده نیست'}
      </Button>
      {busy && (
        <div className={e.fileProgress} role="status">
          <progress
            aria-label={'پیشرفت دریافت ' + file.originalFileName}
            max={progress?.total ?? undefined}
            value={progress?.total ? progress.loaded : undefined}
          />
          <Button type="button" variant="ghost" onClick={() => controller.current?.abort()}>
            لغو دریافت
          </Button>
        </div>
      )}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
function EvaluationForm({
  id,
  submission,
  value,
}: {
  id: string;
  submission: S['SubmissionForEvaluationResult'];
  value?: S['EvaluatorEvaluationResult'];
}) {
  const router = useRouter(),
    params = useSearchParams(),
    correction = value?.status === 'Released' && params.get('correction') === '1';
  const a = useAssessmentAction(attemptBase(id) + '/evaluation'),
    d = useWorkflowDraft(
      'evaluation:' + id,
      {
        score: value ? String(value.score) : '',
        learner: value?.learnerFeedback ?? '',
        guardian: value?.guardianVisibleFeedback ?? '',
        private: value?.teacherPrivateNote ?? '',
        reason: '',
      },
      value?.rowVersion ?? 'new',
    );
  if (value && value.status !== 'Draft' && !correction)
    return (
      <section className={e.panel}>
        <h2>{evaluationLabel(value.status)}</h2>
        <p>این نسخه در این صفحه قابل ویرایش نیست.</p>
        <div className={e.actions}>
          <Button asChild>
            <Link href={attemptRoute(id) + '/evaluation-review'}>مشاهدهٔ ارزیابی</Link>
          </Button>
          {value.status === 'Released' && (
            <Button variant="outline" asChild>
              <Link href={attemptRoute(id) + '/evaluate?correction=1'}>ایجاد اصلاحیه</Link>
            </Button>
          )}
        </div>
      </section>
    );
  const valid =
    validScore(d.values.score, submission.maxScore) && (!correction || !!d.values.reason.trim());
  return (
    <section className={e.panel}>
      <h2>{correction ? 'اصلاح ارزیابی منتشرشده' : 'ثبت پیش‌نویس ارزیابی'}</h2>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!valid || d.stale) return;
          const fields = {
            score: Number(d.values.score),
            learnerFeedback: d.values.learner || null,
            guardianVisibleFeedback: d.values.guardian || null,
            teacherPrivateNote: d.values.private || null,
          };
          const result = await a.run<S['EvaluatorEvaluationResult']>(
            attemptBase(id) + '/evaluation' + (correction ? '/corrections' : ''),
            correction
              ? {
                  ...fields,
                  correctionReason: d.values.reason.trim(),
                  expectedReleasedEvaluationRowVersion: value!.rowVersion,
                }
              : { ...fields, expectedRowVersion: value?.rowVersion ?? null },
            correction ? 'POST' : 'PUT',
          );
          if (result) {
            d.reset();
            router.push(attemptRoute(id) + '/evaluation-review');
          }
        }}
      >
        <fieldset className={s.form} disabled={a.busy || !d.ready || d.stale}>
          <Field label={`نمره از ${submission.maxScore.toLocaleString('fa-IR')}`}>
            <input
              type="number"
              min={0}
              max={submission.maxScore}
              step="any"
              required
              value={d.values.score}
              onChange={(ev) => d.set('score', ev.target.value)}
            />
          </Field>
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
            <h3>
              <LockKeyhole size={18} /> یادداشت خصوصی ارزیاب
            </h3>
            <p>این یادداشت جزو بازخورد دانش‌آموز و والد نیست.</p>
            <Field label="یادداشت خصوصی">
              <textarea
                value={d.values.private}
                onChange={(ev) => d.set('private', ev.target.value)}
              />
            </Field>
          </div>
          {correction && (
            <Field label="دلیل اصلاح">
              <textarea
                required
                value={d.values.reason}
                onChange={(ev) => d.set('reason', ev.target.value)}
              />
            </Field>
          )}
          <div className={e.actions}>
            <Button type="submit" disabled={!valid}>
              {a.busy ? 'در حال ذخیره…' : 'ذخیره و بازبینی'}
            </Button>
          </div>
        </fieldset>
      </form>
      {a.feedback}
      <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
    </section>
  );
}
function EvaluationReview({
  id,
  value,
  onRefresh,
}: {
  id: string;
  value?: S['EvaluatorEvaluationResult'];
  onRefresh: () => Promise<unknown>;
}) {
  const { call } = usePersonal();
  if (!value)
    return (
      <section className={e.panel}>
        <EmptyState title="ارزیابی هنوز ذخیره نشده است" />
        <Button asChild>
          <Link href={attemptRoute(id) + '/evaluate'}>شروع ارزیابی</Link>
        </Button>
      </section>
    );
  return (
    <section className={e.panel}>
      <h2>بازخورد قابل انتشار</h2>
      <Status>{evaluationLabel(value.status)}</Status>
      <div className={e.score}>
        <strong>{value.score.toLocaleString('fa-IR')}</strong>
        <span>از {value.maxScore.toLocaleString('fa-IR')}</span>
      </div>
      <dl className={e.summary}>
        <div>
          <dt>دانش‌آموز می‌بیند</dt>
          <dd>{value.learnerFeedback || 'بازخوردی ثبت نشده است.'}</dd>
        </div>
        <div>
          <dt>والد مجاز می‌بیند</dt>
          <dd>{value.guardianVisibleFeedback || 'بازخوردی ثبت نشده است.'}</dd>
        </div>
      </dl>
      <p className={s.hint}>
        یادداشت خصوصی در بازخورد منتشرشده قرار نمی‌گیرد. نسخهٔ{' '}
        {value.revisionNumber.toLocaleString('fa-IR')}
      </p>
      <div className={e.actions}>
        {value.status === 'Draft' ? (
          <>
            <Button asChild variant="outline">
              <Link href={attemptRoute(id) + '/evaluate'}>بازگشت و ویرایش</Link>
            </Button>
            <ConfirmAction
              title="انتشار ارزیابی"
              description="نمره و بازخوردهای مشخص‌شده برای دانش‌آموز و والد مجاز منتشر شوند؟"
              trigger="انتشار ارزیابی"
              confirm="انتشار نتیجه"
              onConfirm={async () => {
                await call(attemptBase(id) + '/evaluation/release', {
                  method: 'POST',
                  body: JSON.stringify({ expectedRowVersion: value.rowVersion }),
                });
                await onRefresh();
                return true;
              }}
            />
          </>
        ) : (
          value.status === 'Released' && (
            <Button asChild variant="outline">
              <Link href={attemptRoute(id) + '/evaluate?correction=1'}>ایجاد اصلاحیه</Link>
            </Button>
          )
        )}
      </div>
    </section>
  );
}
