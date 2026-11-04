'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import { PageBack } from '@/components/navigation/page-back';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from './provider';
import { useAccountAction } from './use-account-action';
import { resolvePersonInput } from './messaging/directory';
import s from './service-layout.module.css';
type S = components['schemas'];
const base = '/personal/classes',
  api = '/api/v1/personal-classes';
export function PersonalClasses() {
  const q = usePersonalApi<S['PersonalClassDto'][]>(api, { poll: 10000 });
  const invitations = usePersonalApi<S['PersonalClassInvitationDto'][]>(api + '/invitations', {
    poll: 10000,
  });
  return (
    <div className={s.page}>
      <PageBack href="/personal/profile" />
      <header className={s.heading}>
        <div>
          <h1>{uiText.text_85a8acadb0ae}</h1>
          <p>{uiText.text_ac2dc499bebf}</p>
        </div>
        <Button asChild>
          <Link href={base + '/new'}>{uiText.text_256911182e54}</Link>
        </Button>
      </header>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length ? (
        <div className={s.grid}>
          {q.data.map((c) => (
            <section className={s.panel} key={c.id}>
              <h2>{c.title}</h2>
              <p className={s.hint}>
                {c.isHost ? uiText.text_3d196c2db0d9 : uiText.text_fb4c8c6d1e7e}
                {c.archived ? uiText.text_c2fd54962a03 : ''}
              </p>
              <Button asChild variant="outline">
                <Link href={base + '/' + c.id}>{uiText.text_35fc8d0443cb}</Link>
              </Button>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title={uiText.text_5f25c1774e08} description={uiText.text_901a0833748c} />
      )}
      <section className={s.panel}>
        <h2>{uiText.text_486b2669b1ec}</h2>
        {invitations.isPending ? (
          <LoadingSkeleton />
        ) : invitations.isError ? (
          <ErrorState error={invitations.error} />
        ) : invitations.data.length ? (
          invitations.data.map((i) => <PersonalInvitation key={i.id} value={i} />)
        ) : (
          <p className={s.hint}>{uiText.text_77f620a3b627}</p>
        )}
      </section>
    </div>
  );
}
export function PersonalInvitation({ value }: { value: S['PersonalClassInvitationDto'] }) {
  const { session } = usePersonal(),
    a = useAccountAction();
  const q = usePersonalApi<S['PersonalClassDto']>(api + '/' + value.personalClassId);
  const [accepted, setAccepted] = useState(value.accepted);
  const expired = Date.parse(value.expiresAtUtc) <= Date.now();
  return (
    <div className={s.panel}>
      <strong>{q.data?.title ?? uiText.text_2c331e5ca4ce}</strong>
      <details className={s.meta}>
        <summary>{uiText.text_480ed7c313e6}</summary>
        <bdi>{value.personalClassId}</bdi>
        <p>{date(value.expiresAtUtc, true)}</p>
      </details>
      {!q.data && <p className={s.hint}>{uiText.text_ceb37a7376be}</p>}
      <Button
        disabled={a.busy || accepted || expired || value.destinationUserId !== session.user.id}
        onClick={async () => {
          const result = await a.run<S['PersonalClassDto']>(
            api + '/invitations/' + value.id + '/accept',
          );
          if (result) setAccepted(true);
        }}
      >
        {accepted
          ? uiText.text_479574e266a4
          : expired
            ? uiText.text_d659ae8f35a9
            : uiText.text_e6b19e2c1935}
      </Button>
      {!!a.error && <ErrorState error={a.error} />}
    </div>
  );
}
export function PersonalClassCreate() {
  const router = useRouter(),
    a = useAccountAction();
  const [title, setTitle] = useState(''),
    [frozen, setFrozen] = useState<S['CreatePersonalClassCommand']>();
  const saved = useRef(false);
  useUnsavedChanges(!saved.current && !!title.trim());
  return (
    <div className={s.page}>
      <PageBack href={base} />
      <h1>{uiText.text_256911182e54}</h1>
      <form
        className={s.panel}
        onSubmit={async (e) => {
          e.preventDefault();
          const command = frozen ?? { title: title.trim(), clientOperationId: crypto.randomUUID() };
          setFrozen(command);
          const result = await a.run<S['PersonalClassDto']>(api, command);
          if (result) {
            saved.current = true;
            router.push(base + '/' + result.id);
          }
        }}
      >
        <label className={s.field}>
          {uiText.text_10e4dddca732}
          <input
            required
            value={title}
            disabled={a.busy || !!frozen}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <p className={s.hint}>{uiText.text_8c2549d015d8}</p>
        <Button disabled={a.busy || !title.trim()}>
          {frozen ? uiText.text_46f20fac8405 : uiText.text_d2fa39a58fdf}
        </Button>
        {!!a.error && (
          <>
            <ErrorState error={a.error} />
            <Button type="button" variant="outline" onClick={() => setFrozen(undefined)}>
              {uiText.text_5bba5935b193}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
export function PersonalClassDetail({ id }: { id: string }) {
  const q = usePersonalApi<S['PersonalClassDto']>(api + '/' + id, { poll: 10000 });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.id !== id)
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  return (
    <PersonalClassBody
      key={id}
      value={q.data}
      refresh={async () => {
        await q.refetch({ throwOnError: true });
      }}
    />
  );
}
function PersonalClassBody({
  value,
  refresh,
}: {
  value: S['PersonalClassDto'];
  refresh: () => Promise<void>;
}) {
  const { call } = usePersonal(),
    a = useAccountAction();
  const participants = usePersonalApi<S['PersonalClassParticipantDto'][]>(
    api + '/' + value.id + '/participants',
    { poll: 10000 },
  );
  const [target, setTarget] = useState(''),
    [person, setPerson] = useState<S['MessagingPublicProfileResult']>(),
    [issue, setIssue] = useState('');
  const operation = useRef<string | undefined>(undefined);
  return (
    <div className={s.page}>
      <PageBack href={base} />
      <header className={s.heading}>
        <div>
          <h1>{value.title}</h1>
          <p>
            {value.archived
              ? uiText.text_fa799b6ad568
              : value.isHost
                ? uiText.text_b5d3894a5230
                : uiText.text_27646ca6f7ba}
          </p>
        </div>
        {value.isHost && !value.archived && (
          <ConfirmAction
            trigger={uiText.text_2927be7c5ee8}
            title={uiText.text_f2f9a49275fb}
            description={uiText.text_21a66f4f4475}
            onConfirm={async () => {
              await call(api + '/' + value.id + '/archive', { method: 'POST' });
              await refresh();
              return true;
            }}
          />
        )}
      </header>
      <section className={s.panel}>
        <h2>{uiText.text_29c02fa4bd09}</h2>
        {participants.isPending ? (
          <LoadingSkeleton />
        ) : participants.isError ? (
          <ErrorState error={participants.error} />
        ) : participants.data.length ? (
          <ul className={s.list}>
            {participants.data.map((p, i) => (
              <li key={p.id}>
                <strong>
                  {uiText.text_052f63565706}
                  {(i + 1).toLocaleString('fa-IR')}
                  {uiText.text_588da4105320}
                  {p.active ? uiText.text_a3fa2a3ffcb9 : uiText.text_996db6061aa9}
                </strong>
                <details className={s.meta}>
                  <summary>{uiText.text_89b515f684ce}</summary>
                  <bdi>{p.studentUserId}</bdi>
                </details>
                {value.isHost && !value.archived && p.active && (
                  <ConfirmAction
                    destructive
                    trigger={uiText.text_9727cc8c703c + (i + 1).toLocaleString('fa-IR')}
                    title={uiText.text_047a780267a6}
                    description={uiText.text_8d169927938f}
                    onConfirm={async () => {
                      await call(`${api}/${value.id}/participants/${p.id}`, { method: 'DELETE' });
                      await participants.refetch();
                      return true;
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={uiText.text_6a571285362b} />
        )}
      </section>
      {value.isHost && !value.archived && (
        <section className={s.panel}>
          <h2>{uiText.text_2c331e5ca4ce}</h2>
          <label className={s.field}>
            {uiText.text_04825cc9442a}
            <input
              value={target}
              disabled={a.busy}
              onChange={(e) => {
                setTarget(e.target.value);
                setPerson(undefined);
                operation.current = undefined;
              }}
            />
          </label>
          <Button
            disabled={a.busy || !target.trim()}
            variant="outline"
            onClick={async () => {
              setIssue('');
              try {
                const result = await a.run<S['PeopleResolveResult']>(
                  '/api/v1/people/resolve',
                  resolvePersonInput(target),
                );
                if (result?.isDiscoverable && result.profile) setPerson(result.profile);
                else if (result) setIssue(uiText.text_b855dd109c8e);
              } catch {
                setIssue(uiText.text_a6f1d8a9c45b);
              }
            }}
          >
            {uiText.text_840b843fe1ff}
          </Button>
          {person && (
            <>
              <strong>{person.displayName}</strong>
              <Button
                disabled={a.busy}
                onClick={async () => {
                  operation.current ??= crypto.randomUUID();
                  const result = await a.run<S['PersonalClassInvitationDto']>(
                    `${api}/${value.id}/invitations`,
                    { destinationUserId: person.userId, clientOperationId: operation.current },
                  );
                  if (result) setIssue(uiText.text_5d15df0c5b9f);
                }}
              >
                {uiText.text_cc6360828441}
              </Button>
            </>
          )}
          {issue && <p role="status">{issue}</p>}
          {!!a.error && <ErrorState error={a.error} />}
        </section>
      )}
      <p className={s.hint}>{uiText.text_5ee39dc725d4}</p>
    </div>
  );
}
