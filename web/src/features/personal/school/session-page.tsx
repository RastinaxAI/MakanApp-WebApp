'use client';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date, localDateTime } from '@/lib/formatting';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePersonal, usePersonalApi } from '../provider';
import { base, Field, safeMeetingUrl, toUtc, useSchoolAction } from './shared';
import { WorkflowPage, WorkflowForm, useWorkflowDraft } from './workflow';
import s from './school.module.css';
type S = components['schemas'];
export function SessionPage({ id, edit = false }: { id: string; edit?: boolean }) {
  return (
    <WorkflowPage
      title={edit ? 'ویرایش جلسه' : 'جزئیات جلسه'}
      back={base + '/schedule'}
      roles={edit ? ['Manager', 'Teacher'] : ['Manager', 'Teacher', 'Student']}
    >
      <SessionResource id={id} edit={edit} />
    </WorkflowPage>
  );
}
function SessionResource({ id, edit }: { id: string; edit: boolean }) {
  const { session, call } = usePersonal(),
    q = usePersonalApi<S['SessionResult']>(`/api/v1/academic/sessions/${id}`);
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data;
  if (item.organizationId !== session.context.organizationId)
    return <ErrorState error={new ApiError(403)} />;
  if (edit)
    return item.status === 'Scheduled' ? (
      <SessionEditor original={item} />
    ) : (
      <ErrorState error={new ApiError(409)} />
    );
  const manage = ['Manager', 'Teacher'].includes(session.context.activeRole ?? '');
  return (
    <section className={s.card}>
      <h2>{item.title}</h2>
      <p className={s.hint}>{item.classTitle}</p>
      <dl className={s.summary}>
        {[
          ['وضعیت', label(item.status)],
          ['شروع', date(item.startUtc, true)],
          ['پایان', date(item.endUtc, true)],
        ].map(([title, value]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={s.row}>
        <Button asChild variant="outline">
          <Link href={`${base}/classes/${item.classId}`}>صفحهٔ کلاس</Link>
        </Button>
        {item.status === 'Scheduled' && safeMeetingUrl(item.meetingUrl) && (
          <Button asChild>
            <a href={safeMeetingUrl(item.meetingUrl)!} target="_blank" rel="noopener noreferrer">
              ورود به جلسه
            </a>
          </Button>
        )}
        {manage && item.status === 'Scheduled' && (
          <>
            <Button asChild variant="outline">
              <Link href={`${base}/sessions/${id}/edit`}>ویرایش جلسه</Link>
            </Button>
            <ConfirmAction
              trigger="لغو جلسه"
              title="لغو این جلسه؟"
              description={`${item.title} در ${date(item.startUtc, true)} لغو می‌شود. سوابق حذف نمی‌شوند.`}
              confirm="تأیید لغو جلسه"
              destructive
              onConfirm={async () => {
                await call(`/api/v1/academic/sessions/${id}/cancel`, {
                  method: 'POST',
                  body: JSON.stringify({ expectedRowVersion: item.rowVersion }),
                });
                await q.refetch();
                return true;
              }}
            />
          </>
        )}
      </div>
    </section>
  );
}
function SessionEditor({ original }: { original: S['SessionResult'] }) {
  const d = useWorkflowDraft(
      'session:' + original.id,
      {
        title: original.title,
        start: localDateTime(original.startUtc),
        end: localDateTime(original.endUtc),
        link: original.meetingUrl ?? '',
      },
      original.rowVersion,
    ),
    a = useSchoolAction(),
    router = useRouter();
  const valid =
    !!d.values.title.trim() && Date.parse(d.values.end) > Date.parse(d.values.start) && !d.stale;
  return (
    <WorkflowForm
      ready={d.ready && !d.stale}
      canCommit={valid}
      busy={a.busy}
      rows={[
        ['عنوان', d.values.title],
        ['شروع', date(d.values.start, true)],
        ['پایان', date(d.values.end, true)],
      ]}
      error={
        <>
          {a.feedback}
          {d.stale && (
            <p role="alert">
              نسخهٔ جلسه تغییر کرده است؛ پیش از ادامه، تغییرات خود را نگه دارید و اطلاعات را
              بازخوانی کنید.
            </p>
          )}
          {!valid && <p className={s.hint}>عنوان و بازهٔ معتبر را کامل کنید.</p>}
        </>
      }
      onSave={async () => {
        if (!valid) return;
        const result = await a.run<S['SessionResult']>(
          `/api/v1/academic/sessions/${original.id}`,
          {
            title: d.values.title.trim(),
            startUtc: toUtc(d.values.start),
            endUtc: toUtc(d.values.end),
            timeZoneId: original.timeZoneId,
            meetingUrl: d.values.link.trim() || null,
            expectedRowVersion: d.baseVersion,
          },
          'PATCH',
        );
        if (result) {
          d.reset();
          router.replace(`${base}/sessions/${original.id}`);
        }
      }}
    >
      <Field label="عنوان جلسه">
        <input required value={d.values.title} onChange={(e) => d.set('title', e.target.value)} />
      </Field>
      <Field label="شروع جلسه">
        <JalaliDateInput
          withTime
          required
          value={d.values.start}
          onValueChange={(v) => d.set('start', v)}
        />
      </Field>
      <Field label="پایان جلسه">
        <JalaliDateInput
          withTime
          required
          value={d.values.end}
          onValueChange={(v) => d.set('end', v)}
        />
      </Field>
      <Field label="پیوند کلاس آنلاین (اختیاری)">
        <input
          type="url"
          dir="ltr"
          value={d.values.link}
          onChange={(e) => d.set('link', e.target.value)}
        />
      </Field>
    </WorkflowForm>
  );
}
