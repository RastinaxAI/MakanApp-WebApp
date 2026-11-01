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
import { Copy, Share2, Link2, Plus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { date } from '@/lib/formatting';
import { canManageMembers } from './management-policy';
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
  const owner = canManageMembers(value, session.user.id);
  const q = usePersonalApi<S['InviteLinkPageResult']>(`${base}?page=${page}&pageSize=30`, {
    enabled: owner,
    poll: 15000,
  });
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
  if (!owner) return <EmptyState title="مدیریت لینک‌های دعوت برای شما فعال نیست" />;
  const url = created?.token
    ? `${typeof location === 'undefined' ? '' : location.origin}/personal/messages/join#token=${encodeURIComponent(created.token)}`
    : null;
  return (
    <section className={c.panel}>
      <div className={c.filters}>
        <h2>لینک‌های دعوت</h2>
        <Button
          onClick={() => {
            setOpen(true);
            setError(undefined);
          }}
        >
          <Plus size={18} />
          لینک جدید
        </Button>
      </div>
      {created && (
        <div className={c.inviteCard}>
          <h3>دعوت جدید</h3>
          {url ? (
            <>
              <input aria-label="لینک دعوت جدید" readOnly value={url} dir="ltr" />
              <div className={c.shareActions}>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setFeedback('لینک کپی شد.');
                    } catch {
                      setFeedback('کپی خودکار ممکن نشد؛ لینک را انتخاب و کپی کنید.');
                    }
                  }}
                >
                  <Copy size={18} />
                  کپی لینک
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      if (navigator.share) await navigator.share({ title: value.title, url });
                      else {
                        await navigator.clipboard.writeText(url);
                        setFeedback('لینک برای اشتراک‌گذاری کپی شد.');
                      }
                    } catch {
                      setFeedback('اشتراک‌گذاری انجام نشد؛ می‌توانید لینک را کپی کنید.');
                    }
                  }}
                >
                  <Share2 size={18} />
                  اشتراک‌گذاری
                </Button>
              </div>
            </>
          ) : (
            <p>لینک ثبت شده است، اما کد آن در پاسخ سرویس موجود نیست. لینک تازه‌ای بسازید.</p>
          )}
          <p className={c.note}>
            لینک تازه را همین حالا کپی کنید؛ سرویس آن را در فهرست بعدی برنمی‌گرداند.
          </p>
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
                          active: 'لینک دعوت',
                          revoked: 'لغوشده',
                          expired: 'منقضی‌شده',
                          exhausted: 'ظرفیت تکمیل‌شده',
                        }[inviteLinkState(link)]
                      }
                    </strong>
                    <small>اعتبار تا {date(link.expiresAtUtc, true)}</small>
                    <small>
                      {link.usedCount} از {link.maximumUses} استفاده ·{' '}
                      {link.requiresApproval ? 'نیازمند تأیید مدیر' : 'بدون تأیید مدیر'}
                    </small>
                  </div>
                  {!link.revokedAtUtc && (
                    <ConfirmAction
                      destructive
                      title="لغو لینک دعوت"
                      trigger="لغو لینک"
                      description="این لینک دیگر قابل استفاده نخواهد بود."
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
              <EmptyState title="لینک دعوتی ساخته نشده است" />
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
      <JoinRequests id={value.conversationId} />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!lock.current) setOpen(next);
        }}
      >
        <DialogContent
          className={`${t.theme} ${t.dialog} ${c.detailDialog}`}
          title="لینک دعوت جدید"
          description="زمان اعتبار، تعداد استفاده و تأیید اعضای جدید را مشخص کنید."
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
                اعتبار لینک
                <select value={hours} onChange={(ev) => setHours(ev.target.value)}>
                  <option value="1">یک ساعت</option>
                  <option value="24">یک روز</option>
                  <option value="168">یک هفته</option>
                </select>
              </label>
              <label>
                حداکثر تعداد استفاده
                <input
                  type="number"
                  min="1"
                  required
                  value={uses}
                  onChange={(ev) => setUses(ev.target.value)}
                />
              </label>
              <label className={c.toggleRow}>
                <span>تأیید اعضای جدید توسط مدیر</span>
                <input
                  type="checkbox"
                  checked={approval}
                  onChange={(ev) => setApproval(ev.target.checked)}
                />
              </label>
            </fieldset>
            {command.current && (
              <p className={c.note}>
                نتیجهٔ درخواست قبلی نامشخص است؛ تلاش مجدد با همان مشخصات انجام می‌شود.
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'در حال ساخت…' : command.current ? 'تلاش مجدد' : 'ساخت لینک دعوت'}
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
      <h2>درخواست‌های عضویت</h2>
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
                    <strong>درخواست عضویت</strong>
                    <small>
                      <bdi dir="ltr">{item.userId}</bdi>
                    </small>
                    <small>
                      {item.status === 'Pending'
                        ? 'در انتظار بررسی'
                        : item.status === 'Approved'
                          ? 'پذیرفته‌شده'
                          : item.status === 'Rejected'
                            ? 'ردشده'
                            : item.status === 'Expired'
                              ? 'منقضی‌شده'
                              : 'لغوشده'}
                    </small>
                  </div>
                  {item.status === 'Pending' && (
                    <div className={c.requestActions}>
                      {(['approve', 'reject'] as const).map((action) => (
                        <ConfirmAction
                          key={action}
                          destructive={action === 'reject'}
                          title={action === 'approve' ? 'تأیید عضویت' : 'رد عضویت'}
                          trigger={action === 'approve' ? 'تأیید' : 'رد'}
                          description="وضعیت این درخواست تغییر کند؟"
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
              <p className={c.note}>درخواست عضویتی وجود ندارد.</p>
            )}
          </div>
          <div className={c.pager}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              درخواست‌های قبلی
            </Button>
            <Button variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>
              درخواست‌های بعدی
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
