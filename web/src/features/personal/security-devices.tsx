'use client';
import { PageBack } from '@/components/navigation/page-back';

import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { MonitorSmartphone, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { usePersonal, usePersonalApi } from './provider';
import s from './account-services.module.css';
type Session = components['schemas']['UserSessionResult'];
const endpoint = '/api/client/security/sessions';
export function SecurityDevices({ id }: { id?: string }) {
  const q = usePersonalApi<Session[]>(endpoint),
    { call, logout } = usePersonal();
  const [notice, setNotice] = useState('');
  const rows = id ? q.data?.filter((row) => row.id === id) : q.data;
  async function revoke(path: string, method: string) {
    await call(path, { method });
    setNotice('نشست‌های انتخاب‌شده پایان یافتند.');
    await q.refetch();
    return true;
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <h1>{id ? 'جزئیات دستگاه' : 'امنیت و دستگاه‌ها'}</h1>
          <p>نشست‌های ورود حساب خود را بررسی و مدیریت کنید.</p>
        </div>
        <PageBack href={id ? '/personal/settings/devices' : '/personal/profile/preferences'} />
      </header>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {notice && (
            <p role="status" className={s.badge}>
              {notice}
            </p>
          )}
          <div className={s.list}>
            {rows?.length ? (
              rows.map((row) => (
                <section className={s.card} key={row.id}>
                  <div className={s.row}>
                    <span className={s.icon}>
                      <MonitorSmartphone size={23} />
                    </span>
                    <div>
                      <strong>{row.deviceName || 'دستگاه بدون نام'}</strong>
                      <small>ورود: {date(row.createdAtUtc, true)}</small>
                      {row.isCurrent && <span className={s.badge}>دستگاه فعلی</span>}
                    </div>
                    {!id && (
                      <Link
                        aria-label={'جزئیات ' + (row.deviceName || 'دستگاه')}
                        href={'/personal/settings/devices/' + row.id}
                      >
                        <ChevronLeft size={20} />
                      </Link>
                    )}
                  </div>
                  {id && (
                    <dl className={s.details}>
                      <div>
                        <dt>آغاز نشست</dt>
                        <dd>{date(row.createdAtUtc, true)}</dd>
                      </div>
                      <div>
                        <dt>اعتبار نشست</dt>
                        <dd>{date(row.expiresAtUtc, true)}</dd>
                      </div>
                      <div>
                        <dt>پایان اعتبار نهایی</dt>
                        <dd>{date(row.absoluteExpiresAtUtc, true)}</dd>
                      </div>
                    </dl>
                  )}
                  <div className={s.actions}>
                    {row.isCurrent ? (
                      <ConfirmAction
                        trigger="خروج از این دستگاه"
                        title="خروج از حساب؟"
                        description="برای ورود دوباره به این دستگاه به تأیید شماره نیاز دارید."
                        confirm="خروج از حساب"
                        onConfirm={async () => {
                          await logout();
                          return true;
                        }}
                      />
                    ) : (
                      <ConfirmAction
                        destructive
                        trigger="پایان این نشست"
                        title="پایان نشست دستگاه؟"
                        description={`${row.deviceName || 'این دستگاه'} برای دسترسی دوباره باید وارد حساب شود.`}
                        confirm="پایان نشست"
                        onConfirm={() => revoke(endpoint + '/' + row.id, 'DELETE')}
                      />
                    )}
                  </div>
                </section>
              ))
            ) : (
              <EmptyState
                title={id ? 'این نشست دیگر در فهرست شما نیست' : 'نشست فعالی گزارش نشده است'}
              />
            )}
          </div>
          {!id && q.data.some((row) => !row.isCurrent) && (
            <div className={s.actions}>
              <ConfirmAction
                destructive
                trigger="پایان همهٔ نشست‌های دیگر"
                title="خروج دستگاه‌های دیگر؟"
                description="نشست همین دستگاه حفظ می‌شود؛ دستگاه‌های دیگر باید دوباره وارد شوند."
                confirm="پایان نشست‌های دیگر"
                onConfirm={() => revoke(endpoint + '/revoke-others', 'POST')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
