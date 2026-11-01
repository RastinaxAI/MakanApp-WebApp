'use client';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { date, number } from '@/lib/formatting';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpLeft,
  Building2,
  Check,
  CheckCheck,
  Clock,
  Send,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProfileAvatar } from '../profile-photo';
import { usePersonal, usePersonalApi } from '../provider';
import { useMessagingLive } from './live';
import { AttachmentPicker, AttachmentSummary, MessageAttachment } from './media';
import { attachmentMessageKind, attachmentMetadata, type FileAsset } from './media-model';
import s from './messenger.module.css';
import {
  canAttachConversation,
  canWriteConversation,
  conversationRoleLabels,
  conversationTitle,
  mediaRestricted,
  visibleReply,
} from './model';
import { personalMessageQueue, type QueuedMessage } from './outbox';
import { findConversationSummary, isManagedConversation } from './summary';
import { OfficialBadge, useOfficialConversationAccess } from './official';
import { AcademicActivity } from './academic-activity';
import { ConversationActions } from './conversation-actions';
import { MessageBubble } from './message-bubble';
import { visibleLocalMessages, type AcknowledgedMessage } from './message-reconciliation';
type Summary = components['schemas']['ConversationSummaryResult'];
type Message = components['schemas']['ConversationMessageResult'];

function shortTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('fa-IR', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '';
}

export function ConversationRoom({
  id,
  summary,
  onUnavailable,
  onAvailable,
}: {
  id: string;
  summary: Summary | undefined;
  onUnavailable: (id: string) => void;
  onAvailable: (id: string) => void;
}) {
  const { session, call } = usePersonal();
  const lookup = useQuery({
    queryKey: ['personal', session.user.id, session.revision, 'conversation-summary', id],
    queryFn: ({ signal }) =>
      findConversationSummary(id, (path) => call<Summary>(path, { signal }), signal),
    enabled: !summary,
    retry: false,
  });
  const resolved = summary ?? lookup.data;
  if (!resolved)
    return (
      <div className={s.roomState}>
        <PageBack href="/personal/messages" />
        {lookup.isError ? (
          <ErrorState error={lookup.error} onRetry={() => void lookup.refetch()} />
        ) : (
          <LoadingSkeleton />
        )}
      </div>
    );
  return (
    <ResolvedConversationRoom
      id={id}
      summary={resolved}
      onUnavailable={onUnavailable}
      onAvailable={onAvailable}
    />
  );
}
function ResolvedConversationRoom({
  id,
  summary,
  onUnavailable,
  onAvailable,
}: {
  id: string;
  summary: Summary;
  onUnavailable: (id: string) => void;
  onAvailable: (id: string) => void;
}) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const managed = isManagedConversation(summary.type);
  const officialAccess = useOfficialConversationAccess(summary);
  const metadata = usePersonalApi<components['schemas']['ManagedConversationResult']>(
    '/api/v1/conversations/' + id,
    { enabled: managed, poll: 5000 },
  );
  const membership = metadata.data?.participants.find(
    (member) => member.user.userId === session.user.id,
  );
  const forbidden =
    (managed &&
      ((metadata.error instanceof ApiError && [403, 404].includes(metadata.error.status)) ||
        (metadata.data?.scope === 'Organization' && membership?.status !== 'Active'))) ||
    (officialAccess.declared &&
      officialAccess.error instanceof ApiError &&
      [403, 404].includes(officialAccess.error.status));
  const ready = (!managed || metadata.isSuccess) && officialAccess.ready;
  const conversation = managed ? metadata.data : summary;
  const enabled = ready && !forbidden;
  const { subscribe } = useMessagingLive();
  useEffect(() => {
    if (enabled) return subscribe(id);
  }, [enabled, id, subscribe]);
  const history = useInfiniteQuery({
    queryKey: ['personal', session.user.id, session.revision, 'messages', id],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam, signal }) =>
      call<components['schemas']['ConversationMessagePageResult']>(
        '/api/v1/conversations/' +
          id +
          '/messages?' +
          new URLSearchParams({
            limit: '30',
            ...(pageParam === null ? {} : { beforeSequence: String(pageParam) }),
          }),
        { signal },
      ),
    getNextPageParam: (last) => last.nextBeforeSequence ?? undefined,
    enabled,
    refetchInterval: 5000,
    retry: false,
  });
  const reads = usePersonalApi<components['schemas']['ConversationPeerReadStateResult']>(
    '/api/v1/conversations/' + id + '/read-states',
    { enabled: enabled && summary.type === 'Direct', poll: 5000 },
  );
  const messages = useMemo(() => {
    const records = new Map<string, Message>();
    for (const page of history.data?.pages ?? [])
      for (const message of page.messages) records.set(message.messageId, message);
    return [...records.values()].sort((a, b) => a.sequence - b.sequence);
  }, [history.data]);
  const [draft, setDraft] = useState(''),
    [reply, setReply] = useState<Message | null>(null),
    [pending, setPending] = useState<QueuedMessage[]>([]),
    [sending, setSending] = useState<string | null>(null),
    [error, setError] = useState<unknown>(),
    [readError, setReadError] = useState<unknown>(),
    [atBottom, setAtBottom] = useState(false),
    [acknowledged, setAcknowledged] = useState<AcknowledgedMessage[]>([]),
    [now, setNow] = useState(Date.now());
  const bottom = useRef<HTMLDivElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    scroller = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    initial = useRef(true),
    lastReadAttempt = useRef(0),
    currentRef = useRef(true),
    operationInFlight = useRef(false);
  const currentReply = reply
    ? messages.find((message) => message.messageId === reply.messageId)
    : null;
  useEffect(() => {
    const node = composer.current;
    if (node) {
      node.style.height = '42px';
      node.style.height = Math.min(120, node.scrollHeight) + 'px';
    }
  }, [draft]);
  const scopeKey =
    conversation?.scope === 'Personal' ? 'Personal' : contextSignature(session.context);
  const owner = { userId: session.user.id, conversationId: id, scopeKey };
  const localMessages = useMemo(
    () => visibleLocalMessages(messages, acknowledged, pending, session.user.id, id),
    [messages, acknowledged, pending, session.user.id, id],
  );
  const matchingOrganization =
    !conversation ||
    conversation.scope === 'Personal' ||
    (session.context.workspaceType === 'Organization' &&
      session.context.organizationId === conversation.organizationId);
  const writable =
    matchingOrganization &&
    (officialAccess.declared
      ? officialAccess.canSend && history.isSuccess
      : managed
        ? !!metadata.data && canWriteConversation(metadata.data, session.user.id)
        : history.isSuccess && !history.isError);
  const needsRestriction = managed;
  const restriction = usePersonalApi<components['schemas']['MemberRestrictionResult']>(
    '/api/v1/conversations/' + id + '/me/restriction',
    { enabled: enabled && needsRestriction, poll: 5000 },
  );
  const canMedia =
    !!conversation &&
    matchingOrganization &&
    officialAccess.canSend &&
    (managed
      ? !!metadata.data && canAttachConversation(metadata.data, session.user.id)
      : writable) &&
    (!needsRestriction ||
      (restriction.isSuccess &&
        restriction.data.conversationId === id &&
        restriction.data.userId === session.user.id &&
        !mediaRestricted(restriction.data)));
  const messageDenied =
    history.error instanceof ApiError && [403, 404].includes(history.error.status);
  useEffect(() => {
    currentRef.current = true;
    return () => {
      currentRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (forbidden || messageDenied) onUnavailable(id);
    else if (ready && history.isSuccess) onAvailable(id);
  }, [forbidden, messageDenied, ready, history.isSuccess, id, onUnavailable, onAvailable]);
  const loadPending = useCallback(async () => {
    const rows = await personalMessageQueue.list(session.user.id, id, scopeKey);
    if (currentRef.current) setPending(rows);
  }, [session.user.id, id, scopeKey]);
  useEffect(() => {
    if (enabled) void loadPending().catch(setError);
  }, [loadPending, enabled]);
  useEffect(() => {
    if (!pending.some((message) => message.retryAt && message.retryAt > now)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending, now]);
  useEffect(() => {
    if (!enabled || !history.isSuccess) return;
    let alive = true;
    void (async () => {
      const own = messages.filter((message) => message.senderUserId === session.user.id);
      const queued = await personalMessageQueue.list(session.user.id, id, scopeKey);
      for (const message of queued)
        if (own.some((server) => server.clientMessageId === message.id))
          await personalMessageQueue.remove(message.id);
      if (alive) {
        await loadPending();
        setAcknowledged((previous) =>
          previous.filter(
            (item) =>
              !own.some((server) => server.clientMessageId === item.receipt.clientMessageId),
          ),
        );
      }
    })().catch((error) => {
      if (alive) setError(error);
    });
    return () => {
      alive = false;
    };
  }, [messages, session.user.id, id, scopeKey, enabled, history.isSuccess, loadPending]);
  useEffect(() => {
    if (initial.current || nearBottom.current) {
      bottom.current?.scrollIntoView({ block: 'nearest' });
      setAtBottom(true);
      initial.current = false;
    }
  }, [messages.length, pending.length, acknowledged.length]);
  async function refresh() {
    await Promise.all([
      ...(officialAccess.declared ? [officialAccess.refetch()] : []),
      history.refetch(),
      ...(managed ? [metadata.refetch()] : []),
      cache.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations?'),
          ),
      }),
    ]);
  }
  async function markRead(sequence: number) {
    lastReadAttempt.current = sequence;
    try {
      await call('/api/v1/conversations/' + id + '/read', {
        method: 'POST',
        body: JSON.stringify({
          upToMessageSequence: sequence,
        } satisfies components['schemas']['AdvanceConversationCursorCommand']),
      });
      if (currentRef.current) setReadError(undefined);
      await cache.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations?'),
          ),
      });
    } catch (error) {
      if (currentRef.current) setReadError(error);
    }
  }
  const maxSequence = messages.at(-1)?.sequence ?? 0;
  useEffect(() => {
    if (
      enabled &&
      history.isSuccess &&
      !history.isError &&
      atBottom &&
      document.visibilityState === 'visible' &&
      maxSequence > lastReadAttempt.current
    )
      void markRead(maxSequence);
  }, [maxSequence, enabled, history.isSuccess, history.isError, atBottom]);
  async function transmit(message: QueuedMessage, claimed = false) {
    if (!currentRef.current || (!claimed && operationInFlight.current) || !writable || !enabled)
      return;
    operationInFlight.current = true;
    setSending(message.id);
    setError(undefined);
    try {
      const receipt = await personalMessageQueue.send(message, owner, (command) =>
        call('/api/v1/conversations/' + id + '/messages', {
          method: 'POST',
          body: JSON.stringify(command),
        }),
      );
      if (currentRef.current)
        setAcknowledged((previous) => [
          ...previous.filter((item) => item.receipt.clientMessageId !== receipt.clientMessageId),
          { receipt, text: message.command.text ?? '', attachments: message.attachments },
        ]);
      await refresh();
    } catch (error) {
      if (currentRef.current) setError(error);
    } finally {
      if (currentRef.current) {
        await loadPending().catch(setError);
      }
      operationInFlight.current = false;
      if (currentRef.current) setSending(null);
    }
  }
  async function send(assets: FileAsset[] = [], caption?: string): Promise<boolean> {
    const text = (caption ?? draft).trim();
    if (
      (!text && !assets.length) ||
      operationInFlight.current ||
      !writable ||
      !enabled ||
      (assets.length > 0 && !canMedia)
    )
      return false;
    operationInFlight.current = true;
    const clientMessageId = crypto.randomUUID();
    setSending(clientMessageId);
    const message: QueuedMessage = {
      id: clientMessageId,
      ...owner,
      command: {
        clientMessageId,
        kind: assets.length ? attachmentMessageKind(assets) : 'Text',
        text: text || null,
        attachmentIds: assets.length ? assets.map((asset) => asset.id) : null,
        replyToMessageId: reply?.messageId ?? null,
      },
      createdAt: new Date().toISOString(),
      state: 'sending',
      attachments: assets.length ? assets.map(attachmentMetadata) : undefined,
    };
    try {
      await personalMessageQueue.put(message);
      if (!currentRef.current) {
        operationInFlight.current = false;
        return false;
      }
      setDraft('');
      setReply(null);
      await loadPending();
      await transmit(message, true);
      return true;
    } catch (error) {
      operationInFlight.current = false;
      if (currentRef.current) setError(error);
      if (currentRef.current) setSending(null);
      return false;
    }
  }
  const name = summary ? conversationTitle(summary) : metadata.data?.title || 'گفت‌وگو';
  const peerRead =
    reads.data?.conversationId === id && reads.data.visibility === 'Visible'
      ? reads.data.peerReadThroughSequence
      : null;
  if (
    (managed && metadata.isPending) ||
    (officialAccess.declared && !officialAccess.ready && !officialAccess.error)
  )
    return (
      <div className={s.roomState}>
        <PageBack
          href={
            summary.scope === 'Organization'
              ? '/personal/messages?view=organization'
              : '/personal/messages'
          }
        />
        <LoadingSkeleton />
      </div>
    );
  if ((managed && metadata.isError) || forbidden || messageDenied || officialAccess.error)
    return (
      <div className={s.roomState}>
        <PageBack
          href={
            summary.scope === 'Organization'
              ? '/personal/messages?view=organization'
              : '/personal/messages'
          }
        />
        <ErrorState
          error={officialAccess.error ?? metadata.error ?? history.error ?? new ApiError(403)}
          onRetry={() => void refresh()}
        />
      </div>
    );
  if (!conversation) return null;
  return (
    <>
      <section
        className={s.room}
        data-message-room
        data-scope={conversation.scope}
        aria-label={'گفتگو با ' + name}
      >
        <header className={s.roomHeader} data-chat-header>
          <Button asChild className={s.back} size="icon" variant="ghost">
            <Link
              href={
                summary.scope === 'Organization'
                  ? '/personal/messages?view=organization'
                  : '/personal/messages'
              }
              aria-label="بازگشت به فهرست گفتگوها"
            >
              <ArrowRight size={21} />
            </Link>
          </Button>
          <Link
            className={s.identity}
            href={`/personal/messages/${id}/info`}
            aria-label="اطلاعات گفتگو"
          >
            <ProfileAvatar
              photo={
                conversation.type === 'Direct'
                  ? summary.otherParticipant?.profilePhoto
                  : conversation.type === 'Saved'
                    ? session.user.profilePhoto
                    : undefined
              }
              name={name}
              className={s.avatar}
            />
            <div className={s.identityText}>
              <h2 dir="auto">{name}</h2>
              <OfficialBadge summary={summary} />
              <span className={s.identitySubtitle}>
                {conversation.type === 'Direct'
                  ? 'گفت‌وگوی مستقیم'
                  : conversation.type === 'Saved'
                    ? 'یادداشت‌های شخصی'
                    : conversation.type === 'Channel'
                      ? 'کانال'
                      : 'گروه'}
              </span>
            </div>
          </Link>
          <ConversationActions id={id} managed={isManagedConversation(conversation.type)} />
        </header>
        <div className={s.scope}>
          <Building2 size={14} />
          {conversation.scope === 'Personal'
            ? 'فضای شخصی · مستقل از عضویت آموزشگاهی'
            : (summary?.organization?.organizationName ?? 'فضای آموزشگاه')}
        </div>
        <div
          className={s.history}
          ref={scroller}
          onScroll={() => {
            const node = scroller.current;
            if (node) {
              nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
              setAtBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 24);
            }
          }}
          aria-label="پیام‌های گفتگو"
          tabIndex={0}
        >
          {history.isPending ? (
            <LoadingSkeleton />
          ) : history.isError && !history.data ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : (
            <>
              {history.isError && (
                <ErrorState error={history.error} onRetry={() => void history.refetch()} />
              )}
              {history.hasNextPage && (
                <Button
                  className={s.older}
                  variant="outline"
                  disabled={history.isFetchingNextPage}
                  onClick={() => void history.fetchNextPage()}
                >
                  {history.isFetchingNextPage ? 'در حال دریافت…' : 'پیام‌های قدیمی‌تر'}
                </Button>
              )}
              {!messages.length &&
                !localMessages.acknowledged.length &&
                !localMessages.pending.length && (
                  <EmptyState
                    title="هنوز پیامی ثبت نشده است"
                    description="اگر ارسال با حساب فعلی مجاز باشد، گفتگو را از پایین صفحه شروع کنید."
                  />
                )}
              {messages.map((message, index) => {
                const own = message.senderUserId === session.user.id;
                return (
                  <Fragment key={message.messageId}>
                    {(index === 0 ||
                      date(messages[index - 1].sentAtUtc) !== date(message.sentAtUtc)) && (
                      <p className={s.dayDivider}>
                        {date(message.sentAtUtc) === date(new Date().toISOString())
                          ? 'امروز'
                          : date(message.sentAtUtc)}
                      </p>
                    )}
                    <MessageBubble
                      own={own}
                      sequence={message.sequence}
                      text={message.isDeleted ? null : message.text}
                      onReply={
                        !message.isDeleted && writable
                          ? () => {
                              setReply(message);
                              composer.current?.focus();
                            }
                          : undefined
                      }
                    >
                      {conversation.type === 'Group' && !own && (
                        <span className={s.messageSender}>{message.sender.displayName}</span>
                      )}
                      {message.reply && <blockquote>{visibleReply(message.reply)}</blockquote>}
                      {!message.isDeleted &&
                      message.originKind === 'System' &&
                      message.academicActivity ? (
                        <AcademicActivity message={message} summary={summary} onRefresh={refresh} />
                      ) : (
                        (message.isDeleted || message.text || !message.attachments.length) && (
                          <p dir="auto">
                            {message.isDeleted
                              ? 'این پیام حذف شده است'
                              : (message.text ??
                                (message.attachments.length
                                  ? 'پیوست فایل'
                                  : message.kind === 'Poll'
                                    ? 'نظرسنجی'
                                    : message.kind === 'Checklist'
                                      ? 'فهرست کارها'
                                      : 'پیام'))}
                          </p>
                        )
                      )}
                      {!message.isDeleted && message.attachments.length > 0 && (
                        <div
                          className={s.attachments}
                          data-gallery={
                            message.attachments.length > 1 &&
                            message.attachments.every((asset) =>
                              asset.contentType.startsWith('image/'),
                            )
                              ? true
                              : undefined
                          }
                        >
                          {message.attachments.map((asset) => (
                            <MessageAttachment
                              key={asset.fileAssetId}
                              asset={asset}
                              conversationId={id}
                            />
                          ))}
                        </div>
                      )}
                      <div className={s.messageMeta}>
                        <time title={date(message.sentAtUtc, true)}>
                          {shortTime(message.sentAtUtc)}
                          {message.isEdited ? ' · ویرایش‌شده' : ''}
                        </time>
                        {own &&
                          (peerRead !== null &&
                          peerRead !== undefined &&
                          peerRead >= message.sequence ? (
                            <CheckCheck
                              className={s.readTick}
                              size={16}
                              aria-label="خوانده‌شدن مطابق وضعیت مجاز سرور"
                            />
                          ) : (
                            <Check size={15} aria-label="ارسال‌شده" />
                          ))}
                      </div>
                    </MessageBubble>
                  </Fragment>
                );
              })}
              {localMessages.acknowledged.map((item) => (
                <article
                  key={item.receipt.clientMessageId}
                  className={`${s.bubble} ${s.own}`}
                  data-message-state="confirmed"
                >
                  <p dir="auto">{item.text}</p>
                  <AttachmentSummary attachments={item.attachments} />
                  <div className={s.messageMeta}>
                    <time title={date(item.receipt.sentAtUtc, true)}>
                      {shortTime(item.receipt.sentAtUtc)}
                    </time>
                    <Check size={15} aria-label="ارسال‌شده" />
                  </div>
                </article>
              ))}
              {localMessages.pending.map((message) => (
                <article
                  key={message.id}
                  className={`${s.bubble} ${s.own} ${sending === message.id ? '' : s.pending}`}
                  data-message-state={sending === message.id ? 'sending' : 'unconfirmed'}
                >
                  <p dir="auto">{message.command.text}</p>
                  <AttachmentSummary attachments={message.attachments} />
                  {sending === message.id ? (
                    <div className={s.messageMeta}>
                      <time>{shortTime(message.createdAt)}</time>
                      <Clock size={14} aria-label="در حال ارسال" />
                    </div>
                  ) : (
                    <small className={s.localStatus}>
                      {message.error ?? 'نتیجهٔ ارسال هنوز تأیید نشده است.'}
                    </small>
                  )}
                  {sending !== message.id && (
                    <div className={s.pendingActions}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          !!sending ||
                          !writable ||
                          message.state === 'rejected' ||
                          message.retryable === false ||
                          (!!message.retryAt && message.retryAt > now)
                        }
                        onClick={() => void transmit(message)}
                      >
                        تلاش دوباره با همین پیام
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void refresh()}>
                        بررسی سابقه
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            حذف از این دستگاه
                          </Button>
                        </DialogTrigger>
                        <DialogContent
                          title="حذف پیام تأییدنشده از این دستگاه"
                          description="این کار فقط نسخهٔ در انتظار را پاک می‌کند. اگر سرور پیام را قبلاً دریافت کرده باشد، پیام ارسال‌شده حذف نمی‌شود."
                        >
                          <Button
                            variant="destructive"
                            onClick={() =>
                              void personalMessageQueue
                                .remove(message.id)
                                .then(loadPending)
                                .catch(setError)
                            }
                          >
                            حذف نسخهٔ محلی
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </article>
              ))}
              <div ref={bottom} />
            </>
          )}
        </div>
        <div className={s.composerArea}>
          {writable && needsRestriction && restriction.isError && (
            <div className={s.mediaPermissionError} role="status">
              بررسی دسترسی ارسال پیوست انجام نشد.
              <button onClick={() => void restriction.refetch()}>بررسی دوباره</button>
            </div>
          )}
          {!!error && (
            <div className={s.sendError} role="alert">
              {error instanceof Error ? error.message : 'عملیات انجام نشد.'}
            </div>
          )}
          {!!readError && (
            <button className={s.readRetry} onClick={() => void markRead(lastReadAttempt.current)}>
              خواندن هنوز تأیید نشده؛ تلاش دوباره
            </button>
          )}
          {reply && (
            <div className={s.reply}>
              <ArrowUpLeft size={18} />
              <span>
                <strong>
                  {currentReply ? 'پاسخ به ' + currentReply.sender.displayName : 'پاسخ به پیام'}
                </strong>
                <small>
                  {!currentReply
                    ? 'پیام در دسترس نیست'
                    : currentReply.isDeleted
                      ? 'پیام حذف شده'
                      : currentReply.text || 'پیوست'}
                </small>
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="لغو پاسخ"
                onClick={() => setReply(null)}
              >
                <X size={17} />
              </Button>
            </div>
          )}
          {writable && !history.isError ? (
            <form
              className={s.composer}
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <AttachmentPicker
                conversationId={id}
                disabled={!canMedia || !!sending}
                caption={draft}
                onSend={send}
              />
              <div className={s.composeInput}>
                <textarea
                  ref={composer}
                  aria-label="متن پیام"
                  placeholder="پیامی بنویسید…"
                  rows={1}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                className={s.send}
                disabled={!!sending || !draft.trim()}
                aria-label="ارسال پیام"
              >
                <Send size={21} />
              </button>
            </form>
          ) : (
            <p className={s.readOnly}>ارسال با وضعیت فعلی این گفتگو در دسترس نیست.</p>
          )}
        </div>
      </section>
      <aside className={s.inspector}>
        <span className={s.largeAvatar}>{name.slice(0, 1)}</span>
        <h2>{name}</h2>
        <p>{conversation.scope === 'Personal' ? 'فضای شخصی' : 'فضای آموزشگاه'}</p>
        <dl>
          {managed && metadata.data ? (
            <>
              <div>
                <dt>وضعیت گفتگو</dt>
                <dd>{metadata.data.status === 'Active' ? 'فعال' : 'آرشیوشده'}</dd>
              </div>
              <div>
                <dt>عضویت‌های فعال</dt>
                <dd>
                  {number(
                    metadata.data.participants.filter((item) => item.status === 'Active').length,
                  )}
                </dd>
              </div>
            </>
          ) : (
            <div>
              <dt>نوع گفتگو</dt>
              <dd>{summary.type === 'Saved' ? 'پیام‌های ذخیره‌شده' : 'گفت‌وگوی مستقیم'}</dd>
            </div>
          )}
          {managed && (
            <div>
              <dt>نقش شما در گفتگو</dt>
              <dd>{membership ? conversationRoleLabels[membership.role] : 'ثبت نشده'}</dd>
            </div>
          )}
        </dl>
        <Link href="/personal/settings">
          <Settings size={16} />
          تنظیمات
        </Link>
      </aside>
    </>
  );
}
