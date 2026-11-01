'use client';
import { Users, Megaphone, ArrowLeft, Check, Search } from 'lucide-react';
import { readCreationDraft, creationWasRejected } from './creation-draft';
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
  const search = useSearchParams();
  const members = search.get('step') === 'members';
  const { session, call } = usePersonal(),
    router = useRouter(),
    cache = useQueryClient();
  const [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [visibility, setVisibility] = useState<'' | 'Private' | 'Public'>('Private'),
    [history, setHistory] = useState<'' | 'FullHistory' | 'FromJoin'>(''),
    [selected, setSelected] = useState<Set<string>>(() => new Set()),
    [page, setPage] = useState(1),
    [contactQuery, setContactQuery] = useState(''),
    [queryDraft, setQueryDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [frozen, setFrozen] = useState<Command | null>(null),
    [storageReady, setStorageReady] = useState(false);
  const mutex = useRef(false);
  const key =
    'makan-create:' + session.user.id + ':' + contextSignature(session.context) + ':' + kind;
  const draftKey = key + ':draft:v1';
  const stepUrl = '/personal/messages/new?kind=' + kind;
  const status = usePersonalApi<components['schemas']['MessagingStatusResult']>(
    '/api/v1/me/messaging-status',
  );
  const contacts = usePersonalApi<components['schemas']['UserContactPageResult']>(
    '/api/v1/contacts?page=' +
      page +
      '&pageSize=20&favoritesOnly=false&q=' +
      encodeURIComponent(contactQuery),
    { enabled: storageReady && members },
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
      const draft = readCreationDraft(sessionStorage.getItem(draftKey));
      if (draft) {
        setTitle(draft.title);
        setDescription(draft.description);
        setVisibility(draft.visibility);
        setHistory(draft.history);
        setSelected(new Set(draft.selected));
      }
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = clientValidator({
          $ref: '#/components/schemas/CreateManagedConversationCommand',
        }).safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error('اطلاعات درخواست ذخیره‌شده قابل بررسی نیست.');
        const value = parsed.data as Command;
        if (value.scope !== 'Personal') throw new Error('این درخواست به فضای شخصی تعلق ندارد.');
        setFrozen(value);
        router.replace(stepUrl + '&step=members');
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
  }, [key, draftKey, router, stepUrl]);
  useEffect(() => {
    if (!storageReady) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ title, description, visibility, history, selected: [...selected] }),
      );
    } catch {
      setStorageReady(false);
      setError(new Error('امکان نگهداری پیش‌نویس وجود ندارد. ذخیره‌سازی مرورگر را بررسی کنید.'));
    }
  }, [storageReady, draftKey, title, description, visibility, history, selected]);
  useEffect(() => {
    if (storageReady && members && !title.trim() && !frozen) router.replace(stepUrl);
  }, [storageReady, members, title, frozen, router, stepUrl]);
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
      sessionStorage.removeItem(draftKey);
      setStorageReady(false);
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
      if (error instanceof ApiError && creationWasRejected(error.status, error.problem.code)) {
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
          <span>مرحلهٔ {members ? '۲' : '۱'} از ۲</span>
          <h1>{group ? 'ایجاد گروه' : 'ایجاد کانال'}</h1>
          <p>
            {members
              ? 'مخاطبین مورد نظر را برای عضویت اولیه انتخاب کنید.'
              : 'نام و توضیحات را وارد کنید؛ در مرحلهٔ بعد اعضا را انتخاب می‌کنید.'}
          </p>
        </div>
        <PageBack href={members ? stepUrl : '/personal/messages'} />
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
            if (members) void submit();
            else if (storageReady && title.trim() && chosenVisibility)
              router.push(stepUrl + '&step=members');
          }}
        >
          <ol className={d.steps} aria-label="مراحل ایجاد گفتگو">
            <li aria-current={!members ? 'step' : undefined}>
              <span>{members ? <Check size={16} /> : '۱'}</span>اطلاعات {group ? 'گروه' : 'کانال'}
            </li>
            <li aria-current={members ? 'step' : undefined}>
              <span>۲</span>انتخاب مخاطبین
            </li>
          </ol>
          {!members && (
            <section className={s.profileCard}>
              <div className={d.createAvatar}>
                {group ? <Users size={32} /> : <Megaphone size={32} />}
              </div>
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
          )}
          {members && (
            <section className={s.profileCard}>
              <div className={d.creationSummary}>
                <span className={d.smallAvatar}>
                  {group ? <Users size={24} /> : <Megaphone size={24} />}
                </span>
                <div>
                  <strong dir="auto">{title}</strong>
                  <small>
                    {chosenVisibility === 'Private' ? 'خصوصی' : 'عمومی'} · {number(selected.size)}{' '}
                    مخاطب انتخاب شده
                  </small>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || !!frozen}
                  onClick={() => router.push(stepUrl)}
                >
                  ویرایش
                </Button>
              </div>
              <h2>اعضای اولیه از مخاطبین</h2>
              <div className={d.contactSearch}>
                <Search size={18} />
                <input
                  aria-label="جستجوی مخاطبین برای دعوت"
                  placeholder="جستجوی مخاطبین"
                  value={queryDraft}
                  onChange={(ev) => setQueryDraft(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') {
                      ev.preventDefault();
                      setContactQuery(queryDraft.trim());
                      setPage(1);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setContactQuery(queryDraft.trim());
                    setPage(1);
                  }}
                >
                  جستجو
                </Button>
              </div>
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
          )}
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
            {busy ? (
              'در حال بررسی…'
            ) : !members ? (
              <>
                انتخاب مخاطبین <ArrowLeft size={18} />
              </>
            ) : frozen ? (
              'پیگیری همین درخواست'
            ) : group ? (
              'ساخت گروه'
            ) : (
              'ساخت کانال'
            )}
          </Button>
        </form>
      )}
    </MessagingSurface>
  );
}
