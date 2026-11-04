'use client';
import * as uiText from '@/content/fa';
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
  const name = session.user.displayName || session.user.firstName || uiText.text_8b4cb595cd35;
  return (
    <div className={s.columns} data-reference-columns>
      <div className={`${s.content} ${form ? s.formContent : ''}`}>{children}</div>
      <aside className={s.context} aria-label={uiText.text_3d52727b693c}>
        <div className={s.workspace}>
          <ProfileAvatar photo={session.user.profilePhoto} name={name} className={s.avatar} />
          <div>
            <strong>{name}</strong>
            <small>
              {active?.organizationName ??
                (session.context.workspaceType === 'Organization'
                  ? uiText.text_b05e4b9892e2
                  : uiText.text_ab3c684df5df)}
            </small>
          </div>
          <button onClick={() => window.dispatchEvent(new Event('makan:workspace-picker'))}>
            {uiText.text_d6541f139845}
          </button>
        </div>
        <div className={s.divider} />
        <h2>{form ? uiText.text_7cf2f4a3317a : uiText.text_2b09f11a29d1}</h2>
        {form ? (
          <>
            <p>{uiText.text_183283ba6298}</p>
            <div className={s.notice}>
              <ShieldCheck size={20} />
              <span>{uiText.text_ce21dcffb909}</span>
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
                <span className={s.avatar}>{item.classTitle?.[0] || uiText.text_ffa8517fa9b7}</span>
                <span>
                  <strong>{item.classTitle}</strong>
                  <small>{date(item.startUtc, true)}</small>
                </span>
                <ChevronLeft size={16} />
              </Link>
            ))}
            {!sessions.length && <p>{uiText.text_3b913a3284fe}</p>}
            {session.context.workspaceType === 'Organization' && (
              <Link href="/personal/education/schedule" className={s.schedule}>
                {uiText.text_8803dcef8c66}
              </Link>
            )}
          </>
        )}
        <div className={s.divider} />
        <p className={s.footer}>
          {uiText.text_0b6d7d9d8cf2}
          <br />
          {uiText.text_efaf43eff1b4}
        </p>
        <span className={s.role}>{label(session.context.activeRole ?? 'Personal')}</span>
      </aside>
    </div>
  );
}
