'use client';

import * as uiText from '@/content/fa';
import Link from 'next/link';
import {
  BookOpen,
  ChevronLeft,
  Check,
  Pencil,
  ShieldCheck,
  Settings,
  Layers,
  UserRound,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, label } from '@/components/ui/states';
import { usePersonal } from '@/features/personal/provider';
import { ProfileAvatar } from '@/features/personal/profile-photo';
import { useWorkspaceSnapshot, WorkspaceVisibilityNotice } from '@/features/personal/workspaces';
import { visibleWorkspaces, canEnterWorkspace } from '@/features/personal/workspace-model';
import s from './profile-surface.module.css';
import { ConfirmAction } from '@/components/ui/confirm-action';
export function ReferenceProfile() {
  const { session, changing, selectWorkspace, logout } = usePersonal();
  const spaces = useWorkspaceSnapshot();
  const user = session.user;
  const name =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    uiText.text_8b4cb595cd35;
  const workspaces = spaces.data ? visibleWorkspaces(spaces.data) : [];
  const active = workspaces.find(
    (w) =>
      w.workspaceType === session.context.workspaceType &&
      w.membershipId === session.context.membershipId &&
      w.role === session.context.activeRole,
  );
  const role = session.context.activeRole
    ? label(session.context.activeRole)
    : uiText.text_d034f3bcfe7f;
  const organization =
    active?.organizationName ??
    (session.context.workspaceType === 'Organization'
      ? uiText.text_b05e4b9892e2
      : uiText.text_ab3c684df5df);
  return (
    <div className={s.page} data-mk-view="MK-47">
      <section className={s.identity} aria-label={uiText.text_33f4cefcfd71}>
        <ProfileAvatar photo={user.profilePhoto} name={name} className={s.avatar} />
        <h1>{name}</h1>
        <p dir={user.username ? 'ltr' : 'rtl'}>
          {user.username ? '@' + user.username : uiText.text_becb77371bdf}
        </p>
        <span className={s.badge}>{role}</span>
        <p>{organization}</p>
        <Button asChild variant="outline">
          <Link href="/personal/profile/edit">
            <Pencil size={17} />
            {uiText.text_7f941e8233a2}
          </Link>
        </Button>
        <div className={s.identitySummary}>
          <span>{uiText.text_b58b562cefdb}</span>
          <strong>
            {spaces.isPending
              ? '…'
              : spaces.isError
                ? '—'
                : workspaces.length.toLocaleString('fa-IR')}
          </strong>
        </div>
      </section>
      <div className={s.content}>
        <section className={s.card} aria-labelledby="profile-about">
          <div className={s.sectionHeading}>
            <span className={s.icon}>
              <UserRound size={22} />
            </span>
            <div>
              <h2 id="profile-about">{uiText.text_e0c26a52135b}</h2>
              <p>{uiText.text_e867b2170306}</p>
            </div>
            <Link href="/personal/profile/details" className={s.textLink}>
              {uiText.text_81ccc340065e}
              <ChevronLeft size={16} />
            </Link>
          </div>
          <p className={s.about}>
            {name}
            {uiText.text_c7bd7ba5d8c5}
            {role}
            {uiText.text_3fc90e1d558e}
            {organization}
            {uiText.text_c4992612c45a}
          </p>
          <dl className={s.fields}>
            <div>
              <dt>{uiText.text_d502ef7f6e83}</dt>
              <dd>{[user.firstName, user.lastName].filter(Boolean).join(' ') || name}</dd>
            </div>
            <div>
              <dt>{uiText.auth_phoneLabel}</dt>
              <dd dir="ltr">{user.phoneNumber || uiText.text_5749a86140fa}</dd>
            </div>
            <div>
              <dt>{uiText.text_173fec6019a6}</dt>
              <dd dir={user.username ? 'ltr' : 'rtl'}>
                {user.username ? '@' + user.username : uiText.text_5749a86140fa}
              </dd>
            </div>
            <div>
              <dt>{uiText.text_ec1ab14da9e6}</dt>
              <dd>
                {user.dateOfBirth
                  ? new Intl.DateTimeFormat('fa-IR', { timeZone: 'UTC', dateStyle: 'long' }).format(
                      new Date(user.dateOfBirth),
                    )
                  : uiText.text_5749a86140fa}
              </dd>
            </div>
          </dl>
        </section>
        <section className={s.card} aria-labelledby="profile-workspaces">
          <div className={s.sectionHeading}>
            <span className={s.icon}>
              <Layers size={22} />
            </span>
            <div>
              <h2 id="profile-workspaces">{uiText.text_71f0be15159e}</h2>
              <p>{uiText.text_ad91fcc734f3}</p>
            </div>
          </div>
          {spaces.isPending ? (
            <p role="status">{uiText.text_b71318d920ee}</p>
          ) : spaces.isError ? (
            <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
          ) : (
            <div className={s.spaces} aria-label={uiText.text_5111e892b919}>
              {workspaces.map((w, i) => {
                const selected =
                  w.workspaceType === session.context.workspaceType &&
                  w.membershipId === session.context.membershipId &&
                  w.role === session.context.activeRole;
                return (
                  <button
                    key={w.membershipId + ':' + w.role + ':' + i}
                    aria-pressed={selected}
                    disabled={changing || selected || !canEnterWorkspace(w)}
                    onClick={() =>
                      void selectWorkspace(
                        {
                          workspaceType: w.workspaceType,
                          membershipId: w.membershipId,
                          role: w.role,
                        },
                        '/personal/profile',
                      )
                    }
                  >
                    <span className={s.icon}>
                      <BookOpen size={20} />
                    </span>
                    <span>
                      <strong>{w.organizationName ?? w.displayName}</strong>
                      <small>
                        {w.role ? label(w.role) : uiText.text_d034f3bcfe7f}
                        {!canEnterWorkspace(w) ? uiText.text_997df457da9a : ''}
                      </small>
                    </span>
                    {selected ? (
                      <span className={s.selected}>
                        <Check size={16} />
                        {uiText.text_a3fa2a3ffcb9}
                      </span>
                    ) : (
                      <ChevronLeft size={18} />
                    )}
                  </button>
                );
              })}
              {!workspaces.length && <p>{uiText.text_a50e86cb77a0}</p>}
            </div>
          )}
          <WorkspaceVisibilityNotice snapshot={spaces.data} />
        </section>
      </div>
      <nav className={s.links} aria-label={uiText.text_6cf5c4f59e76}>
        {[
          [uiText.text_3a2a401438ce, uiText.text_07fe42e21aa0, '/personal/resources', BookOpen],
          [
            uiText.text_55ed3d50b1e5,
            uiText.text_ffe0dc421364,
            '/personal/settings/privacy',
            ShieldCheck,
          ],
          [uiText.text_891a7f6ecdae, uiText.text_0a3e80141aa1, '/personal/settings', Settings],
        ].map(([title, description, href, Icon]) => {
          const Glyph = Icon as typeof BookOpen;
          return (
            <Link key={String(href)} href={String(href)}>
              <span className={s.icon}>
                <Glyph size={22} />
              </span>
              <span>
                <strong>{String(title)}</strong>
                <small>{String(description)}</small>
              </span>
              <ChevronLeft size={18} />
            </Link>
          );
        })}
        <div className={s.logout}>
          <LogOut size={21} />
          <ConfirmAction
            trigger={uiText.account_logout}
            title={uiText.text_2ddbb4f12b8f}
            description={uiText.text_f40112f83ec9}
            confirm={uiText.account_logout}
            destructive
            onConfirm={async () => {
              await logout();
              return true;
            }}
          />
        </div>
      </nav>
    </div>
  );
}
