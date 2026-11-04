'use client';
import * as uiText from '@/content/fa';
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
        if (!parsed.success) throw new Error(uiText.text_07379c3f080e);
        const value = parsed.data as Command;
        if (value.scope !== 'Personal') throw new Error(uiText.text_f00bc0f210dc);
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
      setError(new Error(uiText.text_f43b73d65e75));
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
      cache.setQueryData(
        ['personal', session.user.id, session.revision, 'creation-receipt', result.conversationId],
        result.initialTargets ?? [],
      );
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
          <span>
            {uiText.text_a62512b0c13b}
            {members ? uiText.text_bc9c03bb975e : uiText.text_62b67013987e}
            {uiText.text_f4f45f3f86f8}
          </span>
          <h1>{group ? uiText.text_70c53f6a4727 : uiText.text_21579cd85bef}</h1>
          <p>{members ? uiText.text_043cba85cfbc : uiText.text_ccfdb4dc6298}</p>
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
            title={uiText.text_3bd2ff842bd4}
            description={messagingNextLabels[status.data.nextAction]}
          />
          <Button asChild variant="outline">
            <Link href="/personal/profile">{uiText.text_e0318aee0f47}</Link>
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
          <ol className={d.steps} aria-label={uiText.text_e5abd525ad78}>
            <li aria-current={!members ? 'step' : undefined}>
              <span>{members ? <Check size={16} /> : uiText.text_62b67013987e}</span>
              {uiText.text_5b40aa409c80}
              {group ? uiText.text_774668d4acc7 : uiText.text_2db356b462dd}
            </li>
            <li aria-current={members ? 'step' : undefined}>
              <span>{uiText.text_bc9c03bb975e}</span>
              {uiText.text_c476c232b8e6}
            </li>
          </ol>
          {!members && (
            <section className={s.profileCard}>
              <div className={d.createAvatar}>
                {group ? <Users size={32} /> : <Megaphone size={32} />}
              </div>
              <label className={s.singleField}>
                {group ? uiText.text_0e1567f71aa6 : uiText.text_e282736ca3cc}
                <input
                  required
                  value={title}
                  disabled={busy || !!frozen}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className={s.singleField}>
                {uiText.text_75e45482aebb}
                <textarea
                  rows={3}
                  value={description}
                  disabled={busy || !!frozen}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className={s.singleField}>
                {uiText.text_d09e4c6a2b5a}
                <select
                  required
                  value={chosenVisibility}
                  disabled={busy || !!frozen || privateOnly}
                  onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                >
                  <option value="" disabled>
                    {uiText.text_398ac1b17cdd}
                  </option>
                  <option value="Private">{uiText.text_e205d3a7a33e}</option>
                  <option value="Public">{uiText.text_526e310df41f}</option>
                </select>
              </label>
              {privateOnly && <p className={s.muted}>{uiText.text_20acc600bc80}</p>}
              {group && (
                <label className={s.singleField}>
                  {uiText.text_d30d3aa840fa}
                  <select
                    value={history}
                    disabled={busy || !!frozen}
                    onChange={(e) => setHistory(e.target.value as typeof history)}
                  >
                    <option value="">{uiText.text_99f51b9ca3db}</option>
                    <option value="FullHistory">{uiText.text_079e2f4cd4d2}</option>
                    <option value="FromJoin">{uiText.text_c693180e811e}</option>
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
                    {chosenVisibility === 'Private'
                      ? uiText.text_e205d3a7a33e
                      : uiText.text_526e310df41f}
                    {uiText.text_588da4105320}
                    {number(selected.size)} {uiText.text_4339e868ff4c}
                  </small>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || !!frozen}
                  onClick={() => router.push(stepUrl)}
                >
                  {uiText.text_d6aa12d559e9}
                </Button>
              </div>
              <h2>{uiText.text_b462d2f2ea47}</h2>
              <div className={d.contactSearch}>
                <Search size={18} />
                <input
                  aria-label={uiText.text_78c43fe4c4d4}
                  placeholder={uiText.text_671a1dcda1c2}
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
                  {uiText.text_2a93eb7f06ce}
                </Button>
              </div>
              <p className={s.muted}>
                {number(selected.size)}
                {uiText.text_903259a26e2b}
              </p>
              {contacts.isPending ? (
                <LoadingSkeleton />
              ) : contacts.isError ? (
                <ErrorState error={contacts.error} onRetry={() => void contacts.refetch()} />
              ) : !contacts.data.items.length ? (
                <EmptyState
                  title={uiText.text_185fb1725ae8}
                  description={uiText.text_93792447ba47}
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
                            <bdi dir="ltr">
                              {uiText.text_c3641f8544d7}
                              {contact.profile.username}
                            </bdi>
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
                  {uiText.text_88e65319d694}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!contacts.data?.hasMore || contacts.isFetching}
                  onClick={() => setPage(page + 1)}
                >
                  {uiText.text_12ca1a58c6ca}
                </Button>
              </div>
            </section>
          )}
          {!!error &&
            (error instanceof ApiError ? (
              <ErrorState error={error} />
            ) : (
              <p className="field-error" role="alert">
                {error instanceof Error ? error.message : uiText.text_ee786ae11865}
              </p>
            ))}
          {frozen && <p className={s.muted}>{uiText.text_ca7549e86e0e}</p>}
          <Button
            type="submit"
            disabled={busy || !storageReady || !title.trim() || !chosenVisibility}
          >
            {busy ? (
              uiText.text_25384e522776
            ) : !members ? (
              <>
                {uiText.text_9e8be562d436}
                <ArrowLeft size={18} />
              </>
            ) : frozen ? (
              uiText.text_6f96c570c24b
            ) : group ? (
              uiText.text_9c8e4fa37d9f
            ) : (
              uiText.text_67f771b12e76
            )}
          </Button>
        </form>
      )}
    </MessagingSurface>
  );
}
