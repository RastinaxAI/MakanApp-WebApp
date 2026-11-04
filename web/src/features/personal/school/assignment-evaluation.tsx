'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
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
import { Field, Status } from './shared';
import { useAssessmentAction } from './use-assessment-action';
import { WorkflowPage, WorkflowDraftConflict, useWorkflowDraft } from './workflow';
import { evaluationLabel, validScore } from './evaluation-model';
import s from './school.module.css';
import e from './evaluation.module.css';
type S = components['schemas'];
const roles = ['Teacher', 'Manager'];
const attemptBase = (id: string) => '/api/v1/academic/submission-attempts/' + id;
const attemptRoute = (base: string, id: string) => base + '/submissions/' + id;

export function AssignmentEvaluationQueue({ assignmentId }: { assignmentId?: string }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={uiText.text_b718bc161b9e}
      back={assignmentId ? base + '/assignments/' + assignmentId : base}
      roles={roles}
    >
      <Queue assignmentId={assignmentId} />
    </WorkflowPage>
  );
}
function Queue({ assignmentId }: { assignmentId?: string }) {
  const { base } = useAcademicScope();
  const [status, setStatus] = useState(''),
    [late, setLate] = useState(false);
  const scope = useAcademicScope();
  const params = new URLSearchParams();
  if (scope.personal) {
    params.set('classKind', 'PersonalClass');
    params.set('classId', scope.personal.classId);
  }
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
        <Field label={uiText.text_0731f9491612}>
          <select value={status} onChange={(ev) => setStatus(ev.target.value)}>
            <option value="">{uiText.text_fa55e47f28bc}</option>
            {(['AwaitingEvaluation', 'Draft', 'Released', 'CorrectionDraft'] as const).map((v) => (
              <option key={v} value={v}>
                {evaluationLabel(v)}
              </option>
            ))}
          </select>
        </Field>
        <label className={s.check}>
          <input type="checkbox" checked={late} onChange={(ev) => setLate(ev.target.checked)} />
          {uiText.text_f125a09fb052}
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
              href={attemptRoute(base, row.submissionAttemptId) + '/evaluate'}
            >
              <div>
                <h2>{row.studentDisplayName}</h2>
                <p>{row.assignmentTitle}</p>
                <small>
                  {uiText.text_1447bc999cc2}
                  {row.attemptNumber.toLocaleString('fa-IR')}
                  {uiText.text_78887da22764} {date(row.submittedAtUtc, true)}
                  {row.isLate ? uiText.text_96408ba3e64d : ''}
                </small>
              </div>
              <Status>{evaluationLabel(row.reviewStatus)}</Status>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={uiText.text_d3da6e382b7b} />
      )}
    </section>
  );
}
export function AssignmentEvaluationPage({ id, review = false }: { id: string; review?: boolean }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={review ? uiText.text_c4becb06f465 : uiText.text_64ff9fb09fcd}
      back={base + '/evaluations'}
      roles={roles}
    >
      <EvaluationLoader id={id} review={review} />
    </WorkflowPage>
  );
}
function EvaluationLoader({ id, review }: { id: string; review: boolean }) {
  const scope = useAcademicScope();
  const q = usePersonalApi<S['SubmissionForEvaluationResult']>(
    attemptBase(id) + '/evaluation/submission',
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (
    q.data.submissionAttemptId !== id ||
    (scope.personal && q.data.classId !== scope.personal.classId)
  )
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
  const scope = useAcademicScope();
  const queue = usePersonalApi<S['EvaluationQueueItemResult'][]>(
    '/api/v1/academic/evaluations/queue?assignmentId=' +
      submission.assignmentId +
      (scope.personal ? '&classKind=PersonalClass&classId=' + scope.personal.classId : ''),
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
        <span>
          {uiText.text_1447bc999cc2}
          {value.attemptNumber.toLocaleString('fa-IR')}
        </span>
        <span>{date(value.submittedAtUtc, true)}</span>
      </div>
      <p className={e.answer} dir="auto">
        {value.answerText || uiText.text_699df53d9134}
      </p>
      <h2>{uiText.text_b7504f07794e}</h2>
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
        <p className={s.hint}>{uiText.text_b07222592c31}</p>
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
  const scope = useAcademicScope();
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
            {formatFileSize(file.sizeBytes)}
            {uiText.text_78887da22764}{' '}
            {file.fileStatus === 'Ready' ? uiText.text_685509581d12 : uiText.text_ab55214d3f76}
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
              `/api/client/submission-files/${file.fileAssetId}/content?attemptId=${attempt}${scope.personal ? '&audience=evaluator' : ''}`,
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
        {busy
          ? uiText.text_80516c4adbbe
          : file.fileStatus === 'Ready'
            ? uiText.text_6a835b3d71f3
            : uiText.text_fddd72f44b1a}
      </Button>
      {busy && (
        <div className={e.fileProgress} role="status">
          <progress
            aria-label={uiText.text_6f83baa49c64 + file.originalFileName}
            max={progress?.total ?? undefined}
            value={progress?.total ? progress.loaded : undefined}
          />
          <Button type="button" variant="ghost" onClick={() => controller.current?.abort()}>
            {uiText.text_6373daa09bbc}
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
  const { base } = useAcademicScope();
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
        <p>{uiText.text_0a907e4db7e6}</p>
        <div className={e.actions}>
          <Button asChild>
            <Link href={attemptRoute(base, id) + '/evaluation-review'}>
              {uiText.text_f74b92f4e375}
            </Link>
          </Button>
          {value.status === 'Released' && (
            <Button variant="outline" asChild>
              <Link href={attemptRoute(base, id) + '/evaluate?correction=1'}>
                {uiText.text_b6efac56c22b}
              </Link>
            </Button>
          )}
        </div>
      </section>
    );
  const valid =
    validScore(d.values.score, submission.maxScore) && (!correction || !!d.values.reason.trim());
  return (
    <section className={e.panel}>
      <h2>{correction ? uiText.text_93d697d4f295 : uiText.text_b258bdb17ed3}</h2>
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
            router.push(attemptRoute(base, id) + '/evaluation-review');
          }
        }}
      >
        <fieldset className={s.form} disabled={a.busy || !d.ready || d.stale}>
          <Field label={uiText.format_afd74191ca72(submission.maxScore.toLocaleString('fa-IR'))}>
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
            <h3>
              <LockKeyhole size={18} />
              {uiText.text_bae472294345}
            </h3>
            <p>{uiText.text_65815ac74e0f}</p>
            <Field label={uiText.text_941348bfcf12}>
              <textarea
                value={d.values.private}
                onChange={(ev) => d.set('private', ev.target.value)}
              />
            </Field>
          </div>
          {correction && (
            <Field label={uiText.text_5a351482a930}>
              <textarea
                required
                value={d.values.reason}
                onChange={(ev) => d.set('reason', ev.target.value)}
              />
            </Field>
          )}
          <div className={e.actions}>
            <Button type="submit" disabled={!valid}>
              {a.busy ? uiText.text_a143258455bb : uiText.text_443deeea74b8}
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
  const { base } = useAcademicScope();
  const { call } = usePersonal();
  if (!value)
    return (
      <section className={e.panel}>
        <EmptyState title={uiText.text_ae21f41e1594} />
        <Button asChild>
          <Link href={attemptRoute(base, id) + '/evaluate'}>{uiText.text_0d12062fab6e}</Link>
        </Button>
      </section>
    );
  return (
    <section className={e.panel}>
      <h2>{uiText.text_e66b52706c41}</h2>
      <Status>{evaluationLabel(value.status)}</Status>
      <div className={e.score}>
        <strong>{value.score.toLocaleString('fa-IR')}</strong>
        <span>
          {uiText.text_928bdfd562d1}
          {value.maxScore.toLocaleString('fa-IR')}
        </span>
      </div>
      <dl className={e.summary}>
        <div>
          <dt>{uiText.text_0a1a85c1271a}</dt>
          <dd>{value.learnerFeedback || uiText.text_7b9c695e1e57}</dd>
        </div>
        <div>
          <dt>{uiText.text_32a672994436}</dt>
          <dd>{value.guardianVisibleFeedback || uiText.text_7b9c695e1e57}</dd>
        </div>
      </dl>
      <p className={s.hint}>
        {uiText.text_5ea656f46842} {value.revisionNumber.toLocaleString('fa-IR')}
      </p>
      <div className={e.actions}>
        {value.status === 'Draft' ? (
          <>
            <Button asChild variant="outline">
              <Link href={attemptRoute(base, id) + '/evaluate'}>{uiText.text_250a7c7f7fe9}</Link>
            </Button>
            <ConfirmAction
              title={uiText.text_9f5a7c3ec8cf}
              description={uiText.text_192eea1785f1}
              trigger={uiText.text_9f5a7c3ec8cf}
              confirm={uiText.text_9bd14215e24e}
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
              <Link href={attemptRoute(base, id) + '/evaluate?correction=1'}>
                {uiText.text_b6efac56c22b}
              </Link>
            </Button>
          )
        )}
      </div>
    </section>
  );
}
