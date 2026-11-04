'use client';
import * as uiText from '@/content/fa';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import { useAccountAction } from '../use-account-action';
import { canWriteConversation, conversationTitle, mediaRestricted } from './model';
import { flattenAccountInbox } from './inbox-model';
import { validForwardReceipt, validReportReceipt } from './message-action-policy';
type S = components['schemas'];
export type MessageActionMode = 'forward' | 'save' | 'report';
const reasons: Record<S['AbuseReportReason'], string> = {
  Harassment: uiText.text_9280b653c7c3,
  Spam: uiText.text_288545a91a27,
  Threat: uiText.text_e1f0ba14c9c6,
  InappropriateContent: uiText.text_837fdf021d1d,
  Impersonation: uiText.text_b83773f3ef15,
  Other: uiText.text_b30be26c1372,
  ChildSafetyConcern: uiText.text_cd7b36e86428,
};
/** Normal conversation APIs only. Linked/official/file forwarding is not inferred from read access. */
export function MessageActions({
  mode,
  message,
  onClose,
  onSuccess,
}: {
  mode: MessageActionMode | null;
  message: S['ConversationMessageResult'];
  onClose: () => void;
  onSuccess: (text: string) => void;
}) {
  const { session, call } = usePersonal(),
    action = useAccountAction();
  const [selected, setSelected] = useState(''),
    [search, setSearch] = useState(''),
    [reason, setReason] = useState<S['AbuseReportReason'] | ''>(''),
    [description, setDescription] = useState(''),
    [error, setError] = useState<unknown>();
  const [frozen, setFrozen] = useState<
      S['ForwardMessageCommand'] | S['ReportMessageCommand'] | null
    >(null),
    [restored, setRestored] = useState(false);
  const lock = useRef(false),
    key =
      'makan:draft:message-action:' +
      session.user.id +
      ':' +
      message.conversationId +
      ':' +
      message.messageId +
      ':' +
      mode;
  useEffect(() => {
    setError(undefined);
    setSelected('');
    setFrozen(null);
    setRestored(false);
    if (!mode) return;
    try {
      const value = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      if (
        value &&
        typeof value === 'object' &&
        (mode === 'report'
          ? typeof value.clientReportId === 'string' && Object.hasOwn(reasons, value.reason)
          : typeof value.clientMessageId === 'string' &&
            typeof value.destinationConversationId === 'string')
      ) {
        setFrozen(value);
        if (mode === 'report') {
          setReason(value.reason);
          setDescription(value.description ?? '');
        } else setSelected(value.destinationConversationId);
      }
    } catch {}
    setRestored(true);
  }, [key, mode]);
  const saved = usePersonalApi<S['SavedConversationResult']>('/api/v1/conversations/saved', {
    enabled: mode === 'save',
  });
  const destination =
    frozen && 'destinationConversationId' in frozen
      ? frozen.destinationConversationId
      : mode === 'save'
        ? (saved.data?.conversationId ?? '')
        : selected;
  const metadata = usePersonalApi<S['ManagedConversationResult']>(
    '/api/v1/conversations/' + destination,
    { enabled: !!mode && mode !== 'report' && !!destination },
  );
  const managed = metadata.data?.type === 'Group' || metadata.data?.type === 'Channel';
  const restriction = usePersonalApi<S['MemberRestrictionResult']>(
    '/api/v1/conversations/' + destination + '/me/restriction',
    { enabled: !!mode && mode !== 'report' && managed && !!destination },
  );
  const writable =
    !!metadata.data &&
    metadata.data.conversationId === destination &&
    metadata.data.scope === 'Personal' &&
    metadata.data.managementPolicy !== 'SystemManagedAcademic' &&
    canWriteConversation(metadata.data, session.user.id) &&
    (!managed ||
      (restriction.isSuccess &&
        restriction.data.conversationId === destination &&
        restriction.data.userId === session.user.id &&
        !mediaRestricted(restriction.data)));
  const inbox = useInfiniteQuery({
    queryKey: ['personal', session.user.id, session.revision, 'forward-targets', search],
    initialPageParam: null as string | null,
    enabled: mode === 'forward',
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ Filter: 'All', Limit: '30' });
      if (search) params.set('Search', search);
      if (pageParam) params.set('Cursor', pageParam);
      const data = await call<S['AccountInboxPageResult']>(
        '/api/v1/conversations/account?' + params,
        { signal },
      );
      if (data.hasMore && (!data.nextCursor || data.nextCursor === pageParam))
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      return data;
    },
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    retry: false,
  });
  const targets = flattenAccountInbox(inbox.data?.pages ?? []).filter(
    (item) => item.scope === 'Personal' && !item.isOfficial && !item.official,
  );
  async function submit() {
    if (lock.current || !mode || !restored) return;
    if ((mode === 'report' && !reason) || (mode !== 'report' && !writable)) return;
    lock.current = true;
    setError(undefined);
    try {
      const command =
        frozen ??
        (mode === 'report'
          ? {
              clientReportId: crypto.randomUUID(),
              reason: reason as S['AbuseReportReason'],
              description: description.trim() || null,
            }
          : {
              destinationConversationId: destination,
              clientMessageId: crypto.randomUUID(),
              destinationTopicId: null,
              isSilent: false,
            });
      setFrozen(command);
      try {
        sessionStorage.setItem(key, JSON.stringify(command));
      } catch {}
      const path =
        '/api/v1/conversations/' + message.conversationId + '/messages/' + message.messageId;
      if (mode === 'report') {
        const result = await action.run<S['AbuseReportReceiptResult']>(path + '/reports', command);
        if (!result) return;
        if (
          !validReportReceipt(
            result,
            message.conversationId,
            message.messageId,
            command as S['ReportMessageCommand'],
          )
        )
          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      } else {
        const result = await action.run<S['MessageReceiptResult']>(path + '/forward', command);
        if (!result) return;
        if (!validForwardReceipt(result, command as S['ForwardMessageCommand']))
          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      }
      try {
        sessionStorage.removeItem(key);
      } catch {}
      setFrozen(null);
      onSuccess(
        mode === 'report'
          ? uiText.text_2b243f115b4a
          : mode === 'save'
            ? uiText.text_d73b0f4df8b9
            : uiText.text_1c7ed14dc0af,
      );
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
    }
  }
  return (
    <Dialog
      open={!!mode}
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <DialogContent
        title={
          mode === 'report'
            ? uiText.text_984f13cff775
            : mode === 'save'
              ? uiText.text_479a5da6e735
              : uiText.text_5ed5cb08fd4e
        }
        description={mode === 'report' ? uiText.text_8f3a096dfb87 : uiText.text_e6db423fe932}
      >
        {mode === 'forward' && (
          <>
            <label className="field">
              {uiText.text_88d42df1139e}
              <input
                value={search}
                disabled={!!frozen || action.busy}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {inbox.isPending ? (
              <LoadingSkeleton />
            ) : inbox.isError ? (
              <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
            ) : (
              <div className="mk-menu-actions">
                {targets.length ? (
                  targets.map((target) => (
                    <label className="mk-target-choice" key={target.conversationId}>
                      <input
                        type="radio"
                        name="forward-target"
                        aria-label={conversationTitle(target)}
                        checked={selected === target.conversationId}
                        disabled={!!frozen || action.busy}
                        onChange={() => setSelected(target.conversationId)}
                      />
                      {conversationTitle(target)}
                    </label>
                  ))
                ) : (
                  <EmptyState title={uiText.text_c082b661ba2e} />
                )}
                {inbox.hasNextPage && (
                  <Button
                    variant="outline"
                    disabled={inbox.isFetchingNextPage}
                    onClick={() => void inbox.fetchNextPage()}
                  >
                    {uiText.text_12e9b2eceeab}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
        {mode === 'save' && saved.isPending && <LoadingSkeleton />}
        {mode === 'save' && saved.isError && (
          <ErrorState error={saved.error} onRetry={() => void saved.refetch()} />
        )}
        {destination &&
          (metadata.isPending ? (
            <LoadingSkeleton />
          ) : metadata.isError ? (
            <ErrorState error={metadata.error} />
          ) : (
            <p role="status">{writable ? uiText.text_4976b074ef45 : uiText.text_82cc69363213}</p>
          ))}
        {mode === 'report' && (
          <>
            <label>
              {uiText.text_e96d22a3d2dc}
              <select
                aria-label={uiText.text_e96d22a3d2dc}
                value={reason}
                disabled={!!frozen || action.busy}
                onChange={(event) => setReason(event.target.value as S['AbuseReportReason'])}
              >
                <option value="" disabled>
                  {uiText.text_bfddea31e17d}
                </option>
                {Object.entries(reasons).map(([value, title]) => (
                  <option key={value} value={value}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {uiText.text_c0d8a570e7ce}
              <textarea
                aria-label={uiText.text_743f63e1ea92}
                value={description}
                disabled={!!frozen || action.busy}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
              />
            </label>
          </>
        )}
        {frozen && <p className="small muted">{uiText.text_c83a7d86b4fd}</p>}
        {!!(error ?? action.error) && <ErrorState error={error ?? action.error} />}
        <div className="confirm-actions">
          <Button
            disabled={action.busy || !restored || (mode === 'report' ? !reason : !writable)}
            onClick={() => void submit()}
          >
            {action.busy
              ? uiText.text_b5ef00b1806f
              : frozen
                ? uiText.text_6f96c570c24b
                : mode === 'report'
                  ? uiText.text_4f7060b4db38
                  : mode === 'save'
                    ? uiText.text_f169ae784dd7
                    : uiText.text_5ed5cb08fd4e}
          </Button>
          <Button variant="outline" disabled={action.busy} onClick={onClose}>
            {uiText.text_313cbecb4dd3}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
