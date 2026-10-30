'use client';
import Link from 'next/link';
import { ArrowLeft, FolderSync, UserRoundPlus, UsersRound } from 'lucide-react';
import { base, Card } from './shared';
import { ManagerPageHeader } from './manager-page-header';
import { InvitationsPage } from './invitations';
import s from './manager-workspace.module.css';
export function ManagerInvitations() {
  return (
    <div className={s.stack}>
      <ManagerPageHeader
        title="مدیریت دعوت‌های آموزشگاه"
        description="دعوت والد را برای فرزند مشخص ارسال کنید و پرونده‌های نیازمند اتصال حساب را بررسی کنید."
      />
      <nav className={s.invitationActions} aria-label="اقدام‌های دعوت و عضویت">
        <Link className={s.primaryAction} href={base + '/guardians/new'}>
          <UserRoundPlus size={22} />
          <span>دعوت والد برای دانش‌آموز</span>
          <ArrowLeft size={17} />
        </Link>
        <Link href={base + '/people'}>
          <FolderSync size={22} />
          <span>پرونده‌ها و اتصال حساب</span>
          <ArrowLeft size={17} />
        </Link>
        <Link href={base + '/members'}>
          <UsersRound size={22} />
          <span>اعضای فعلی آموزشگاه</span>
          <ArrowLeft size={17} />
        </Link>
      </nav>
      <Card title="دعوت‌های ارسالی آموزشگاه">
        <p className={s.hint}>
          فهرست یکپارچهٔ دعوت‌های ارسالی هنوز در این بخش در دسترس نیست. پس از ارسال دعوت والد، وضعیت
          و امکان لغو همان دعوت در رسید آن نمایش داده می‌شود.
        </p>
      </Card>
      <InvitationsPage />
    </div>
  );
}
