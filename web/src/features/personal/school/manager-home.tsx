'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { Plus, CalendarDays, ClipboardCheck, Users, Mail, ChevronLeft } from 'lucide-react';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { base } from './shared';
import layout from './dashboard-layout.module.css';
import { ManagerClassCards } from './manager-class-cards';
import { OfficialSpaces } from './official-spaces';
type S = components['schemas'];
export function ManagerHome() {
  const { session } = usePersonal();
  const dashboard = usePersonalApi<S['ManagerDashboardDto']>('/api/v1/dashboards/manager', {
    poll: 10000,
  });
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes', { poll: 10000 });
  if (dashboard.isPending) return <LoadingSkeleton />;
  if (dashboard.isError)
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data;
  if (
    d.organizationId !== session.context.organizationId ||
    classes.data?.some((c) => c.organizationId !== session.context.organizationId)
  )
    return <ErrorState error={new ApiError(403)} />;
  return (
    <>
      <div className={layout.heading}>
        <div>
          <h1>{uiText.text_a4dd29fe7d67}</h1>
          <p>{uiText.text_45db6dacb1d1}</p>
        </div>
        <Link className="btn" href={base + '/classes/new'}>
          <Plus size={19} />
          {uiText.text_413337c38036}
        </Link>
      </div>
      <div className="stats" aria-label={uiText.text_622d10d391a9}>
        {[
          [uiText.text_e85db0fb2a48, d.operationalCounts.activeClassCount],
          [uiText.text_fbd179d162db, d.operationalCounts.enrolledLearnerCount],
          [uiText.text_3d4c3d92cfad, d.pendingInvitationCount],
        ].map(([name, count]) => (
          <div className="stat" key={name}>
            <b>{Number(count).toLocaleString('fa-IR')}</b>
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className={layout.grid}>
        <section className={layout.followup}>
          <h2 className="section-title">{uiText.text_5419ed3bd524}</h2>
          <div className="list">
            <Link href={base + '/invitations'} className="row">
              <span className="tile-icon">
                <Mail size={22} />
              </span>
              <span className="grow">
                <h4>{uiText.text_2c55a75e6b60}</h4>
                <p>
                  {d.pendingInvitationCount.toLocaleString('fa-IR')}
                  {uiText.text_7330fa8e33d9}
                </p>
              </span>
              <span className="badge warn">{d.pendingInvitationCount.toLocaleString('fa-IR')}</span>
            </Link>
            <Link href={base + '/schedule'} className="row">
              <span className="tile-icon">
                <CalendarDays size={22} />
              </span>
              <span className="grow">
                <h4>{uiText.text_55e5cd56489f}</h4>
                <p>{uiText.text_3d7d49b37d72}</p>
              </span>
              <ChevronLeft size={18} />
            </Link>
            <Link href={base + '/reports'} className="row">
              <span className="tile-icon">
                <ClipboardCheck size={22} />
              </span>
              <span className="grow">
                <h4>{uiText.text_35d50af580db}</h4>
                <p>{uiText.text_6c1681d6d4e1}</p>
              </span>
              <ChevronLeft size={18} />
            </Link>
            <Link href={base + '/guardians'} className="row">
              <span className="tile-icon">
                <Users size={22} />
              </span>
              <span className="grow">
                <h4>{uiText.text_d61b3d58a5e7}</h4>
                <p>{uiText.text_6cdd6f97ebf5}</p>
              </span>
              <ChevronLeft size={18} />
            </Link>
          </div>
        </section>
        <section className={layout.classes}>
          <div className="section-title">
            <h2>{uiText.text_9d936eeca4e2}</h2>
            <Link className="text-action" href={base + '/classes'}>
              {uiText.text_5477ed00df38}
            </Link>
          </div>
          {classes.isPending ? (
            <LoadingSkeleton />
          ) : classes.isError ? (
            <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
          ) : (
            <ManagerClassCards items={classes.data.slice(0, 2)} />
          )}
        </section>
      </div>
      <div className="alert">{uiText.text_ab4d76d96a3a}</div>
      <details className="card">
        <summary>{uiText.text_030eacc9e686}</summary>
        <OfficialSpaces />
      </details>
      <p className="tiny muted">
        {uiText.text_7b586f9d7764}
        {date(d.dataAsOfUtc, true)}
      </p>
    </>
  );
}
