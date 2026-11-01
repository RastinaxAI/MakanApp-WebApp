'use client';
import { PageBack } from '@/components/navigation/page-back';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Files, Users, Settings2, MessageCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { findConversationSummary, isManagedConversation } from './summary';
import { conversationRoleLabels, conversationTitle } from './model';
import { MessageAttachment } from './media';
import { useMessagingLive } from './live';
import { OfficialBadge, useOfficialConversationAccess } from './official';
import c from './conversation-pages.module.css';
import { MessagingSurface } from './messaging-surface';
import { ProfileAvatar } from '../profile-photo';
type S = components['schemas'];
export type ConversationSection = 'info' | 'members' | 'media' | 'settings';
const route = (id: string) => '/personal/messages/' + id;
export function ConversationPage({ id, section }: { id: string; section: ConversationSection }) {
  const { session, call } = usePersonal();
  const q = useQuery({
    queryKey: ['personal', session.user.id, session.revision, 'conversation-summary', id],
    queryFn: ({ signal }) =>
      findConversationSummary(
        id,
        (p) => call<S['ConversationSummaryResult']>(p, { signal }),
        signal,
      ),
    retry: false,
    refetchInterval: 15000,
  });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <ResolvedConversationPage id={id} section={section} summary={q.data} />;
}
function ResolvedConversationPage({
  id,
  section,
  summary,
}: {
  id: string;
  section: ConversationSection;
  summary: S['ConversationSummaryResult'];
}) {
  const access = useOfficialConversationAccess(summary);
  if (access.error)
    return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;
  if (!access.ready) return <LoadingSkeleton />;
  const tabs: [ConversationSection, string, LucideIcon][] = [
    ['info', 'اطلاعات', MessageCircle],
    ['media', 'رسانه و فایل', Files],
  ];
  if (isManagedConversation(summary.type))
    tabs.push(['members', 'اعضا', Users], ['settings', 'تنظیمات', Settings2]);
  return (
    <MessagingSurface className={c.page}>
      <ConversationSubscription id={id} />
      <header className={c.header}>
        <ProfileAvatar
          photo={summary.otherParticipant?.profilePhoto}
          name={conversationTitle(summary)}
          className={c.heroAvatar}
        />
        <div>
          <span>
            {summary.scope === 'Personal'
              ? 'گفت‌وگوی شخصی'
              : (summary.organization?.organizationName ?? 'گفت‌وگوی آموزشگاه')}
          </span>
          <h1>{conversationTitle(summary)}</h1>
          <OfficialBadge summary={summary} />
        </div>
        <PageBack href={route(id)} />
      </header>
      <nav className={c.tabs} aria-label="جزئیات گفتگو">
        {tabs.map(([key, title, Icon]) => (
          <Link
            href={route(id) + '/' + key}
            aria-current={section === key ? 'page' : undefined}
            key={key}
          >
            <Icon size={19} />
            {title}
          </Link>
        ))}
      </nav>
      {section === 'media' ? (
        <ConversationMedia id={id} />
      ) : isManagedConversation(summary.type) ? (
        section === 'settings' && !access.canManage ? (
          <EmptyState title="امکان مدیریت این گفتگو برای شما فعال نیست" />
        ) : (
          <ManagedPage id={id} section={section} />
        )
      ) : section === 'info' ? (
        <DirectInfo summary={summary} />
      ) : (
        <ErrorState error={new ApiError(404)} />
      )}
    </MessagingSurface>
  );
}
function ConversationSubscription({ id }: { id: string }) {
  const { subscribe } = useMessagingLive();
  useEffect(() => subscribe(id), [id, subscribe]);
  return null;
}
function DirectInfo({ summary }: { summary: S['ConversationSummaryResult'] }) {
  return (
    <section className={c.panel}>
      <h2>{summary.type === 'Saved' ? 'پیام‌های ذخیره‌شدهٔ شما' : 'گفت‌وگوی مستقیم'}</h2>
      {summary.otherParticipant?.username && (
        <p>
          <bdi dir="ltr">@{summary.otherParticipant.username}</bdi>
        </p>
      )}
      <p>
        {summary.scope === 'Personal'
          ? 'این گفتگو مستقل از عضویت آموزشی شماست.'
          : 'این گفتگو به آموزشگاه تعلق دارد.'}
      </p>
      <ArchiveAction id={summary.conversationId} archived={summary.isArchived} />
    </section>
  );
}
function ManagedPage({ id, section }: { id: string; section: ConversationSection }) {
  const q = usePersonalApi<S['ManagedConversationResult']>('/api/v1/conversations/' + id, {
    poll: 5000,
  });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.conversationId !== id) return <ErrorState error={new ApiError(502)} />;
  return section === 'members' ? (
    <ConversationMembers id={id} />
  ) : section === 'settings' ? (
    <ConversationSettings value={q.data} />
  ) : (
    <ManagedInfo value={q.data} />
  );
}
function ManagedInfo({ value }: { value: S['ManagedConversationResult'] }) {
  const { call, session } = usePersonal(),
    router = useRouter();
  const cache = useQueryClient();
  return (
    <section className={c.panel}>
      <h2>{value.type === 'Channel' ? 'اطلاعات کانال' : 'اطلاعات گروه'}</h2>
      <p className={c.body} dir="auto">
        {value.description || 'توضیحی ثبت نشده است.'}
      </p>
      <dl className={c.details}>
        <div>
          <dt>وابستگی گفتگو</dt>
          <dd>{value.scope === 'Personal' ? 'شخصی' : 'آموزشگاه'}</dd>
        </div>
        <div>
          <dt>نمایان‌بودن</dt>
          <dd>{value.visibility === 'Public' ? 'عمومی' : 'خصوصی'}</dd>
        </div>
        <div>
          <dt>تاریخچه برای عضو جدید</dt>
          <dd>{value.groupHistoryPolicy === 'FromJoin' ? 'از زمان عضویت' : 'تاریخچهٔ کامل'}</dd>
        </div>
      </dl>
      {value.managementPolicy === 'SystemManagedAcademic' ? (
        <p className={c.note}>عضویت و مدیریت این فضای رسمی تابع دسترسی آموزشی معتبر است.</p>
      ) : (
        <div className={c.actions}>
          <ConfirmAction
            destructive
            title="ترک گفتگو"
            trigger={value.type === 'Channel' ? 'ترک کانال' : 'ترک گروه'}
            description="عضویت شما در این گفتگو پایان یابد؟ در صورت نیاز به انتقال مدیریت، سرویس اجازهٔ خروج را مشخص می‌کند."
            confirm="ترک گفتگو"
            onConfirm={async () => {
              await call('/api/v1/conversations/' + value.conversationId + '/leave', {
                method: 'POST',
              });
              void cache.invalidateQueries({
                queryKey: ['personal', session.user.id, session.revision],
              });
              router.replace('/personal/messages');
              return true;
            }}
          />
        </div>
      )}
    </section>
  );
}
function ConversationMembers({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ConversationParticipantPageResult']>(
    `/api/v1/conversations/${id}/members?page=${page}&pageSize=30`,
    { poll: 5000 },
  );
  return (
    <section className={c.panel}>
      <h2>اعضای گفتگو</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={c.members}>
            {q.data.items.length ? (
              q.data.items.map((m) => (
                <article key={m.participantId}>
                  <span className={c.avatar}>{m.user.displayName[0]}</span>
                  <div>
                    <strong>{m.user.displayName}</strong>
                    {m.user.username && (
                      <small>
                        <bdi dir="ltr">@{m.user.username}</bdi>
                      </small>
                    )}
                    <small>
                      {m.status === 'Active' ? 'عضو فعال' : 'عضویت پایان‌یافته'} ·{' '}
                      {conversationRoleLabels[m.role]}
                    </small>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="عضوی برای نمایش وجود ندارد" />
            )}
          </div>
          <div className={c.actions}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              صفحهٔ قبل
            </Button>
            <span>صفحهٔ {page.toLocaleString('fa-IR')}</span>
            <Button variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>
              صفحهٔ بعد
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
function ConversationMedia({ id }: { id: string }) {
  const selectId = useId();
  const { session, call } = usePersonal();
  const [kind, setKind] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['personal', session.user.id, session.revision, 'conversation-media', id, kind],
    initialPageParam: null as number | null,
    refetchInterval: 5000,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (kind) params.set('kind', kind);
      if (pageParam !== null) params.set('beforeSequence', String(pageParam));
      const value = await call<S['ConversationMediaPageResult']>(
        `/api/v1/conversations/${id}/media?${params}`,
        { signal },
      );
      if (
        value.nextBeforeSequence !== null &&
        pageParam !== null &&
        value.nextBeforeSequence >= pageParam
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      return value;
    },
    getNextPageParam: (last) => last.nextBeforeSequence ?? undefined,
  });
  const items =
    q.data?.pages
      .flatMap((p) => p.items)
      .filter(
        (item, i, rows) =>
          rows.findIndex(
            (x) =>
              x.sequence === item.sequence &&
              x.attachment.fileAssetId === item.attachment.fileAssetId,
          ) === i,
      ) ?? [];
  return (
    <section className={c.panel}>
      <div className={c.filters}>
        <h2>رسانه‌ها و فایل‌ها</h2>
        <div>
          <label htmlFor={selectId}>نوع رسانه</label>
          <select id={selectId} value={kind} onChange={(ev) => setKind(ev.target.value)}>
            <option value="">همهٔ رسانه‌ها</option>
            <option value="Image">عکس</option>
            <option value="Video">ویدئو</option>
            <option value="File">فایل</option>
          </select>
        </div>
      </div>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError && !items.length ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={c.media}>
            {items.length ? (
              items.map((item) => (
                <article key={item.sequence + ':' + item.attachment.fileAssetId}>
                  <MessageAttachment conversationId={id} asset={item.attachment} />
                  <small>{date(item.sentAtUtc, true)}</small>
                </article>
              ))
            ) : (
              <EmptyState title="رسانه‌ای در این بخش نیست" />
            )}
          </div>
          {q.isError && <ErrorState error={q.error} />}
          {q.hasNextPage && (
            <Button
              disabled={q.isFetchingNextPage}
              variant="outline"
              onClick={() => void q.fetchNextPage()}
            >
              {q.isFetchingNextPage ? 'در حال دریافت…' : 'نمایش بیشتر'}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
function ConversationSettings({ value }: { value: S['ManagedConversationResult'] }) {
  const visibilityId = useId(),
    historyId = useId();
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const owner = value.participants.some(
    (m) => m.user.userId === session.user.id && m.status === 'Active' && m.role === 'Owner',
  );
  const [baseline, setBaseline] = useState({
      visibility: value.visibility,
      history: value.groupHistoryPolicy,
      version: value.version,
    }),
    [visibility, setVisibility] = useState(value.visibility),
    [history, setHistory] = useState(value.groupHistoryPolicy),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState(false);
  const lock = useRef(false),
    dirty = visibility !== baseline.visibility || history !== baseline.history,
    stale = baseline.version !== value.version;
  useUnsavedChanges(dirty);
  if (!owner || value.managementPolicy !== 'UserManaged')
    return (
      <section className={c.panel}>
        <h2>تنظیمات گفتگو</h2>
        <p className={c.note}>
          تغییر این تنظیمات در این نما برای مالک فعالِ گروه یا کانال شخصی در دسترس است. مدیریت فضای
          رسمی از دسترسی آموزشی جداست.
        </p>
      </section>
    );
  return (
    <section className={c.panel}>
      <h2>تنظیمات گروه یا کانال</h2>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (lock.current || stale || !dirty) return;
          lock.current = true;
          setBusy(true);
          setError(undefined);
          setSuccess(false);
          try {
            const updated = await call<S['ManagedConversationResult']>(
              '/api/v1/conversations/' + value.conversationId + '/settings',
              {
                method: 'PATCH',
                body: JSON.stringify({
                  visibility,
                  groupHistoryPolicy: history,
                  memberCapabilities: value.memberCapabilities,
                  expectedVersion: baseline.version,
                }),
              },
            );
            const key = [
              'personal',
              session.user.id,
              session.revision,
              '/api/v1/conversations/' + value.conversationId,
            ];
            await cache.cancelQueries({ queryKey: key });
            cache.setQueryData(key, updated);
            setBaseline({
              visibility: updated.visibility,
              history: updated.groupHistoryPolicy,
              version: updated.version,
            });
            setVisibility(updated.visibility);
            setHistory(updated.groupHistoryPolicy);
            setSuccess(true);
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
            lock.current = false;
          }
        }}
      >
        <fieldset disabled={busy || stale} className={c.form}>
          <div>
            <label htmlFor={visibilityId}>نمایان‌بودن</label>
            <select
              id={visibilityId}
              value={visibility}
              onChange={(ev) => setVisibility(ev.target.value as S['ConversationVisibility'])}
            >
              <option value="Private">خصوصی</option>
              <option value="Public">عمومی</option>
            </select>
          </div>
          <div>
            <label htmlFor={historyId}>تاریخچه برای عضو جدید</label>
            <select
              id={historyId}
              value={history}
              onChange={(ev) => setHistory(ev.target.value as S['GroupHistoryPolicy'])}
            >
              <option value="FromJoin">از زمان عضویت</option>
              <option value="FullHistory">تاریخچهٔ کامل</option>
            </select>
          </div>
          <div className={c.actions}>
            <Button disabled={!dirty} type="submit">
              {busy ? 'در حال ثبت…' : 'ثبت تنظیمات گفتگو'}
            </Button>
          </div>
        </fieldset>
      </form>
      {stale && (
        <div role="alert">
          <p>نسخهٔ تنظیمات تغییر کرده؛ انتخاب شما حفظ شده است.</p>
          <ConfirmAction
            title="دریافت تنظیمات تازه"
            trigger="جایگزینی با نسخهٔ سرویس"
            description="تغییرات ثبت‌نشده با نسخهٔ تازهٔ سرویس جایگزین شوند؟"
            onConfirm={async () => {
              setVisibility(value.visibility);
              setHistory(value.groupHistoryPolicy);
              setBaseline({
                visibility: value.visibility,
                history: value.groupHistoryPolicy,
                version: value.version,
              });
              return true;
            }}
          />
        </div>
      )}
      {!!error && <ErrorState error={error} />}
      {success && <p role="status">تنظیمات گفتگو ثبت شد.</p>}
    </section>
  );
}
function ArchiveAction({ id, archived }: { id: string; archived: boolean }) {
  const { call, session } = usePersonal(),
    router = useRouter();
  const cache = useQueryClient();
  return (
    <div className={c.actions}>
      <ConfirmAction
        title={archived ? 'خروج از آرشیو' : 'آرشیو گفتگو'}
        trigger={archived ? 'بازگرداندن به گفتگوها' : 'آرشیو گفتگو'}
        description="فقط جای این گفتگو در فهرست شما تغییر می‌کند."
        onConfirm={async () => {
          await call('/api/v1/conversations/' + id + '/archive', {
            method: archived ? 'DELETE' : 'POST',
          });
          void cache.invalidateQueries({
            queryKey: ['personal', session.user.id, session.revision],
          });
          router.replace('/personal/messages' + (archived ? '' : '?filter=Archived'));
          return true;
        }}
      />
    </div>
  );
}
