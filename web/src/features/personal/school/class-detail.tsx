'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { PageBack } from '@/components/navigation/page-back';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Library,
  ClipboardList,
  FileQuestion,
  Users,
  ChevronRight,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonalApi, usePersonal } from '../provider';
import { Schedule } from './schedule';
import { Assignments } from './learning';
import { ClassLessons } from './lessons';
import { Exams } from './exams';
import { ClassMembersOverview } from './class-members';
import { OfficialSpaces } from './official-spaces';
import { base } from './shared';
import { date } from '@/lib/formatting';
import s from './education-layout.module.css';
type S = components['schemas'];
const sections = [
  ['sessions', uiText.text_92797051c40c, CalendarDays],
  ['lessons', uiText.text_c75948a71a2d, Library],
  ['assignments', uiText.text_e8fed4d47d62, ClipboardList],
  ['exams', uiText.text_4f7293cf5780, FileQuestion],
  ['members', uiText.text_29c02fa4bd09, Users],
] as const;
export function ClassSectionNavigation({ id, members = false }: { id: string; members?: boolean }) {
  const visible = sections.filter(([key]) => key !== 'members' || members);
  const requested = useSearchParams().get('tab'),
    tab = visible.some(([key]) => key === requested) ? requested : 'sessions';
  return (
    <nav
      className={`${s.classTabs} ${members ? s.classTabsMembers : ''}`}
      aria-label={uiText.text_3f6941f28393}
    >
      {visible.map(([key, title, Icon]) => (
        <Link
          key={key}
          href={`${base}/classes/${id}?tab=${key}`}
          aria-current={tab === key ? 'page' : undefined}
        >
          <Icon size={20} />
          <span>{title}</span>
        </Link>
      ))}
    </nav>
  );
}
export function ClassDetail({
  id,
  manager,
  teacher,
}: {
  id: string;
  manager: boolean;
  teacher: boolean;
}) {
  const q = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes'),
    { session } = usePersonal();
  const tab = useSearchParams().get('tab') ?? 'sessions';
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const item = q.data.find(
    (c) => c.id === id && c.organizationId === session.context.organizationId,
  );
  if (!item) return <ErrorState error={new ApiError(404)} />;
  return (
    <div className={s.classPage}>
      <PageBack href={`${base}/classes`} />
      <header className={s.classHeading}>
        <span className={s.courseIcon}>{item.courseTitle.slice(0, 1)}</span>
        <div>
          <p>{item.courseTitle}</p>
          <h1>{item.title}</h1>
          <span>{item.academicPeriodTitle}</span>
        </div>
      </header>
      <ClassSectionNavigation id={id} members={manager || teacher} />
      <OfficialSpaces classId={id} />
      <section className={s.classContent} aria-label={uiText.text_951b90b58d3d}>
        {tab === 'members' ? (
          manager || teacher ? (
            <ClassMembersOverview classId={id} />
          ) : (
            <ErrorState error={new ApiError(403)} />
          )
        ) : tab === 'lessons' ? (
          <ClassLessons classId={id} teach={teacher || manager} />
        ) : tab === 'assignments' ? (
          <Assignments classId={id} teach={teacher || manager} />
        ) : tab === 'exams' ? (
          <Exams classId={id} teach={teacher || manager} />
        ) : (
          <Schedule classId={id} teach={teacher || manager} />
        )}
      </section>
    </div>
  );
}
export function ParentClasses({ id }: { id?: string }) {
  const { session } = usePersonal(),
    q = usePersonalApi<S['ParentDashboardDto']>('/api/v1/dashboards/parent', { poll: 10000 });
  const tab = useSearchParams().get('tab') ?? 'sessions';
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} />;
  const d = q.data;
  if (
    d.organizationId !== session.context.organizationId ||
    !d.selectedLearner ||
    d.selectedLearner.learnerOrganizationPersonId !== session.context.subjectOrganizationPersonId
  )
    return <ErrorState error={new ApiError(403)} />;
  const classes = new Map(
    [...d.upcomingSessions, ...d.assignments, ...d.exams].map((row) => [
      row.classId,
      row.classTitle,
    ]),
  );
  if (!id)
    return (
      <div className={s.classPage}>
        <header className={s.classHeading}>
          <div>
            <h1>{uiText.text_ad3bf2c81977}</h1>
            <p>
              {d.selectedLearner.displayName}
              {uiText.text_2655b36aa32c}
            </p>
          </div>
        </header>
        {classes.size ? (
          <div className={s.classList}>
            {[...classes].map(([key, title]) => (
              <Link href={`${base}/classes/${key}`} key={key}>
                <h2>{title}</h2>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title={uiText.text_48743e694ff4} />
        )}
      </div>
    );
  if (!classes.has(id)) return <ErrorState error={new ApiError(404)} />;
  const rows =
    tab === 'assignments'
      ? d.assignments
          .filter((x) => x.classId === id)
          .map((x) => ({ id: x.assignmentId, title: x.title, time: x.dueAtUtc }))
      : tab === 'exams'
        ? d.exams
            .filter((x) => x.classId === id)
            .map((x) => ({ id: x.examId, title: x.title, time: x.availableFromUtc }))
        : d.upcomingSessions
            .filter((x) => x.classId === id)
            .map((x) => ({ id: x.sessionId, title: x.title, time: x.startUtc }));
  return (
    <div className={s.classPage}>
      <PageBack href={`${base}/classes`} />
      <header className={s.classHeading}>
        <div>
          <h1>{classes.get(id)}</h1>
          <p>{d.selectedLearner.displayName}</p>
        </div>
      </header>
      <ClassSectionNavigation id={id} />
      {tab === 'lessons' ? (
        <EmptyState title={uiText.text_2a9b0d8ae50f} />
      ) : rows.length ? (
        <div className={s.parentItems}>
          {rows.map((row) => (
            <article key={row.id}>
              <h2>{row.title}</h2>
              <p>{date(row.time, true)}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={uiText.text_ca38497f0734} />
      )}
    </div>
  );
}
