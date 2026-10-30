'use client';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/components/hooks/use-media-query';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { number } from '@/lib/formatting';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Users,
  Archive,
  Bookmark,
  ContactRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProfileAvatar } from '../profile-photo';
import { usePersonal, usePersonalApi } from '../provider';
import { ConversationRoom } from './conversation-room';
import { useMessagingLive } from './live';
import { useConversationSelection } from './selection';
import s from './messenger.module.css';
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
  const { session } = usePersonal(),
    cache = useQueryClient(),
    router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const requested = search.get('filter') ?? 'All';
  const organizationView =
    search.get('view') === 'organization' && session.context.workspaceType === 'Organization';
  const filter = requested in filterLabels ? (requested as keyof typeof filterLabels) : 'All';
  const requestedPage = Number(search.get('page'));
  const q = search.get('q') ?? '',
    page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize = 30;
  const [draft, setDraft] = useState(q),
    [hidden, setHidden] = useState<Set<string>>(() => new Set());
  useEffect(() => setDraft(q), [q]);
  const params = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) });
  if (q) params.set('q', q);
  const routeParams = new URLSearchParams(params);
  if (organizationView) routeParams.set('view', 'organization');
  const inboxParams = new URLSearchParams(params);
  if (!organizationView) inboxParams.set('scope', 'Personal');
  const inbox = usePersonalApi<Summary[]>('/api/v1/conversations?' + inboxParams, { poll: 5000 });
  const unavailable = useCallback(
    (id: string) => {
      setHidden((previous) => (previous.has(id) ? previous : new Set([...previous, id])));
      cache.setQueriesData<Summary[]>(
        {
          queryKey: ['personal', session.user.id, session.revision],
          predicate: (query) =>
            query.queryKey.some(
              (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations?'),
            ),
        },
        (previous) => previous?.filter((row) => row.conversationId !== id),
      );
    },
    [cache, session.user.id, session.revision],
  );
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
  function update(nextFilter: typeof filter, nextQuery = q, nextPage = 1) {
    const next = new URLSearchParams({ filter: nextFilter, page: String(nextPage) });
    if (organizationView) next.set('view', 'organization');
    if (nextQuery) next.set('q', nextQuery);
    router.push(pathname + '?' + next, { scroll: false });
  }
  const rows = inbox.data?.filter((row) => !hidden.has(row.conversationId));
  const displayId =
    conversationId ?? (wide && rows?.some((row) => row.conversationId === last) ? last : undefined);
  const selected = inbox.data?.find((row) => row.conversationId === displayId);
  useEffect(() => {
    if (conversationId && inbox.data?.some((row) => row.conversationId === conversationId))
      remember(conversationId);
  }, [conversationId, inbox.data, remember]);
  return (
    <div className={`${s.messenger} ${displayId ? s.activeChat : ''}`}>
      <section className={s.sidebar} aria-label="فهرست گفتگوها">
        <h1 className="sr-only">پیام‌ها</h1>
        {session.context.workspaceType === 'Organization' && (
          <nav className={s.scopeSwitch} aria-label="فضای گفتگوها">
            <Link href="/personal/messages" aria-current={!organizationView ? 'page' : undefined}>
              شخصی
            </Link>
            <Link
              href="/personal/messages?view=organization"
              aria-current={organizationView ? 'page' : undefined}
            >
              آموزشگاه
            </Link>
          </nav>
        )}
        <form
          className={s.search}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update(filter, draft.trim());
          }}
        >
          <Search size={18} />
          <input
            aria-label="جستجوی گفتگوها"
            placeholder="جستجو در پیام‌ها"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="انجام جستجوی گفتگو" className={s.searchSubmit}>
            <ChevronLeft size={19} />
          </button>
        </form>
        <nav className={s.filter} aria-label="نوع گفتگوها">
          {(['All', 'Direct', 'Group', 'Channel'] as const).map((value) => (
            <button key={value} onClick={() => update(value)} aria-pressed={filter === value}>
              {value === 'Direct' && !organizationView ? 'شخصی' : filterLabels[value]}
            </button>
          ))}
        </nav>
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
                  : organizationView
                    ? 'گروه و کانال رسمی را از صفحهٔ آموزشگاه یا کلاس باز کنید.'
                    : 'از دکمهٔ پایین برای شروع ارتباط استفاده کنید.'
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
                <ProfileAvatar
                  photo={row.type === 'Direct' ? row.otherParticipant?.profilePhoto : undefined}
                  name={conversationTitle(row)}
                  className={`${s.avatar} ${row.scope === 'Organization' ? s.organizationAvatar : ''}`}
                />
                <span className={s.chatSummary}>
                  <span className={s.row}>
                    <strong>{conversationTitle(row)}</strong>
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
                    {row.unreadCount > 0 && <b className={s.unread}>{number(row.unreadCount)}</b>}
                  </span>
                </span>
              </Link>
            ))
          )}
          {(page > 1 || inbox.data?.length === pageSize) && (
            <div className={s.paging}>
              <Button
                size="icon"
                variant="ghost"
                aria-label="صفحهٔ قبلی گفتگوها"
                disabled={page <= 1 || inbox.isFetching}
                onClick={() => update(filter, q, page - 1)}
              >
                <ChevronRight size={18} />
              </Button>
              <span>صفحهٔ {number(page)}</span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="صفحهٔ بعدی گفتگوها"
                disabled={!inbox.data || inbox.data.length < pageSize || inbox.isFetching}
                onClick={() => update(filter, q, page + 1)}
              >
                <ChevronLeft size={18} />
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
        <Menu.Root dir="rtl">
          <Menu.Trigger asChild>
            <button className={s.floating} aria-label="ایجاد گفت‌وگو یا مخاطب">
              <Plus size={22} />
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content className="dropdown" side="top" align="start" sideOffset={8}>
              <Menu.Item asChild>
                <Link href="/personal/messages/new?kind=groups">
                  <Users size={17} />
                  ایجاد گروه
                </Link>
              </Menu.Item>
              <Menu.Item asChild>
                <Link href="/personal/messages/new?kind=channels">
                  <MessageCircle size={17} />
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
