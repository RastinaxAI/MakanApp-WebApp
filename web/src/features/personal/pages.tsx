'use client';
import * as uiText from '@/content/fa';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  Settings,
  Pencil,
  Camera,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import s from './personal.module.css';
import p from './profile-reference.module.css';
import { displayDateOnly } from './profile-model';
import { ProfileAvatar } from './profile-photo';
import { usePersonal, usePersonalApi } from './provider';
import { useWorkspaceSnapshot, WorkspaceVisibilityNotice } from './workspaces';
import { visibleWorkspaces, canEnterWorkspace } from './workspace-model';
import { ageCategoryLabels, ageVerificationLabels, messagingNextLabels } from './status-labels';

export function PersonalHome() {
  const { session } = usePersonal();
  const spaces = useWorkspaceSnapshot();
  const organizationCount = spaces.data
    ? new Set(
        visibleWorkspaces(spaces.data)
          .filter((w) => w.organizationId)
          .map((w) => w.organizationId),
      ).size
    : null;
  const cards = [
    {
      title: uiText.text_58b634557905,
      description: uiText.text_be6ad26a2907,
      href: '/personal/messages',
      icon: MessageCircle,
    },
    {
      title: uiText.text_2cb3fe307efb,
      description: uiText.text_bc5dba82dc68,
      href: '/personal/profile',
      icon: UserRound,
    },
    {
      title: uiText.text_8fa4122032f4,
      description: uiText.text_38f053ad5286,
      href: '/personal/education',
      icon: GraduationCap,
    },
    {
      title: uiText.text_3a2a401438ce,
      description: uiText.text_cd91c90b6565,
      href: '/personal/resources',
      icon: BookOpen,
    },
    {
      title: uiText.text_b929671ed22f,
      description: uiText.text_7efe1b3a70de,
      href: '/personal/ai',
      icon: Sparkles,
    },
    {
      title: uiText.text_6b1ac4d74206,
      description: uiText.text_d4a1c2a050f1,
      href: '/personal/subscription',
      icon: Wallet,
    },
  ];
  return (
    <>
      <div className={s.heading}>
        <span>
          {session.context.workspaceType === 'Personal'
            ? uiText.text_ab3c684df5df
            : uiText.text_7298890ac877}
        </span>
        <h1>
          {session.user.firstName
            ? uiText.format_3d34ebe177d6(session.user.firstName)
            : uiText.text_faa9d5e66033}
        </h1>
        <p>{uiText.text_b9c5b60f445c}</p>
      </div>
      {!session.user.isProfileComplete && (
        <div className={s.notice}>
          <UserRound size={22} />
          <p>
            <strong>{uiText.text_338907839d78}</strong>
            <span>{uiText.text_878db5df132b}</span>
          </p>
          <Button asChild variant="outline">
            <Link href="/personal/profile/edit">{uiText.text_dc1e77f52af9}</Link>
          </Button>
        </div>
      )}
      {spaces.isError ? (
        <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
      ) : organizationCount === 0 ? (
        <div className={s.personalNote}>
          <ShieldCheck size={20} />
          <p>{uiText.text_97abd9bfcbc0}</p>
        </div>
      ) : organizationCount !== null ? (
        <p className={s.muted}>{uiText.text_4ee5ce4fd1a6}</p>
      ) : null}
      <div className={s.cards}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <span className={s.cardIcon}>
              <card.icon size={24} />
            </span>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <span className={s.cardAction}>
              {uiText.text_52fa408fc93a}
              <span aria-hidden="true">{uiText.text_774f1d6b2910}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
export function PersonalProfile() {
  const { session, logout } = usePersonal();
  const status = usePersonalApi<components['schemas']['MessagingStatusResult']>(
    '/api/v1/me/messaging-status',
  );
  const user = session.user;
  return (
    <div className={p.page} data-profile-overview>
      <div className={p.profile}>
        <section className={p.profileCard}>
          <div className={p.identity}>
            <ProfileAvatar
              photo={user.profilePhoto}
              name={user.displayName || user.firstName || uiText.text_8b4cb595cd35}
              className={p.avatar}
            />
            <Link href="/personal/profile/edit" className={p.photoLink}>
              <Camera size={16} />
              {uiText.text_7b5ff0b44aec}
            </Link>
            <div>
              <h1>
                {user.displayName ||
                  [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                  uiText.text_d34d90474c92}
              </h1>
              <p>
                {user.username ? <bdi dir="ltr">{user.username}</bdi> : uiText.text_becb77371bdf}
              </p>
              <span className={p.status}>
                {label(session.context.activeRole ?? 'Personal')}
                {!user.isProfileComplete ? uiText.text_109865fd7239 : ''}
              </span>
            </div>
          </div>
        </section>
        <div className={p.actions}>
          <Button asChild variant="outline" className={p.edit}>
            <Link href="/personal/profile/edit">
              <Pencil size={20} />
              <span>{uiText.text_7f941e8233a2}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className={p.edit}>
            <Link href="/personal/profile/preferences">
              <Settings size={20} />
              <span>{uiText.text_8aa6893911d9}</span>
            </Link>
          </Button>
        </div>
        <ProfileSpaces />
        <section className={p.infoCard} aria-label={uiText.text_61d235c5d463}>
          <h2>{uiText.text_61d235c5d463}</h2>
          <dl className={p.infoFields}>
            <div>
              <dt>{uiText.text_69c1e5b1fe20}</dt>
              <dd>{user.firstName || uiText.text_5749a86140fa}</dd>
            </div>
            <div>
              <dt>{uiText.text_3fe7ba4a2131}</dt>
              <dd>{user.lastName || uiText.text_5749a86140fa}</dd>
            </div>
            <div>
              <dt>{uiText.text_5903c1c121cb}</dt>
              <dd>{user.displayName || uiText.text_5749a86140fa}</dd>
            </div>
            <div>
              <dt>{uiText.text_2690bee9ac93}</dt>
              <dd>{displayDateOnly(user.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>{uiText.text_d7429b08c9cf}</dt>
              <dd>
                <bdi dir="ltr">{user.phoneNumber}</bdi>
              </dd>
            </div>
          </dl>
        </section>
        <AccountIdentifier id={user.id} />
        <section className={p.infoCard} aria-label={uiText.text_7511feb9767e}>
          <h2>{uiText.text_7511feb9767e}</h2>
          {status.isPending ? (
            <LoadingSkeleton />
          ) : status.isError ? (
            <ErrorState error={status.error} onRetry={() => void status.refetch()} />
          ) : (
            <dl className={p.infoFields}>
              <div>
                <dt>{uiText.text_f56cfcd67f9c}</dt>
                <dd>{ageVerificationLabels[status.data.verificationStatus]}</dd>
              </div>
              <div>
                <dt>{uiText.text_c97a6f291fe6}</dt>
                <dd>{ageCategoryLabels[status.data.effectiveAgeCategory]}</dd>
              </div>
              <div>
                <dt>{uiText.text_96b3a0fde540}</dt>
                <dd>{messagingNextLabels[status.data.nextAction]}</dd>
              </div>
            </dl>
          )}
        </section>
        <Button variant="ghost" className={p.logout} onClick={() => void logout()}>
          <LogOut size={17} />
          {uiText.account_logout}
        </Button>
      </div>
    </div>
  );
}
function ProfileSpaces() {
  const { session, selectWorkspace } = usePersonal();
  const spaces = useWorkspaceSnapshot();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <section className={p.links} aria-label={uiText.text_8b5aed7deee2}>
      <h2>{uiText.text_8b5aed7deee2}</h2>
      {spaces.isPending ? (
        <LoadingSkeleton />
      ) : spaces.isError ? (
        <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
      ) : (
        visibleWorkspaces(spaces.data)
          .toSorted(
            (a, b) =>
              Number(a.workspaceType === 'Personal') - Number(b.workspaceType === 'Personal'),
          )
          .map((space, index) => (
            <button
              key={`${space.membershipId}:${space.role}:${index}`}
              disabled={busy || !canEnterWorkspace(space)}
              onClick={async () => {
                setBusy(true);
                setError(undefined);
                try {
                  await selectWorkspace(
                    {
                      workspaceType: space.workspaceType,
                      membershipId: space.membershipId,
                      role: space.role,
                    },
                    space.workspaceType === 'Personal' ? '/personal/messages' : '/personal',
                  );
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span className={p.settingIcon}>
                {space.workspaceType === 'Personal' ? (
                  <UserRound size={23} />
                ) : (
                  <GraduationCap size={23} />
                )}
              </span>
              <span>
                <strong>{space.organizationName || uiText.text_d034f3bcfe7f}</strong>
                <small>
                  {space.workspaceType === 'Personal'
                    ? uiText.text_3b528d2db9f6
                    : label(space.role ?? '')}
                  {space.workspaceType === session.context.workspaceType &&
                  space.role === session.context.activeRole &&
                  space.membershipId === session.context.membershipId
                    ? uiText.text_67978642ed7f
                    : ''}
                </small>
              </span>
              <ChevronLeft size={18} />
            </button>
          ))
      )}
      <WorkspaceVisibilityNotice snapshot={spaces.data} />
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
export { PersonalProfileEdit } from './profile-edit';
function AccountIdentifier({ id }: { id: string }) {
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <section className={p.infoCard} aria-label={uiText.text_89b515f684ce}>
      <h2>{uiText.text_89b515f684ce}</h2>
      <p>
        <bdi dir="ltr">{id}</bdi>
      </p>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
            setFailed(false);
          } catch {
            setFailed(true);
          }
        }}
      >
        {uiText.text_72c0b5c79c22}
      </Button>
      {copied && <p role="status">{uiText.text_a0a416aef2e7}</p>}
      {failed && <p role="status">{uiText.text_59a007742acf}</p>}
    </section>
  );
}
export function PersonalPending({ area }: { area: 'resources' | 'ai' | 'subscription' }) {
  const info = {
    resources: {
      title: uiText.text_3a2a401438ce,
      text: uiText.text_dfa644fe2ec0,
    },
    ai: {
      title: uiText.text_b929671ed22f,
      text: uiText.text_bf28dfb51c5d,
    },
    subscription: {
      title: uiText.text_ab67aa4d93be,
      text: uiText.text_fb5f200e68b3,
    },
  }[area];
  return (
    <>
      <div className={s.heading}>
        <span>{uiText.text_ab3c684df5df}</span>
        <h1>{info.title}</h1>
      </div>
      <section className={s.profileCard}>
        <EmptyState title={uiText.text_177460222287} description={info.text} />
        <PageBack href="/personal" />
      </section>
    </>
  );
}
