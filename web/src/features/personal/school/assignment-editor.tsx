'use client';
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
import { base, Field, Status, toUtc } from './shared';
import e from './evaluation.module.css';
import s from './school.module.css';
type S = components['schemas'];
export function AssignmentEditPage({ id, publish = false }: { id: string; publish?: boolean }) {
  return (
    <WorkflowPage
      title={publish ? 'بازبینی انتشار تکلیف' : 'ویرایش پیش‌نویس تکلیف'}
      back={`${base}/assignments/${id}`}
      roles={['Teacher', 'Manager']}
    >
      <AssignmentLoader id={id} publish={publish} />
    </WorkflowPage>
  );
}
function AssignmentLoader({ id, publish }: { id: string; publish: boolean }) {
  const { session } = usePersonal();
  const q = usePersonalApi<S['AssignmentResult']>('/api/v1/academic/assignments/' + id);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.id !== id || q.data.organizationId !== session.context.organizationId)
    return <ErrorState error={new ApiError(404)} />;
  return publish ? (
    <AssignmentPublish value={q.data} refresh={() => q.refetch({ throwOnError: true })} />
  ) : (
    <AssignmentEditor value={q.data} />
  );
}
function AssignmentEditor({ value }: { value: S['AssignmentResult'] }) {
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
        <h2>این تکلیف پیش‌نویس نیست</h2>
        <p className={s.hint}>ویرایش این نسخه از مسیر پیش‌نویس مجاز نیست.</p>
        <Button variant="outline" asChild>
          <Link href={`${base}/assignments/${value.id}`}>مشاهدهٔ تکلیف</Link>
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
    Number(d.values.score) >= 0;
  return (
    <WorkflowForm
      busy={a.busy}
      ready={d.ready}
      canCommit={valid && !d.stale}
      button="تأیید و ذخیرهٔ پیش‌نویس"
      rows={[
        ['عنوان', d.values.title],
        ['شرح', d.values.description],
        ['مهلت', date(d.values.due, true)],
        ['نمرهٔ کل', d.values.score],
        ['دفعات مجاز', d.values.attempts],
        ['تحویل با تأخیر', d.values.late ? 'مجاز' : 'غیرمجاز'],
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
      <Field label="عنوان تکلیف">
        <input required value={d.values.title} onChange={(ev) => d.set('title', ev.target.value)} />
      </Field>
      <Field label="شرح تکلیف">
        <textarea
          required
          value={d.values.description}
          onChange={(ev) => d.set('description', ev.target.value)}
        />
      </Field>
      <Field label="مهلت تحویل">
        <JalaliDateInput
          required
          withTime
          value={d.values.due}
          onValueChange={(v) => d.set('due', v)}
        />
      </Field>
      <div className={s.two}>
        <Field label="حداکثر دفعات تحویل">
          <input
            required
            type="number"
            min={1}
            step={1}
            value={d.values.attempts}
            onChange={(ev) => d.set('attempts', ev.target.value)}
          />
        </Field>
        <Field label="نمرهٔ کل">
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
        تحویل با تأخیر مجاز باشد
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
  const { call } = usePersonal();
  return (
    <section className={e.panel}>
      <Status>{value.status === 'Draft' ? 'پیش‌نویس' : 'منتشرشده'}</Status>
      <h2>{value.title}</h2>
      <p className={e.answer} dir="auto">
        {value.description}
      </p>
      <dl className={e.summary}>
        <div>
          <dt>کلاس</dt>
          <dd>{value.classTitle}</dd>
        </div>
        <div>
          <dt>مهلت</dt>
          <dd>{date(value.dueAtUtc, true)}</dd>
        </div>
        <div>
          <dt>نمرهٔ کل و تعداد تلاش</dt>
          <dd>
            {value.maxScore.toLocaleString('fa-IR')} نمره ·{' '}
            {value.maxAttempts.toLocaleString('fa-IR')} بار
          </dd>
        </div>
        <div>
          <dt>تحویل با تأخیر</dt>
          <dd>{value.allowLateSubmission ? 'مجاز' : 'غیرمجاز'}</dd>
        </div>
      </dl>
      <div className={e.actions}>
        {value.status === 'Draft' && (
          <>
            <Button asChild variant="outline">
              <Link href={`${base}/assignments/${value.id}/edit`}>بازگشت و ویرایش</Link>
            </Button>
            <ConfirmAction
              title="انتشار تکلیف"
              trigger="انتشار تکلیف برای کلاس"
              confirm="تأیید انتشار تکلیف"
              description="این نسخه با تنظیمات نمایش‌داده‌شده برای دانش‌آموزان مجاز کلاس منتشر شود؟"
              onConfirm={async () => {
                await call('/api/v1/academic/assignments/' + value.id + '/publish', {
                  method: 'POST',
                  body: JSON.stringify({
                    expectedAssignmentRowVersion: value.assignmentRowVersion,
                    expectedVersionRowVersion: value.versionRowVersion,
                  }),
                });
                await refresh();
                return true;
              }}
            />
          </>
        )}
        <Button asChild variant="ghost">
          <Link href={`${base}/assignments/${value.id}`}>جزئیات تکلیف</Link>
        </Button>
      </div>
      {value.status === 'Published' && (
        <ActivityDeliveryStatus
          classId={value.classId}
          kind="Assignment"
          sourceVersionId={value.versionId}
        />
      )}
    </section>
  );
}
