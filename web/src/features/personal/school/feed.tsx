'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import { nearestUpcoming } from './calendar-model';
import { mapSchoolSearch } from './search-model';
import { UpcomingSummary } from './upcoming';
import { base } from './shared';
import s from './overview.module.css';
type S = components['schemas'];
type Dashboard = S['ManagerDashboardDto'] | S['TeacherDashboardDto'] | S['StudentDashboardDto'];
export function SchoolFeed() {
  const { session, call } = usePersonal(),
    role = session.context.activeRole,
    student = role === 'Student';
  const dashboard = usePersonalApi<Dashboard>('/api/v1/dashboards/' + role!.toLowerCase(), {
    poll: 10000,
  });
  const classes = usePersonalApi<S['ClassResult'][]>('/api/v1/academic/classes');
  const assignments = useQuery({
    queryKey: [
      'personal',
      session.user.id,
      session.revision,
      'overview-assignments',
      classes.data?.map((c) => c.id).join(','),
    ],
    enabled: !student && classes.isSuccess,
    queryFn: async ({ signal }) =>
      (
        await mapSchoolSearch(classes.data!, signal, (c) =>
          call<S['AssignmentResult'][]>('/api/v1/academic/classes/' + c.id + '/assignments', {
            signal,
          }),
        )
      ).flat(),
    refetchInterval: 10000,
  });
  const exams = usePersonalApi<S['StudentExamSummary'][]>('/api/v1/academic/exams', {
    enabled: !student,
    poll: 10000,
  });
  if (dashboard.isPending) return <LoadingSkeleton />;
  if (dashboard.isError)
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data;
  if (
    d.organizationId !== session.context.organizationId ||
    classes.data?.some((c) => c.organizationId !== session.context.organizationId)
  )
    return <ErrorState error={new ApiError(409)} />;
  const sessions =
    'upcomingSessions' in d ? d.upcomingSessions : d.nextSession ? [d.nextSession] : [];
  const nextSession = nearestUpcoming(
    sessions.filter((x) => x.status === 'Scheduled'),
    (x) => x.startUtc,
  );
  const candidate = 'nearestAssignmentDeadline' in d ? d.nearestAssignmentDeadline : null;
  const nextAssignment = student
    ? candidate && nearestUpcoming([candidate], (x) => x.dueAtUtc)
    : nearestUpcoming(
        (assignments.data ?? []).filter((x) => x.status === 'Published'),
        (x) => x.dueAtUtc,
      );
  const examItems =
    'upcomingExams' in d
      ? d.upcomingExams.map((x) => ({
          title: x.title,
          classTitle: x.classTitle,
          classId: x.classId,
          time: x.availableFromUtc,
        }))
      : (exams.data ?? [])
          .filter((x) => x.publicationState === 'Published')
          .map((x) => ({
            title: x.title,
            classTitle: x.classTitle,
            classId: x.classId,
            time: x.rules.availableFromUtc,
          }));
  const nextExam = nearestUpcoming(examItems, (x) => x.time);
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>نمای آموزشگاه</h1>
        <p>جلسه‌ها، تکلیف‌ها و آزمون‌های پیش رو، در یک نگاه.</p>
      </header>
      <UpcomingSummary
        session={
          nextSession
            ? {
                title: nextSession.title,
                classTitle: nextSession.classTitle,
                time: nextSession.startUtc,
                href: base + '/classes/' + nextSession.classId,
              }
            : null
        }
        assignment={
          nextAssignment
            ? {
                title: nextAssignment.title,
                classTitle: nextAssignment.classTitle,
                time: nextAssignment.dueAtUtc,
                href:
                  base +
                  '/assignments/' +
                  ('assignmentId' in nextAssignment
                    ? nextAssignment.assignmentId
                    : nextAssignment.id),
              }
            : null
        }
        exam={
          nextExam
            ? {
                title: nextExam.title,
                classTitle: nextExam.classTitle,
                time: nextExam.time,
                href: base + '/classes/' + nextExam.classId + '?tab=exams',
              }
            : null
        }
        loading={
          !student &&
          (classes.isPending || (classes.isSuccess && assignments.isPending) || exams.isPending)
        }
        errors={[undefined, classes.error || assignments.error, exams.error]}
      />
      {!student && (
        <Button asChild variant="outline">
          <Link href={base + '/evaluations'}>ارزیابی تکلیف‌ها</Link>
        </Button>
      )}
    </div>
  );
}
