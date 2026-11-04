'use client';
import * as uiText from '@/content/fa';
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
          <h1>{uiText.text_921314c1d2ff}</h1>
          <p>{uiText.text_d2c4b63c4bf8}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/settings/notifications">{uiText.text_49a3bb5d02f6}</Link>
        </Button>
      </header>
      <label className={s.toggle}>
        {uiText.text_98328e62b409}
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
                      {date(item.createdAtUtc, true)}
                      {uiText.text_78887da22764}{' '}
                      {item.readAtUtc ? uiText.text_04a0052037db : uiText.text_55bbc66fe277}
                    </small>
                    <p className={s.body}>{item.body}</p>
                    <div className={s.actions}>
                      {target && sameContext && (
                        <Button asChild variant="outline">
                          <Link href={target}>{uiText.text_515ee981f4a0}</Link>
                        </Button>
                      )}
                      {!sameContext && <p className={s.muted}>{uiText.text_f707420decb3}</p>}
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
                          {uiText.text_cb1e79eee77e}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState title={uiText.text_1999b6d24abb} />
            )}
          </div>
          <Pager page={page} size={q.data.pageSize} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
