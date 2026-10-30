'use client';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { label } from '@/components/ui/states';
import { date } from '@/lib/formatting';
import { ProfileAvatar } from './profile-photo';
import { usePersonal } from './provider';
import { useWorkspaceSnapshot } from './workspaces';
import type { components } from '@/generated/api/schema';
import type { ReactNode } from 'react';
import s from './reference-layout.module.css';

type Session = NonNullable<components['schemas']['DashboardSessionItem']>;
export function ReferenceColumns({
  children,
  form = false,
  sessions = [],
}: {
  children: ReactNode;
  form?: boolean;
  sessions?: Session[];
}) {
  const { session } = usePersonal();
  const spaces = useWorkspaceSnapshot();
  const active = spaces.data?.workspaces.find(
    (w) => w.membershipId === session.context.membershipId && w.role === session.context.activeRole,
  );
  const name = session.user.displayName || session.user.firstName || 'حساب من';
  return (
    <div className={s.columns} data-reference-columns>
      <div className={`${s.content} ${form ? s.formContent : ''}`}>{children}</div>
      <aside className={s.context} aria-label="اطلاعات فضای کار">
        <div className={s.workspace}>
          <ProfileAvatar photo={session.user.profilePhoto} name={name} className={s.avatar} />
          <div>
            <strong>{name}</strong>
            <small>
              {active?.organizationName ??
                (session.context.workspaceType === 'Organization' ? 'آموزشگاه فعال' : 'فضای شخصی')}
            </small>
          </div>
          <button onClick={() => window.dispatchEvent(new Event('makan:workspace-picker'))}>
            تغییر
          </button>
        </div>
        <div className={s.divider} />
        <h2>{form ? 'راهنمای این صفحه' : 'برنامهٔ پیش رو'}</h2>
        {form ? (
          <>
            <p>اطلاعات را مرحله‌به‌مرحله وارد کنید و پیش از ثبت، آن‌ها را مرور کنید.</p>
            <div className={s.notice}>
              <ShieldCheck size={20} />
              <span>حریم خصوصی و دسترسی‌ها در هر نقش حفظ می‌شود.</span>
            </div>
          </>
        ) : (
          <>
            {sessions.map((item) => (
              <Link
                href={`/personal/education/classes/${item.classId}`}
                className={s.session}
                key={item.sessionId}
              >
                <span className={s.avatar}>{item.classTitle?.[0] || 'ک'}</span>
                <span>
                  <strong>{item.classTitle}</strong>
                  <small>{date(item.startUtc, true)}</small>
                </span>
                <ChevronLeft size={16} />
              </Link>
            ))}
            {!sessions.length && <p>جلسهٔ پیش رویی ثبت نشده است.</p>}
            {session.context.workspaceType === 'Organization' && (
              <Link href="/personal/education/schedule" className={s.schedule}>
                مشاهده برنامه
              </Link>
            )}
          </>
        )}
        <div className={s.divider} />
        <p className={s.footer}>
          راهنما · حریم خصوصی · شرایط استفاده
          <br />
          ماکان — یادگیری، کنار هم
        </p>
        <span className={s.role}>{label(session.context.activeRole ?? 'Personal')}</span>
      </aside>
    </div>
  );
}
