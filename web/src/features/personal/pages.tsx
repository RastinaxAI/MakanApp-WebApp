'use client';
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
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import s from './personal.module.css';
import p from './profile-reference.module.css';
import { ReferenceColumns } from './reference-layout';
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
      title: 'پیام‌ها و مخاطبین',
      description: 'گفت‌وگوها و دفترچهٔ مخاطبین خود را ببینید.',
      href: '/personal/messages',
      icon: MessageCircle,
    },
    {
      title: 'حساب و پروفایل',
      description: 'اطلاعات فردی و وضعیت امکان ارتباط خود را بررسی کنید.',
      href: '/personal/profile',
      icon: UserRound,
    },
    {
      title: 'آموزشگاه‌های من',
      description: 'عضویت‌ها و نقش‌های مجاز خود را انتخاب کنید.',
      href: '/personal/education',
      icon: GraduationCap,
    },
    {
      title: 'منابع من',
      description: 'فضای منابع شخصی، مستقل از آموزشگاه.',
      href: '/personal/resources',
      icon: BookOpen,
    },
    {
      title: 'یادگیری با AI',
      description: 'منابع و محل مصرف را پیش از شروع بشناسید.',
      href: '/personal/ai',
      icon: Sparkles,
    },
    {
      title: 'اشتراک و مصرف',
      description: 'حق استفاده و مصرف فردی را جدا از سازمان ببینید.',
      href: '/personal/subscription',
      icon: Wallet,
    },
  ];
  return (
    <>
      <div className={s.heading}>
        <span>{session.context.workspaceType === 'Personal' ? 'فضای شخصی' : 'فضای آموزشگاه'}</span>
        <h1>
          {session.user.firstName ? `${session.user.firstName}، خوش آمدید` : 'به ماکان خوش آمدید'}
        </h1>
        <p>گفت‌وگو و یادگیری شما، در یک فضای روشن.</p>
      </div>
      {!session.user.isProfileComplete && (
        <div className={s.notice}>
          <UserRound size={22} />
          <p>
            <strong>پروفایل شما نیاز به تکمیل دارد</strong>
            <span>اطلاعات خواسته‌شده را بررسی کنید؛ وضعیت ارتباطات جداگانه مشخص می‌شود.</span>
          </p>
          <Button asChild variant="outline">
            <Link href="/personal/profile/edit">تکمیل پروفایل</Link>
          </Button>
        </div>
      )}
      {spaces.isError ? (
        <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
      ) : organizationCount === 0 ? (
        <div className={s.personalNote}>
          <ShieldCheck size={20} />
          <p>هنوز عضو آموزشگاهی نیستید. حساب و امکانات شخصی مجاز شما برقرار است.</p>
        </div>
      ) : organizationCount !== null ? (
        <p className={s.muted}>فضاهای آموزشگاهی شما از بخش «آموزشگاه» در دسترس‌اند.</p>
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
              مشاهده <span aria-hidden="true">←</span>
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
    <ReferenceColumns>
      <div className={p.profile}>
        <section className={p.profileCard}>
          <div className={p.identity}>
            <ProfileAvatar
              photo={user.profilePhoto}
              name={user.displayName || user.firstName || 'حساب من'}
              className={p.avatar}
            />
            <div>
              <h1>
                {user.displayName ||
                  [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                  'حساب ماکان'}
              </h1>
              <p>{user.username ? <bdi dir="ltr">{user.username}</bdi> : 'نام کاربری ثبت نشده'}</p>
              <span className={p.status}>
                {label(session.context.activeRole ?? 'Personal')}
                {!user.isProfileComplete ? ' · نیازمند تکمیل اطلاعات' : ''}
              </span>
            </div>
          </div>
        </section>
        <Button asChild variant="outline" className={p.edit}>
          <Link href="/personal/profile/edit">ویرایش پروفایل</Link>
        </Button>
        <ProfileSpaces />
        <section className={p.infoCard} aria-label="مشخصات فردی">
          <h2>مشخصات فردی</h2>
          <dl className={p.infoFields}>
            <div>
              <dt>نام</dt>
              <dd>{user.firstName || 'ثبت نشده'}</dd>
            </div>
            <div>
              <dt>نام خانوادگی</dt>
              <dd>{user.lastName || 'ثبت نشده'}</dd>
            </div>
            <div>
              <dt>نام نمایشی</dt>
              <dd>{user.displayName || 'ثبت نشده'}</dd>
            </div>
            <div>
              <dt>تاریخ تولد خوداظهاری</dt>
              <dd>{displayDateOnly(user.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>شمارهٔ همراه</dt>
              <dd>
                <bdi dir="ltr">{user.phoneNumber}</bdi>
              </dd>
            </div>
          </dl>
        </section>
        <AccountIdentifier id={user.id} />
        <section className={p.infoCard} aria-label="وضعیت سنی">
          <h2>وضعیت سنی</h2>
          {status.isPending ? (
            <LoadingSkeleton />
          ) : status.isError ? (
            <ErrorState error={status.error} onRetry={() => void status.refetch()} />
          ) : (
            <dl className={p.infoFields}>
              <div>
                <dt>بررسی سن</dt>
                <dd>{ageVerificationLabels[status.data.verificationStatus]}</dd>
              </div>
              <div>
                <dt>ردهٔ سنی</dt>
                <dd>{ageCategoryLabels[status.data.effectiveAgeCategory]}</dd>
              </div>
              <div>
                <dt>اقدام بعدی</dt>
                <dd>{messagingNextLabels[status.data.nextAction]}</dd>
              </div>
            </dl>
          )}
        </section>
        <Button asChild variant="outline">
          <Link href="/personal/profile/preferences">
            <Settings size={19} />
            حساب و ترجیحات
          </Link>
        </Button>
        <Button variant="destructive" onClick={() => void logout()}>
          <LogOut size={17} />
          خروج از حساب
        </Button>
      </div>
    </ReferenceColumns>
  );
}
function ProfileSpaces() {
  const { session, selectWorkspace } = usePersonal();
  const spaces = useWorkspaceSnapshot();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <section className={p.links} aria-label="فضاهای من">
      <h2>فضاهای من</h2>
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
                <strong>{space.organizationName || 'حساب شخصی'}</strong>
                <small>
                  {space.workspaceType === 'Personal'
                    ? 'پیام‌ها و مخاطبین شما'
                    : label(space.role ?? '')}
                  {space.workspaceType === session.context.workspaceType &&
                  space.role === session.context.activeRole &&
                  space.membershipId === session.context.membershipId
                    ? ' · فضای فعال'
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
    <section className={p.infoCard} aria-label="شناسهٔ حساب">
      <h2>شناسهٔ حساب</h2>
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
        کپی شناسهٔ حساب
      </Button>
      {copied && <p role="status">شناسه کپی شد.</p>}
      {failed && <p role="status">کپی خودکار انجام نشد؛ شناسه را انتخاب و کپی کنید.</p>}
    </section>
  );
}
export function PersonalPending({ area }: { area: 'resources' | 'ai' | 'subscription' }) {
  const info = {
    resources: {
      title: 'منابع من',
      text: 'مدیریت منابع شخصی و آماده‌سازی آن‌ها برای یادگیری هنوز در دسترس نیست.',
    },
    ai: {
      title: 'یادگیری با AI',
      text: 'این خدمت در حال حاضر فعال نیست. انتخاب منابع، مدل و محل مصرف پیش از شروع مشخص خواهد شد.',
    },
    subscription: {
      title: 'اشتراک و مصرف شخصی',
      text: 'اطلاعات اشتراک فردی و مسیر خرید آن هنوز در دسترس نیست. اشتراک آموزشگاه از حساب شخصی شما جداست.',
    },
  }[area];
  return (
    <>
      <div className={s.heading}>
        <span>فضای شخصی</span>
        <h1>{info.title}</h1>
      </div>
      <section className={s.profileCard}>
        <EmptyState title="این بخش هنوز آمادهٔ استفاده نیست" description={info.text} />
        <PageBack href="/personal" />
      </section>
    </>
  );
}
