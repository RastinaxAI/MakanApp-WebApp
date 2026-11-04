'use client';
import * as uiText from '@/content/fa';
import { PageBack } from '@/components/navigation/page-back';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { Bell, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { usePersonal, usePersonalApi } from './provider';
import s from './account-services.module.css';
type S = components['schemas'];
export const notificationLabels: Record<S['NotificationPreferenceCategory'], string> = {
  Messages: uiText.navigation_messages,
  Assignments: uiText.text_e8fed4d47d62,
  Results: uiText.text_aae3c4a0c257,
  Sessions: uiText.text_92797051c40c,
  Reports: uiText.text_5dc634b07b21,
  Invitations: uiText.text_016c18389868,
  AccountSecurity: uiText.text_36e2e9a2e4a1,
};
export function NotificationSettings({ category }: { category?: string }) {
  const { session } = usePersonal(),
    scope = useSearchParams().get('scope') === 'organization' ? 'organization' : 'personal';
  const org = scope === 'organization' ? session.context.organizationId : null;
  const suffix = org ? '?organizationId=' + org : '',
    path = '/api/v1/notification-preferences' + suffix;
  const q = usePersonalApi<S['NotificationPreferenceItem'][]>(path, {
    enabled: scope === 'personal' || !!org,
  });
  if (
    (scope === 'organization' && !org) ||
    (category && !Object.hasOwn(notificationLabels, category))
  )
    return <ErrorState error={new ApiError(404)} />;
  const item = q.data?.find((row) => row.category === category);
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <h1>
            {category
              ? notificationLabels[category as keyof typeof notificationLabels]
              : uiText.text_161b7c8fcee3}
          </h1>
          <p>{uiText.text_cd1da22edb13}</p>
        </div>
        <PageBack
          href={
            category
              ? `/personal/settings/notifications?scope=${scope}`
              : '/personal/profile/preferences'
          }
        />
      </header>
      {!category && (
        <nav className={s.scope} aria-label={uiText.text_327a658aba96}>
          <Link
            href="/personal/settings/notifications?scope=personal"
            aria-current={scope === 'personal' ? 'page' : undefined}
          >
            {uiText.text_d034f3bcfe7f}
          </Link>
          {session.context.organizationId && (
            <Link
              href="/personal/settings/notifications?scope=organization"
              aria-current={scope === 'organization' ? 'page' : undefined}
            >
              {uiText.text_b05e4b9892e2}
            </Link>
          )}
        </nav>
      )}
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data?.some((row) => row.organizationId !== org) ? (
        <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />
      ) : category ? (
        item ? (
          <PreferenceForm
            key={scope + ':' + category}
            original={item}
            suffix={suffix}
            reload={async () => {
              const r = await q.refetch();
              if (r.isError) throw r.error;
              return r.data?.find((row) => row.category === category);
            }}
          />
        ) : (
          <EmptyState title={uiText.text_a1e394cdbcf2} />
        )
      ) : (
        <div className={s.list}>
          {q.data?.length ? (
            q.data.map((row) => (
              <Link
                className={s.card}
                key={row.category}
                href={`/personal/settings/notifications/${row.category}?scope=${scope}`}
              >
                <div className={s.row}>
                  <span className={s.icon}>
                    <Bell size={21} />
                  </span>
                  <div>
                    <strong>{notificationLabels[row.category]}</strong>
                    <small>
                      {uiText.text_b8451239c1bb}
                      {row.inAppEnabled ? uiText.text_a3fa2a3ffcb9 : uiText.text_4e67bd8e3482}
                      {uiText.text_de7d3b6c7249}{' '}
                      {row.pushEnabled ? uiText.text_a3fa2a3ffcb9 : uiText.text_4e67bd8e3482}
                      {uiText.text_86642a4557c6}{' '}
                      {row.smsEnabled ? uiText.text_a3fa2a3ffcb9 : uiText.text_4e67bd8e3482}
                    </small>
                    {row.isMandatory && <span className={s.badge}>{uiText.text_fd171c24dcfc}</span>}
                  </div>
                  <ChevronLeft size={18} />
                </div>
              </Link>
            ))
          ) : (
            <EmptyState title={uiText.text_63693d28fdf3} />
          )}
        </div>
      )}
    </div>
  );
}
function PreferenceForm({
  original,
  suffix,
  reload,
}: {
  original: S['NotificationPreferenceItem'];
  suffix: string;
  reload: () => Promise<S['NotificationPreferenceItem'] | undefined>;
}) {
  const { call } = usePersonal();
  const [baseline, setBaseline] = useState(original),
    [values, setValues] = useState(original),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  useUnsavedChanges(dirty);
  const set = <K extends keyof S['NotificationPreferenceItem']>(
    key: K,
    value: S['NotificationPreferenceItem'][K],
  ) => {
    setSaved(false);
    setValues((old) => ({ ...old, [key]: value }));
  };
  return (
    <form
      className={s.card}
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current || !dirty) return;
        lock.current = true;
        setBusy(true);
        setSaved(false);
        setError(undefined);
        try {
          const body: S['UpdateNotificationPreferenceCommand'] = {
            pushEnabled: values.pushEnabled,
            smsEnabled: values.smsEnabled,
            quietHoursEnabled: values.quietHoursEnabled,
            quietHoursStartLocal: values.quietHoursEnabled ? values.quietHoursStartLocal : null,
            quietHoursEndLocal: values.quietHoursEnabled ? values.quietHoursEndLocal : null,
            timeZoneId: values.quietHoursEnabled ? values.timeZoneId : null,
            expectedRowVersion: baseline.rowVersion,
          };
          const result = await call<S['NotificationPreferenceItem']>(
            '/api/v1/notification-preferences/' + baseline.category + suffix,
            { method: 'PUT', body: JSON.stringify(body) },
          );
          setBaseline(result);
          setValues(result);
          setSaved(true);
          await reload().catch(setError);
        } catch (problem) {
          setError(problem);
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset className={s.fields} disabled={busy}>
        <label className={s.toggle}>
          {uiText.text_8c12a8350a0e}
          <input
            type="checkbox"
            checked={values.pushEnabled}
            disabled={busy || !baseline.canDisablePush}
            onChange={(e) => set('pushEnabled', e.target.checked)}
          />
        </label>
        <label className={s.toggle}>
          {uiText.text_c7362666bdce}
          <input
            type="checkbox"
            checked={values.smsEnabled}
            disabled={busy || !baseline.canDisableSms}
            onChange={(e) => set('smsEnabled', e.target.checked)}
          />
        </label>
        <p className={s.muted}>{uiText.text_d79df76cab90}</p>
        <label className={s.toggle}>
          {uiText.text_238a2f74addc}
          <input
            type="checkbox"
            checked={values.quietHoursEnabled}
            onChange={(e) => {
              set('quietHoursEnabled', e.target.checked);
              if (e.target.checked && !values.timeZoneId)
                set('timeZoneId', Intl.DateTimeFormat().resolvedOptions().timeZone);
            }}
          />
        </label>
        {values.quietHoursEnabled && (
          <>
            <div className={s.two}>
              <label>
                {uiText.text_631f359ae660}
                <input
                  required
                  type="time"
                  value={values.quietHoursStartLocal?.slice(0, 5) ?? ''}
                  onChange={(e) =>
                    set('quietHoursStartLocal', e.target.value ? e.target.value + ':00' : null)
                  }
                />
              </label>
              <label>
                {uiText.text_988da0ee1c79}
                <input
                  required
                  type="time"
                  value={values.quietHoursEndLocal?.slice(0, 5) ?? ''}
                  onChange={(e) =>
                    set('quietHoursEndLocal', e.target.value ? e.target.value + ':00' : null)
                  }
                />
              </label>
            </div>
            <label>
              {uiText.text_9547b882b1cf}
              <input
                required
                type="text"
                dir="ltr"
                value={values.timeZoneId ?? ''}
                onChange={(e) => set('timeZoneId', e.target.value)}
              />
            </label>
          </>
        )}
      </fieldset>
      {!!error && <ErrorState error={error} />}{' '}
      {saved && (
        <p role="status" className={s.badge}>
          {uiText.text_083a0ab6b295}
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? uiText.text_b5ef00b1806f : uiText.text_1d615f338733}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (lock.current || (dirty && !window.confirm(uiText.text_e00522c63330))) return;
            lock.current = true;
            setBusy(true);
            try {
              const row = await reload();
              if (row) {
                setValues(row);
                setBaseline(row);
                setError(undefined);
                setSaved(false);
              }
            } catch (problem) {
              setError(problem);
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          {uiText.text_aae95f355460}
        </Button>
      </div>
    </form>
  );
}
