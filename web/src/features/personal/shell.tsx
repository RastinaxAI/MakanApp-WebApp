'use client';
import { ReferenceBrand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ErrorState, label } from '@/components/ui/states';
import {
  activeNavigation,
  isFocusedPage,
  isMessageRoom,
  navigation,
  workspaceDestination,
} from '@/config/navigation';
import type { components } from '@/generated/api/schema';
import {
  ChevronDown,
  GraduationCap,
  House,
  Bell,
  Search,
  ChevronRight,
  MessageCircle,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import s from './shell.module.css';
import { ProfileAvatar } from './profile-photo';
import { usePersonal, usePersonalApi } from './provider';
import { useWorkspaceSnapshot, WorkspaceVisibilityNotice } from './workspaces';
import { visibleWorkspaces, canEnterWorkspace } from './workspace-model';
import { useThemePreference } from './theme';
import { PageBackProvider, usePageBackTarget } from '@/components/navigation/page-back';
const icons = {
  education: House,
  assistant: Sparkles,
  messages: MessageCircle,
  profile: UserRound,
};
const nav = navigation.map((item) => ({ ...item, icon: icons[item.icon] }));
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
  const router = useRouter();
  useThemePreference();
  const messageLayout = pathname === '/personal/messages' || isMessageRoom(pathname);
  const educationLayout = pathname.startsWith('/personal/education') || pathname === '/personal';
  const [picker, setPicker] = useState(false),
    [error, setError] = useState<unknown>();
  useEffect(() => {
    const open = () => setPicker(true);
    window.addEventListener('makan:workspace-picker', open);
    return () => window.removeEventListener('makan:workspace-picker', open);
  }, []);
  const spaces = useWorkspaceSnapshot();
  const name =
    session.user.displayName ||
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    'حساب من';
  const active = spaces.data?.workspaces.find(
    (w) => w.membershipId === session.context.membershipId && w.role === session.context.activeRole,
  );
  const workspaceTitle =
    active?.organizationName ??
    (session.context.workspaceType === 'Organization' ? 'آموزشگاه فعال' : 'فضای شخصی');
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
  const pageTitle = pathname.includes('/education/members')
    ? 'اعضای آموزشگاه'
    : pathname.includes('/education/people')
      ? 'پرونده‌های آموزشی'
      : pathname.includes('/assignments/new')
        ? 'افزودن تکلیف'
        : pathname.includes('/lessons/new')
          ? 'افزودن درس'
          : pathname.includes('/lessons/') && pathname.endsWith('/edit')
            ? 'ویرایش درس'
            : pathname === '/personal/profile'
              ? 'پروفایل من'
              : pathname === '/personal/profile/preferences'
                ? 'حساب و ترجیحات'
                : pathname.endsWith('/profile/edit')
                  ? 'ویرایش پروفایل'
                  : pathname.startsWith('/personal/messages')
                    ? 'پیام‌ها'
                    : pathname.startsWith('/personal/contacts')
                      ? 'مخاطبان'
                      : pathname.includes('/assignments')
                        ? 'تکلیف‌ها'
                        : pathname.includes('/exams')
                          ? 'آزمون‌ها'
                          : pathname.includes('/classes')
                            ? 'کلاس‌های من'
                            : pathname.includes('/settings')
                              ? 'تنظیمات'
                              : pathname.includes('/assistant')
                                ? 'دستیار ماکان'
                                : 'ماکان';
  const navigation = (
    <nav aria-label="ناوبری حساب شخصی" className={s.nav}>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-label={item.name}
          aria-current={activeNavigation(pathname) === item.href ? 'page' : undefined}
        >
          <span className={s.navGlyph}>
            <item.icon size={22} />
          </span>
          <span>{item.name}</span>
        </Link>
      ))}
    </nav>
  );
  if (pathname === '/personal/workspaces') return <>{children}</>;
  return (
    <div
      className={s.shell}
      data-reference-shell
      data-focused={isFocusedPage(pathname) || undefined}
      data-messaging={messageLayout || undefined}
    >
      <a className="skip-link" href="#personal-content">
        رفتن به محتوای اصلی
      </a>
      <aside className={s.sidebar}>
        <button
          className={s.brand}
          onClick={() => setPicker(true)}
          aria-label="ماکان؛ انتخاب نقش و فضای کار"
        >
          <ReferenceBrand />
        </button>
        <button className={s.workspaceSwitch} onClick={() => setPicker(true)}>
          <span>
            <strong>{workspaceTitle}</strong>
            <small>
              {session.context.activeRole ? label(session.context.activeRole) : 'حساب شخصی'}
            </small>
          </span>
          <ChevronDown size={16} />
        </button>
        {navigation}
        <div className={s.sidebarBottom}>
          <Link href="/personal/settings" className={s.sidebarSetting} aria-label="تنظیمات">
            <Settings size={23} />
            <span>تنظیمات</span>
          </Link>
          <Link href="/personal/profile" className={s.account} aria-label="حساب من">
            <ProfileAvatar photo={session.user.profilePhoto} name={name} className={s.avatar} />
            <span>
              <strong>{name}</strong>
              <small>حساب من</small>
            </span>
          </Link>
        </div>
      </aside>
      <div className={s.workspace}>
        <header className={s.header}>
          <Dialog open={picker} onOpenChange={setPicker}>
            {home ? (
              <DialogTrigger asChild>
                <button
                  className={s.context}
                  aria-label={
                    'فضای کار: ' +
                    workspaceTitle +
                    '، نقش: ' +
                    (session.context.activeRole ? label(session.context.activeRole) : 'فرد عادی')
                  }
                >
                  <ChevronDown size={20} />
                </button>
              </DialogTrigger>
            ) : (
              <Link className={s.context} href={backTarget} aria-label="بازگشت">
                <ChevronRight size={20} />
              </Link>
            )}
            <DialogContent
              title="انتخاب فضای کار"
              description="حساب شخصی شما با تغییر آموزشگاه باقی می‌ماند."
            >
              <div className={s.spaceList}>
                {spaces.isError ? (
                  <ErrorState error={spaces.error} onRetry={() => void spaces.refetch()} />
                ) : spaces.isPending ? (
                  <p role="status">در حال دریافت فضاهای مجاز…</p>
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
          <h2
            className={`${s.pageTitle} ${home && (!session.context.activeRole || session.context.activeRole === 'Student') ? s.brandWord : ''}`}
          >
            {home ? (
              <button
                className={s.titleSwitch}
                onClick={() => setPicker(true)}
                aria-label="ماکان؛ تغییر نقش و فضای کار"
              >
                {session.context.activeRole === 'Manager'
                  ? (active?.organizationName ?? 'آموزشگاه من')
                  : session.context.activeRole === 'Teacher'
                    ? 'روز کاری من'
                    : session.context.activeRole === 'Parent'
                      ? selectedChild
                        ? `امروزِ ${selectedChild.displayName.split(' ')[0]}`
                        : 'فرزندان من'
                      : 'ماکان'}
              </button>
            ) : (
              pageTitle
            )}
          </h2>
          <div className={s.headerEnd}>
            {pathname === '/personal/profile' ? (
              <Button asChild size="icon" variant="ghost">
                <Link href="/personal/profile/preferences" aria-label="حساب و ترجیحات">
                  <Settings size={21} />
                </Link>
              </Button>
            ) : (
              (educationLayout || messageLayout || pathname === '/personal/contacts') && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={educationLayout ? 'جستجو در آموزشگاه' : 'جستجو'}
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
                <Link aria-label="اعلان‌ها" href="/personal/notifications">
                  <Bell size={20} />
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main
          className={`${s.main} ${messageLayout ? s.messageMain : ''} ${pathname.startsWith('/personal/assistant') || pathname === '/personal/ai' ? s.assistantMain : ''}`}
          id="personal-content"
        >
          {!!error && <ErrorState error={error} />}
          {children}
        </main>
        <div className={s.mobileNav}>{navigation}</div>
      </div>
    </div>
  );
}
