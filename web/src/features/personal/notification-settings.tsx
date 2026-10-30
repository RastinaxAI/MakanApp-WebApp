'use client';
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
  Messages: 'پیام‌ها',
  Assignments: 'تکلیف‌ها',
  Results: 'نتایج و ارزیابی',
  Sessions: 'جلسه‌ها',
  Reports: 'گزارش‌ها',
  Invitations: 'دعوت‌ها',
  AccountSecurity: 'امنیت حساب',
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
              : 'تنظیمات اعلان‌ها'}
          </h1>
          <p>دریافت اعلان را برای همین دامنه تنظیم کنید.</p>
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
        <nav className={s.scope} aria-label="دامنهٔ تنظیمات اعلان">
          <Link
            href="/personal/settings/notifications?scope=personal"
            aria-current={scope === 'personal' ? 'page' : undefined}
          >
            حساب شخصی
          </Link>
          {session.context.organizationId && (
            <Link
              href="/personal/settings/notifications?scope=organization"
              aria-current={scope === 'organization' ? 'page' : undefined}
            >
              آموزشگاه فعال
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
          <EmptyState title="تنظیمی برای این دسته گزارش نشده است" />
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
                      اعلان برنامه: {row.inAppEnabled ? 'فعال' : 'غیرفعال'} · اعلان دستگاه:{' '}
                      {row.pushEnabled ? 'فعال' : 'غیرفعال'} · پیامک:{' '}
                      {row.smsEnabled ? 'فعال' : 'غیرفعال'}
                    </small>
                    {row.isMandatory && <span className={s.badge}>دارای تنظیمات ضروری</span>}
                  </div>
                  <ChevronLeft size={18} />
                </div>
              </Link>
            ))
          ) : (
            <EmptyState title="تنظیمات اعلانی گزارش نشده است" />
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
          اعلان دستگاه
          <input
            type="checkbox"
            checked={values.pushEnabled}
            disabled={busy || !baseline.canDisablePush}
            onChange={(e) => set('pushEnabled', e.target.checked)}
          />
        </label>
        <label className={s.toggle}>
          پیامک
          <input
            type="checkbox"
            checked={values.smsEnabled}
            disabled={busy || !baseline.canDisableSms}
            onChange={(e) => set('smsEnabled', e.target.checked)}
          />
        </label>
        <p className={s.muted}>
          گزینه‌های ضروری مطابق سیاست سرویس قابل غیرفعال‌کردن نیستند. اعلان دستگاه به فعال‌بودن
          دریافت در همان دستگاه نیز وابسته است.
        </p>
        <label className={s.toggle}>
          ساعت سکوت
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
                شروع سکوت
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
                پایان سکوت
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
              منطقهٔ زمانی
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
          تنظیمات اعلان ثبت شد.
        </p>
      )}
      <div className={s.actions}>
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? 'در حال ثبت…' : 'ثبت تنظیمات'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (lock.current || (dirty && !window.confirm('تغییرات ثبت‌نشده کنار گذاشته شوند؟')))
              return;
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
          دریافت نسخهٔ تازه
        </Button>
      </div>
    </form>
  );
}
