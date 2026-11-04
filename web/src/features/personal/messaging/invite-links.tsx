'use client';
import * as uiText from '@/content/fa';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import c from './conversation-pages.module.css';
import { Copy, Share2, Link2, Plus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { date } from '@/lib/formatting';
import { conversationCapability } from './management-policy';
import t from './messaging-theme.module.css';
import { inviteLinkState } from './invite-link-model';
type S = components['schemas'];
/** Tokens are only returned at creation; never invent a public slug or recover one from an id. */
export function ConversationInviteLinks({ value }: { value: S['ManagedConversationResult'] }) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const [page, setPage] = useState(1),
    [open, setOpen] = useState(false),
    [uses, setUses] = useState('10'),
    [hours, setHours] = useState('24');
  const [approval, setApproval] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [created, setCreated] = useState<S['CreatedInviteLinkResult']>(),
    [feedback, setFeedback] = useState('');
  const lock = useRef(false),
    command = useRef<S['CreateInviteLinkCommand'] | null>(null);
  const base = `/api/v1/conversations/${value.conversationId}/invite-links`;
  const owner = conversationCapability(value, 'canManageInvites');
  const q = usePersonalApi<S['InviteLinkPageResult']>(`${base}?page=${page}&pageSize=30`, {
    enabled: owner,
    poll: 15000,
  });
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
  if (!owner) return <EmptyState title={uiText.text_db54be8c6231} />;
  const url = created?.token
    ? `${typeof location === 'undefined' ? '' : location.origin}/personal/messages/join#token=${encodeURIComponent(created.token)}`
    : null;
  return (
    <section className={c.panel}>
      <div className={c.filters}>
        <h2>{uiText.text_10c263e49b58}</h2>
        <Button
          onClick={() => {
            setOpen(true);
            setError(undefined);
          }}
        >
          <Plus size={18} />
          {uiText.text_52fb3fc1116c}
        </Button>
      </div>
      {created && (
        <div className={c.inviteCard}>
          <h3>{uiText.text_c82f98b3969b}</h3>
          {url ? (
            <>
              <input aria-label={uiText.text_fbb4e2588109} readOnly value={url} dir="ltr" />
              <div className={c.shareActions}>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setFeedback(uiText.text_d5019c056b53);
                    } catch {
                      setFeedback(uiText.text_83a9db1ceb63);
                    }
                  }}
                >
                  <Copy size={18} />
                  {uiText.text_3b907474a390}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      if (navigator.share) await navigator.share({ title: value.title, url });
                      else {
                        await navigator.clipboard.writeText(url);
                        setFeedback(uiText.text_069812fe4aca);
                      }
                    } catch {
                      setFeedback(uiText.text_664cd187c8b4);
                    }
                  }}
                >
                  <Share2 size={18} />
                  {uiText.text_075b83ebe614}
                </Button>
              </div>
            </>
          ) : (
            <p>{uiText.text_a0cb26a781b7}</p>
          )}
          <p className={c.note}>{uiText.text_5317ef2d15be}</p>
        </div>
      )}
      {feedback && <p role="status">{feedback}</p>}
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={c.linkList}>
            {q.data.items.length ? (
              q.data.items.map((link) => (
                <article key={link.id}>
                  <Link2 size={23} />
                  <div>
                    <strong>
                      {
                        {
                          active: uiText.text_01ecef85ebd9,
                          revoked: uiText.text_7a56ac65be94,
                          expired: uiText.text_7f81e6534834,
                          exhausted: uiText.text_4d36dcae4aa5,
                        }[inviteLinkState(link)]
                      }
                    </strong>
                    <small>
                      {uiText.text_5fd8e4601000}
                      {date(link.expiresAtUtc, true)}
                    </small>
                    <small>
                      {link.usedCount}
                      {uiText.text_a624a1e41ffd}
                      {link.maximumUses}
                      {uiText.text_26f8def7f686}{' '}
                      {link.requiresApproval ? uiText.text_8828599b0d27 : uiText.text_db1beec49bc6}
                    </small>
                  </div>
                  {!link.revokedAtUtc && (
                    <ConfirmAction
                      destructive
                      title={uiText.text_3f33c72118c4}
                      trigger={uiText.text_e1fd59fc4069}
                      description={uiText.text_003b1c0a04e4}
                      onConfirm={async () => {
                        const result = await call<S['InviteLinkResult']>(
                          `${base}/${link.id}/revoke`,
                          {
                            method: 'POST',
                            body: JSON.stringify({ expectedVersion: link.version }),
                          },
                        );
                        if (result.id !== link.id || !result.revokedAtUtc)
                          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                        if (created?.link.id === link.id) setCreated(undefined);
                        await refresh();
                        return true;
                      }}
                    />
                  )}
                </article>
              ))
            ) : (
              <EmptyState title={uiText.text_8009dd2a1225} />
            )}
          </div>
          <div className={c.pager}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {uiText.text_28d94a2716a9}
            </Button>
            <span>
              {uiText.text_2714496eef16}
              {page}
            </span>
            <Button variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>
              {uiText.text_a381bb5c90e2}
            </Button>
          </div>
        </>
      )}
      <JoinRequests id={value.conversationId} />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!lock.current) setOpen(next);
        }}
      >
        <DialogContent
          className={`${t.theme} ${t.dialog} ${c.detailDialog}`}
          title={uiText.text_fbb4e2588109}
          description={uiText.text_7612c9fe1f3a}
        >
          <form
            className={c.form}
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError(undefined);
              command.current ??= {
                clientLinkId: crypto.randomUUID(),
                expiresAtUtc: new Date(Date.now() + Number(hours) * 3600000).toISOString(),
                maximumUses: Number(uses),
                requiresApproval: approval,
              };
              try {
                const result = await call<S['CreatedInviteLinkResult']>(base, {
                  method: 'POST',
                  body: JSON.stringify(command.current),
                });
                if (result.link.conversationId !== value.conversationId)
                  throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                setCreated(result);
                command.current = null;
                setOpen(false);
                await refresh();
              } catch (err) {
                setError(err);
                if (err instanceof ApiError && [400, 403, 422].includes(err.status))
                  command.current = null;
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <fieldset className={c.form} disabled={busy || !!command.current}>
              <label>
                {uiText.text_7fb27240d29d}
                <select value={hours} onChange={(ev) => setHours(ev.target.value)}>
                  <option value="1">{uiText.text_4cbac929c674}</option>
                  <option value="24">{uiText.text_bc0743dbf6f7}</option>
                  <option value="168">{uiText.text_8626eabab1ff}</option>
                </select>
              </label>
              <label>
                {uiText.text_d1b873e25f3a}
                <input
                  type="number"
                  min="1"
                  required
                  value={uses}
                  onChange={(ev) => setUses(ev.target.value)}
                />
              </label>
              <label className={c.toggleRow}>
                <span>{uiText.text_596e7a455ae9}</span>
                <input
                  type="checkbox"
                  checked={approval}
                  onChange={(ev) => setApproval(ev.target.checked)}
                />
              </label>
            </fieldset>
            {command.current && <p className={c.note}>{uiText.text_5db8879fe0d3}</p>}
            <Button type="submit" disabled={busy}>
              {busy
                ? uiText.text_6b7a414cc01b
                : command.current
                  ? uiText.text_8ea79cd585d1
                  : uiText.text_66844075e887}
            </Button>
            {!!error && <ErrorState error={error} />}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function JoinRequests({ id }: { id: string }) {
  const { call, session } = usePersonal(),
    cache = useQueryClient();
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ConversationJoinRequestPageResult']>(
    `/api/v1/conversations/${id}/join-requests?page=${page}&pageSize=30`,
    { poll: 10000 },
  );
  return (
    <section className={c.joinRequests}>
      <h2>{uiText.text_49b752556153}</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={c.linkList}>
            {q.data.items.length ? (
              q.data.items.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{uiText.text_2abca77097a6}</strong>
                    <small>
                      <bdi dir="ltr">{item.userId}</bdi>
                    </small>
                    <small>
                      {item.status === 'Pending'
                        ? uiText.text_e81c80fd6d5f
                        : item.status === 'Approved'
                          ? uiText.text_479574e266a4
                          : item.status === 'Rejected'
                            ? uiText.text_c7009e8ab420
                            : item.status === 'Expired'
                              ? uiText.text_7f81e6534834
                              : uiText.text_7a56ac65be94}
                    </small>
                  </div>
                  {item.status === 'Pending' && (
                    <div className={c.requestActions}>
                      {(['approve', 'reject'] as const).map((action) => (
                        <ConfirmAction
                          key={action}
                          destructive={action === 'reject'}
                          title={
                            action === 'approve'
                              ? uiText.text_40d407fc5e46
                              : uiText.text_cca763acd0d2
                          }
                          trigger={
                            action === 'approve'
                              ? uiText.text_df535a7ee41d
                              : uiText.text_cc522e594117
                          }
                          description={uiText.text_c356dfccba3c}
                          onConfirm={async () => {
                            const result = await call<S['ConversationJoinRequestResult2']>(
                              `/api/v1/messaging/join-requests/${item.id}/${action}`,
                              {
                                method: 'POST',
                                body: JSON.stringify({ expectedVersion: item.version }),
                              },
                            );
                            if (
                              result.id !== item.id ||
                              result.status !== (action === 'approve' ? 'Approved' : 'Rejected')
                            )
                              throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                            void cache.invalidateQueries({
                              queryKey: ['personal', session.user.id, session.revision],
                            });
                            return true;
                          }}
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p className={c.note}>{uiText.text_5e52f10bb784}</p>
            )}
          </div>
          <div className={c.pager}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {uiText.text_320b8978731f}
            </Button>
            <Button variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>
              {uiText.text_0d27a1d50d56}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
