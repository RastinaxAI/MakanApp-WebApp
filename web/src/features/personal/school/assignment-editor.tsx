'use client';
import * as uiText from '@/content/fa';
import { useAcademicScope } from './academic-scope';
import { useState } from 'react';
import { PublicationReceipt } from './publication-receipt';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date, localDateTime } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { ActivityDeliveryStatus } from './activity-delivery';
import { WorkflowPage, WorkflowForm, WorkflowDraftConflict, useWorkflowDraft } from './workflow';
import { useAssessmentAction } from './use-assessment-action';
import { Field, Status, toUtc } from './shared';
import e from './evaluation.module.css';
import s from './school.module.css';
type S = components['schemas'];
export function AssignmentEditPage({ id, publish = false }: { id: string; publish?: boolean }) {
  const { base } = useAcademicScope();
  return (
    <WorkflowPage
      title={publish ? uiText.text_75b3b6a69681 : uiText.text_1d3577cf9675}
      back={`${base}/assignments/${id}`}
      roles={['Teacher', 'Manager']}
    >
      <AssignmentLoader id={id} publish={publish} />
    </WorkflowPage>
  );
}
function AssignmentLoader({ id, publish }: { id: string; publish: boolean }) {
  const scope = useAcademicScope();
  const q = usePersonalApi<S['AssignmentResult']>('/api/v1/academic/assignments/' + id);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.id !== id || !scope.matches(q.data)) return <ErrorState error={new ApiError(404)} />;
  return publish ? (
    <AssignmentPublish value={q.data} refresh={() => q.refetch({ throwOnError: true })} />
  ) : (
    <AssignmentEditor value={q.data} />
  );
}
function AssignmentEditor({ value }: { value: S['AssignmentResult'] }) {
  const { base } = useAcademicScope();
  const d = useWorkflowDraft(
    'assignment-edit:' + value.id,
    {
      title: value.title,
      description: value.description,
      due: localDateTime(value.dueAtUtc),
      late: value.allowLateSubmission,
      attempts: String(value.maxAttempts),
      score: String(value.maxScore),
    },
    value.assignmentRowVersion + ':' + value.versionRowVersion,
  );
  const a = useAssessmentAction('/api/v1/academic/assignments/' + value.id),
    router = useRouter();
  if (value.status !== 'Draft')
    return (
      <section className={e.panel}>
        <h2>{uiText.text_fea95daa2cd8}</h2>
        <p className={s.hint}>{uiText.text_fa2690fb6104}</p>
        <Button variant="outline" asChild>
          <Link href={`${base}/assignments/${value.id}`}>{uiText.text_187e46cf3b71}</Link>
        </Button>
      </section>
    );
  const valid =
    !!d.values.title.trim() &&
    !!d.values.description.trim() &&
    !!d.values.due &&
    Number.isFinite(Date.parse(d.values.due)) &&
    Number.isInteger(Number(d.values.attempts)) &&
    Number(d.values.attempts) > 0 &&
    d.values.score.trim() !== '' &&
    Number.isFinite(Number(d.values.score)) &&
    Number(d.values.score) > 0;
  return (
    <WorkflowForm
      busy={a.busy}
      ready={d.ready}
      canCommit={valid && !d.stale}
      button={uiText.text_44e4555f21d7}
      rows={[
        [uiText.text_74190f4bb095, d.values.title],
        [uiText.text_dd322d284113, d.values.description],
        [uiText.text_fbf33464a790, date(d.values.due, true)],
        [uiText.text_25823dfdfd3f, d.values.score],
        [uiText.text_9f129855c90d, d.values.attempts],
        [
          uiText.text_1acb0e529075,
          d.values.late ? uiText.text_d70d2d795615 : uiText.text_5c7f069cd852,
        ],
      ]}
      error={
        <>
          {a.feedback}
          <WorkflowDraftConflict stale={d.stale} onDiscard={d.acceptServerValues} />
        </>
      }
      onSave={async () => {
        if (!valid || d.stale) return;
        const result = await a.run<S['AssignmentResult']>(
          '/api/v1/academic/assignments/' + value.id,
          {
            title: d.values.title.trim(),
            description: d.values.description.trim(),
            dueAtUtc: toUtc(d.values.due),
            allowLateSubmission: d.values.late,
            maxAttempts: Number(d.values.attempts),
            maxScore: Number(d.values.score),
            expectedAssignmentRowVersion: value.assignmentRowVersion,
            expectedVersionRowVersion: value.versionRowVersion,
          },
          'PATCH',
        );
        if (result) {
          d.reset();
          router.push(`${base}/assignments/${value.id}/publish-review`);
        }
      }}
    >
      <Field label={uiText.text_c864088e1061}>
        <input required value={d.values.title} onChange={(ev) => d.set('title', ev.target.value)} />
      </Field>
      <Field label={uiText.text_1d3c268468ff}>
        <textarea
          required
          value={d.values.description}
          onChange={(ev) => d.set('description', ev.target.value)}
        />
      </Field>
      <Field label={uiText.text_2b26e703adf2}>
        <JalaliDateInput
          required
          withTime
          value={d.values.due}
          onValueChange={(v) => d.set('due', v)}
        />
      </Field>
      <div className={s.two}>
        <Field label={uiText.text_0e469bc1ffab}>
          <input
            required
            type="number"
            min={1}
            step={1}
            value={d.values.attempts}
            onChange={(ev) => d.set('attempts', ev.target.value)}
          />
        </Field>
        <Field label={uiText.text_25823dfdfd3f}>
          <input
            required
            type="number"
            min={0}
            step="any"
            value={d.values.score}
            onChange={(ev) => d.set('score', ev.target.value)}
          />
        </Field>
      </div>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={d.values.late}
          onChange={(ev) => d.set('late', ev.target.checked)}
        />
        {uiText.text_8dd151936022}
      </label>
    </WorkflowForm>
  );
}
function AssignmentPublish({
  value,
  refresh,
}: {
  value: S['AssignmentResult'];
  refresh: () => Promise<unknown>;
}) {
  const { base } = useAcademicScope();
  const scope = useAcademicScope();
  const { call } = usePersonal();
  const [receipt, setReceipt] = useState<S['AcademicPublicationReceipt']>();
  return (
    <section className={e.panel}>
      <Status>
        {value.status === 'Draft' ? uiText.text_410c47c7f8b7 : uiText.text_e4f1cf0d1e04}
      </Status>
      <h2>{value.title}</h2>
      <p className={e.answer} dir="auto">
        {value.description}
      </p>
      <dl className={e.summary}>
        <div>
          <dt>{uiText.text_56c43e096bb9}</dt>
          <dd>{value.classTitle}</dd>
        </div>
        <div>
          <dt>{uiText.text_fbf33464a790}</dt>
          <dd>{date(value.dueAtUtc, true)}</dd>
        </div>
        <div>
          <dt>{uiText.text_b48aed6cd968}</dt>
          <dd>
            {value.maxScore.toLocaleString('fa-IR')}
            {uiText.text_fcd548d11d3f} {value.maxAttempts.toLocaleString('fa-IR')}
            {uiText.text_c23a4b046c4e}
          </dd>
        </div>
        <div>
          <dt>{uiText.text_1acb0e529075}</dt>
          <dd>{value.allowLateSubmission ? uiText.text_d70d2d795615 : uiText.text_5c7f069cd852}</dd>
        </div>
      </dl>
      <div className={e.actions}>
        {value.status === 'Draft' && (
          <>
            <Button asChild variant="outline">
              <Link href={`${base}/assignments/${value.id}/edit`}>{uiText.text_250a7c7f7fe9}</Link>
            </Button>
            <ConfirmAction
              title={uiText.text_e6701e88678e}
              trigger={uiText.text_d165c340ec56}
              confirm={uiText.text_2391d7b29480}
              description={uiText.text_a6eef9f48911}
              onConfirm={async () => {
                const result = await call<S['PublishAssignmentResult']>(
                  '/api/v1/academic/assignments/' + value.id + '/publish',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      expectedAssignmentRowVersion: value.assignmentRowVersion,
                      expectedVersionRowVersion: value.versionRowVersion,
                    }),
                  },
                );
                setReceipt(result.publicationReceipt);
                await refresh();
                return true;
              }}
            />
          </>
        )}
        <Button asChild variant="ghost">
          <Link href={`${base}/assignments/${value.id}`}>{uiText.text_31b5276a70f5}</Link>
        </Button>
      </div>
      <PublicationReceipt value={receipt} />
      {!scope.personal && value.status === 'Published' && (
        <ActivityDeliveryStatus
          classId={value.classId}
          kind="Assignment"
          sourceVersionId={value.versionId}
        />
      )}
    </section>
  );
}
