'use client';
import * as uiText from '@/content/fa';
import { ReferenceBrand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ErrorState, label } from '@/components/ui/states';
import { isFocusedPage, isMessageRoom, workspaceDestination } from '@/config/navigation';
import type { components } from '@/generated/api/schema';
import { ChevronDown, GraduationCap, Bell, Search, ChevronRight, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useScrollMemory } from '@/components/navigation/scroll-memory';
import s from './shell.module.css';
import { ProfileAvatar } from './profile-photo';
import { usePersonal, usePersonalApi } from './provider';
import { useWorkspaceSnapshot, WorkspaceVisibilityNotice } from './workspaces';
import { visibleWorkspaces, canEnterWorkspace } from './workspace-model';
import { useThemePreference } from './theme';
import { PageBackProvider, usePageBackTarget } from '@/components/navigation/page-back';
import { AppNavigation } from '@/components/navigation/app-navigation';
export function PersonalShell({ children }: { children: ReactNode }) {
  const { session } = usePersonal();
  return (
    <PageBackProvider key={session.user.id + ':' + session.revision}>
      <PersonalShellContent>{children}</PersonalShellContent>
    </PageBackProvider>
  );
}
function PersonalShellContent({ children }: { children: ReactNode }) {
  const backTarget = usePageBackTarget();
  const { session, selectWorkspace } = usePersonal();
  const pathname = usePathname();
  const mainScroll = useRef<HTMLElement | null>(null);
  useScrollMemory(mainScroll, 'shell');
  const router = useRouter();
  useThemePreference();
  const messageLayout = pathname === '/personal/messages' || isMessageRoom(pathname);
  const messagingPage =
    pathname.startsWith('/personal/messages/') ||
    pathname === '/personal/contacts' ||
    ['/personal/settings/privacy', '/personal/settings/blocked'].includes(pathname);
  const educationLayout = pathname.startsWith('/personal/education') || pathname === '/personal';
  const [picker, setPicker] = useState(false),
    [error, setError] = useState<unknown>();
  const pickerTrigger = useRef<HTMLElement | null>(null);
  function openPicker() {
    pickerTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPicker(true);
  }
  useEffect(() => {
    const open = () => openPicker();
    window.addEventListener('makan:workspace-picker', open);
    return () => window.removeEventListener('makan:workspace-picker', open);
  }, []);
  const spaces = useWorkspaceSnapshot();
  const name =
    session.user.displayName ||
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    uiText.text_8b4cb595cd35;
  const active = spaces.data?.workspaces.find(
    (w) => w.membershipId === session.context.membershipId && w.role === session.context.activeRole,
  );
  const workspaceTitle =
    active?.organizationName ??
    (session.context.workspaceType === 'Organization'
      ? uiText.text_b05e4b9892e2
      : uiText.text_ab3c684df5df);
  const guardianChildren = usePersonalApi<components['schemas']['AuthorizedChildResult'][]>(
    '/api/v1/guardian/children',
    {
      enabled:
        session.context.activeRole === 'Parent' && session.context.workspaceType === 'Organization',
    },
  );
  const selectedChild = guardianChildren.data?.find(
    (child) =>
      child.learnerOrganizationPersonId === session.context.subjectOrganizationPersonId &&
      child.organizationId === session.context.organizationId &&
      child.relationStatus === 'Active',
  );
  const home = pathname === '/personal' || pathname === '/personal/education';
  const assistantRoot = pathname === '/personal/assistant' || pathname === '/personal/ai';
  const peerRoot = home || pathname === '/personal/profile' || assistantRoot;
  const HeaderHeading = assistantRoot ? 'h1' : 'h2';
  const conversationSection = pathname.match(
    /^\/personal\/messages\/[^/]+\/(info|edit|settings|members|media|invites|topics)$/,
  )?.[1];
  const conversationTitles: Record<string, string> = {
    info: uiText.text_3a3510c0ba99,
    edit: uiText.text_7f018872aab1,
    settings: uiText.text_ad01ea1c94b6,
    members: uiText.text_6347d5e56150,
    media: uiText.text_8b5bf435319d,
    invites: uiText.text_10c263e49b58,
    topics: uiText.text_0de00f83cacf,
  };
  const pageTitle = conversationSection
    ? conversationTitles[conversationSection]
    : pathname === '/personal/education/invitations'
      ? uiText.text_016c18389868
      : pathname.startsWith('/personal/education/guardians')
        ? uiText.text_d61b3d58a5e7
        : pathname === '/personal/education/reports'
          ? uiText.text_2cbe62e265bd
          : pathname === '/personal/education/overview'
            ? uiText.navigation_education
            : pathname.includes('/education/members')
              ? uiText.text_34e7820beb9d
              : pathname.includes('/education/people')
                ? uiText.text_11a6a5d76e76
                : pathname.includes('/assignments/new')
                  ? uiText.text_6ddab36198ac
                  : pathname.includes('/lessons/new')
                    ? uiText.text_dd307ff5e667
                    : pathname.includes('/lessons/') && pathname.endsWith('/edit')
                      ? uiText.text_9aaef6f3e9c3
                      : pathname === '/personal/profile'
                        ? uiText.text_33f4cefcfd71
                        : pathname === '/personal/profile/preferences'
                          ? uiText.text_8aa6893911d9
                          : pathname.endsWith('/profile/edit')
                            ? uiText.text_7f941e8233a2
                            : pathname.startsWith('/personal/messages')
                              ? uiText.navigation_messages
                              : pathname.startsWith('/personal/contacts')
                                ? uiText.text_b119e3358137
                                : pathname.includes('/assignments')
                                  ? uiText.text_e8fed4d47d62
                                  : pathname.includes('/exams')
                                    ? uiText.text_4f7293cf5780
                                    : pathname.includes('/classes')
                                      ? uiText.text_7c61d113156b
                                      : pathname.includes('/settings')
                                        ? uiText.navigation_settings
                                        : pathname.includes('/assistant')
                                          ? uiText.text_7168b7bf2f42
                                          : uiText.brand_name;
  if (
    pathname === '/personal/workspaces' ||
    pathname === '/personal/settings/privacy' ||
    /^\/personal\/education\/lessons\/[^/]+(?:\/review)?$/.test(pathname) ||
    /^\/personal\/education\/assignments\/[^/]+\/(answer|review|receipt)$/.test(pathname) ||
    pathname.startsWith('/personal/settings/devices') ||
    pathname.startsWith('/personal/extracurricular') ||
    pathname.startsWith('/personal/resources')
  )
    return <>{children}</>;
  return (
    <div
      className={s.shell}
      data-reference-shell
      data-area={
        educationLayout
          ? 'education'
          : pathname.startsWith('/personal/profile')
            ? 'profile'
            : pathname.startsWith('/personal/settings')
              ? 'settings'
              : undefined
      }
      data-focused={isFocusedPage(pathname) || undefined}
      data-messaging={messageLayout || undefined}
      data-messaging-page={messagingPage || undefined}
    >
      <a className="skip-link" href="#personal-content">
        {uiText.text_05508133d927}
      </a>
      <aside className={s.sidebar}>
        <button className={s.brand} onClick={openPicker} aria-label={uiText.text_e357d20c5ae7}>
          <ReferenceBrand />
        </button>
        <button className={s.workspaceSwitch} onClick={openPicker}>
          <span>
            <strong>{workspaceTitle}</strong>
            <small>
              {session.context.activeRole
                ? label(session.context.activeRole)
                : uiText.text_d034f3bcfe7f}
            </small>
          </span>
          <ChevronDown size={16} />
        </button>
        <AppNavigation presentation="sidebar" />
        <div className={s.sidebarBottom}>
          <Link
            href="/personal/settings"
            className={s.sidebarSetting}
            aria-label={uiText.navigation_settings}
          >
            <Settings size={23} />
            <span>{uiText.navigation_settings}</span>
          </Link>
          <Link
            href="/personal/profile"
            className={s.account}
            aria-label={uiText.text_8b4cb595cd35}
          >
            <ProfileAvatar photo={session.user.profilePhoto} name={name} className={s.avatar} />
            <span>
              <strong>{name}</strong>
              <small>{uiText.text_8b4cb595cd35}</small>
            </span>
          </Link>
        </div>
      </aside>
      <div className={s.workspace}>
        <header className={s.header}>
          <Dialog open={picker} onOpenChange={setPicker}>
            {peerRoot ? (
              <DialogTrigger asChild>
                <button
                  className={s.context}
                  aria-label={
                    uiText.text_4fdfc489ee16 +
                    workspaceTitle +
                    uiText.text_6eccd825a0c4 +
                    (session.context.activeRole
                      ? label(session.context.activeRole)
                      : uiText.text_1313fa70e766)
                  }
                >
                  <ChevronDown size={20} />
                </button>
              </DialogTrigger>
            ) : (
              <Link className={s.context} href={backTarget} aria-label={uiText.common_back}>
                <ChevronRight size={20} />
              </Link>
            )}
            <DialogContent
              title={uiText.text_52cdbbd87707}
              description={uiText.text_c16909b11f18}
              onCloseAutoFocus={(event) => {
                const target = pickerTrigger.current;
                pickerTrigger.current = null;
                if (target?.isConnected) {
                  event.preventDefault();
                  target.focus();
                }
              }}
            >
              <div className={s.spaceList}>
                {spaces.isError ? (
                  <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
                ) : spaces.isPending ? (
                  <p role="status">{uiText.text_b71318d920ee}</p>
                ) : (
                  visibleWorkspaces(spaces.data).map((space, index) => (
                    <button
                      key={index}
                      disabled={!canEnterWorkspace(space)}
                      onClick={() =>
                        void selectWorkspace(
                          {
                            workspaceType: space.workspaceType,
                            membershipId: space.membershipId,
                            role: space.role,
                          },
                          workspaceDestination(pathname, space.workspaceType),
                        ).catch(setError)
                      }
                    >
                      <GraduationCap size={20} />
                      <span>
                        {space.organizationName ?? space.displayName}
                        <small>{label(space.role ?? space.workspaceType)}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <WorkspaceVisibilityNotice snapshot={spaces.data} />
            </DialogContent>
          </Dialog>
          <div className={s.headerTitle}>
            <HeaderHeading
              className={s.pageTitle}
              aria-label={
                home
                  ? uiText.navigation_education
                  : assistantRoot
                    ? uiText.navigation_assistant
                    : pageTitle
              }
            >
              {home ? (
                <button
                  className={s.titleSwitch}
                  onClick={openPicker}
                  aria-label={uiText.text_ea58c94d0d26}
                >
                  {uiText.navigation_education}
                </button>
              ) : assistantRoot ? (
                uiText.navigation_assistant
              ) : (
                pageTitle
              )}
            </HeaderHeading>
            <p className={s.headerSubtitle}>
              {assistantRoot ? (
                uiText.text_e3ca4bcedb43
              ) : (
                <>
                  {workspaceTitle}
                  {uiText.text_78887da22764}{' '}
                  {session.context.activeRole
                    ? label(session.context.activeRole)
                    : uiText.text_d034f3bcfe7f}
                  {selectedChild ? ` · ${selectedChild.displayName}` : ''}
                </>
              )}
            </p>
          </div>
          <div className={s.headerEnd}>
            {pathname === '/personal/profile' ? (
              <Button asChild size="icon" variant="ghost">
                <Link href="/personal/profile/preferences" aria-label={uiText.text_8aa6893911d9}>
                  <Settings size={21} />
                </Link>
              </Button>
            ) : (
              (educationLayout || messageLayout || pathname === '/personal/contacts') && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={educationLayout ? uiText.text_8e87c1832a1e : uiText.text_2a93eb7f06ce}
                  onClick={() => {
                    if (educationLayout) {
                      router.push('/personal/education/search');
                      return;
                    }
                    const field = document.querySelector<HTMLInputElement>(
                      'main [role="search"] input',
                    );
                    if (field) field.focus();
                  }}
                >
                  <Search size={20} />
                </Button>
              )
            )}
            {!messageLayout && (
              <Button asChild size="icon" variant="ghost">
                <Link aria-label={uiText.text_9f2a436a61f3} href="/personal/notifications">
                  <Bell size={20} />
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main
          ref={mainScroll}
          className={`${s.main} ${messageLayout ? s.messageMain : ''} ${messagingPage && !messageLayout ? s.messagingPageMain : ''} ${pathname.startsWith('/personal/assistant') || pathname === '/personal/ai' ? s.assistantMain : ''}`}
          id="personal-content"
        >
          {!!error && <ErrorState error={error} />}
          {children}
        </main>
        <div className={s.mobileNav}>
          <AppNavigation presentation="dock" />
        </div>
      </div>
    </div>
  );
}
