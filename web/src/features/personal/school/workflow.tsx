'use client';
import { useTextDraft } from '@/components/hooks/use-text-draft';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { ClipboardCheck } from 'lucide-react';
import { PageBack } from '@/components/navigation/page-back';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import r from './assessment.module.css';
import s from './school.module.css';

export function WorkflowPage({
  title,
  back,
  children,
  roles = ['Manager'],
  classId,
  eyebrow = 'آموزشگاه / مدیریت فعالیت‌ها',
}: {
  title: string;
  back: string;
  children: ReactNode;
  roles?: string[];
  classId?: string;
  eyebrow?: string;
}) {
  const { session } = usePersonal();
  if (
    session.context.workspaceType !== 'Organization' ||
    !roles.includes(session.context.activeRole ?? '')
  )
    return <ErrorState error={new ApiError(403)} />;
  return (
    <div className={r.workspace} data-school-form>
      <header className={r.heading}>
        <div>
          <span className={r.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        <PageBack href={back} />
      </header>
      {classId ? <ClassWorkflowGate id={classId}>{children}</ClassWorkflowGate> : children}
    </div>
  );
}
function ClassWorkflowGate({ id, children }: { id: string; children: ReactNode }) {
  const { session } = usePersonal();
  const classes = usePersonalApi<components['schemas']['ClassResult'][]>(
    '/api/v1/academic/classes',
  );
  if (classes.isPending) return <LoadingSkeleton />;
  if (classes.isError)
    return <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />;
  const item = classes.data.find(
    (c) => c.id === id && c.organizationId === session.context.organizationId,
  );
  if (!item) return <ErrorState error={new ApiError(404)} />;
  return (
    <>
      <p className={r.note}>کلاس: {item.title}</p>
      {children}
    </>
  );
}
export function useWorkflowDraft<T extends Record<string, string | boolean>>(
  scope: string,
  defaults: T,
  version = 'new',
) {
  const { session } = usePersonal();
  const [initial, setInitial] = useState(() => JSON.stringify(defaults));
  const draft = useTextDraft(
    `${session.user.id}:${contextSignature(session.context)}:workflow:${scope}`,
    initial,
    version,
  );
  type Values = { [K in keyof T]: T[K] extends boolean ? boolean : string };
  let values = JSON.parse(initial) as Values;
  try {
    const parsed = JSON.parse(draft.text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      values = Object.fromEntries(
        Object.entries(defaults).map(([k, v]) => [
          k,
          typeof parsed[k] === typeof v ? parsed[k] : v,
        ]),
      ) as Values;
  } catch {}
  const set = <K extends keyof T>(key: K, value: Values[K]) =>
    draft.setText((old) => {
      let previous = JSON.parse(initial);
      try {
        const parsed = JSON.parse(old);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) previous = parsed;
      } catch {}
      return JSON.stringify({ ...previous, [key]: value });
    });
  function acceptServerValues() {
    const next = JSON.stringify(defaults);
    setInitial(next);
    draft.reset(next, version);
  }
  return { ...draft, values, set, stale: draft.baseVersion !== version, acceptServerValues };
}
export function WorkflowDraftConflict({
  stale,
  onDiscard,
}: {
  stale: boolean;
  onDiscard: () => void;
}) {
  if (!stale) return null;
  return (
    <div role="alert">
      <p>
        نسخهٔ اطلاعات در سرویس تغییر کرده است. متن شما حفظ شده؛ پیش از ادامه آن را بررسی و در صورت
        نیاز کپی کنید.
      </p>
      <ConfirmAction
        title="جایگزینی پیش‌نویس"
        trigger="استفاده از نسخهٔ سرویس"
        confirm="جایگزینی اطلاعات فرم"
        description="تغییرات ذخیره‌نشدهٔ این فرم با اطلاعات تازهٔ سرویس جایگزین شوند؟"
        onConfirm={async () => {
          onDiscard();
          return true;
        }}
      />
    </div>
  );
}
export function WorkflowForm({
  children,
  rows,
  busy,
  error,
  ready = true,
  canCommit = true,
  onSave,
  button = 'تأیید و ثبت',
  notice,
}: {
  children: ReactNode;
  rows: [string, string][];
  busy: boolean;
  error?: ReactNode;
  ready?: boolean;
  canCommit?: boolean;
  onSave: () => Promise<void>;
  button?: string;
  notice?: string;
}) {
  const router = useRouter(),
    path = usePathname(),
    params = useSearchParams(),
    review = params.get('step') === 'review';
  const step = (value: boolean) => {
    const q = new URLSearchParams(params);
    if (value) q.set('step', 'review');
    else q.delete('step');
    router.replace(path + (q.size ? '?' + q : ''), { scroll: false });
  };
  return (
    <section className={`${r.panel} ${s.workflowPanel}`}>
      <ol className={r.steps} aria-label="مراحل ثبت">
        <li aria-current={!review ? 'step' : undefined}>
          <span>۱</span>تکمیل اطلاعات
        </li>
        <li aria-current={review ? 'step' : undefined}>
          <span>۲</span>بازبینی و ثبت
        </li>
      </ol>
      {notice && <p className={r.note}>{notice}</p>}
      {review ? (
        <>
          <div className={r.panelTitle}>
            <ClipboardCheck size={22} />
            <h2>بازبینی اطلاعات</h2>
          </div>
          <dl className={s.summary}>
            {rows.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd dir="auto">{value || 'ثبت نشده'}</dd>
              </div>
            ))}
          </dl>
          <div className={r.actions}>
            <Button variant="outline" disabled={busy} onClick={() => step(false)}>
              بازگشت و ویرایش
            </Button>
            <Button disabled={busy || !ready || !canCommit} onClick={() => void onSave()}>
              {busy ? 'در حال ثبت…' : button}
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) step(true);
          }}
        >
          <fieldset className={s.form} disabled={busy}>
            {children}
          </fieldset>
          <div className={r.actions}>
            <Button type="submit" disabled={busy || !ready}>
              بازبینی اطلاعات
            </Button>
          </div>
        </form>
      )}
      {error}
    </section>
  );
}
