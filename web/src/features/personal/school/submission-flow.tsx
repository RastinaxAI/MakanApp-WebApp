'use client';
import '@/features/reference/bundles/features-personal-school-submission-flow';

import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { PageBack } from '@/components/navigation/page-back';
import { ReferenceFrame } from '@/features/reference/frame';
import { useTextDraft } from '@/components/hooks/use-text-draft';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { CheckCircle2, FilePenLine, Save } from 'lucide-react';
import { usePersonal, usePersonalApi } from '../provider';
import s from './school.module.css';
import r from './assessment.module.css';
import { SubmissionFiles } from './submission-files';
import { Card, Field, SchoolHeading, useSchoolAction } from './shared';
import {
  canReviewSubmission,
  receiptFromAttempt,
  validSubmissionReceipt,
  type SubmissionStage,
} from './submission-model';
type S = components['schemas'];

export function SubmissionFlow({ id, stage }: { id: string; stage: SubmissionStage }) {
  const { routes: schoolRoutes } = useAcademicScope();
  const { session } = usePersonal();
  const scope = useAcademicScope();
  if (!scope.learner) return <ErrorState error={new ApiError(403)} />;
  if (scope.personal)
    return <OwnSubmission key={session.revision + ':' + id + ':' + stage} id={id} stage={stage} />;
  return (
    <ReferenceFrame
      id="MK-06"
      title={
        stage === 'review'
          ? uiText.text_9e0ab9989a34
          : stage === 'receipt'
            ? uiText.text_9b6a410d2fd4
            : uiText.text_e9579f397088
      }
      back={schoolRoutes.assignment(id)}
    >
      <OwnSubmission key={session.revision + ':' + id + ':' + stage} id={id} stage={stage} />
    </ReferenceFrame>
  );
}
function OwnSubmission({ id, stage }: { id: string; stage: SubmissionStage }) {
  const { routes: schoolRoutes } = useAcademicScope();
  const router = useRouter(),
    requested = useSearchParams().get('attempt');
  const q = usePersonalApi<S['SubmissionAttemptResult'][]>(
    `/api/v1/academic/assignments/${id}/attempts/me`,
  );
  const a = useSchoolAction();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const candidate = requested
    ? q.data.find((item) => item.id === requested)
    : (q.data.find((item) => item.status === 'Draft') ??
      (stage === 'receipt'
        ? q.data
            .filter((item) => item.status === 'Submitted')
            .sort((a, b) => b.attemptNumber - a.attemptNumber)[0]
        : undefined));
  if (!candidate)
    return (
      <>
        <SchoolHeading title={uiText.text_185168f80806} />
        <Card>
          <p>{uiText.text_b534c9378ec0}</p>
          <Button
            disabled={a.busy || stage !== 'answer'}
            onClick={async () => {
              const result = await a.run<S['SubmissionAttemptResult']>(
                `/api/v1/academic/assignments/${id}/attempts`,
              );
              if (result) router.replace(schoolRoutes.answer(id) + '?attempt=' + result.id);
            }}
          >
            {uiText.text_42c85a968ff2}
          </Button>
          <PageBack href={schoolRoutes.assignment(id)} />
          {a.feedback}
        </Card>
      </>
    );
  return <LoadedSubmission key={candidate.id} id={id} attemptId={candidate.id} stage={stage} />;
}
function LoadedSubmission({
  id,
  attemptId,
  stage,
}: {
  id: string;
  attemptId: string;
  stage: SubmissionStage;
}) {
  const scope = useAcademicScope();
  const q = usePersonalApi<S['SubmissionAttemptResult']>(
    `/api/v1/academic/submission-attempts/${attemptId}`,
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.assignmentId !== id || !scope.matches(q.data) || !q.data.contentVisible)
    return <ErrorState error={new ApiError(403)} />;
  return (
    <SubmissionEditor
      value={q.data}
      stage={stage}
      reload={() => q.refetch().then((result) => result.data)}
    />
  );
}
function SubmissionEditor({
  value,
  stage,
  reload,
}: {
  value: S['SubmissionAttemptResult'];
  stage: SubmissionStage;
  reload: () => Promise<S['SubmissionAttemptResult'] | undefined>;
}) {
  const { routes: schoolRoutes } = useAcademicScope();
  const { session } = usePersonal(),
    router = useRouter(),
    a = useSchoolAction();
  const draft = useTextDraft(
    `${session.user.id}:${contextSignature(session.context)}:submission:${value.id}`,
    value.answerText ?? '',
    value.rowVersion,
  );
  const [error, setError] = useState<unknown>(),
    [fileBusy, setFileBusy] = useState(false),
    [submitting, setSubmitting] = useState(false),
    lock = useRef(false);
  const query = '?attempt=' + value.id;
  const confirmed = receiptFromAttempt(value);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const latest = await reload();
      if (!latest) throw new ApiError(503);
      if (receiptFromAttempt(latest)) {
        router.replace(schoolRoutes.receipt(value.assignmentId) + query);
        return;
      }
      if (latest.rowVersion !== value.rowVersion)
        throw new ApiError(409, { code: 'SUBMISSION_VERSION_CONFLICT' });
      const receipt = await a.run<S['SubmissionReceipt']>(
        `/api/v1/academic/submission-attempts/${value.id}/submit`,
        { expectedRowVersion: value.rowVersion },
      );
      if (receipt && validSubmissionReceipt(receipt, value.assignmentId, value.id)) {
        draft.reset();
        router.replace(schoolRoutes.receipt(value.assignmentId) + query);
        return;
      }
      // Lost response is not a failure guarantee: only an authoritative Submitted read reconciles it.
      const after = await reload();
      if (after && receiptFromAttempt(after)) {
        draft.reset();
        router.replace(schoolRoutes.receipt(value.assignmentId) + query);
      } else if (receipt) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }
  if (stage === 'receipt')
    return (
      <>
        <SchoolHeading title={uiText.text_a92abd249599} />
        <Card>
          {confirmed ? (
            <div className={s.receipt}>
              <h2>{uiText.text_db45f95e898b}</h2>
              <p>
                {uiText.text_911bee269a92}
                {confirmed.attemptNumber.toLocaleString('fa-IR')}
              </p>
              <p>
                {uiText.text_9160be1d11fd}
                {date(confirmed.submittedAtUtc, true)}
              </p>
              <p>{uiText.text_929f03ab605c}</p>
            </div>
          ) : (
            <p role="alert">{uiText.text_7b938dd0baa1}</p>
          )}
          {confirmed && <SubmissionFiles value={value} />}
          <PageBack href={schoolRoutes.assignment(value.assignmentId)} />
        </Card>
      </>
    );
  if (confirmed)
    return (
      <>
        <SchoolHeading title={uiText.text_bd904ba4e9f5} />
        <Card>
          <p>{uiText.text_b178997648da}</p>
          <Button asChild>
            <Link href={schoolRoutes.receipt(value.assignmentId) + query}>
              {uiText.text_9560630f8636}
            </Link>
          </Button>
        </Card>
      </>
    );
  return (
    <div className={r.workspace} data-school-form data-submission-workspace>
      <header className={r.heading}>
        <div>
          <span className={r.eyebrow}>{uiText.text_d7be740f493d}</span>
          <h1>{stage === 'review' ? uiText.text_9e0ab9989a34 : uiText.text_8936687a1593}</h1>
          <p className={r.muted}>{uiText.text_fdda4c37fb68}</p>
        </div>
        <PageBack href={schoolRoutes.assignment(value.assignmentId)} />
      </header>
      <ol className={r.steps} aria-label={uiText.text_f863f1753616}>
        {[uiText.text_08ca6c6d28a0, uiText.text_8315dc440d8b, uiText.text_db72fa383443].map(
          (title, i) => (
            <li
              key={title}
              aria-current={(stage === 'answer' ? i === 0 : i === 1) ? 'step' : undefined}
            >
              <span>{(i + 1).toLocaleString('fa-IR')}</span>
              {title}
            </li>
          ),
        )}
      </ol>
      <div className={r.layout}>
        <div className={r.mainColumn}>
          <section className={r.panel}>
            <div className={r.panelTitle}>
              <FilePenLine size={22} />
              <h2>{stage === 'answer' ? uiText.text_303aed19e640 : uiText.text_de52acd1c81a}</h2>
            </div>
            {stage === 'answer' ? (
              <>
                <div className={r.answerField}>
                  <Field label={uiText.text_e9579f397088}>
                    <textarea
                      rows={10}
                      value={draft.text}
                      disabled={fileBusy || a.busy || !draft.ready || value.status !== 'Draft'}
                      onChange={(e) => draft.setText(e.target.value)}
                      placeholder={uiText.text_59ca5495819c}
                    />
                  </Field>
                </div>
                {draft.baseVersion !== value.rowVersion && (
                  <p role="alert">{uiText.text_268a03f27704}</p>
                )}
                <div className={r.editorBar} data-dirty={draft.dirty}>
                  <span>
                    {draft.dirty ? <Save size={15} /> : <CheckCircle2 size={15} />}
                    {draft.dirty ? uiText.text_384ce99126d0 : uiText.text_06746a73b060}
                  </span>
                  <span>
                    {draft.text.length.toLocaleString('fa-IR')}
                    {uiText.text_c3e146dab247}
                  </span>
                </div>
                <div className={r.actions}>
                  <Button
                    variant="outline"
                    disabled={a.busy || fileBusy || !draft.ready || !draft.dirty}
                    onClick={async () => {
                      const result = await a.run<S['SubmissionAttemptResult']>(
                        `/api/v1/academic/submission-attempts/${value.id}/draft`,
                        { answerText: draft.text, expectedRowVersion: draft.baseVersion },
                        'PATCH',
                      );
                      if (result) {
                        draft.reset(result.answerText ?? '', result.rowVersion);
                        await reload();
                      }
                    }}
                  >
                    {uiText.text_3377c18a0960}
                  </Button>
                  <Button
                    disabled={
                      a.busy ||
                      fileBusy ||
                      !draft.ready ||
                      !canReviewSubmission(value, draft.text, draft.dirty)
                    }
                    onClick={() => router.push(schoolRoutes.review(value.assignmentId) + query)}
                  >
                    {uiText.text_2f5412466e47}
                  </Button>
                </div>
                <p className={s.hint}>
                  {draft.dirty
                    ? uiText.text_9d50c961e634
                    : canReviewSubmission(value, draft.text, false)
                      ? uiText.text_c40f664ec596
                      : uiText.text_eb751dedb61d}
                </p>
              </>
            ) : (
              <>
                <p className={r.reviewText} dir="auto">
                  {value.answerText || uiText.text_c524c2bf4099}
                </p>
                <p className={s.hint}>{uiText.text_6f26079ce668}</p>
                <div className={r.actions}>
                  <Button asChild variant="outline">
                    <Link href={schoolRoutes.answer(value.assignmentId) + query}>
                      {uiText.text_765ece4bf409}
                    </Link>
                  </Button>
                  <Button
                    disabled={
                      submitting ||
                      fileBusy ||
                      a.busy ||
                      !canReviewSubmission(value, value.answerText ?? '', false)
                    }
                    onClick={() => void submit()}
                  >
                    {submitting ? uiText.text_1d97dfd8b2fc : uiText.text_f6a1f07de0a0}
                  </Button>
                </div>
              </>
            )}
            {a.feedback}
            {!!error && <ErrorState error={error} />}
          </section>
          <SubmissionFiles
            value={value}
            editable={stage === 'answer'}
            disabled={a.busy || !draft.ready || draft.dirty}
            onBusy={setFileBusy}
            onSaved={async (updated) => {
              draft.reset(updated.answerText ?? '', updated.rowVersion);
              await reload();
            }}
          />
        </div>
        <aside className={r.sidebar} aria-label={uiText.text_a386b4b3f356}>
          <AssignmentBrief value={value} />
          <section>
            <h2>{uiText.text_7b00ccc5488b}</h2>
            <dl>
              <div>
                <dt>{uiText.text_b65a1b4e036c}</dt>
                <dd>{value.attemptNumber.toLocaleString('fa-IR')}</dd>
              </div>
              <div>
                <dt>{uiText.text_71e6f07218a9}</dt>
                <dd>
                  {value.attachments.length.toLocaleString('fa-IR')}
                  {uiText.text_8db870221ba1}
                </dd>
              </div>
              <div>
                <dt>{uiText.text_68d7eb08efbc}</dt>
                <dd>{uiText.text_410c47c7f8b7}</dd>
              </div>
            </dl>
            <p className={r.note}>{uiText.text_a432b50514c8}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AssignmentBrief({ value }: { value: S['SubmissionAttemptResult'] }) {
  const q = usePersonalApi<S['AssignmentResult']>(
    '/api/v1/academic/assignments/' + value.assignmentId,
  );
  return (
    <section>
      <h2>{uiText.text_7647e0a413cb}</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <strong>{q.data.title}</strong>
          <dl>
            <div>
              <dt>{uiText.text_56c43e096bb9}</dt>
              <dd>{q.data.classTitle}</dd>
            </div>
            <div>
              <dt>{uiText.text_2b26e703adf2}</dt>
              <dd>{date(q.data.dueAtUtc, true)}</dd>
            </div>
          </dl>
          {q.data.versionId === value.assignmentVersionId ? (
            <details>
              <summary>{uiText.text_1d3c268468ff}</summary>
              <p className={r.instructions} dir="auto">
                {q.data.description}
              </p>
            </details>
          ) : (
            <p className={r.muted}>{uiText.text_f5687ebf71ed}</p>
          )}
        </>
      )}
    </section>
  );
}
