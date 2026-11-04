'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ConnectionNotice } from '@/components/ui/connection-notice';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal, usePersonalApi } from '../provider';
import { nearestUpcoming, currentSchoolWeek, schoolWeekRange } from './calendar-model';
import { useState } from 'react';
import { BookOpen, ClipboardList, ChevronLeft } from 'lucide-react';
import { date } from '@/lib/formatting';
import { mapSchoolSearch } from './search-model';
import { base } from './shared';
type S = components['schemas'];
type Dashboard = S['ManagerDashboardDto'] | S['TeacherDashboardDto'] | S['StudentDashboardDto'];
export function SchoolFeed() {
  const { session, call } = usePersonal(),
    role = session.context.activeRole,
    student = role === 'Student';
  const [selectedDay, setSelectedDay] = useState('');
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
  if (dashboard.isError && !dashboard.data)
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data!;
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
  const week = schoolWeekRange(currentSchoolWeek(new Date(d.dataAsOfUtc)));
  const current = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(d.dataAsOfUtc));
  const chosenDay = selectedDay || current;
  const name = session.user.firstName || session.user.displayName || uiText.text_2018071defea;
  const grading = 'assignmentGradingQueue' in d ? d.assignmentGradingQueue.totalPendingCount : 0;
  return (
    <>
      <ConnectionNotice
        cached={!!dashboard.data}
        error={dashboard.isError}
        onRetry={() => void dashboard.refetch()}
      />

      <div className="between">
        <div>
          <p className="small muted" style={{ margin: 0 }}>
            {new Intl.DateTimeFormat('fa-IR', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              timeZone: 'Asia/Tehran',
            }).format(new Date(d.dataAsOfUtc))}
          </p>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
            {uiText.text_48d43650690b}
            {name}
          </div>
        </div>
        <Link className="chip" href="/personal/workspaces">
          {uiText.text_3c95ceca639d}
        </Link>
      </div>
      {student && (
        <div className="date-strip" aria-label={uiText.text_65cdaaabdabd}>
          {week.days.map((day) => (
            <button
              type="button"
              className={'date-cell ' + (chosenDay === day.date ? 'active' : '')}
              key={day.date}
              aria-pressed={chosenDay === day.date}
              onClick={() => setSelectedDay(day.date)}
            >
              <span>{day.weekday.slice(0, 1)}</span>
              <b>
                {new Intl.DateTimeFormat('fa-IR', { day: 'numeric', timeZone: 'UTC' }).format(
                  new Date(day.date + 'T12:00:00Z'),
                )}
              </b>
            </button>
          ))}
        </div>
      )}
      <h2 className="section-title">
        <span>{uiText.text_e30bd24d513b}</span>
        <Link className="text-action" href={base + '/schedule'}>
          {uiText.text_ca0f901fdf49}
        </Link>
      </h2>
      {nextSession ? (
        <Link className="schedule" href={base + '/sessions/' + nextSession.sessionId}>
          <span className="time">
            {new Intl.DateTimeFormat('fa-IR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Tehran',
            }).format(new Date(nextSession.startUtc))}
            <br />
            {Math.round(
              (Date.parse(nextSession.endUtc) - Date.parse(nextSession.startUtc)) / 60000,
            ).toLocaleString('fa-IR')}{' '}
            {uiText.text_fa95e25fd538}
          </span>
          <span className="bar" />
          <span className="grow">
            <h4>{nextSession.title}</h4>
            <p>{nextSession.classTitle}</p>
          </span>
        </Link>
      ) : (
        <div className="card">
          <p>{uiText.text_827cc8637f4d}</p>
          <Link className="text-action" href={base + '/schedule'}>
            {uiText.text_15aa7009c6f2}
          </Link>
        </div>
      )}
      {!student && nextSession && (
        <div className="button-row">
          <Link className="btn" href={base + '/sessions/' + nextSession.sessionId}>
            {uiText.text_5ebf6333e4cd}
          </Link>
          <Link className="btn secondary" href={base + '/sessions/' + nextSession.sessionId}>
            {uiText.text_7841d322609a}
          </Link>
        </div>
      )}
      <h2 className="section-title">
        <span>{student ? uiText.text_f9aa47c30ce0 : uiText.text_1b5115f2f6fa}</span>
        <Link
          className="text-action"
          href={student ? base + '/assignments' : base + '/evaluations'}
        >
          {uiText.text_d0c8b7c92026}
        </Link>
      </h2>
      <div className="list">
        {nextAssignment && (
          <Link
            className="row"
            href={
              base +
              '/assignments/' +
              ('assignmentId' in nextAssignment ? nextAssignment.assignmentId : nextAssignment.id)
            }
          >
            <span className="tile-icon">
              <ClipboardList size={22} />
            </span>
            <span className="grow">
              <h4>{nextAssignment.title}</h4>
              <p>
                {uiText.text_fbb3425cdeea}
                {date(nextAssignment.dueAtUtc, true)}
              </p>
            </span>
            <span className="badge warn">{uiText.text_563c95d1f5ea}</span>
          </Link>
        )}
        {!student && (
          <Link className="row" href={base + '/evaluations'}>
            <span className="tile-icon">
              <ClipboardList size={22} />
            </span>
            <span className="grow">
              <h4>{uiText.text_ad3c2573d0e2}</h4>
              <p>{uiText.text_522e4acaf773}</p>
            </span>
            <span className="badge">{grading.toLocaleString('fa-IR')}</span>
          </Link>
        )}
        <Link className="row" href={base + '/classes'}>
          <span className="tile-icon">
            <BookOpen size={22} />
          </span>
          <span className="grow">
            <h4>{student ? uiText.text_4f96bdc2ea91 : uiText.text_aeef0973ce24}</h4>
            <p>{student ? uiText.text_d59bfca8883f : uiText.text_ded488406591}</p>
          </span>
          <ChevronLeft size={18} />
        </Link>
        {nextExam && (
          <Link className="row" href={base + '/classes/' + nextExam.classId + '?tab=exams'}>
            <span className="tile-icon">
              <ClipboardList size={22} />
            </span>
            <span className="grow">
              <h4>{nextExam.title}</h4>
              <p>{date(nextExam.time, true)}</p>
            </span>
            <ChevronLeft size={18} />
          </Link>
        )}
      </div>
      {!!(classes.error || assignments.error || exams.error) && (
        <ErrorState error={classes.error || assignments.error || exams.error} />
      )}
    </>
  );
}
