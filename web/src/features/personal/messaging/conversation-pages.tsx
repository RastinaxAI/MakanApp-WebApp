'use client';
import * as uiText from '@/content/fa';
import { PageBack } from '@/components/navigation/page-back';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Files,
  Users,
  Settings2,
  MessageCircle,
  Pencil,
  Shield,
  Lock,
  History,
  Link2,
  List,
  Heart,
  Hand,
  MessagesSquare,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { findConversationSummary, isManagedConversation } from './summary';
import { conversationRoleLabels, conversationTitle } from './model';
import { MessageAttachment } from './media';
import { useMessagingLive } from './live';
import { OfficialBadge, useOfficialConversationAccess } from './official';
import c from './conversation-pages.module.css';
import { ConversationInviteLinks } from './invite-links';
import { ConversationTopics } from './topics';
import {
  canManageMembers,
  conversationCapability,
  canManageConversation,
} from './management-policy';
import { MessagingSurface } from './messaging-surface';
import { ProfileAvatar } from '../profile-photo';
import { ConversationAvatar } from './conversation-photo';
import { ConversationInfoEditor, AddConversationMember, MemberManagement } from './management';
import { SettingRow, UnavailableSetting, MuteAction } from './conversation-controls';
type S = components['schemas'];
export type ConversationSection =
  | 'info'
  | 'members'
  | 'media'
  | 'settings'
  | 'edit'
  | 'invites'
  | 'topics';
const route = (id: string) => '/personal/messages/' + id;
export function ConversationPage({ id, section }: { id: string; section: ConversationSection }) {
  const { session, call } = usePersonal();
  const q = useQuery({
    queryKey: ['personal', session.user.id, session.revision, 'conversation-summary', id],
    queryFn: ({ signal }) =>
      findConversationSummary(
        id,
        (p) => call<S['ConversationSummaryResult']>(p, { signal }),
        signal,
      ),
    retry: false,
    refetchInterval: 15000,
  });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <ResolvedConversationPage id={id} section={section} summary={q.data} />;
}
function ResolvedConversationPage({
  id,
  section,
  summary,
}: {
  id: string;
  section: ConversationSection;
  summary: S['ConversationSummaryResult'];
}) {
  const access = useOfficialConversationAccess(summary);
  if (access.error)
    return <ErrorState error={access.error} onRetry={() => void access.refetch()} />;
  if (!access.ready) return <LoadingSkeleton />;
  const tabs: [ConversationSection, string, LucideIcon][] = [
    ['info', uiText.text_0ac642a80e31, MessageCircle],
    ['media', uiText.text_563cba00d087, Files],
  ];
  if (isManagedConversation(summary.type))
    tabs.push(
      ['members', uiText.text_102f79b3f87c, Users],
      ['settings', uiText.navigation_settings, Settings2],
    );
  return (
    <MessagingSurface className={c.page}>
      <ConversationSubscription id={id} />
      <header className={`${c.header} ${section !== 'info' ? c.compactHeader : ''}`}>
        {isManagedConversation(summary.type) ? (
          <ConversationAvatar
            id={id}
            photo={summary.photo}
            name={conversationTitle(summary)}
            className={c.heroAvatar}
          />
        ) : (
          <ProfileAvatar
            photo={summary.otherParticipant?.profilePhoto}
            name={conversationTitle(summary)}
            className={c.heroAvatar}
          />
        )}
        <div>
          <h1>{conversationTitle(summary)}</h1>
          {section === 'info' && (
            <p className={c.heroSubtitle}>
              {summary.type === 'Channel' ? (
                uiText.text_2db356b462dd
              ) : summary.type === 'Group' ? (
                uiText.text_774668d4acc7
              ) : summary.type === 'Saved' ? (
                uiText.text_9f3597ff2f66
              ) : summary.otherParticipant?.username ? (
                <bdi dir="ltr">
                  {uiText.text_c3641f8544d7}
                  {summary.otherParticipant.username}
                </bdi>
              ) : (
                uiText.text_8f421b73047d
              )}
            </p>
          )}
          <div>
            <OfficialBadge summary={summary} />
          </div>
        </div>
        <PageBack
          href={
            section === 'info'
              ? route(id)
              : section === 'edit' || section === 'members' || section === 'media'
                ? route(id) + '/info'
                : route(id) + '/edit'
          }
        />
      </header>
      {section === 'info' && summary.type !== 'Saved' && (
        <div className={c.quickActions}>
          <Link href={route(id)}>
            <MessageCircle size={23} />
            <span>
              {summary.type === 'Channel' ? uiText.text_c982501f1e57 : uiText.text_a5fc55f1f6ee}
            </span>
          </Link>
          <MuteAction summary={summary} />
          <Link href={route(id) + '/media'}>
            <Files size={23} />
            <span>{uiText.text_6577ef461d82}</span>
          </Link>
        </div>
      )}
      {['info', 'media', 'members'].includes(section) && (
        <nav className={c.tabs} aria-label={uiText.text_32cd42113754}>
          {tabs.map(([key, title, Icon]) => (
            <Link
              href={route(id) + '/' + (key === 'settings' ? 'edit' : key)}
              aria-current={
                section === key || (section === 'edit' && key === 'settings') ? 'page' : undefined
              }
              key={key}
            >
              <Icon size={19} />
              {title}
            </Link>
          ))}
        </nav>
      )}
      {section === 'media' ? (
        <ConversationMedia id={id} />
      ) : isManagedConversation(summary.type) ? (
        ['settings', 'edit', 'invites', 'topics'].includes(section) && !access.canManage ? (
          <EmptyState title={uiText.text_12512b4e3543} />
        ) : (
          <ManagedPage id={id} section={section} />
        )
      ) : section === 'info' ? (
        <DirectInfo summary={summary} />
      ) : (
        <ErrorState error={new ApiError(404)} />
      )}
    </MessagingSurface>
  );
}
function ConversationSubscription({ id }: { id: string }) {
  const { subscribe } = useMessagingLive();
  useEffect(() => subscribe(id), [id, subscribe]);
  return null;
}
function DirectInfo({ summary }: { summary: S['ConversationSummaryResult'] }) {
  return (
    <section className={c.panel}>
      <h2>{summary.type === 'Saved' ? uiText.text_f82c6fe06a24 : uiText.text_e02d12375642}</h2>
      {summary.otherParticipant && (
        <dl className={c.profileFields}>
          <div>
            <dt>{uiText.text_69c1e5b1fe20}</dt>
            <dd dir="auto">{summary.otherParticipant.displayName}</dd>
          </div>
          {summary.otherParticipant.username && (
            <div>
              <dt>{uiText.text_173fec6019a6}</dt>
              <dd>
                <bdi dir="ltr">
                  {uiText.text_c3641f8544d7}
                  {summary.otherParticipant.username}
                </bdi>
              </dd>
            </div>
          )}
        </dl>
      )}
      <p className={c.note}>
        {summary.scope === 'Personal' ? uiText.text_6223ba2ea5ad : uiText.text_86b851ad9cd5}
      </p>
      <ArchiveAction id={summary.conversationId} archived={summary.isArchived} />
    </section>
  );
}
function ManagedPage({ id, section }: { id: string; section: ConversationSection }) {
  const q = usePersonalApi<S['ManagedConversationResult']>('/api/v1/conversations/' + id, {
    poll: 5000,
  });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.conversationId !== id) return <ErrorState error={new ApiError(502)} />;
  return section === 'members' ? (
    <ConversationMembers id={id} value={q.data} />
  ) : section === 'edit' ? (
    <>
      <ConversationInfoEditor value={q.data} />
      <ManagementRows value={q.data} />
    </>
  ) : section === 'invites' ? (
    <ConversationInviteLinks value={q.data} />
  ) : section === 'topics' ? (
    <ConversationTopics value={q.data} />
  ) : section === 'settings' ? (
    <ConversationSettings value={q.data} />
  ) : (
    <>
      <ManagedInfo value={q.data} />
      <ConversationMedia id={id} />
    </>
  );
}
function ManagedInfo({ value }: { value: S['ManagedConversationResult'] }) {
  const { call, session } = usePersonal(),
    router = useRouter();
  const cache = useQueryClient();
  const owner = canManageConversation(value);
  return (
    <section className={c.panel}>
      {conversationCapability(value, 'canEditInfo') && (
        <Link
          className={c.heroEdit}
          href={route(value.conversationId) + '/edit'}
          aria-label={uiText.text_7f018872aab1}
        >
          <Pencil size={23} />
        </Link>
      )}
      <h2>{value.type === 'Channel' ? uiText.text_cc139334bedd : uiText.text_52d7d84bf065}</h2>
      <p className={c.body} dir="auto">
        {value.description || uiText.text_4d3401e58f25}
      </p>
      <dl className={c.details}>
        <div>
          <Lock size={19} />
          <div>
            <dt>
              {value.type === 'Channel' ? uiText.text_1b68cebe6d65 : uiText.text_b9eed0dd74cd}
            </dt>
            <dd>
              {value.visibility === 'Public' ? uiText.text_526e310df41f : uiText.text_e205d3a7a33e}
            </dd>
          </div>
        </div>
        <div>
          <History size={19} />
          <div>
            <dt>{uiText.text_88712bbe9ebc}</dt>
            <dd>
              {value.groupHistoryPolicy === 'FromJoin'
                ? uiText.text_c693180e811e
                : uiText.text_747182bc8309}
            </dd>
          </div>
        </div>
      </dl>
      <div className={c.settingRows}>
        <SettingRow
          icon={Users}
          title={value.type === 'Channel' ? uiText.text_e21033a53839 : uiText.text_5de04c1ab9c6}
          href={route(value.conversationId) + '/members'}
        />
        <SettingRow
          icon={Shield}
          title={uiText.text_a5f9af4e336a}
          href={route(value.conversationId) + '/members'}
        />
        {owner && (
          <SettingRow
            icon={Settings2}
            title={value.type === 'Channel' ? uiText.text_0b9e68551045 : uiText.text_c72d0ff183f6}
            href={route(value.conversationId) + '/edit'}
          />
        )}
      </div>
      {value.type === 'Group' && (
        <div className={c.rosterPreview}>
          {conversationCapability(value, 'canInviteMembers') && (
            <AddConversationMember value={value} />
          )}
          {value.participants
            .filter((m) => m.status === 'Active')
            .slice(0, 4)
            .map((m) => (
              <div className={c.rosterPerson} key={m.participantId}>
                <ProfileAvatar
                  photo={m.user.profilePhoto}
                  name={m.user.displayName}
                  className={c.avatar}
                />
                <div>
                  <strong dir="auto">{m.user.displayName}</strong>
                  <small>
                    {m.user.username ? '@' + m.user.username : uiText.text_0045a56d2e19}
                  </small>
                </div>
                {m.role !== 'Member' && (
                  <span className={c.roleBadge}>{conversationRoleLabels[m.role]}</span>
                )}
              </div>
            ))}
        </div>
      )}
      {value.managementPolicy === 'SystemManagedAcademic' ? (
        <p className={c.note}>{uiText.text_01793b42b2ba}</p>
      ) : (
        <div className={c.actions}>
          <ConfirmAction
            destructive
            title={uiText.text_9299c9dc14c6}
            trigger={value.type === 'Channel' ? uiText.text_c71a9ac02f77 : uiText.text_25e26909e1ab}
            description={uiText.text_2b09c8612d26}
            confirm={uiText.text_9299c9dc14c6}
            onConfirm={async () => {
              await call('/api/v1/conversations/' + value.conversationId + '/leave', {
                method: 'POST',
              });
              void cache.invalidateQueries({
                queryKey: ['personal', session.user.id, session.revision],
              });
              router.replace('/personal/messages');
              return true;
            }}
          />
        </div>
      )}
    </section>
  );
}
function ManagementRows({ value }: { value: S['ManagedConversationResult'] }) {
  if (!canManageConversation(value)) return null;
  const base = route(value.conversationId),
    channel = value.type === 'Channel';
  return (
    <section className={c.managementCards} aria-label={uiText.text_76c4dcda8d25}>
      <div className={c.rowCard}>
        {conversationCapability(value, 'canChangeSettings') && (
          <SettingRow
            icon={channel ? MessagesSquare : Users}
            title={channel ? uiText.text_1b68cebe6d65 : uiText.text_b9eed0dd74cd}
            value={
              value.visibility === 'Public' ? uiText.text_526e310df41f : uiText.text_e205d3a7a33e
            }
            href={base + '/settings'}
          />
        )}
        {!channel && conversationCapability(value, 'canChangeSettings') && (
          <SettingRow
            icon={History}
            title={uiText.text_93241310d77c}
            value={
              value.groupHistoryPolicy === 'FromJoin'
                ? uiText.text_c693180e811e
                : uiText.text_4e95f3ce6edd
            }
            href={base + '/settings'}
          />
        )}
        {!channel && conversationCapability(value, 'canManageTopics') && (
          <SettingRow icon={List} title={uiText.text_7d6bf52fbd3e} href={base + '/topics'} />
        )}
        {channel && (
          <UnavailableSetting
            icon={MessageCircle}
            title={uiText.text_2226ed46e579}
            description={uiText.text_30b5f221253e}
          />
        )}
      </div>
      <div className={c.rowCard}>
        {conversationCapability(value, 'canManageInvites') && (
          <SettingRow icon={Link2} title={uiText.text_10c263e49b58} href={base + '/invites'} />
        )}
        {(conversationCapability(value, 'canManageMembers') ||
          conversationCapability(value, 'canManageAdmins')) && (
          <SettingRow icon={Shield} title={uiText.text_a5f9af4e336a} href={base + '/members'} />
        )}
        <PermissionCatalog value={value} />
      </div>
      <div className={c.rowCard}>
        <UnavailableSetting
          icon={Heart}
          title={uiText.text_6e0960982174}
          description={uiText.text_659615a7e539}
        />
        <UnavailableSetting
          icon={Hand}
          title={uiText.text_b2c00b4bfc07}
          description={uiText.text_53c8f001930c}
        />
        <UnavailableSetting
          icon={Video}
          title={channel ? uiText.text_7ac728600e49 : uiText.text_ab5201540315}
          description={uiText.text_7d03f42270a4}
        />
      </div>
    </section>
  );
}
function ConversationMembers({ id, value }: { id: string; value: S['ManagedConversationResult'] }) {
  const { session } = usePersonal();
  const owner = canManageMembers(value, session.user.id);
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['ConversationParticipantPageResult']>(
    `/api/v1/conversations/${id}/members?page=${page}&pageSize=30`,
    { poll: 5000 },
  );
  return (
    <section className={c.panel}>
      <div className={c.filters}>
        <h2>{uiText.text_6347d5e56150}</h2>
        {conversationCapability(value, 'canInviteMembers') && (
          <AddConversationMember value={value} />
        )}
      </div>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={c.members}>
            {q.data.items.length ? (
              q.data.items.map((m) => (
                <article key={m.participantId}>
                  <ProfileAvatar
                    photo={m.user.profilePhoto}
                    name={m.user.displayName}
                    className={c.avatar}
                  />
                  <div>
                    <strong>{m.user.displayName}</strong>
                    {m.user.username && (
                      <small>
                        <bdi dir="ltr">
                          {uiText.text_c3641f8544d7}
                          {m.user.username}
                        </bdi>
                      </small>
                    )}
                    <small>
                      {m.status === 'Active'
                        ? uiText.text_1e148080c7c2
                        : m.status === 'Removed'
                          ? uiText.text_fe9630da3708
                          : uiText.text_568c1cd99f89}{' '}
                      {uiText.text_6e01f78b9eb4}
                      {conversationRoleLabels[m.role]}
                    </small>
                  </div>
                  {(owner || conversationCapability(value, 'canManageAdmins')) &&
                    m.role !== 'Owner' &&
                    m.status === 'Active' && (
                      <MemberManagement
                        id={id}
                        member={m}
                        canManageAdmins={conversationCapability(value, 'canManageAdmins')}
                        canManageMembers={owner}
                      />
                    )}
                </article>
              ))
            ) : (
              <EmptyState title={uiText.text_2c34dd61a34f} />
            )}
          </div>
          <div className={c.actions}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {uiText.text_88e65319d694}
            </Button>
            <span>
              {uiText.text_2714496eef16}
              {page.toLocaleString('fa-IR')}
            </span>
            <Button variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>
              {uiText.text_12ca1a58c6ca}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
function ConversationMedia({ id }: { id: string }) {
  const selectId = useId();
  const { session, call } = usePersonal();
  const [kind, setKind] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['personal', session.user.id, session.revision, 'conversation-media', id, kind],
    initialPageParam: null as number | null,
    refetchInterval: 5000,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (kind) params.set('kind', kind);
      if (pageParam !== null) params.set('beforeSequence', String(pageParam));
      const value = await call<S['ConversationMediaPageResult']>(
        `/api/v1/conversations/${id}/media?${params}`,
        { signal },
      );
      if (
        value.nextBeforeSequence !== null &&
        pageParam !== null &&
        value.nextBeforeSequence >= pageParam
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      return value;
    },
    getNextPageParam: (last) => last.nextBeforeSequence ?? undefined,
  });
  const items =
    q.data?.pages
      .flatMap((p) => p.items)
      .filter(
        (item, i, rows) =>
          rows.findIndex(
            (x) =>
              x.sequence === item.sequence &&
              x.attachment.fileAssetId === item.attachment.fileAssetId,
          ) === i,
      ) ?? [];
  return (
    <section className={c.panel}>
      <div className={c.filters}>
        <h2>{uiText.text_8b5bf435319d}</h2>
        <div>
          <label htmlFor={selectId}>{uiText.text_745ae2a160df}</label>
          <select id={selectId} value={kind} onChange={(ev) => setKind(ev.target.value)}>
            <option value="">{uiText.text_85a801ba9df1}</option>
            <option value="Image">{uiText.text_972d6b378a7b}</option>
            <option value="Video">{uiText.text_8a1583a102ac}</option>
            <option value="File">{uiText.text_d099cfd756e0}</option>
          </select>
        </div>
      </div>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError && !items.length ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <div className={c.media}>
            {items.length ? (
              items.map((item) => (
                <article key={item.sequence + ':' + item.attachment.fileAssetId}>
                  <MessageAttachment conversationId={id} asset={item.attachment} />
                  <small>{date(item.sentAtUtc, true)}</small>
                </article>
              ))
            ) : (
              <EmptyState title={uiText.text_648cc23ae875} />
            )}
          </div>
          {q.isError && <ErrorState error={q.error} />}
          {q.hasNextPage && (
            <Button
              disabled={q.isFetchingNextPage}
              variant="outline"
              onClick={() => void q.fetchNextPage()}
            >
              {q.isFetchingNextPage ? uiText.text_80516c4adbbe : uiText.text_12e9b2eceeab}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
function ConversationSettings({ value }: { value: S['ManagedConversationResult'] }) {
  const visibilityId = useId(),
    historyId = useId();
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const owner = conversationCapability(value, 'canChangeSettings');
  const [baseline, setBaseline] = useState({
      visibility: value.visibility,
      history: value.groupHistoryPolicy,
      version: value.version,
    }),
    [visibility, setVisibility] = useState(value.visibility),
    [history, setHistory] = useState(value.groupHistoryPolicy),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState(false);
  const lock = useRef(false),
    dirty = visibility !== baseline.visibility || history !== baseline.history,
    stale = baseline.version !== value.version;
  useUnsavedChanges(dirty);
  if (!owner)
    return (
      <section className={`${c.panel} ${c.settingsPanel}`}>
        <h2>{uiText.text_ad01ea1c94b6}</h2>
        <p className={c.note}>{uiText.text_8d780fc7d678}</p>
      </section>
    );
  return (
    <section className={`${c.panel} ${c.settingsPanel}`}>
      <h2>
        {uiText.text_aa46bc41d37e}
        {value.type === 'Channel' ? uiText.text_2db356b462dd : uiText.text_774668d4acc7}
      </h2>
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (lock.current || stale || !dirty) return;
          lock.current = true;
          setBusy(true);
          setError(undefined);
          setSuccess(false);
          try {
            const updated = await call<S['ManagedConversationResult']>(
              '/api/v1/conversations/' + value.conversationId + '/settings',
              {
                method: 'PATCH',
                body: JSON.stringify({
                  visibility,
                  groupHistoryPolicy: history,
                  memberCapabilities: value.memberCapabilities,
                  expectedVersion: baseline.version,
                }),
              },
            );
            if (updated.conversationId !== value.conversationId)
              throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
            const key = [
              'personal',
              session.user.id,
              session.revision,
              '/api/v1/conversations/' + value.conversationId,
            ];
            await cache.cancelQueries({ queryKey: key });
            cache.setQueryData(key, updated);
            setBaseline({
              visibility: updated.visibility,
              history: updated.groupHistoryPolicy,
              version: updated.version,
            });
            setVisibility(updated.visibility);
            setHistory(updated.groupHistoryPolicy);
            setSuccess(true);
          } catch (err) {
            setError(err);
            if (err instanceof ApiError && [409, 412].includes(err.status))
              void cache.invalidateQueries({
                queryKey: [
                  'personal',
                  session.user.id,
                  session.revision,
                  '/api/v1/conversations/' + value.conversationId,
                ],
              });
          } finally {
            setBusy(false);
            lock.current = false;
          }
        }}
      >
        <fieldset disabled={busy || stale} className={c.form}>
          <fieldset className={c.choiceCard} aria-labelledby={visibilityId}>
            <legend id={visibilityId}>{uiText.text_6d85705a8779}</legend>
            {(['Private', 'Public'] as const).map((option) => (
              <label className={c.radioChoice} key={option}>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === option}
                  onChange={() => setVisibility(option)}
                />
                <span>
                  <strong>
                    {option === 'Private' ? uiText.text_e205d3a7a33e : uiText.text_526e310df41f}
                  </strong>
                  <small>
                    {option === 'Private' ? uiText.text_cb504fe8648a : uiText.text_6d2331f083cb}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className={c.choiceCard} aria-labelledby={historyId}>
            <legend id={historyId}>{uiText.text_88712bbe9ebc}</legend>
            {(['FromJoin', 'FullHistory'] as const).map((option) => (
              <label className={c.radioChoice} key={option}>
                <input
                  type="radio"
                  name="history"
                  checked={history === option}
                  onChange={() => setHistory(option)}
                />
                <span>
                  <strong>
                    {option === 'FromJoin' ? uiText.text_c693180e811e : uiText.text_747182bc8309}
                  </strong>
                  <small>
                    {option === 'FromJoin' ? uiText.text_364d7031b847 : uiText.text_b0faa1b686ee}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className={c.actions}>
            <Button disabled={!dirty} type="submit">
              {busy ? uiText.text_b5ef00b1806f : uiText.text_0f50f4779d8f}
            </Button>
          </div>
        </fieldset>
      </form>
      {stale && (
        <div role="alert">
          <p>{uiText.text_5a085de59e41}</p>
          <ConfirmAction
            title={uiText.text_077b680f5a66}
            trigger={uiText.text_360204aefeab}
            description={uiText.text_6b8cef37f4f4}
            onConfirm={async () => {
              setVisibility(value.visibility);
              setHistory(value.groupHistoryPolicy);
              setBaseline({
                visibility: value.visibility,
                history: value.groupHistoryPolicy,
                version: value.version,
              });
              return true;
            }}
          />
        </div>
      )}
      {!!error && <ErrorState error={error} />}
      {success && <p role="status">{uiText.text_b2764e825c30}</p>}
    </section>
  );
}
function ArchiveAction({ id, archived }: { id: string; archived: boolean }) {
  const { call, session } = usePersonal(),
    router = useRouter();
  const cache = useQueryClient();
  return (
    <div className={c.actions}>
      <ConfirmAction
        title={archived ? uiText.text_863dece374bf : uiText.text_5c846bae22ae}
        trigger={archived ? uiText.text_7961f47c1630 : uiText.text_5c846bae22ae}
        description={uiText.text_dc67b660687e}
        onConfirm={async () => {
          await call('/api/v1/conversations/' + id + '/archive', {
            method: archived ? 'DELETE' : 'POST',
          });
          void cache.invalidateQueries({
            queryKey: ['personal', session.user.id, session.revision],
          });
          router.replace('/personal/messages' + (archived ? '' : '?filter=Archived'));
          return true;
        }}
      />
    </div>
  );
}

function PermissionCatalog({ value }: { value: S['ManagedConversationResult'] }) {
  const q = usePersonalApi<S['ConversationPermissionDescriptor'][]>(
    '/api/v1/conversations/permissions',
  );
  return (
    <details className={c.note}>
      <summary>{uiText.text_38ec5214a232}</summary>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <ul>
          {q.data
            .filter(
              (item) =>
                item.conversationTypes.includes(value.type) &&
                (value.managementPolicy === 'SystemManagedAcademic'
                  ? item.appliesToSystemManagedAcademic
                  : item.appliesToUserManaged),
            )
            .map((item) => (
              <li key={item.category + ':' + item.key}>
                {item.description}
                {item.officialRelationshipDerivedOnly ? uiText.text_4ccd6c829701 : ''}
              </li>
            ))}
        </ul>
      )}
      <p>{uiText.text_a84fa232d06f}</p>
    </details>
  );
}
