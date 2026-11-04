'use client';
import * as uiText from '@/content/fa';
import { useRef, useState } from 'react';
import { ChevronLeft, UserRound, GraduationCap, LoaderCircle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import { usePersonal } from '@/features/personal/provider';
import { useWorkspaceSnapshot, WorkspaceVisibilityNotice } from '@/features/personal/workspaces';
import { visibleWorkspaces, canEnterWorkspace } from '@/features/personal/workspace-model';
import type { components } from '@/generated/api/schema';
import s from './login-reference.module.css';
type Workspace = components['schemas']['WorkspaceResult'];
export function WorkspaceSelection() {
  const { session, selectWorkspace } = usePersonal();
  const q = useWorkspaceSnapshot();
  const workspaces = q.data ? visibleWorkspaces(q.data) : [];
  const [entering, setEntering] = useState<string>(),
    [error, setError] = useState<unknown>();
  const lock = useRef(false);
  const current = workspaces.find(
    (w) =>
      w.workspaceType === session.context.workspaceType &&
      w.membershipId === session.context.membershipId &&
      w.role === session.context.activeRole,
  );
  async function enter(w: Workspace, key: string) {
    if (lock.current || !canEnterWorkspace(w)) return;
    lock.current = true;
    setEntering(key);
    setError(undefined);
    try {
      await selectWorkspace(
        { workspaceType: w.workspaceType, membershipId: w.membershipId, role: w.role },
        '/personal',
      );
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setEntering(undefined);
    }
  }
  return (
    <div className={s.page} data-reference-public>
      <header className={s.header}>{uiText.text_f22fc41872c4}</header>
      <main className={s.main}>
        <div className={`${s.card} ${s.workspaceCard}`}>
          <h1>{uiText.text_f22fc41872c4}</h1>
          <p className={s.intro}>{uiText.text_f736bd2c5640}</p>
          {q.isPending ? (
            <LoadingSkeleton />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : !workspaces.length ? (
            <EmptyState title={uiText.text_1e8321671f3f} />
          ) : (
            <div className={s.spaces}>
              {workspaces.map((w, index) => (
                <button
                  key={`${w.membershipId}:${w.role}:${index}`}
                  aria-pressed={current === w}
                  disabled={!!entering || !canEnterWorkspace(w)}
                  onClick={() => void enter(w, `${w.membershipId}:${w.role}:${index}`)}
                >
                  <span className={s.spaceAvatar}>
                    {w.workspaceType === 'Personal' ? (
                      <UserRound size={20} />
                    ) : (
                      <GraduationCap size={20} />
                    )}
                  </span>
                  <span>
                    <strong>{w.organizationName ?? uiText.text_d034f3bcfe7f}</strong>
                    <small>
                      {w.workspaceType === 'Personal'
                        ? uiText.text_9336384b74e8
                        : label(w.role ?? '')}
                    </small>
                    {!canEnterWorkspace(w) && <small>{uiText.text_c7581e2c4ccf}</small>}
                  </span>
                  {entering === `${w.membershipId}:${w.role}:${index}` ? (
                    <LoaderCircle
                      className={s.spinner}
                      size={20}
                      aria-label={uiText.text_d04bf8106c45}
                    />
                  ) : (
                    <ChevronLeft size={18} />
                  )}
                </button>
              ))}
            </div>
          )}
          <WorkspaceVisibilityNotice snapshot={q.data} />
          {!!error && <ErrorState error={error} />}
        </div>
      </main>
    </div>
  );
}
