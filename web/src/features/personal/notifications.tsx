'use client';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import Link from 'next/link';
import { useState } from 'react';
import { usePersonal, usePersonalApi } from './provider';
import { Pager } from './school/shared';
import s from './account-services.module.css';
type S = components['schemas'];
export function NotificationsPage() {
  const { call, session } = usePersonal(),
    [page, setPage] = useState(1),
    [unread, setUnread] = useState(false),
    [busy, setBusy] = useState<string>(),
    [error, setError] = useState<unknown>();
  const q = usePersonalApi<S['NotificationPage']>(
    '/api/v1/notifications?' +
      new URLSearchParams({ Page: String(page), PageSize: '20', UnreadOnly: String(unread) }),
    { poll: 15000 },
  );
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <h1>اعلان‌های من</h1>
          <p>خبرهای مرتبط با حساب و فعالیت‌های مجاز شما</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/settings/notifications">تنظیمات اعلان</Link>
        </Button>
      </header>
      <label className={s.toggle}>
        فقط خوانده‌نشده‌ها
        <input
          type="checkbox"
          checked={unread}
          onChange={(e) => {
            setPage(1);
            setUnread(e.target.checked);
          }}
        />
      </label>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={s.list}>
            {q.data.items.length ? (
              q.data.items.map((item) => {
                const sameContext =
                  !item.organizationId || item.organizationId === session.context.organizationId;
                const target =
                  item.resourceType === 'Conversation'
                    ? '/personal/messages/' + item.resourceId
                    : item.resourceType === 'Assignment'
                      ? '/personal/education/assignments/' + item.resourceId
                      : item.resourceType === 'Exam'
                        ? '/personal/education/exams/' + item.resourceId
                        : null;
                return (
                  <article key={item.id} className={`${s.card} ${!item.readAtUtc ? s.unread : ''}`}>
                    <h2>{item.title}</h2>
                    <small className={s.muted}>
                      {date(item.createdAtUtc, true)} ·{' '}
                      {item.readAtUtc ? 'خوانده‌شده' : 'خوانده‌نشده'}
                    </small>
                    <p className={s.body}>{item.body}</p>
                    <div className={s.actions}>
                      {target && sameContext && (
                        <Button asChild variant="outline">
                          <Link href={target}>مشاهدهٔ مورد مرتبط</Link>
                        </Button>
                      )}
                      {!sameContext && (
                        <p className={s.muted}>
                          برای مشاهدهٔ منبع، ابتدا آموزشگاه مرتبط را از انتخابگر فضا انتخاب کنید.
                        </p>
                      )}
                      {!item.readAtUtc && (
                        <Button
                          disabled={!!busy}
                          onClick={async () => {
                            if (busy) return;
                            setBusy(item.id);
                            setError(undefined);
                            try {
                              await call(`/api/v1/notifications/${item.id}/read`, {
                                method: 'POST',
                              });
                              await q.refetch();
                            } catch (problem) {
                              setError(problem);
                            } finally {
                              setBusy(undefined);
                            }
                          }}
                        >
                          علامت‌گذاری به‌عنوان خوانده‌شده
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState title="اعلانی برای نمایش نیست" />
            )}
          </div>
          <Pager page={page} size={q.data.pageSize} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
