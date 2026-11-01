'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, UserMinus, UserPlus, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, EmptyState, LoadingSkeleton } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import c from './conversation-pages.module.css';
import t from './messaging-theme.module.css';
import { canManageMembers } from './management-policy';
type S = components['schemas'];
export function ConversationInfoEditor({ value }: { value: S['ManagedConversationResult'] }) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const [baseline, setBaseline] = useState({
    title: value.title,
    description: value.description ?? '',
    version: value.version,
  });
  const [title, setTitle] = useState(value.title),
    [description, setDescription] = useState(value.description ?? '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState(false);
  const lock = useRef(false),
    dirty = title !== baseline.title || description !== baseline.description,
    stale = baseline.version !== value.version;
  useUnsavedChanges(dirty);
  if (!canManageMembers(value, session.user.id))
    return (
      <section className={c.panel}>
        <EmptyState title="امکان ویرایش اطلاعات این گفتگو برای شما فعال نیست" />
      </section>
    );
  return (
    <section className={c.panel}>
      <h2>{value.type === 'Channel' ? 'ویرایش کانال' : 'ویرایش گروه'}</h2>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (lock.current || stale || !dirty || !title.trim()) return;
          lock.current = true;
          setBusy(true);
          setError(undefined);
          setSuccess(false);
          const key = [
            'personal',
            session.user.id,
            session.revision,
            '/api/v1/conversations/' + value.conversationId,
          ];
          try {
            const result = await call<S['ConversationInfoResult']>(
              '/api/v1/conversations/' + value.conversationId + '/info',
              {
                method: 'PATCH',
                body: JSON.stringify({
                  title: title.trim(),
                  description: description.trim() || null,
                  expectedVersion: baseline.version,
                }),
              },
            );
            if (result.conversationId !== value.conversationId)
              throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
            await cache.cancelQueries({ queryKey: key });
            cache.setQueryData<S['ManagedConversationResult']>(key, (old) =>
              old?.version === baseline.version ? { ...old, ...result } : old,
            );
            setTitle(result.title);
            setDescription(result.description ?? '');
            setBaseline({
              title: result.title,
              description: result.description ?? '',
              version: result.version,
            });
            setSuccess(true);
            void cache.invalidateQueries({
              queryKey: ['personal', session.user.id, session.revision],
            });
          } catch (err) {
            setError(err);
            if (err instanceof ApiError && err.status === 409)
              void cache.invalidateQueries({ queryKey: key });
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy || stale} className={c.form}>
          <label>
            نام {value.type === 'Channel' ? 'کانال' : 'گروه'}
            <input
              required
              value={title}
              onChange={(ev) => {
                setTitle(ev.target.value);
                setSuccess(false);
              }}
            />
          </label>
          <label>
            توضیحات (اختیاری)
            <textarea
              rows={4}
              value={description}
              onChange={(ev) => {
                setDescription(ev.target.value);
                setSuccess(false);
              }}
            />
          </label>
          <Button type="submit" disabled={!dirty || !title.trim()}>
            {busy ? 'در حال ثبت…' : 'ذخیرهٔ اطلاعات'}
          </Button>
        </fieldset>
      </form>
      {stale && (
        <div role="alert">
          <p>اطلاعات گفتگو تغییر کرده است؛ پیش‌نویس شما حفظ شد.</p>
          <ConfirmAction
            title="دریافت اطلاعات تازه"
            trigger="دریافت نسخهٔ تازه"
            description="تغییرات ثبت‌نشده با اطلاعات تازه جایگزین شود؟"
            onConfirm={async () => {
              setTitle(value.title);
              setDescription(value.description ?? '');
              setBaseline({
                title: value.title,
                description: value.description ?? '',
                version: value.version,
              });
              setError(undefined);
              return true;
            }}
          />
        </div>
      )}
      {!!error && <ErrorState error={error} />}
      {success && <p role="status">اطلاعات گفتگو ذخیره شد.</p>}
    </section>
  );
}
export function AddConversationMember({ value }: { value: S['ManagedConversationResult'] }) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(1),
    [draft, setDraft] = useState(''),
    [q, setQ] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false);
  const contacts = usePersonalApi<S['UserContactPageResult']>(
    '/api/v1/contacts?page=' + page + '&pageSize=20&favoritesOnly=false&q=' + encodeURIComponent(q),
    { enabled: open },
  );
  const existing = new Set(
    value.participants.filter((m) => m.status === 'Active').map((m) => m.user.userId),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!lock.current) {
          setOpen(v);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus size={18} />
          افزودن عضو
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`${t.theme} ${t.dialog}`}
        title="افزودن عضو"
        description="یک مخاطب را به گفتگو اضافه کنید. حریم خصوصی و اجازهٔ عضویت توسط سرویس بررسی می‌شود."
      >
        <form
          className={c.search}
          onSubmit={(ev) => {
            ev.preventDefault();
            setQ(draft.trim());
            setPage(1);
          }}
        >
          <Search size={18} />
          <input
            aria-label="جستجوی عضو جدید"
            placeholder="نام مخاطب"
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
          />
          <Button type="submit" variant="ghost">
            جستجو
          </Button>
        </form>
        {contacts.isPending ? (
          <LoadingSkeleton />
        ) : contacts.isError ? (
          <ErrorState error={contacts.error} onRetry={() => void contacts.refetch()} />
        ) : (
          <div className={c.memberPicker}>
            {contacts.data.items
              .filter((m) => m.contactUserId !== session.user.id)
              .map((m) => (
                <article key={m.contactUserId}>
                  <span className={c.avatar}>{(m.savedName || m.profile.displayName)[0]}</span>
                  <strong>{m.savedName || m.profile.displayName}</strong>
                  <Button
                    size="sm"
                    disabled={busy || existing.has(m.contactUserId)}
                    onClick={async () => {
                      if (lock.current) return;
                      lock.current = true;
                      setBusy(true);
                      setError(undefined);
                      try {
                        const result = await call<S['ManagedConversationResult']>(
                          '/api/v1/conversations/' + value.conversationId + '/members',
                          { method: 'POST', body: JSON.stringify({ userId: m.contactUserId }) },
                        );
                        if (result.conversationId !== value.conversationId)
                          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                        await cache.invalidateQueries({
                          queryKey: ['personal', session.user.id, session.revision],
                        });
                        setOpen(false);
                      } catch (err) {
                        setError(err);
                      } finally {
                        lock.current = false;
                        setBusy(false);
                      }
                    }}
                  >
                    {existing.has(m.contactUserId) ? 'عضو است' : 'افزودن'}
                  </Button>
                </article>
              ))}
            {!contacts.data.items.length && <EmptyState title="مخاطبی پیدا نشد" />}
          </div>
        )}
        {!!error && <ErrorState error={error} />}
        <div className={c.pager}>
          <Button
            variant="ghost"
            disabled={busy || page === 1 || contacts.isFetching}
            onClick={() => setPage(page - 1)}
          >
            صفحهٔ قبل
          </Button>
          <Button
            variant="ghost"
            disabled={busy || !contacts.data?.hasMore || contacts.isFetching}
            onClick={() => setPage(page + 1)}
          >
            صفحهٔ بعد
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function MemberManagement({
  id,
  member,
}: {
  id: string;
  member: S['ConversationParticipantResult'];
}) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [action, setAction] = useState<'Admin' | 'Member' | 'Remove' | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!lock.current) {
          setOpen(v);
          setAction(null);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label={'مدیریت ' + member.user.displayName}>
          <MoreVertical size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`${t.theme} ${t.dialog}`}
        title={'مدیریت ' + member.user.displayName}
        description="نقش و عضویت فرد را در همین گفتگو مدیریت کنید."
      >
        {!action ? (
          <div className={c.memberActions}>
            <Button
              variant="ghost"
              onClick={() => setAction(member.role === 'Admin' ? 'Member' : 'Admin')}
            >
              <Shield size={20} />
              {member.role === 'Admin' ? 'حذف دسترسی مدیریت' : 'ارتقا به مدیر'}
            </Button>
            <Button variant="ghost" className={c.danger} onClick={() => setAction('Remove')}>
              <UserMinus size={20} />
              حذف از گفتگو
            </Button>
          </div>
        ) : (
          <>
            <p>
              {action === 'Remove'
                ? 'عضویت این فرد در گفتگو پایان یابد؟'
                : action === 'Admin'
                  ? 'این فرد به مدیر گفتگو ارتقا یابد؟'
                  : 'دسترسی مدیریت حذف و عضویت عادی حفظ شود؟'}
            </p>
            <div className={c.pager}>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setAction(null);
                  setError(undefined);
                }}
              >
                بازگشت
              </Button>
              <Button
                variant={action === 'Remove' ? 'destructive' : 'default'}
                disabled={busy}
                onClick={async () => {
                  if (lock.current) return;
                  lock.current = true;
                  setBusy(true);
                  setError(undefined);
                  try {
                    const result = await call<S['ManagedConversationResult']>(
                      '/api/v1/conversations/' +
                        id +
                        '/members/' +
                        member.user.userId +
                        (action === 'Remove' ? '' : '/role'),
                      {
                        method: action === 'Remove' ? 'DELETE' : 'PATCH',
                        ...(action !== 'Remove' ? { body: JSON.stringify({ role: action }) } : {}),
                      },
                    );
                    if (result.conversationId !== id)
                      throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
                    await cache.invalidateQueries({
                      queryKey: ['personal', session.user.id, session.revision],
                    });
                    setOpen(false);
                  } catch (err) {
                    setError(err);
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'در حال ثبت…' : 'تأیید تغییر'}
              </Button>
            </div>
          </>
        )}
        {!!error && <ErrorState error={error} />}
      </DialogContent>
    </Dialog>
  );
}
