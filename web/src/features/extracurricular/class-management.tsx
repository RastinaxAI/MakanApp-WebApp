'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { integration80c as t } from '@/content/fa';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import { usePersonal, usePersonalApi } from '@/features/personal/provider';
import { resolvePersonInput } from '@/features/personal/messaging/directory';
import { Field, Pager } from '@/features/personal/school/shared';
import { date } from '@/lib/formatting';
import { ApiError } from '@/lib/api/errors';
import { classBase as base, classApi as api, stateLabel, hasFlag, type S } from './api-model';
import { StaticConnectedFrame } from './frame';
import { useClassCommand } from './use-class-command';

function QueryResult({
  q,
  children,
}: {
  q: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  children: ReactNode;
}) {
  return q.isPending ? (
    <LoadingSkeleton />
  ) : q.isError ? (
    <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  ) : (
    children
  );
}
export function ClassOverview({ id }: { id: string }) {
  const q = usePersonalApi<S['PersonalClassDto']>(`${api}/${id}`, { poll: 10000 });
  return (
    <StaticConnectedFrame id="MK-24" title={q.data?.title ?? t.independent}>
      <QueryResult q={q}>
        {q.data && (
          <>
            <section className="card">
              <span className="badge">{stateLabel(q.data.state ?? 'Unknown')}</span>
              <h3>{q.data.title}</h3>
              <p>
                {t.capacity}: {q.data.capacity?.toLocaleString('fa-IR') ?? '—'}
              </p>
              <p>{t.grantHint}</p>
            </section>
            <div className="list">
              {[
                ['learning', t.learning],
                ['members', t.members],
                ['requests', t.joins],
                ['invite', t.invite],
                ['setup', t.spaces],
                ['info', t.history],
                ['edit', t.settings],
              ].map(([path, label]) => (
                <Link className="row" key={path} href={`${base}/classes/${id}/${path}`}>
                  {label}
                </Link>
              ))}
            </div>
            <ClassSpaces value={q.data} />
          </>
        )}
      </QueryResult>
    </StaticConnectedFrame>
  );
}
function VersionForm({
  version,
  busy,
  children,
  onSubmit,
  label = t.save,
}: {
  version: string;
  busy: boolean;
  children: ReactNode;
  onSubmit: (data: FormData, version: string) => Promise<unknown>;
  label?: string;
}) {
  const [committed, setCommitted] = useState(false);
  const [expected, setExpected] = useState(version),
    stale = expected !== version;
  useEffect(() => {
    if (committed) {
      setExpected(version);
      setCommitted(false);
    }
  }, [committed, version]);
  return (
    <form
      className="card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stale && !busy) {
          const result = await onSubmit(new FormData(e.currentTarget), expected);
          if (result) setCommitted(true);
        }
      }}
    >
      <fieldset className="stack" disabled={busy}>
        {children}
        <Field label={t.reason}>
          <textarea name="reason" required maxLength={500} />
        </Field>
      </fieldset>
      {stale && (
        <>
          <p role="alert">{t.versionConflict}</p>
          <Button type="button" variant="outline" onClick={() => setExpected(version)}>
            {t.refresh}
          </Button>
        </>
      )}
      <Button disabled={busy || stale || !version}>{label}</Button>
    </form>
  );
}
export function ClassManagement({
  id,
  section,
  memberId,
}: {
  id: string;
  section: string;
  memberId?: string;
}) {
  const q = usePersonalApi<S['PersonalClassDto']>(`${api}/${id}`, {
    enabled: section !== 'join',
    poll: 10000,
  });
  if (section === 'join')
    return (
      <StaticConnectedFrame id="MK-28" title={t.join}>
        <JoinClass id={id} />
      </StaticConnectedFrame>
    );
  return (
    <StaticConnectedFrame
      back={`${base}/classes/${id}`}
      id={
        section === 'members'
          ? 'MK-30'
          : section === 'requests'
            ? 'MK-29'
            : section === 'invite'
              ? 'MK-26'
              : section === 'edit'
                ? 'MK-55'
                : 'MK-34'
      }
      title={q.data?.title ?? t.independent}
    >
      <QueryResult q={q}>
        {q.data &&
          (section === 'members' ? (
            <Members value={q.data} memberId={memberId} />
          ) : section === 'requests' ? (
            <JoinRequests value={q.data} />
          ) : section === 'invite' ? (
            <InviteMember value={q.data} />
          ) : ['edit', 'archive'].includes(section) ? (
            <ClassSettings value={q.data} />
          ) : section === 'info' ? (
            <ClassHistory id={id} />
          ) : (
            <ClassSpaces value={q.data} />
          ))}
      </QueryResult>
    </StaticConnectedFrame>
  );
}
function ClassSpaces({ value }: { value: S['PersonalClassDto'] }) {
  const q = usePersonalApi<S['OfficialSpacesPairResult']>(`${api}/${value.id}/spaces`, {
    poll: 5000,
  });
  const command = useClassCommand('repair:' + value.id),
    [pending, setPending] = useState(false);
  return (
    <section className="card stack">
      <h3>{t.spaces}</h3>
      <QueryResult q={q}>
        {q.data && (
          <div className="link-pair">
            {(['group', 'channel'] as const).map((kind) => {
              const space = q.data![kind];
              return (
                <div className="link-card" key={kind}>
                  <h4>{t[kind]}</h4>
                  <p>{stateLabel(space.state)}</p>
                  {space.conversationId && space.capabilities.canRead && (
                    <Link
                      className="btn secondary"
                      href={`/personal/messages/${space.conversationId}`}
                    >
                      {t.open}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </QueryResult>
      {value.capabilities?.canManageSpaces && value.version && (
        <VersionForm
          version={value.version}
          busy={command.busy}
          label={t.repair}
          onSubmit={async (f, version) => {
            const r = await command.run(`${api}/${value.id}/spaces/repair`, {
              expectedVersion: version,
              reason: f.get('reason'),
            });
            if (r) {
              setPending(true);
              void q.refetch();
            }
          }}
        >
          <p>{t.formationHint}</p>
        </VersionForm>
      )}
      {pending && <p role="status">{t.repairPending}</p>}
      {command.feedback}
    </section>
  );
}
export function ClassInvitationList({ id }: { id?: string }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['PersonalClassPageOfPersonalClassInvitationDto']>(
    `${api}/invitations/page?page=${page}&pageSize=30`,
    { poll: 10000 },
  );
  return (
    <StaticConnectedFrame id="MK-27" title={t.invitations}>
      <QueryResult q={q}>
        {q.data && (
          <>
            {!q.data.items.length && <EmptyState title={t.noItems} />}{' '}
            {q.data.items
              .filter((v) => !id || v.id === id)
              .map((v) => (
                <Invitation key={v.id} value={v} />
              ))}
            <Pager page={page} total={q.data.totalCount} onChange={setPage} />
          </>
        )}
      </QueryResult>
      <Transfers />
    </StaticConnectedFrame>
  );
}
function Invitation({ value }: { value: S['PersonalClassInvitationDto'] }) {
  const command = useClassCommand('invitation:' + value.id),
    router = useRouter(),
    { session } = usePersonal();
  const pending = value.status === 'Pending' && Date.parse(value.expiresAtUtc) > Date.now();
  return (
    <article className="card stack">
      <h3>{t.invitations}</h3>
      <p>{stateLabel(value.status ?? (value.accepted ? 'Accepted' : 'Unknown'))}</p>
      <small>{date(value.expiresAtUtc, true)}</small>
      {pending && value.destinationUserId === session.user.id && (
        <>
          <Button
            disabled={command.busy}
            onClick={async () => {
              const r = await command.run<S['PersonalClassDto']>(
                `${api}/invitations/${value.id}/accept`,
              );
              if (r) router.push(`${base}/classes/${r.value.id}`);
            }}
          >
            {t.accept}
          </Button>
          {value.version && (
            <VersionForm
              version={value.version}
              busy={command.busy}
              label={t.decline}
              onSubmit={(f, version) =>
                command.run(`${api}/invitations/${value.id}/decline`, {
                  expectedVersion: version,
                  reason: f.get('reason'),
                })
              }
            >
              <p>{t.decline}</p>
            </VersionForm>
          )}
        </>
      )}
      {command.feedback}
    </article>
  );
}
function InviteMember({ value }: { value: S['PersonalClassDto'] }) {
  const { call } = usePersonal(),
    [target, setTarget] = useState(''),
    [roles, setRoles] = useState('Learner');
  const [error, setError] = useState<unknown>(),
    [invitation, setInvitation] = useState<S['PersonalClassInvitationDto']>();
  const command = useClassCommand('invite:' + value.id),
    [resolving, setResolving] = useState(false);
  if (!value.capabilities?.canManageMembers) return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (resolving || command.busy) return;
          setResolving(true);
          setError(undefined);
          try {
            const resolved = await call<S['PeopleResolveResult']>('/api/v1/people/resolve', {
              method: 'POST',
              body: JSON.stringify(resolvePersonInput(target)),
            });
            if (!resolved.isDiscoverable || !resolved.profile) throw new ApiError(404);
            const person = resolved.profile;
            const r = await command.run<S['PersonalClassInvitationDto']>(
              `${api}/${value.id}/invitations`,
              {
                destinationUserId: person.userId,
                localRoles: roles,
                delegatedCapabilities: 'None',
              },
              { idempotent: true },
            );
            if (r) setInvitation(r.value);
          } catch (e) {
            setError(e);
          } finally {
            setResolving(false);
          }
        }}
      >
        <Field label={t.target}>
          <input required value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label={t.roles}>
          <select value={roles} onChange={(e) => setRoles(e.target.value)}>
            <option value="Learner">{t.learner}</option>
            <option value="Teacher">{t.teacher}</option>
          </select>
        </Field>
        <Button disabled={command.busy || resolving}>{t.invite}</Button>
        {!!error && <ErrorState error={error} />}
        {command.feedback}
      </form>
      {invitation && (
        <div className="card">
          <p role="status">{t.pendingMember}</p>
          <p>
            {stateLabel(invitation.status ?? 'Unknown')} · {date(invitation.expiresAtUtc, true)}
          </p>
          {invitation.version && (
            <VersionForm
              version={invitation.version}
              busy={command.busy}
              label={t.revoke}
              onSubmit={(f, version) =>
                command.run(`${api}/invitations/${invitation.id}/revoke`, {
                  expectedVersion: version,
                  reason: f.get('reason'),
                })
              }
            >
              <p>{t.revoke}</p>
            </VersionForm>
          )}
        </div>
      )}
    </>
  );
}
function JoinClass({ id }: { id: string }) {
  const command = useClassCommand('join:' + id),
    [result, setResult] = useState<S['PersonalClassJoinDto']>();
  return (
    <section className="card stack">
      <p>{t.pendingMember}</p>
      <Button
        disabled={command.busy || !!result}
        onClick={async () => {
          const r = await command.run<S['PersonalClassJoinDto']>(
            `${api}/${id}/join-requests`,
            {},
            { idempotent: true },
          );
          if (r) setResult(r.value);
        }}
      >
        {t.join}
      </Button>
      {result && <p role="status">{stateLabel(result.status)}</p>}
      {command.feedback}
    </section>
  );
}
function JoinRequests({ value }: { value: S['PersonalClassDto'] }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['PersonalClassPageOfPersonalClassJoinDto']>(
    `${api}/join-requests?classId=${value.id}&page=${page}&pageSize=30`,
    { poll: 10000 },
  );
  return (
    <QueryResult q={q}>
      {q.data && (
        <>
          {q.data.items.map((item) => (
            <JoinDecision
              key={item.id}
              value={item}
              canManage={value.capabilities?.canManageMembers === true}
            />
          ))}
          {!q.data.items.length && <EmptyState title={t.noItems} />}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </QueryResult>
  );
}
function JoinDecision({
  value,
  canManage,
}: {
  value: S['PersonalClassJoinDto'];
  canManage: boolean;
}) {
  const command = useClassCommand('join-decision:' + value.id);
  return (
    <article className="card stack">
      <p>
        <MemberName userId={value.userId} />
      </p>
      <p>{stateLabel(value.status)}</p>
      {canManage && value.status === 'Pending' && (
        <VersionForm
          version={value.version}
          busy={command.busy}
          label={t.action}
          onSubmit={(f, version) =>
            command.run(`${api}/join-requests/${value.id}/decision`, {
              expectedVersion: version,
              decision: f.get('decision'),
              reason: f.get('reason'),
            })
          }
        >
          <Field label={t.status}>
            <select name="decision">
              <option value="Approved">{t.approve}</option>
              <option value="Rejected">{t.reject}</option>
            </select>
          </Field>
        </VersionForm>
      )}
      {command.feedback}
    </article>
  );
}
function Members({ value, memberId }: { value: S['PersonalClassDto']; memberId?: string }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<S['PersonalClassPageOfPersonalClassMembershipDto']>(
    `${api}/${value.id}/memberships?page=${page}&pageSize=30`,
    { poll: 10000 },
  );
  const grants = usePersonalApi<S['PersonalClassPageOfPersonalClassAcademicPermissionDto']>(
    `${api}/${value.id}/academic-permissions?page=1&pageSize=100`,
    { enabled: value.capabilities?.canManageRoles === true },
  );
  return (
    <>
      <QueryResult q={q}>
        {q.data && (
          <>
            {q.data.items
              .filter((m) => !memberId || m.id === memberId)
              .map((m) => (
                <Member
                  key={m.id}
                  value={m}
                  classValue={value}
                  grants={grants.data?.items}
                  grantsReady={grants.isSuccess}
                />
              ))}
            <Pager page={page} total={q.data.totalCount} onChange={setPage} />
          </>
        )}
      </QueryResult>
      {grants.isError && <ErrorState error={grants.error} onRetry={() => void grants.refetch()} />}
      <Transfers classValue={value} />
    </>
  );
}
function Member({
  value,
  classValue,
  grants,
  grantsReady,
}: {
  value: S['PersonalClassMembershipDto'];
  classValue: S['PersonalClassDto'];
  grants?: S['PersonalClassAcademicPermissionDto'][];
  grantsReady: boolean;
}) {
  const command = useClassCommand('member:' + value.id),
    grant = grants?.find((g) => g.membershipId === value.id && g.isEffective);
  const [selected, setSelected] = useState(
    ['Learner', 'Teacher', 'Manager'].filter((role) => hasFlag(value.localRoles, role)),
  );
  const [capabilities, setCapabilities] = useState(
    ['AuthorAssignments', 'AuthorExams', 'Grade'].filter((c) => hasFlag(grant?.capabilities, c)),
  );
  const [grantInitialized, setGrantInitialized] = useState(false);
  useEffect(() => {
    if (grantsReady && !grantInitialized) {
      setCapabilities(
        ['AuthorAssignments', 'AuthorExams', 'Grade'].filter((c) =>
          hasFlag(grant?.capabilities, c),
        ),
      );
      setGrantInitialized(true);
    }
  }, [grantsReady, grantInitialized, grant?.capabilities]);
  const prefix = `${api}/${classValue.id}/memberships/${value.id}`;
  return (
    <article className="card stack">
      <h3>
        <MemberName userId={value.userId} />
      </h3>
      <p>
        {stateLabel(value.status)} ·{' '}
        {['Learner', 'Teacher', 'Manager']
          .filter((r) => hasFlag(value.localRoles, r))
          .map((r) => ({ Learner: t.learner, Teacher: t.teacher, Manager: t.manager })[r])
          .join(' / ')}
      </p>
      {value.status === 'Active' && classValue.capabilities?.canManageRoles && (
        <>
          <VersionForm
            version={value.version}
            busy={command.busy}
            onSubmit={(f, version) =>
              command.run(
                prefix + '/roles',
                {
                  expectedVersion: version,
                  roles: selected.join(', ') || 'None',
                  delegatedCapabilities: value.delegatedCapabilities,
                  reason: f.get('reason'),
                },
                { method: 'PUT' },
              )
            }
          >
            <Field label={t.roles}>
              <select
                multiple
                value={selected}
                onChange={(e) => setSelected(Array.from(e.target.selectedOptions, (o) => o.value))}
              >
                <option value="Learner">{t.learner}</option>
                <option value="Teacher">{t.teacher}</option>
                <option value="Manager">{t.manager}</option>
              </select>
            </Field>
          </VersionForm>
          {grantsReady && (
            <VersionForm
              version={value.version + ':' + (grant?.version ?? '')}
              busy={command.busy}
              onSubmit={(f) =>
                command.run(
                  `${api}/${classValue.id}/academic-permissions/${value.id}`,
                  {
                    capabilities: capabilities.join(', ') || 'None',
                    expectedMembershipVersion: value.version,
                    expectedGrantVersion: grant?.version ?? null,
                    reason: f.get('reason'),
                  },
                  { method: 'PUT', idempotent: true },
                )
              }
            >
              <p>{t.grantHint}</p>
              <Field label={t.grants}>
                <select
                  multiple
                  value={capabilities}
                  onChange={(e) =>
                    setCapabilities(Array.from(e.target.selectedOptions, (o) => o.value))
                  }
                >
                  <option value="AuthorAssignments">{t.authorAssignments}</option>
                  <option value="AuthorExams">{t.authorExams}</option>
                  <option value="Grade">{t.grade}</option>
                </select>
              </Field>
            </VersionForm>
          )}
        </>
      )}
      {value.status === 'Active' && classValue.capabilities?.canManageMembers && (
        <VersionForm
          version={value.version}
          busy={command.busy}
          label={t.remove}
          onSubmit={(f, version) =>
            command.run(
              prefix,
              { expectedVersion: version, reason: f.get('reason') },
              { method: 'DELETE' },
            )
          }
        >
          <p>{t.remove}</p>
        </VersionForm>
      )}
      {command.feedback}
    </article>
  );
}
function ClassSettings({ value }: { value: S['PersonalClassDto'] }) {
  const command = useClassCommand('settings:' + value.id),
    { session } = usePersonal();
  const manager = value.managerUserId === session.user.id;
  if (!value.version || !manager) return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <VersionForm
        version={value.version}
        busy={command.busy}
        onSubmit={(f, version) =>
          command.run(
            `${api}/${value.id}/settings`,
            {
              expectedVersion: version,
              capacity: Number(f.get('capacity')),
              acceptingJoinRequests: f.get('accepting') === 'on',
              reason: f.get('reason'),
            },
            { method: 'PUT' },
          )
        }
      >
        <Field label={t.capacity}>
          <input
            required
            name="capacity"
            type="number"
            min={1}
            defaultValue={value.capacity ?? 1}
          />
        </Field>
        <label>
          <input name="accepting" type="checkbox" defaultChecked={value.acceptingJoinRequests} />
          {t.accepting}
        </label>
      </VersionForm>
      {(['activate', 'suspend', 'archive'] as const)
        .filter((action) => action !== 'archive' || value.capabilities?.canArchive)
        .map((action) => (
          <VersionForm
            key={action}
            version={value.version!}
            busy={command.busy}
            label={t[action]}
            onSubmit={(f, version) =>
              command.run(`${api}/${value.id}/${action}`, {
                expectedVersion: version,
                reason: f.get('reason'),
              })
            }
          >
            <p>{t[action]}</p>
          </VersionForm>
        ))}
      {command.feedback}
      <Transfers classValue={value} />
    </>
  );
}
function Transfers({ classValue }: { classValue?: S['PersonalClassDto'] }) {
  const [page, setPage] = useState(1),
    { session } = usePersonal(),
    command = useClassCommand('manager-transfer:' + (classValue?.id ?? 'incoming'));
  const q = usePersonalApi<S['PersonalClassPageOfPersonalClassTransferDto']>(
    `${api}/manager-transfers?page=${page}&pageSize=30${classValue ? '&classId=' + classValue.id : ''}`,
    { poll: 10000 },
  );
  return (
    <section className="card stack">
      <h3>{t.transfer}</h3>
      {classValue?.managerUserId === session.user.id && classValue.version && (
        <VersionForm
          version={classValue.version}
          busy={command.busy}
          label={t.transfer}
          onSubmit={(f, version) =>
            command.run(
              `${api}/${classValue.id}/manager-transfers`,
              { expectedVersion: version, targetUserId: f.get('target'), reason: f.get('reason') },
              { idempotent: true },
            )
          }
        >
          <Field label={t.transferTarget}>
            <input name="target" required pattern="[a-fA-F0-9-]{36}" dir="ltr" />
          </Field>
        </VersionForm>
      )}
      <QueryResult q={q}>
        {q.data && (
          <>
            {q.data.items.map((v) => (
              <article key={v.id}>
                <p>{stateLabel(v.status)}</p>
                <p>{v.reason}</p>
                {v.status === 'Pending' &&
                  v.targetUserId === session.user.id &&
                  (['Accepted', 'Declined'] as const).map((decision) => (
                    <ConfirmAction
                      key={decision}
                      title={decision === 'Accepted' ? t.transferAccept : t.transferDecline}
                      trigger={decision === 'Accepted' ? t.transferAccept : t.transferDecline}
                      description={v.reason}
                      onConfirm={async () =>
                        !!(await command.run(`${api}/manager-transfers/${v.id}/decision`, {
                          expectedVersion: v.version,
                          decision,
                        }))
                      }
                    />
                  ))}
              </article>
            ))}
            <Pager page={page} total={q.data.totalCount} onChange={setPage} />
          </>
        )}
      </QueryResult>
      {command.feedback}
    </section>
  );
}
function ClassHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1),
    q = usePersonalApi<S['PersonalClassPageOfPersonalClassHistoryItem']>(
      `${api}/${id}/history?page=${page}&pageSize=30`,
    );
  return (
    <QueryResult q={q}>
      {q.data && (
        <>
          {q.data.items.map((v) => (
            <article className="card" key={v.id}>
              <p>{stateLabel(v.action)}</p>
              <p>{date(v.occurredAtUtc, true)}</p>
            </article>
          ))}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </QueryResult>
  );
}

function MemberName({ userId }: { userId: string }) {
  const { session } = usePersonal();
  const q = usePersonalApi<S['MessagingPublicProfileResult']>('/api/v1/people/' + userId, {
    enabled: session.user.id !== userId,
  });
  return (
    <span>
      {session.user.id === userId
        ? session.user.displayName || session.user.firstName || t.learner
        : q.data?.displayName || t.learner}
    </span>
  );
}
