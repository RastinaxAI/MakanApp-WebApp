'use client';
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
      <header className={s.header}>کجا ادامه می‌دهید؟</header>
      <main className={s.main}>
        <div className={`${s.card} ${s.workspaceCard}`}>
          <h1>کجا ادامه می‌دهید؟</h1>
          <p className={s.intro}>برای ورود، فضای موردنظرتان را انتخاب کنید.</p>
          {q.isPending ? (
            <LoadingSkeleton />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : !workspaces.length ? (
            <EmptyState title="فضایی برای ورود موجود نیست" />
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
                    <strong>{w.organizationName ?? 'حساب شخصی'}</strong>
                    <small>
                      {w.workspaceType === 'Personal' ? 'ارتباطات شما' : label(w.role ?? '')}
                    </small>
                    {!canEnterWorkspace(w) && <small>در حال حاضر قابل ورود نیست</small>}
                  </span>
                  {entering === `${w.membershipId}:${w.role}:${index}` ? (
                    <LoaderCircle className={s.spinner} size={20} aria-label="در حال ورود" />
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
