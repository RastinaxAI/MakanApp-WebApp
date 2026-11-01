'use client';
import { MessagingSurface } from './messaging-surface';
import d from './directory.module.css';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError } from '@/lib/api/errors';
import { contextSignature } from '@/lib/client-surface';
import { number } from '@/lib/formatting';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import s from '../personal.module.css';
import { usePersonal, usePersonalApi } from '../provider';
import { messagingNextLabels } from '../status-labels';
type Command = components['schemas']['CreateManagedConversationCommand'];
export function CreateConversationPage() {
  const kind = useSearchParams().get('kind') === 'channels' ? 'channels' : 'groups';
  return <CreateConversation key={kind} kind={kind} />;
}
function CreateConversation({ kind }: { kind: 'groups' | 'channels' }) {
  const { session, call } = usePersonal(),
    router = useRouter(),
    cache = useQueryClient();
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [visibility, setVisibility] = useState<'' | 'Private' | 'Public'>(''),
    [history, setHistory] = useState<'' | 'FullHistory' | 'FromJoin'>(''),
    [selected, setSelected] = useState<Set<string>>(() => new Set()),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [frozen, setFrozen] = useState<Command | null>(null),
    [storageReady, setStorageReady] = useState(false);
  const mutex = useRef(false);
  const key =
    'makan-create:' + session.user.id + ':' + contextSignature(session.context) + ':' + kind;
  const status = usePersonalApi<components['schemas']['MessagingStatusResult']>(
    '/api/v1/me/messaging-status',
  );
  const contacts = usePersonalApi<components['schemas']['UserContactPageResult']>(
    '/api/v1/contacts?page=' + page + '&pageSize=20&favoritesOnly=false',
  );
  const group = kind === 'groups';
  const generalGroup = status.data?.allowedActions.includes('CreatePersonalGroup') ?? false;
  const privateOnly =
    group && !generalGroup && !!status.data?.allowedActions.includes('CreatePrivatePersonalGroup');
  const allowed = group
    ? generalGroup || privateOnly
    : !!status.data?.allowedActions.includes('CreatePersonalChannel');
  const chosenVisibility = privateOnly ? 'Private' : visibility;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = clientValidator({
          $ref: '#/components/schemas/CreateManagedConversationCommand',
        }).safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error('اطلاعات درخواست ذخیره‌شده قابل بررسی نیست.');
        const value = parsed.data as Command;
        if (value.scope !== 'Personal') throw new Error('این درخواست به فضای شخصی تعلق ندارد.');
        setFrozen(value);
        setTitle(value.title);
        setDescription(value.description ?? '');
        setVisibility(value.visibility ?? '');
        setHistory(value.groupHistoryPolicy ?? '');
        setSelected(new Set(value.initialParticipantUserIds ?? []));
      }
      setStorageReady(true);
    } catch (error) {
      setError(error);
    }
  }, [key]);
  async function submit() {
    if (mutex.current || !storageReady || !allowed) return;
    mutex.current = true;
    setBusy(true);
    setError(undefined);
    let command = frozen;
    try {
      if (!command) {
        if (!title.trim() || !chosenVisibility) return;
        command = {
          clientOperationId: crypto.randomUUID(),
          scope: 'Personal',
          title: title.trim(),
          description: description.trim() || null,
          initialParticipantUserIds: selected.size ? [...selected] : null,
          visibility: chosenVisibility,
          ...(group && history ? { groupHistoryPolicy: history } : {}),
        };
        sessionStorage.setItem(key, JSON.stringify(command));
        setFrozen(command);
      }
      const result = await call<components['schemas']['ManagedConversationResult']>(
        '/api/v1/conversations/' + kind,
        { method: 'POST', body: JSON.stringify(command) },
      );
      if (result.scope !== 'Personal' || result.type !== (group ? 'Group' : 'Channel'))
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      sessionStorage.removeItem(key);
      setFrozen(null);
      await cache.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations'),
          ),
      });
      router.replace('/personal/messages/' + result.conversationId);
    } catch (error) {
      setError(error);
      if (error instanceof ApiError && [400, 403, 404, 422].includes(error.status)) {
        sessionStorage.removeItem(key);
        setFrozen(null);
      }
    } finally {
      mutex.current = false;
      setBusy(false);
    }
  }
  return (
    <MessagingSurface className={d.create}>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>پیام‌رسان / فضای شخصی</span>
          <h1>{group ? 'ایجاد گروه' : 'ایجاد کانال'}</h1>
          <p>
            {group
              ? 'اعضای اولیه و شیوهٔ دسترسی گروه را انتخاب کنید.'
              : 'نام و شیوهٔ دسترسی کانال شخصی خود را مشخص کنید.'}
          </p>
        </div>
        <PageBack href="/personal/messages" />
      </div>
      {status.isPending ? (
        <LoadingSkeleton />
      ) : status.isError ? (
        <ErrorState error={status.error} onRetry={() => void status.refetch()} />
      ) : !allowed ? (
        <section className={s.profileCard}>
          <EmptyState
            title="ساخت این فضا فعلاً مجاز نیست"
            description={messagingNextLabels[status.data.nextAction]}
          />
          <Button asChild variant="outline">
            <Link href="/personal/profile">بررسی وضعیت حساب</Link>
          </Button>
        </section>
      ) : (
        <form
          className={s.createForm}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <section className={s.profileCard}>
            <label className={s.singleField}>
              {group ? 'نام گروه' : 'نام کانال'}
              <input
                required
                value={title}
                disabled={busy || !!frozen}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className={s.singleField}>
              توضیحات (اختیاری)
              <textarea
                rows={3}
                value={description}
                disabled={busy || !!frozen}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className={s.singleField}>
              دسترسی
              <select
                required
                value={chosenVisibility}
                disabled={busy || !!frozen || privateOnly}
                onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              >
                <option value="" disabled>
                  نوع دسترسی را انتخاب کنید
                </option>
                <option value="Private">خصوصی</option>
                <option value="Public">عمومی</option>
              </select>
            </label>
            {privateOnly && (
              <p className={s.muted}>این حساب در حال حاضر اجازهٔ ساخت گروه خصوصی دارد.</p>
            )}
            {group && (
              <label className={s.singleField}>
                تاریخچه برای عضو جدید (اختیاری)
                <select
                  value={history}
                  disabled={busy || !!frozen}
                  onChange={(e) => setHistory(e.target.value as typeof history)}
                >
                  <option value="">تنظیم پیش‌فرض سرویس</option>
                  <option value="FullHistory">تاریخچهٔ مجاز کامل</option>
                  <option value="FromJoin">از زمان عضویت</option>
                </select>
              </label>
            )}
          </section>
          <section className={s.profileCard}>
            <h2>اعضای اولیه از مخاطبین</h2>
            <p className={s.muted}>
              {number(selected.size)} مخاطب انتخاب شده است. دعوت اعضا همچنان تابع حریم خصوصی
              آن‌هاست.
            </p>
            {contacts.isPending ? (
              <LoadingSkeleton />
            ) : contacts.isError ? (
              <ErrorState error={contacts.error} onRetry={() => void contacts.refetch()} />
            ) : !contacts.data.items.length ? (
              <EmptyState
                title="مخاطبی برای انتخاب در این صفحه نیست"
                description="می‌توانید بعداً اعضای مجاز را اضافه کنید."
              />
            ) : (
              <div className={s.spaceList}>
                {contacts.data.items
                  .filter((item) => item.contactUserId !== session.user.id)
                  .map((contact) => (
                    <label className={s.selectContact} key={contact.contactUserId}>
                      <input
                        type="checkbox"
                        disabled={busy || !!frozen}
                        checked={selected.has(contact.contactUserId)}
                        onChange={(event) =>
                          setSelected((previous) => {
                            const next = new Set(previous);
                            if (event.target.checked) next.add(contact.contactUserId);
                            else next.delete(contact.contactUserId);
                            return next;
                          })
                        }
                      />
                      <span>
                        {contact.savedName || contact.profile.displayName}
                        <small>
                          <bdi dir="ltr">@{contact.profile.username}</bdi>
                        </small>
                      </span>
                    </label>
                  ))}
              </div>
            )}
            <div className={s.actions}>
              <Button
                type="button"
                variant="ghost"
                disabled={page <= 1 || contacts.isFetching}
                onClick={() => setPage(page - 1)}
              >
                صفحهٔ قبل
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!contacts.data?.hasMore || contacts.isFetching}
                onClick={() => setPage(page + 1)}
              >
                صفحهٔ بعد
              </Button>
            </div>
          </section>
          {!!error &&
            (error instanceof ApiError ? (
              <ErrorState error={error} />
            ) : (
              <p className="field-error" role="alert">
                {error instanceof Error ? error.message : 'عملیات انجام نشد.'}
              </p>
            ))}
          {frozen && (
            <p className={s.muted}>
              نتیجهٔ این درخواست هنوز نهایی نشده است. برای پیگیری، همان مشخصات ذخیره‌شده دوباره
              ارسال می‌شود.
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || !storageReady || !title.trim() || !chosenVisibility}
          >
            {busy
              ? 'در حال بررسی…'
              : frozen
                ? 'پیگیری همین درخواست'
                : group
                  ? 'ساخت گروه'
                  : 'ساخت کانال'}
          </Button>
        </form>
      )}
    </MessagingSurface>
  );
}
