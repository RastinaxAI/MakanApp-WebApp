'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/components/hooks/use-media-query';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { number } from '@/lib/formatting';
import { ApiError } from '@/lib/api/errors';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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
import { ConversationAvatar } from './conversation-photo';
import { usePersonal } from '../provider';
import { flattenAccountInbox } from './inbox-model';
import { ConversationRoom } from './conversation-room';
import { useMessagingLive } from './live';
import { useConversationSelection } from './selection';
import s from './messenger.module.css';
import t from './messaging-theme.module.css';
import { conversationTitle } from './model';
import { OfficialBadge } from './official';

const filterLabels = {
  All: uiText.text_15270886eadd,
  Direct: uiText.text_bb8b8f5b8bfc,
  Group: uiText.text_197ebc70e3d9,
  Channel: uiText.text_028b3c5809be,
  Unread: uiText.text_b3e662eb0f81,
  Archived: uiText.text_332d2faea0e2,
  Saved: uiText.text_7d24bb2778c3,
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
  const q = (search.get('q') ?? '').slice(0, 100),
    pageSize = 30;
  const cache = useQueryClient();
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
      '/api/v1/conversations/account',
      filter,
      q,
    ],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ Filter: filter, Limit: String(pageSize) });
      if (q) params.set('Search', q);
      if (pageParam) params.set('Cursor', pageParam);
      const result = await call<components['schemas']['AccountInboxPageResult']>(
        '/api/v1/conversations/account?' + params,
        { signal },
      );
      if (result.hasMore && (!result.nextCursor || result.nextCursor === pageParam))
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      return result;
    },
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    refetchInterval: 5000,
    retry: false,
  });
  function retryInbox() {
    if (inbox.error instanceof ApiError && [400, 409].includes(inbox.error.status)) {
      setRequestedPages(1);
      void cache.resetQueries({
        queryKey: [
          'personal',
          session.user.id,
          session.revision,
          '/api/v1/conversations/account',
          filter,
          q,
        ],
        exact: true,
      });
    } else void inbox.refetch();
  }
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
  const allRows = useMemo(() => flattenAccountInbox(inbox.data?.pages ?? []), [inbox.data]);
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
  const keepCachedInbox =
    !!inbox.data &&
    !(inbox.error instanceof ApiError && [401, 403, 404].includes(inbox.error.status));
  const displayId =
    conversationId ?? (wide && rows?.some((row) => row.conversationId === last) ? last : undefined);
  const selected = allRows.find((row) => row.conversationId === displayId);
  useEffect(() => {
    if (conversationId && allRows.some((row) => row.conversationId === conversationId))
      remember(conversationId);
  }, [conversationId, allRows, remember]);
  return (
    <div className={`${t.theme} ${s.messenger} ${displayId ? s.activeChat : ''}`} data-messenger>
      <section className={s.sidebar} aria-label={uiText.text_bf3af9311de4}>
        <header className={s.listHeader}>
          <div className={s.inboxHeading}>
            <h1>{uiText.navigation_messages}</h1>
            <p>{uiText.text_27e5b8a1c666}</p>
          </div>
          <Menu.Root dir="rtl">
            <Menu.Trigger asChild>
              <button className={s.floating} aria-label={uiText.text_449fa510fb42}>
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
                    {uiText.text_70c53f6a4727}
                  </Link>
                </Menu.Item>
                <Menu.Item asChild>
                  <Link href="/personal/messages/new?kind=channels">
                    <Megaphone size={17} />
                    {uiText.text_21579cd85bef}
                  </Link>
                </Menu.Item>
                <Menu.Item asChild>
                  <Link href="/personal/contacts">
                    <ContactRound size={17} />
                    {uiText.text_759044ca1d2d}
                  </Link>
                </Menu.Item>
                <Menu.Item onSelect={() => update('Direct')}>
                  <MessageCircle size={17} />
                  {uiText.text_114def302a70}
                </Menu.Item>
                <Menu.Item asChild>
                  <Link href="/personal/settings">
                    <Settings size={17} />
                    {uiText.text_feab3764e510}
                  </Link>
                </Menu.Item>
                <Menu.Item onSelect={() => update('Archived')}>
                  <Archive size={17} />
                  {uiText.text_332d2faea0e2}
                </Menu.Item>
                <Menu.Item onSelect={() => update('Saved')}>
                  <Bookmark size={17} />
                  {uiText.text_9f3597ff2f66}
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
              aria-label={uiText.text_b5159abdeeb1}
              placeholder={uiText.text_1d1dfb27d455}
              maxLength={100}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" aria-label={uiText.text_3fb47eb71ac7} className={s.searchSubmit}>
              <Search size={20} />
            </button>
          </div>
        </form>
        <nav className={s.filter} aria-label={uiText.text_6f9bc91900c3}>
          {(['All', 'Unread', 'Group', 'Channel'] as const).map((value) => (
            <button key={value} onClick={() => update(value)} aria-pressed={filter === value}>
              {filterLabels[value]}
            </button>
          ))}
        </nav>
        {!['All', 'Unread', 'Group', 'Channel'].includes(filter) && (
          <div className={s.filterTitle}>
            <strong>{filterLabels[filter]}</strong>
            <button onClick={() => update('All')}>{uiText.text_eaadb95c2b86}</button>
          </div>
        )}
        <div className={s.list}>
          {inbox.isError && keepCachedInbox && (
            <ErrorState error={inbox.error} onRetry={retryInbox} />
          )}
          {inbox.isPending ? (
            <LoadingSkeleton />
          ) : inbox.isError && !keepCachedInbox ? (
            <ErrorState error={inbox.error} onRetry={retryInbox} />
          ) : !rows?.length ? (
            <EmptyState
              title={q ? uiText.text_c8acf4fa9c84 : uiText.text_87fd15d4a2f2}
              description={q ? uiText.text_eb844d50a629 : uiText.text_127d28904712}
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
                  <span className={s.avatar} aria-label={uiText.text_9f3597ff2f66}>
                    <Bookmark size={28} fill="currentColor" />
                  </span>
                ) : row.type === 'Group' || row.type === 'Channel' ? (
                  <ConversationAvatar
                    id={row.conversationId}
                    photo={row.photo}
                    name={conversationTitle(row)}
                    className={s.avatar}
                  />
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
                      {row.isMuted && <BellOff size={12} aria-label={uiText.text_16be3d3db4fc} />}
                    </strong>
                    <time>{shortTime(row.lastMessageAtUtc)}</time>
                  </span>
                  {row.scope === 'Organization' && (
                    <small className={s.orgLabel}>
                      <Building2 size={12} />
                      {row.organization?.organizationName ?? uiText.text_7298890ac877}
                    </small>
                  )}
                  <OfficialBadge summary={row} />
                  <span className={s.row}>
                    <span className={s.preview}>
                      {row.lastMessagePreview ?? uiText.text_8253c0eeba70}
                    </span>
                    {row.unreadCount > 0 ? (
                      <b
                        className={s.unread}
                        aria-label={number(row.unreadCount) + uiText.text_a300d2d3e7cd}
                      >
                        {number(row.unreadCount)}
                      </b>
                    ) : row.isPinned ? (
                      <Pin size={14} aria-label={uiText.text_c52d80c47859} />
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
                {inbox.isFetchingNextPage ? uiText.text_80516c4adbbe : uiText.text_1e8ff49623b1}
              </Button>
            </div>
          )}
        </div>
        <footer className={s.sidebarFoot}>
          <Link href="/personal/settings">
            <Settings size={14} />
            {uiText.navigation_settings}
          </Link>
          <span>
            {inbox.isError
              ? uiText.text_a4770d022c38
              : inbox.isFetching
                ? uiText.text_41f38689a3ef
                : live.state === 'live'
                  ? uiText.text_7d870c3eb207
                  : live.state === 'connecting'
                    ? uiText.text_3b6b5e0a1c78
                    : uiText.text_ce167312e237}
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
          <h2>{uiText.text_3c2b5b61158e}</h2>
          <p>{uiText.text_6012e6a72455}</p>
          <Button asChild>
            <Link href="/personal/contacts">{uiText.text_9e9f0195605b}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
