'use client';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { number } from '@/lib/formatting';
import { useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import s from '../personal.module.css';
import { ProfileAvatar } from '../profile-photo';
import { usePersonal, usePersonalApi } from '../provider';
import { messagingNextLabels } from '../status-labels';
import { resolvePersonInput } from './directory';
type Person = components['schemas']['MessagingPublicProfileResult'];
export function ContactsPage() {
  const { session, call } = usePersonal(),
    router = useRouter(),
    cache = useQueryClient();
  const [tab, setTab] = useState<'contacts' | 'add' | 'search'>('contacts'),
    [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1);
  const [target, setTarget] = useState(''),
    [savedName, setSavedName] = useState(''),
    [person, setPerson] = useState<Person | null>(null),
    [resolved, setResolved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [notice, setNotice] = useState('');
  const [lookupError, setLookupError] = useState('');
  const status = usePersonalApi<components['schemas']['MessagingStatusResult']>(
    '/api/v1/me/messaging-status',
    { poll: 10000 },
  );
  const canCreateDirect =
    status.isSuccess &&
    status.data.allowedActions.some(
      (action) => action === 'CreateDirect' || action === 'CreateDirectWithAuthorizedRelationship',
    );
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: '20',
    favoritesOnly: 'false',
  });
  const contacts = usePersonalApi<components['schemas']['UserContactPageResult']>(
    '/api/v1/contacts?' + params,
    { enabled: tab === 'contacts' },
  );
  const people = usePersonalApi<components['schemas']['PeopleSearchPageResult']>(
    '/api/v1/people/search?' +
      new URLSearchParams({ q: query.replace(/^@/, ''), page: String(page), pageSize: '20' }),
    { enabled: tab === 'search' && !!query },
  );
  function changeTab(next: typeof tab) {
    setTab(next);
    setQuery('');
    setDraft('');
    setPage(1);
    setError(undefined);
    setNotice('');
    setPerson(null);
    setResolved(false);
    setSavedName('');
    setLookupError('');
  }
  async function start(profile: Person) {
    if (!canCreateDirect || !profile.canStartDirect || profile.userId === session.user.id) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await call<components['schemas']['DirectConversationResult']>(
        '/api/v1/conversations/direct',
        {
          method: 'POST',
          body: JSON.stringify({
            targetUserId: profile.userId,
            scope: 'Personal',
          } satisfies components['schemas']['StartDirectConversationCommand']),
        },
      );
      if (result.otherParticipant.userId !== profile.userId || result.scope !== 'Personal')
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      await cache.invalidateQueries({
        predicate: (item) =>
          item.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/conversations'),
          ),
      });
      router.push('/personal/messages/' + result.conversationId);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(profile: Person, alias: string | null = null) {
    setBusy(true);
    setError(undefined);
    try {
      const result = await call<components['schemas']['UserContactResult']>('/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({
          contactUserId: profile.userId,
          savedName: alias,
        } satisfies components['schemas']['SaveUserContactCommand']),
      });
      if (result.contactUserId !== profile.userId)
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      setNotice('مخاطب در سرور ذخیره شد.');
      setTab('contacts');
      setQuery('');
      setPage(1);
      await cache.invalidateQueries({
        predicate: (item) =>
          item.queryKey.some(
            (key) => typeof key === 'string' && key.startsWith('/api/v1/contacts'),
          ),
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const data = tab === 'contacts' ? contacts : people;
  const rows =
    tab === 'contacts'
      ? contacts.data?.items.map((contact) => ({
          profile: contact.profile,
          name: contact.savedName || contact.profile.displayName,
          contact,
        }))
      : people.data?.items.map((profile) => ({
          profile,
          name: profile.displayName,
          contact: undefined,
        }));
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>پیام‌رسان / دفترچهٔ مخاطبین</span>
          <h1>مخاطبین شما</h1>
          <p>یک حساب قابل مشاهده را پیدا کنید، ذخیره کنید و گفت‌وگو را شروع کنید.</p>
        </div>
        <PageBack href="/personal/messages" />
      </div>
      <nav className={s.sectionLinks} aria-label="بخش‌های مخاطبین">
        <button aria-pressed={tab === 'contacts'} onClick={() => changeTab('contacts')}>
          مخاطبین
        </button>
        <button aria-pressed={tab === 'add'} onClick={() => changeTab('add')}>
          <Plus size={16} />
          مخاطب جدید
        </button>
        <button aria-pressed={tab === 'search'} onClick={() => changeTab('search')}>
          جستجوی افراد
        </button>
      </nav>
      {notice && (
        <p className={s.success} role="status">
          {notice}
        </p>
      )}
      {status.isPending ? (
        <p role="status">در حال بررسی وضعیت ارتباطی…</p>
      ) : status.isError ? (
        <ErrorState error={status.error} onRetry={() => void status.refetch()} />
      ) : (
        status.data.nextAction !== 'None' && (
          <section className={s.profileCard} role="status">
            {canCreateDirect ? (
              <>
                <p>گفت‌وگو با مخاطبانی که برای حساب شما مجاز هستند فعال است.</p>
                <details>
                  <summary>وضعیت ارتباطی حساب</summary>
                  <p>{messagingNextLabels[status.data.nextAction]}</p>
                </details>
              </>
            ) : (
              <>
                <p>{messagingNextLabels[status.data.nextAction]}</p>
                <p>
                  این وضعیت از تنظیمات فعلی حساب دریافت شده است؛ ذخیرهٔ مخاطب به‌تنهایی مجوز ارتباط
                  ایجاد نمی‌کند.
                </p>
              </>
            )}
            {status.data.nextAction === 'ProfileCompletionRequired' && (
              <Button asChild variant="outline">
                <Link href="/personal/profile/edit">تکمیل پروفایل</Link>
              </Button>
            )}
          </section>
        )
      )}
      {!!error && <ErrorState error={error} />}
      {lookupError && (
        <p className="field-error" role="alert">
          {lookupError}
        </p>
      )}
      {tab === 'add' ? (
        <section className={s.profileCard}>
          <form
            className={s.directoryForm}
            onSubmit={async (event) => {
              event.preventDefault();
              let command: components['schemas']['ResolvePersonCommand'];
              try {
                command = resolvePersonInput(target);
                setLookupError('');
              } catch (error) {
                setLookupError(
                  error instanceof Error ? error.message : 'اطلاعات مخاطب معتبر نیست.',
                );
                return;
              }
              setBusy(true);
              setError(undefined);
              setResolved(false);
              setPerson(null);
              try {
                const result = await call<components['schemas']['PeopleResolveResult']>(
                  '/api/v1/people/resolve',
                  { method: 'POST', body: JSON.stringify(command) },
                );
                setPerson(result.isDiscoverable ? result.profile : null);
                setResolved(true);
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              شمارهٔ همراه یا نام کاربری
              <input
                dir="ltr"
                aria-label="شماره یا نام کاربری مخاطب"
                placeholder="@username یا 09123456789"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setPerson(null);
                  setResolved(false);
                  setSavedName('');
                  setLookupError('');
                  setError(undefined);
                }}
                required
                disabled={busy}
              />
            </label>
            <Button type="submit" disabled={busy || !target.trim()}>
              {busy ? 'در حال بررسی…' : 'پیدا کردن مخاطب'}
            </Button>
          </form>
          {resolved && !person && (
            <EmptyState
              title="مخاطب قابل مشاهده‌ای پیدا نشد"
              description="شماره یا نام کاربری را بررسی کنید. نتیجه تابع حریم خصوصی و وضعیت مجاز ارتباط حساب‌هاست."
            />
          )}
          {person && (
            <div className={s.foundPerson}>
              <div className={s.profileIdentity}>
                <ProfileAvatar
                  photo={person.profilePhoto}
                  name={person.displayName}
                  className={s.largeAvatar}
                />
                <div>
                  <h2>{person.displayName}</h2>
                  <bdi dir="ltr">@{person.username}</bdi>
                  {person.phoneNumber && (
                    <p>
                      <bdi dir="ltr">{person.phoneNumber}</bdi>
                    </p>
                  )}
                </div>
              </div>
              {person.userId === session.user.id ? (
                <p className={s.muted}>این حساب خود شماست؛ مخاطب دیگری را پیدا کنید.</p>
              ) : (
                <>
                  <label className={s.singleField}>
                    نام ذخیره‌شده (اختیاری)
                    <input value={savedName} onChange={(e) => setSavedName(e.target.value)} />
                  </label>
                  <div className={s.actions}>
                    <Button
                      disabled={busy}
                      onClick={() => void save(person, savedName.trim() || null)}
                    >
                      ذخیرهٔ مخاطب
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        busy ||
                        person.userId === session.user.id ||
                        !canCreateDirect ||
                        !person.canStartDirect
                      }
                      onClick={() => void start(person)}
                    >
                      <MessageCircle size={17} />
                      شروع گفت‌وگو
                    </Button>
                  </div>
                  {!person.canStartDirect && (
                    <p className={s.muted}>
                      شروع گفت‌وگو با این حساب فعلاً مجاز نیست. وضعیت حساب خود را از «حساب من» بررسی
                      کنید.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className={s.profileCard}>
          <form
            className={s.directoryForm}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(draft.trim());
              setPage(1);
            }}
          >
            <label>
              {tab === 'contacts' ? 'جستجو در دفترچهٔ مخاطبین' : 'جستجوی حساب‌های قابل مشاهده'}
              <input
                aria-label="عبارت جستجوی مخاطب"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  tab === 'contacts' ? 'نام ذخیره‌شده یا نام کاربری…' : 'نام یا نام کاربری…'
                }
              />
            </label>
            <Button type="submit" variant="outline">
              <Search size={17} />
              جستجو
            </Button>
          </form>
          {tab === 'search' && !query ? (
            <EmptyState
              title="نام یا نام کاربری را جستجو کنید"
              description="فقط اطلاعاتی نمایش داده می‌شود که مشاهدهٔ آن برای شما مجاز است."
            />
          ) : data.isPending ? (
            <LoadingSkeleton />
          ) : data.isError ? (
            <ErrorState error={data.error} onRetry={() => void data.refetch()} />
          ) : !rows?.length ? (
            <EmptyState
              title={
                tab === 'contacts' ? 'مخاطبی در این فهرست نیست' : 'حساب قابل مشاهده‌ای پیدا نشد'
              }
              description={
                tab === 'contacts'
                  ? 'از بخش مخاطب جدید، یک حساب را پیدا و به دفترچه اضافه کنید.'
                  : 'عبارت جستجو را تغییر دهید؛ نتیجه تابع حریم خصوصی و مجوزهای ارتباط است.'
              }
            />
          ) : (
            <div className={s.contactRows}>
              {rows.map((row) => (
                <article key={row.profile.userId} className={s.contactRow}>
                  <ProfileAvatar
                    photo={row.profile.profilePhoto}
                    name={row.name}
                    className={s.avatar}
                  />
                  <div>
                    <strong>{row.name}</strong>
                    <small>
                      <bdi dir="ltr">@{row.profile.username}</bdi>
                    </small>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      busy ||
                      !canCreateDirect ||
                      !row.profile.canStartDirect ||
                      row.profile.userId === session.user.id
                    }
                    onClick={() => void start(row.profile)}
                  >
                    <MessageCircle size={16} />
                    گفت‌وگو
                  </Button>
                  {row.contact ? (
                    <ContactActions
                      contact={row.contact}
                      onChanged={() => void contacts.refetch()}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || row.profile.userId === session.user.id}
                      onClick={() => void save(row.profile)}
                    >
                      ذخیره
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
          {(tab === 'contacts' || !!query) && (
            <div className={s.paging}>
              <Button
                size="icon"
                variant="outline"
                aria-label="صفحهٔ قبلی مخاطبین"
                disabled={page <= 1 || data.isFetching}
                onClick={() => setPage(page - 1)}
              >
                <ChevronRight size={18} />
              </Button>
              <span>صفحهٔ {number(page)}</span>
              <Button
                size="icon"
                variant="outline"
                aria-label="صفحهٔ بعدی مخاطبین"
                disabled={!data.data?.hasMore || data.isFetching}
                onClick={() => setPage(page + 1)}
              >
                <ChevronLeft size={18} />
              </Button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
function ContactActions({
  contact,
  onChanged,
}: {
  contact: components['schemas']['UserContactResult'];
  onChanged: () => void;
}) {
  const { call } = usePersonal();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const [alias, setAlias] = useState(contact.savedName ?? ''),
    [favorite, setFavorite] = useState(contact.isFavorite);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setAlias(contact.savedName ?? '');
          setFavorite(contact.isFavorite);
          setError(undefined);
        }
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={'مدیریت ' + (contact.savedName || contact.profile.displayName)}
        >
          <UserRound size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent
        title="مدیریت مخاطب"
        description={contact.savedName || contact.profile.displayName}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(undefined);
            try {
              await call('/api/v1/contacts/' + contact.contactUserId, {
                method: 'PATCH',
                body: JSON.stringify({
                  savedName: alias.trim() || null,
                  isFavorite: favorite,
                  expectedVersion: contact.version,
                } satisfies components['schemas']['UpdateUserContactCommand']),
              });
              onChanged();
              setOpen(false);
            } catch (error) {
              setError(error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className={s.singleField}>
            نام ذخیره‌شده
            <input
              value={alias}
              disabled={busy}
              onChange={(event) => setAlias(event.target.value)}
            />
          </label>
          <label className={s.selectContact}>
            <input
              type="checkbox"
              checked={favorite}
              disabled={busy}
              onChange={(event) => setFavorite(event.target.checked)}
            />
            <span>مخاطب برگزیده</span>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? 'در حال ثبت…' : 'ثبت تغییرات مخاطب'}
          </Button>
        </form>
        <p className={s.muted}>
          حذف از دفترچه و مسدودکردن ارتباط دو اقدام جدا هستند. تاریخچهٔ گفتگو با حذف مخاطب پاک
          نمی‌شود.
        </p>
        {!!error && <ErrorState error={error} />}
        {error instanceof ApiError && [409, 412].includes(error.status) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onChanged();
              setOpen(false);
            }}
          >
            بستن و بازخوانی مخاطب
          </Button>
        )}
        <div className={s.actions}>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                await call('/api/v1/contacts/' + contact.contactUserId, { method: 'DELETE' });
                setOpen(false);
                onChanged();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 size={17} />
            حذف از دفترچه
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                await call('/api/v1/messaging/blocks/' + contact.contactUserId, { method: 'POST' });
                await cache.invalidateQueries({
                  predicate: (query) =>
                    query.queryKey.some(
                      (key) =>
                        typeof key === 'string' && key.startsWith('/api/v1/messaging/blocks'),
                    ),
                });
                setOpen(false);
                onChanged();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Ban size={17} />
            مسدودکردن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export { BlockedAccountsPage, MessagingPrivacyPage } from './privacy';
