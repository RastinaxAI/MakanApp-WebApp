'use client';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/components/hooks/use-media-query';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { number } from '@/lib/formatting';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Building2,
  MessageCircle,
  SquarePen,
  BellOff,
  Pin,
  Megaphone,
  Search,
  Settings,
  Users,
  Archive,
  Bookmark,
  ContactRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileAvatar } from '../profile-photo';
import { usePersonal } from '../provider';
import { mergeInboxPages } from './inbox-model';
import { ConversationRoom } from './conversation-room';
import { useMessagingLive } from './live';
import { useConversationSelection } from './selection';
import s from './messenger.module.css';
import t from './messaging-theme.module.css';
import { conversationTitle } from './model';
import { OfficialBadge } from './official';
type Summary = components['schemas']['ConversationSummaryResult'];

const filterLabels = {
  All: 'همه',
  Direct: 'مستقیم',
  Group: 'گروه‌ها',
  Channel: 'کانال‌ها',
  Unread: 'خوانده‌نشده',
  Archived: 'آرشیو',
  Saved: 'ذخیره‌شده',
} as const;
function shortTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('fa-IR', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '';
}
export function Messenger({ conversationId }: { conversationId?: string }) {
  return <ContextMessenger conversationId={conversationId} />;
}
function ContextMessenger({ conversationId }: { conversationId?: string }) {
  const { last, remember } = useConversationSelection();
  const wide = useMediaQuery('(min-width:768px)');
  const live = useMessagingLive();
  const { session, call } = usePersonal(),
    router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const requested = search.get('filter') ?? 'All';
  const filter = requested in filterLabels ? (requested as keyof typeof filterLabels) : 'All';
  const q = search.get('q') ?? '',
    pageSize = 30;
  const [requestedPages, setRequestedPages] = useState(1);
  useEffect(() => setRequestedPages(1), [filter, q]);
  const [draft, setDraft] = useState(q),
    [hidden, setHidden] = useState<Set<string>>(() => new Set());
  useEffect(() => setDraft(q), [q]);
  const routeParams = new URLSearchParams({ filter });
  if (q) routeParams.set('q', q);
  const inbox = useInfiniteQuery({
    queryKey: [
      'personal',
      session.user.id,
      session.revision,
      '/api/v1/conversations?unified=1',
      filter,
      q,
    ],
    initialPageParam: { personal: 1 as number | null, organization: 1 as number | null },
    queryFn: async ({ pageParam, signal }) => {
      const read = async (scope: 'Personal' | 'Organization', page: number | null) => {
        if (
          page === null ||
          (scope === 'Organization' && session.context.workspaceType !== 'Organization')
        )
          return [];
        const params = new URLSearchParams({
          filter,
          page: String(page),
          pageSize: String(pageSize),
          scope,
        });
        if (q) params.set('q', q);
        return call<Summary[]>('/api/v1/conversations?' + params, { signal });
      };
      const [personal, organization] = await Promise.all([
        read('Personal', pageParam.personal),
        read('Organization', pageParam.organization),
      ]);
      return {
        items: [...personal, ...organization],
        next: {
          personal:
            personal.length === pageSize && pageParam.personal !== null
              ? pageParam.personal + 1
              : null,
          organization:
            organization.length === pageSize && pageParam.organization !== null
              ? pageParam.organization + 1
              : null,
        },
      };
    },
    getNextPageParam: (last) =>
      last.next.personal !== null || last.next.organization !== null ? last.next : undefined,
    refetchInterval: 5000,
    retry: false,
  });
  // A live invalidation may cancel fetchNextPage. Preserve the user's load intent
  // until that page is actually cached; never cancel an active refresh to append it.
  useEffect(() => {
    if (
      !inbox.isFetching &&
      !inbox.isError &&
      inbox.hasNextPage &&
      inbox.data &&
      inbox.data.pages.length < requestedPages
    )
      void inbox.fetchNextPage({ cancelRefetch: false });
  }, [inbox, requestedPages]);
  const allRows = useMemo(
    () => mergeInboxPages(inbox.data?.pages.map((p) => p.items) ?? []),
    [inbox.data],
  );
  const unavailable = useCallback((id: string) => {
    setHidden((previous) => (previous.has(id) ? previous : new Set([...previous, id])));
  }, []);
  const available = useCallback(
    (id: string) =>
      setHidden((previous) => {
        if (!previous.has(id)) return previous;
        const next = new Set(previous);
        next.delete(id);
        return next;
      }),
    [],
  );
  function update(nextFilter: typeof filter, nextQuery = q) {
    const next = new URLSearchParams({ filter: nextFilter });
    if (nextQuery) next.set('q', nextQuery);
    router.push(pathname + '?' + next, { scroll: false });
  }
  const rows = allRows.filter((row) => !hidden.has(row.conversationId));
  const displayId =
    conversationId ?? (wide && rows?.some((row) => row.conversationId === last) ? last : undefined);
  const selected = allRows.find((row) => row.conversationId === displayId);
  useEffect(() => {
    if (conversationId && allRows.some((row) => row.conversationId === conversationId))
      remember(conversationId);
  }, [conversationId, allRows, remember]);
  return (
    <div className={`${t.theme} ${s.messenger} ${displayId ? s.activeChat : ''}`} data-messenger>
      <section className={s.sidebar} aria-label="فهرست گفتگوها">
        <header className={s.listHeader}>
          <h1>پیام‌ها</h1>
          <Link href="/personal/settings" aria-label="تنظیمات پیام‌رسان">
            <Settings size={22} />
          </Link>
          <Menu.Root dir="rtl">
            <Menu.Trigger asChild>
              <button className={s.floating} aria-label="ایجاد گفت‌وگو یا مخاطب">
                <SquarePen size={23} />
              </button>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content
                className={`dropdown ${t.theme} ${t.menu}`}
                side="top"
                align="end"
                sideOffset={8}
              >
                <Menu.Item asChild>
                  <Link href="/personal/messages/new?kind=groups">
                    <Users size={17} />
                    ایجاد گروه
                  </Link>
                </Menu.Item>
                <Menu.Item asChild>
                  <Link href="/personal/messages/new?kind=channels">
                    <Megaphone size={17} />
                    ایجاد کانال
                  </Link>
                </Menu.Item>
                <Menu.Item asChild>
                  <Link href="/personal/contacts">
                    <ContactRound size={17} />
                    مخاطبین
                  </Link>
                </Menu.Item>
                <Menu.Item onSelect={() => update('Archived')}>
                  <Archive size={17} />
                  آرشیو
                </Menu.Item>
                <Menu.Item onSelect={() => update('Saved')}>
                  <Bookmark size={17} />
                  پیام‌های ذخیره‌شده
                </Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </header>
        <form
          className={s.search}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update(filter, draft.trim());
          }}
        >
          <div className={s.searchField}>
            <input
              aria-label="جستجوی گفتگوها"
              placeholder="جستجو در پیام‌ها"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" aria-label="انجام جستجوی گفتگو" className={s.searchSubmit}>
              <Search size={20} />
            </button>
          </div>
        </form>
        <nav className={s.filter} aria-label="نوع گفتگوها">
          {(['All', 'Direct', 'Group', 'Channel'] as const).map((value) => (
            <button key={value} onClick={() => update(value)} aria-pressed={filter === value}>
              {filterLabels[value]}
            </button>
          ))}
        </nav>
        {!['All', 'Direct', 'Group', 'Channel'].includes(filter) && (
          <div className={s.filterTitle}>
            <strong>{filterLabels[filter]}</strong>
            <button onClick={() => update('All')}>همهٔ گفتگوها</button>
          </div>
        )}
        <div className={s.list}>
          {inbox.isPending ? (
            <LoadingSkeleton />
          ) : inbox.isError ? (
            <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
          ) : !rows?.length ? (
            <EmptyState
              title={q ? 'گفت‌وگویی پیدا نشد' : 'این فهرست گفت‌وگویی ندارد'}
              description={
                q
                  ? 'عبارت جستجو یا نوع گفتگو را تغییر دهید.'
                  : 'از دکمهٔ نوشتن بالای فهرست، گفت‌وگویی شروع کنید.'
              }
            />
          ) : (
            rows.map((row) => (
              <Link
                key={row.conversationId}
                href={'/personal/messages/' + row.conversationId + '?' + routeParams}
                className={`${s.chatItem} ${row.conversationId === displayId ? s.selected : ''}`}
                aria-current={row.conversationId === displayId ? 'page' : undefined}
              >
                {row.type === 'Saved' ? (
                  <span className={s.avatar} aria-label="پیام‌های ذخیره‌شده">
                    <Bookmark size={28} fill="currentColor" />
                  </span>
                ) : (
                  <ProfileAvatar
                    photo={row.type === 'Direct' ? row.otherParticipant?.profilePhoto : undefined}
                    name={conversationTitle(row)}
                    className={`${s.avatar} ${row.scope === 'Organization' ? s.organizationAvatar : ''}`}
                  />
                )}
                <span className={s.chatSummary}>
                  <span className={s.row}>
                    <strong dir="auto">
                      {conversationTitle(row)}{' '}
                      {row.isMuted && <BellOff size={12} aria-label="بی‌صدا" />}
                    </strong>
                    <time>{shortTime(row.lastMessageAtUtc)}</time>
                  </span>
                  {row.scope === 'Organization' && (
                    <small className={s.orgLabel}>
                      <Building2 size={12} />
                      {row.organization?.organizationName ?? 'فضای آموزشگاه'}
                    </small>
                  )}
                  <OfficialBadge summary={row} />
                  <span className={s.row}>
                    <span className={s.preview}>
                      {row.lastMessagePreview ?? 'هنوز پیامی ثبت نشده'}
                    </span>
                    {row.unreadCount > 0 ? (
                      <b
                        className={s.unread}
                        aria-label={number(row.unreadCount) + ' پیام خوانده‌نشده'}
                      >
                        {number(row.unreadCount)}
                      </b>
                    ) : row.isPinned ? (
                      <Pin size={14} aria-label="سنجاق‌شده" />
                    ) : null}
                  </span>
                </span>
              </Link>
            ))
          )}
          {inbox.hasNextPage && (
            <div className={s.paging}>
              <Button
                variant="ghost"
                disabled={inbox.isFetchingNextPage}
                onClick={() => {
                  // A background refresh must not disable the button between pointer down/up.
                  // Queue the user's intent and append after that refresh has finished.
                  setRequestedPages((inbox.data?.pages.length ?? 1) + 1);
                  if (inbox.isError) void inbox.fetchNextPage({ cancelRefetch: false });
                }}
              >
                {inbox.isFetchingNextPage ? 'در حال دریافت…' : 'گفتگوهای بیشتر'}
              </Button>
            </div>
          )}
        </div>
        <footer className={s.sidebarFoot}>
          <Link href="/personal/settings">
            <Settings size={14} />
            تنظیمات
          </Link>
          <span>
            {inbox.isError
              ? 'دریافت اطلاعات انجام نشد'
              : inbox.isFetching
                ? 'در حال تازه‌سازی…'
                : live.state === 'live'
                  ? 'ارتباط زنده برقرار است'
                  : live.state === 'connecting'
                    ? 'در حال برقراری ارتباط زنده…'
                    : 'به‌روزرسانی دوره‌ای فعال'}
          </span>
        </footer>
      </section>
      {displayId ? (
        <ConversationRoom
          key={displayId}
          id={displayId}
          summary={selected}
          onUnavailable={unavailable}
          onAvailable={available}
        />
      ) : (
        <div className={s.emptyRoom}>
          <span>
            <MessageCircle size={40} />
          </span>
          <h2>گفت‌وگو از همین‌جا شروع می‌شود</h2>
          <p>یک گفتگو را باز کنید یا از دفترچهٔ مخاطبین، ارتباط تازه‌ای بسازید.</p>
          <Button asChild>
            <Link href="/personal/contacts">مشاهدهٔ مخاطبین</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
