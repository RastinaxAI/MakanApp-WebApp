'use client';
import * as uiText from '@/content/fa';
import { MessagingSurface } from './messaging-surface';
import d from './directory.module.css';
import t from './messaging-theme.module.css';
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
  MoreHorizontal,
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
      setNotice(uiText.text_c69ebbd6ae2f);
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
    <MessagingSurface className={d.directory}>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <h1 className="sr-only">{uiText.text_8236f4ce3dac}</h1>
        </div>
        <PageBack href="/personal/messages" />
      </div>
      <nav className={s.sectionLinks} aria-label={uiText.text_1971055384f8}>
        <button aria-pressed={tab === 'contacts'} onClick={() => changeTab('contacts')}>
          {uiText.text_759044ca1d2d}
        </button>
        <button aria-pressed={tab === 'add'} onClick={() => changeTab('add')}>
          <Plus size={16} />
          {uiText.text_5fde423d6a3f}
        </button>
        <button aria-pressed={tab === 'search'} onClick={() => changeTab('search')}>
          {uiText.text_6c705b7f7da2}
        </button>
      </nav>
      {notice && (
        <p className={s.success} role="status">
          {notice}
        </p>
      )}
      {status.isPending ? (
        <p role="status">{uiText.text_a72edc3a1bd6}</p>
      ) : status.isError ? (
        <ErrorState error={status.error} onRetry={() => void status.refetch()} />
      ) : (
        status.data.nextAction !== 'None' && (
          <section className={s.profileCard} role="status">
            {canCreateDirect ? (
              <>
                <p>{uiText.text_1b9ffc2a9963}</p>
                <details>
                  <summary>{uiText.text_3dad9471da0a}</summary>
                  <p>{messagingNextLabels[status.data.nextAction]}</p>
                </details>
              </>
            ) : (
              <>
                <p>{messagingNextLabels[status.data.nextAction]}</p>
                <p>{uiText.text_a86147563bca}</p>
              </>
            )}
            {status.data.nextAction === 'ProfileCompletionRequired' && (
              <Button asChild variant="outline">
                <Link href="/personal/profile/edit">{uiText.text_dc1e77f52af9}</Link>
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
                setLookupError(error instanceof Error ? error.message : uiText.text_6242b7c1497d);
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
              {uiText.text_54c852331c9b}
              <input
                dir="ltr"
                aria-label={uiText.text_30d28a3021cd}
                placeholder={uiText.text_cff9c0e723ac}
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
              {busy ? uiText.text_25384e522776 : uiText.text_43dad0d90fdf}
            </Button>
          </form>
          {resolved && !person && (
            <EmptyState title={uiText.text_0364864766f8} description={uiText.text_2dd3b2bb5816} />
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
                  <bdi dir="ltr">
                    {uiText.text_c3641f8544d7}
                    {person.username}
                  </bdi>
                  {person.phoneNumber && (
                    <p>
                      <bdi dir="ltr">{person.phoneNumber}</bdi>
                    </p>
                  )}
                </div>
              </div>
              {person.userId === session.user.id ? (
                <p className={s.muted}>{uiText.text_c068733f39cf}</p>
              ) : (
                <>
                  <label className={s.singleField}>
                    {uiText.text_07436f1f45ac}
                    <input value={savedName} onChange={(e) => setSavedName(e.target.value)} />
                  </label>
                  <div className={s.actions}>
                    <Button
                      disabled={busy}
                      onClick={() => void save(person, savedName.trim() || null)}
                    >
                      {uiText.text_7290148d263c}
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
                      {uiText.text_2d995041bb4a}
                    </Button>
                  </div>
                  {!person.canStartDirect && <p className={s.muted}>{uiText.text_b8440364bb81}</p>}
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
              <span className="sr-only">
                {tab === 'contacts' ? uiText.text_88c808fdf7f4 : uiText.text_2562435815a8}
              </span>
              <input
                aria-label={uiText.text_2c54ecc60e86}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  tab === 'contacts' ? uiText.text_47c491561dd4 : uiText.text_39abf906c29d
                }
              />
            </label>
            <Button type="submit" variant="outline">
              <Search size={17} />
              <span className="sr-only">{uiText.text_2a93eb7f06ce}</span>
            </Button>
          </form>
          {tab === 'search' && !query ? (
            <EmptyState title={uiText.text_8e4123c40ba0} description={uiText.text_514b1fbad09d} />
          ) : data.isPending ? (
            <LoadingSkeleton />
          ) : data.isError ? (
            <ErrorState error={data.error} onRetry={() => void data.refetch()} />
          ) : !rows?.length ? (
            <EmptyState
              title={tab === 'contacts' ? uiText.text_8d1b81ec1aa1 : uiText.text_9620a4294e2d}
              description={tab === 'contacts' ? uiText.text_17f6af62f546 : uiText.text_dae5c09caaa2}
            />
          ) : (
            <div className={s.contactRows}>
              {rows.map((row) => (
                <article key={row.profile.userId} className={`${s.contactRow} ${d.contact}`}>
                  <ProfileAvatar
                    photo={row.profile.profilePhoto}
                    name={row.name}
                    className={s.avatar}
                  />
                  <div>
                    <strong>{row.name}</strong>
                    <small>
                      <bdi dir="ltr">
                        {uiText.text_c3641f8544d7}
                        {row.profile.username}
                      </bdi>
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
                    {uiText.text_99c891fdab48}
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
                      {uiText.text_8cfe257aece4}
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
                aria-label={uiText.text_a7009e9019ab}
                disabled={page <= 1 || data.isFetching}
                onClick={() => setPage(page - 1)}
              >
                <ChevronRight size={18} />
              </Button>
              <span>
                {uiText.text_2714496eef16}
                {number(page)}
              </span>
              <Button
                size="icon"
                variant="outline"
                aria-label={uiText.text_a0b6f49670b9}
                disabled={!data.data?.hasMore || data.isFetching}
                onClick={() => setPage(page + 1)}
              >
                <ChevronLeft size={18} />
              </Button>
            </div>
          )}
        </section>
      )}
    </MessagingSurface>
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
          aria-label={uiText.text_aa46bc41d37e + (contact.savedName || contact.profile.displayName)}
        >
          <MoreHorizontal size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={`${t.theme} ${t.dialog}`}
        title={uiText.text_dae770ce3334}
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
            {uiText.text_796ebc9a8741}
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
            <span>{uiText.text_c4749ec2c895}</span>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? uiText.text_b5ef00b1806f : uiText.text_b7d4e6239152}
          </Button>
        </form>
        <p className={s.muted}>{uiText.text_d5499ef00124}</p>
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
            {uiText.text_b41fe8563d7d}
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
            {uiText.text_539f52498828}
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
            {uiText.text_24417444e3d1}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export { BlockedAccountsPage, MessagingPrivacyPage } from './privacy';
