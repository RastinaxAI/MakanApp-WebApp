'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import c from './conversation-pages.module.css';
import { List, Plus } from 'lucide-react';
type S = components['schemas'];
export function ConversationTopics({ value }: { value: S['ManagedConversationResult'] }) {
  const { call, session } = usePersonal(),
    cache = useQueryClient();
  const [page, setPage] = useState(1),
    [title, setTitle] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const command = useRef<S['CreateConversationTopicCommand'] | null>(null),
    lock = useRef(false);
  const base = `/api/v1/conversations/${value.conversationId}/topics`;
  const q = usePersonalApi<S['ConversationTopicPageResult']>(`${base}?page=${page}&pageSize=30`, {
    poll: 10000,
  });
  return (
    <section className={c.panel}>
      <h2>موضوعات گروه</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.canManage && (
            <form
              className={c.form}
              onSubmit={async (ev) => {
                ev.preventDefault();
                if (lock.current || !title.trim()) return;
                lock.current = true;
                setBusy(true);
                setError(undefined);
                command.current ??= { clientTopicId: crypto.randomUUID(), title: title.trim() };
                try {
                  const result = await call<S['ConversationTopicResult']>(base, {
                    method: 'POST',
                    body: JSON.stringify(command.current),
                  });
                  if (result.conversationId !== value.conversationId)
                    throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                  command.current = null;
                  setTitle('');
                  void cache.invalidateQueries({
                    queryKey: ['personal', session.user.id, session.revision],
                  });
                } catch (err) {
                  setError(err);
                  if (err instanceof ApiError && [400, 403, 422].includes(err.status))
                    command.current = null;
                } finally {
                  setBusy(false);
                  lock.current = false;
                }
              }}
            >
              <label>
                نام موضوع
                <input
                  required
                  disabled={busy || !!command.current}
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                />
              </label>
              <Button disabled={busy} type="submit">
                <Plus size={18} />
                {command.current ? 'تلاش مجدد' : 'ایجاد موضوع'}
              </Button>
            </form>
          )}
          {!!error && <ErrorState error={error} />}
          <div className={c.linkList}>
            {q.data.items.length ? (
              q.data.items.map((topic) => (
                <article key={topic.topicId}>
                  <List size={22} />
                  <div>
                    <strong dir="auto">{topic.title}</strong>
                    <small>{topic.status === 'Open' ? 'باز' : 'بسته'}</small>
                  </div>
                  {q.data.canManage && (
                    <ConfirmAction
                      title={topic.status === 'Open' ? 'بستن موضوع' : 'بازکردن موضوع'}
                      trigger={topic.status === 'Open' ? 'بستن' : 'بازکردن'}
                      description="وضعیت این موضوع تغییر کند؟"
                      onConfirm={async () => {
                        const result = await call<S['ConversationTopicResult']>(
                          `${base}/${topic.topicId}`,
                          {
                            method: 'PUT',
                            body: JSON.stringify({
                              title: topic.title,
                              status: topic.status === 'Open' ? 'Closed' : 'Open',
                              expectedVersion: topic.version,
                            }),
                          },
                        );
                        if (
                          result.topicId !== topic.topicId ||
                          result.conversationId !== value.conversationId ||
                          result.status !== (topic.status === 'Open' ? 'Closed' : 'Open')
                        )
                          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                        await q.refetch();
                        return true;
                      }}
                    />
                  )}
                </article>
              ))
            ) : (
              <EmptyState title="هنوز موضوعی ایجاد نشده است" />
            )}
          </div>
          <div className={c.pager}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              قبلی
            </Button>
            <span>صفحهٔ {page}</span>
            <Button variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>
              بعدی
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
