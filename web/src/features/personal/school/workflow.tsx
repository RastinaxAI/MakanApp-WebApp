'use client';
import { useAcademicScope } from './academic-scope';
import * as uiText from '@/content/fa';
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
  eyebrow = uiText.text_c4e5cf604afe,
}: {
  title: string;
  back: string;
  children: ReactNode;
  roles?: string[];
  classId?: string;
  eyebrow?: string;
}) {
  const { session } = usePersonal();
  const scope = useAcademicScope();
  if (
    !scope.personal &&
    (session.context.workspaceType !== 'Organization' ||
      !roles.includes(session.context.activeRole ?? ''))
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
  const scope = useAcademicScope();
  const classes = usePersonalApi<components['schemas']['ClassResult'][]>(
    '/api/v1/academic/classes',
    { enabled: !scope.personal },
  );
  if (scope.personal) return <>{children}</>;
  if (classes.isPending) return <LoadingSkeleton />;
  if (classes.isError)
    return <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />;
  const item = classes.data.find(
    (c) => c.id === id && c.organizationId === session.context.organizationId,
  );
  if (!item) return <ErrorState error={new ApiError(404)} />;
  return (
    <>
      <p className={r.note}>
        {uiText.text_aee307f783b6}
        {item.title}
      </p>
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
  const academic = useAcademicScope();
  const [initial, setInitial] = useState(() => JSON.stringify(defaults));
  const draft = useTextDraft(
    `${session.user.id}:${contextSignature(session.context)}:workflow:${academic.personal?.classId ?? 'organization'}:${scope}`,
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
      <p>{uiText.text_78d0088bdedd}</p>
      <ConfirmAction
        title={uiText.text_35a1c9b683d8}
        trigger={uiText.text_363bc802fb51}
        confirm={uiText.text_c36e75eccc66}
        description={uiText.text_883fc794a5da}
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
  button = uiText.text_796a59104e57,
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
      <ol className={r.steps} aria-label={uiText.text_acf974d20dd2}>
        <li aria-current={!review ? 'step' : undefined}>
          <span>{uiText.text_62b67013987e}</span>
          {uiText.text_16adf56a6387}
        </li>
        <li aria-current={review ? 'step' : undefined}>
          <span>{uiText.text_bc9c03bb975e}</span>
          {uiText.text_2fd8a3150ccd}
        </li>
      </ol>
      {notice && <p className={r.note}>{notice}</p>}
      {review ? (
        <>
          <div className={r.panelTitle}>
            <ClipboardCheck size={22} />
            <h2>{uiText.text_4a9a328e6b5b}</h2>
          </div>
          <dl className={s.summary}>
            {rows.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd dir="auto">{value || uiText.text_5749a86140fa}</dd>
              </div>
            ))}
          </dl>
          <div className={r.actions}>
            <Button variant="outline" disabled={busy} onClick={() => step(false)}>
              {uiText.text_250a7c7f7fe9}
            </Button>
            <Button disabled={busy || !ready || !canCommit} onClick={() => void onSave()}>
              {busy ? uiText.text_b5ef00b1806f : button}
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
              {uiText.text_4a9a328e6b5b}
            </Button>
          </div>
        </form>
      )}
      {error}
    </section>
  );
}
