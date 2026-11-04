'use client';
import * as uiText from '@/content/fa';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, label, LoadingSkeleton } from '@/components/ui/states';
import { isSchoolRole, isSchoolPath } from '@/config/navigation';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import {
  BookOpen,
  Building2,
  CalendarDays,
  Mail,
  Users,
  UserRoundCheck,
  ChartNoAxesCombined,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePersonal, usePersonalApi } from './provider';
import { useWorkspaceSnapshot } from './workspaces';
import { visibleWorkspaces, canEnterWorkspace } from './workspace-model';
import { SchoolFeed } from './school/feed';
import s from './school/school.module.css';
import { base, Card, Pager, SchoolHeading } from './school/shared';
import { ChildSelector } from './school/child-selector';
import { SchoolSearch } from './school/search';
import layout from './school/education-layout.module.css';
import { ReferenceSchoolFrame } from '@/features/reference/connected-school';
const LessonFormPage = dynamic(() => import('./school/lessons').then((m) => m.LessonFormPage), {
  loading: LoadingSkeleton,
});
const MemberDirectory = dynamic(
  () => import('./school/member-directory').then((m) => m.MemberDirectory),
  { loading: LoadingSkeleton },
);
const ExamEditor = dynamic(() => import('./school/exams').then((m) => m.ExamEditor), {
  loading: LoadingSkeleton,
});
const Exams = dynamic(() => import('./school/exams').then((m) => m.Exams), {
  loading: LoadingSkeleton,
});
const StudentExam = dynamic(() => import('./school/exams').then((m) => m.StudentExam), {
  loading: LoadingSkeleton,
});
const AssignmentDetail = dynamic(
  () => import('./school/learning').then((m) => m.AssignmentDetail),
  { loading: LoadingSkeleton },
);
const Assignments = dynamic(() => import('./school/learning').then((m) => m.Assignments), {
  loading: LoadingSkeleton,
});
const Schedule = dynamic(() => import('./school/learning').then((m) => m.Schedule), {
  loading: LoadingSkeleton,
});
const AssignmentFormPage = dynamic(
  () => import('./school/learning').then((m) => m.AssignmentFormPage),
  { loading: LoadingSkeleton },
);
const LessonDetail = dynamic(() => import('./school/lessons').then((m) => m.LessonDetail), {
  loading: LoadingSkeleton,
});
const ResourcesClasses = dynamic(() => import('./school/lessons').then((m) => m.ResourcesClasses), {
  loading: LoadingSkeleton,
});
const Classes = dynamic(() => import('./school/manager').then((m) => m.Classes), {
  loading: LoadingSkeleton,
});
const Enrollments = dynamic(() => import('./school/manager').then((m) => m.Enrollments), {
  loading: LoadingSkeleton,
});
const Guardians = dynamic(() => import('./school/manager').then((m) => m.Guardians), {
  loading: LoadingSkeleton,
});
const People = dynamic(() => import('./school/manager').then((m) => m.People), {
  loading: LoadingSkeleton,
});
const Teachers = dynamic(() => import('./school/manager').then((m) => m.Teachers), {
  loading: LoadingSkeleton,
});
const SubmissionFlow = dynamic(
  () => import('./school/submission-flow').then((m) => m.SubmissionFlow),
  { loading: LoadingSkeleton },
);
const ParentDaily = dynamic(() => import('./school/parent-daily').then((m) => m.ParentDaily), {
  loading: LoadingSkeleton,
});
const ClassDetail = dynamic(() => import('./school/class-detail').then((m) => m.ClassDetail), {
  loading: LoadingSkeleton,
});
const ParentClasses = dynamic(() => import('./school/class-detail').then((m) => m.ParentClasses), {
  loading: LoadingSkeleton,
});
const InvitationsPage = dynamic(
  () => import('./school/invitations').then((m) => m.InvitationsPage),
  { loading: LoadingSkeleton },
);
const ClassCreatePage = dynamic(
  () => import('./school/creation-pages').then((m) => m.ClassCreatePage),
  { loading: LoadingSkeleton },
);
const CatalogCreatePage = dynamic(
  () => import('./school/creation-pages').then((m) => m.CatalogCreatePage),
  { loading: LoadingSkeleton },
);
const PersonFormPage = dynamic(
  () => import('./school/creation-pages').then((m) => m.PersonFormPage),
  { loading: LoadingSkeleton },
);
const PersonDetailPage = dynamic(
  () => import('./school/creation-pages').then((m) => m.PersonDetailPage),
  { loading: LoadingSkeleton },
);
const SessionCreatePage = dynamic(
  () => import('./school/creation-pages').then((m) => m.SessionCreatePage),
  { loading: LoadingSkeleton },
);
const ExamCreatePage = dynamic(
  () => import('./school/creation-pages').then((m) => m.ExamCreatePage),
  { loading: LoadingSkeleton },
);
const GuardianCreatePage = dynamic(
  () => import('./school/creation-pages').then((m) => m.GuardianCreatePage),
  { loading: LoadingSkeleton },
);
const ClassMembersPage = dynamic(
  () => import('./school/creation-pages').then((m) => m.ClassMembersPage),
  { loading: LoadingSkeleton },
);
const QuestionCreatePage = dynamic(
  () => import('./school/creation-pages').then((m) => m.QuestionCreatePage),
  { loading: LoadingSkeleton },
);
const SessionPage = dynamic(() => import('./school/session-page').then((m) => m.SessionPage), {
  loading: LoadingSkeleton,
});
const ExamReviewPage = dynamic(() => import('./school/exam-review').then((m) => m.ExamReviewPage), {
  loading: LoadingSkeleton,
});
const AssignmentEvaluationQueue = dynamic(
  () => import('./school/assignment-evaluation').then((m) => m.AssignmentEvaluationQueue),
  { loading: LoadingSkeleton },
);
const AssignmentEvaluationPage = dynamic(
  () => import('./school/assignment-evaluation').then((m) => m.AssignmentEvaluationPage),
  { loading: LoadingSkeleton },
);
const ExamGradingQueue = dynamic(
  () => import('./school/exam-grading').then((m) => m.ExamGradingQueue),
  { loading: LoadingSkeleton },
);
const ExamGradingPage = dynamic(
  () => import('./school/exam-grading').then((m) => m.ExamGradingPage),
  { loading: LoadingSkeleton },
);
const AssessmentHistory = dynamic(
  () => import('./school/assessment-results').then((m) => m.AssessmentHistory),
  { loading: LoadingSkeleton },
);
const AssessmentResult = dynamic(
  () => import('./school/assessment-results').then((m) => m.AssessmentResult),
  { loading: LoadingSkeleton },
);
const AssignmentEditPage = dynamic(
  () => import('./school/assignment-editor').then((m) => m.AssignmentEditPage),
  { loading: LoadingSkeleton },
);
const ManagerHome = dynamic(() => import('./school/manager-home').then((m) => m.ManagerHome), {
  loading: LoadingSkeleton,
});
const ManagerClass = dynamic(() => import('./school/manager-class').then((m) => m.ManagerClass), {
  loading: LoadingSkeleton,
});
const ManagerReports = dynamic(
  () => import('./school/manager-reports').then((m) => m.ManagerReports),
  { loading: LoadingSkeleton },
);
const ManagerInvitations = dynamic(
  () => import('./school/manager-invitations').then((m) => m.ManagerInvitations),
  { loading: LoadingSkeleton },
);

type S = components['schemas'];
export function PersonalEducation({ section = [] }: { section?: string[] }) {
  const { session } = usePersonal();
  const active = session.context.workspaceType === 'Organization';
  const role = session.context.activeRole;
  const manager = role === 'Manager',
    teacher = role === 'Teacher',
    parent = role === 'Parent';
  const page = section[0] ?? 'overview';
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    tabsRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [page, manager]);
  const focused =
    (page === 'people' && !!section[1]) ||
    (page === 'exams' && !!section[1] && !teacher && !manager) ||
    section.some((part) =>
      [
        'new',
        'edit',
        'answer',
        'review',
        'receipt',
        'evaluate',
        'evaluation-review',
        'grading',
        'grading-review',
        'questions',
      ].includes(part),
    );
  const tabs = manager
    ? ([
        ['overview', uiText.text_ca3c4420b9b8, Building2],
        ['classes', uiText.text_e7b1ccd0bda3, BookOpen],
        ['members', uiText.text_102f79b3f87c, Users],
        ['guardians', uiText.text_d61b3d58a5e7, UserRoundCheck],
        ['invitations', uiText.text_016c18389868, Mail],
        ['reports', uiText.text_5dc634b07b21, ChartNoAxesCombined],
      ] as const)
    : ([
        ['overview', uiText.text_9a8e4bfdd18e, Building2],
        ['classes', uiText.text_e7b1ccd0bda3, BookOpen],
        ['schedule', uiText.text_82ec67c14936, CalendarDays],
        ['invitations', uiText.text_016c18389868, Mail],
      ] as const);
  const navigationPage =
    manager && ['people', 'members', 'teachers', 'students'].includes(page) ? 'members' : page;
  const navigation = (
    <nav
      ref={tabsRef}
      className={`${layout.navigation} ${manager ? layout.managerNavigation : ''}`}
      aria-label={uiText.text_589d5004f227}
    >
      {tabs.map(([key, title, Icon]) => (
        <Link
          key={key}
          href={key === 'overview' ? base : base + '/' + key}
          aria-current={navigationPage === key ? 'page' : undefined}
          aria-label={title}
        >
          <Icon size={20} />
          <span>{title}</span>
        </Link>
      ))}
    </nav>
  );
  if (!isSchoolPath(section)) return <ErrorState error={new ApiError(404)} />;
  if (section.length === 0 || (section.length === 1 && page === 'overview'))
    return (
      <ReferenceSchoolFrame>
        {navigation}
        {!active ? (
          <WorkspaceList />
        ) : !isSchoolRole(role) ? (
          <ErrorState error={new ApiError(403)} />
        ) : parent ? (
          <ParentSchool page="overview" />
        ) : manager ? (
          <ManagerHome />
        ) : (
          <SchoolOverview />
        )}
      </ReferenceSchoolFrame>
    );
  if (page === 'invitations')
    return (
      <div className={s.portal}>
        {navigation}
        {active && manager ? <ManagerInvitations /> : <InvitationsPage />}
      </div>
    );
  if (!active)
    return (
      <div className={s.portal}>
        {navigation}
        <SchoolHeading title={uiText.text_8fa4122032f4} description={uiText.text_13e372aa992c} />
        <WorkspaceList />
      </div>
    );
  if (!isSchoolRole(role)) return <ErrorState error={new ApiError(403)} />;
  if (page === 'search')
    return (
      <div className={s.portal}>
        <SchoolSearch />
      </div>
    );
  const allowed =
    tabs.some(([key]) => key === page) ||
    ['assignments', 'exams'].includes(page) ||
    ['submissions', 'exam-submissions'].includes(page) ||
    ((teacher || manager) && page === 'evaluations') ||
    (!parent && ['classes', 'lessons', 'resources', 'sessions'].includes(page)) ||
    (manager &&
      [
        'people',
        'members',
        'teachers',
        'students',
        'guardians',
        'courses',
        'periods',
        'reports',
      ].includes(page));
  return (
    <div className={s.portal} key={session.revision}>
      {!focused && !(page === 'classes' && section[1]) && navigation}
      {!allowed ? (
        <ErrorState error={new ApiError(403)} />
      ) : page === 'evaluations' ? (
        <AssignmentEvaluationQueue />
      ) : page === 'submissions' ? (
        section[2] === 'result' ? (
          <AssessmentResult id={section[1]} />
        ) : (
          <AssignmentEvaluationPage id={section[1]} review={section[2] === 'evaluation-review'} />
        )
      ) : page === 'exam-submissions' ? (
        section[2] === 'result' ? (
          <AssessmentResult id={section[1]} exam />
        ) : (
          <ExamGradingPage
            id={section[1]}
            review={section[2] === 'grading-review'}
            questionId={section[2] === 'questions' ? section[3] : undefined}
          />
        )
      ) : page === 'assignments' && section[2] === 'evaluations' ? (
        <AssignmentEvaluationQueue assignmentId={section[1]} />
      ) : page === 'assignments' && ['edit', 'publish-review'].includes(section[2]) ? (
        <AssignmentEditPage id={section[1]} publish={section[2] === 'publish-review'} />
      ) : ['assignments', 'exams'].includes(page) && section[2] === 'history' ? (
        <AssessmentHistory id={section[1]} exam={page === 'exams'} />
      ) : page === 'exams' && section[2] === 'grading' ? (
        <ExamGradingQueue examId={section[1]} />
      ) : page === 'classes' && section[1] === 'new' ? (
        <ClassCreatePage />
      ) : (page === 'courses' || page === 'periods') && section[1] === 'new' ? (
        <CatalogCreatePage kind={page} />
      ) : page === 'people' && section[1] ? (
        section[1] === 'new' ? (
          <PersonFormPage />
        ) : section[2] === 'edit' ? (
          <PersonFormPage id={section[1]} />
        ) : (
          <PersonDetailPage id={section[1]} />
        )
      ) : page === 'guardians' && section[1] === 'new' ? (
        <GuardianCreatePage />
      ) : page === 'sessions' && section[1] ? (
        <SessionPage id={section[1]} edit={section[2] === 'edit'} />
      ) : page === 'exams' && section[2] === 'review' ? (
        <ExamReviewPage id={section[1]} />
      ) : page === 'exams' && section[2] === 'questions' ? (
        <QuestionCreatePage id={section[1]} />
      ) : page === 'classes' && section[2] === 'members' ? (
        <ClassMembersPage classId={section[1]} kind="all" />
      ) : page === 'classes' && section[3] === 'new' && section[2] === 'sessions' ? (
        <SessionCreatePage classId={section[1]} />
      ) : page === 'classes' && section[3] === 'new' && section[2] === 'exams' ? (
        <ExamCreatePage classId={section[1]} />
      ) : page === 'classes' &&
        section[3] === 'new' &&
        ['enrollments', 'teachers'].includes(section[2]) ? (
        <ClassMembersPage
          classId={section[1]}
          kind={section[2] === 'teachers' ? 'teachers' : 'learners'}
        />
      ) : parent ? (
        <ParentSchool page={page} classId={section[1]} />
      ) : page === 'overview' ? (
        manager ? (
          <ManagerHome />
        ) : (
          <SchoolOverview />
        )
      ) : page === 'reports' && manager ? (
        <ManagerReports />
      ) : page === 'classes' && section[1] ? (
        section[2] === 'lessons' && section[3] === 'new' ? (
          <LessonFormPage classId={section[1]} />
        ) : section[2] === 'assignments' && section[3] === 'new' ? (
          <AssignmentFormPage classId={section[1]} />
        ) : manager ? (
          <ManagerClass id={section[1]} />
        ) : (
          <ClassDetail id={section[1]} manager={false} teacher={teacher} />
        )
      ) : page === 'classes' ? (
        <Classes manage={manager} />
      ) : page === 'people' && manager ? (
        <People />
      ) : page === 'teachers' && manager ? (
        <Teachers />
      ) : page === 'members' && manager ? (
        <MemberDirectory />
      ) : page === 'students' && manager ? (
        <>
          <MemberDirectory initialRole="Student" />
          <Enrollments />
        </>
      ) : page === 'guardians' && manager ? (
        <Guardians />
      ) : page === 'lessons' && section[1] ? (
        section[2] === 'edit' ? (
          <LessonFormPage id={section[1]} />
        ) : (
          <LessonDetail
            id={section[1]}
            teach={teacher || manager}
            review={section[2] === 'review'}
          />
        )
      ) : page === 'assignments' && section[1] ? (
        section[2] === 'answer' || section[2] === 'review' || section[2] === 'receipt' ? (
          <SubmissionFlow id={section[1]} stage={section[2]} />
        ) : (
          <AssignmentDetail id={section[1]} teach={teacher || manager} />
        )
      ) : page === 'assignments' ? (
        <Assignments teach={teacher || manager} />
      ) : page === 'exams' && section[1] ? (
        section[2] === 'edit' ? (
          teacher || manager ? (
            <ExamEditor id={section[1]} />
          ) : (
            <ErrorState error={new ApiError(403)} />
          )
        ) : (
          <StudentExam id={section[1]} />
        )
      ) : page === 'exams' ? (
        <Exams teach={teacher || manager} />
      ) : page === 'schedule' ? (
        <>
          <SchoolHeading title={uiText.text_0465a6813992} />
          <Schedule teach={teacher || manager} />
        </>
      ) : (
        <ResourcesClasses />
      )}
    </div>
  );
}
function WorkspaceList() {
  const { selectWorkspace } = usePersonal();
  const q = useWorkspaceSnapshot();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const organizations = visibleWorkspaces(q.data).filter((w) => w.workspaceType === 'Organization');
  return (
    <>
      {organizations.length ? (
        <div className={s.grid}>
          {organizations.map((w) => (
            <div key={w.membershipId + ':' + w.role} className={s.classCard}>
              <Building2 size={28} />
              <h2>{w.organizationName}</h2>
              <p>{label(w.role ?? '')}</p>
              <Button
                disabled={busy || !canEnterWorkspace(w)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await selectWorkspace({
                      workspaceType: 'Organization',
                      membershipId: w.membershipId,
                      role: w.role,
                    });
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {uiText.text_0cff2209b91a}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState title={uiText.text_aa11114d1a2f} description={uiText.text_d738b763f126} />
        </Card>
      )}
      {!!error && <ErrorState error={error} />}
    </>
  );
}
function SchoolOverview() {
  return <SchoolFeed />;
}
function ParentSchool({ page, classId }: { page: string; classId?: string }) {
  const { session, call, reload } = usePersonal();
  const children = usePersonalApi<S['AuthorizedChildResult'][]>('/api/v1/guardian/children', {
    poll: 5000,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [pendingId, setPendingId] = useState<string>();
  const selectionLock = useRef(false);
  const active = children.isSuccess
    ? children.data?.find(
        (child) =>
          child.organizationId === session.context.organizationId &&
          child.learnerOrganizationPersonId === session.context.subjectOrganizationPersonId &&
          child.relationStatus === 'Active',
      )
    : undefined;
  return (
    <>
      <ChildSelector
        children={
          children.data?.filter(
            (child) => child.organizationId === session.context.organizationId,
          ) ?? []
        }
        active={active}
        pendingId={pendingId}
        busy={busy}
        loading={children.isPending}
        error={children.error ?? error}
        onRetry={() => {
          setError(undefined);
          void children.refetch();
        }}
        onSelect={async (id) => {
          if (selectionLock.current || id === active?.learnerOrganizationPersonId) return;
          const child = children.data?.find(
            (c) =>
              c.learnerOrganizationPersonId === id &&
              c.organizationId === session.context.organizationId &&
              c.relationStatus === 'Active',
          );
          if (!child) return;
          selectionLock.current = true;
          setBusy(true);
          setPendingId(id);
          setError(undefined);
          try {
            await call('/api/v1/guardian/children/' + id + '/select', { method: 'POST' });
            await reload();
          } catch (e) {
            if (!(e instanceof Error && e.name === 'AbortError')) setError(e);
          } finally {
            selectionLock.current = false;
            setBusy(false);
            setPendingId(undefined);
          }
        }}
      />
      {['assignments', 'exams'].includes(page) && (
        <SchoolHeading
          title={
            page === 'overview'
              ? uiText.text_14130edb2ced
              : page === 'assignments'
                ? uiText.text_5a73fd9b2b49
                : uiText.text_960478099184
          }
          description={uiText.text_77c36f68bc81}
        />
      )}

      {busy ? (
        <LoadingSkeleton />
      ) : (
        active &&
        (page === 'classes' ? (
          <ParentClasses id={classId} />
        ) : page === 'schedule' ? (
          <Schedule teach={false} />
        ) : page === 'overview' ? (
          <ParentDaily child={active} />
        ) : (
          <ParentReports
            key={session.revision + page}
            kind={page === 'assignments' ? 'assignments' : 'exams'}
          />
        ))
      )}
    </>
  );
}
function ParentReports({ kind }: { kind: 'assignments' | 'exams' }) {
  const [page, setPage] = useState(1);
  const q = usePersonalApi<
    S['ReportPageOfParentAssignmentReportItem'] | S['ReportPageOfParentExamReportItem']
  >(`/api/v1/reports/parent/${kind}?PageNumber=${page}&PageSize=30`);
  return (
    <Card title={kind === 'assignments' ? uiText.text_813016dea0b5 : uiText.text_58bde8323225}>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.length ? (
            <div className={s.editorList}>
              {q.data.items.map((item, index) => (
                <div className={s.question} key={index}>
                  <h3>{item.title}</h3>
                  <p className={s.hint}>{item.classTitle}</p>
                  <p>
                    {'submissionStatus' in item
                      ? item.submissionStatus
                        ? label(item.submissionStatus)
                        : uiText.text_2675dd46965d
                      : item.latestAttemptStatus
                        ? label(item.latestAttemptStatus)
                        : uiText.text_8b56533a0281}
                  </p>
                  <p>
                    {uiText.text_faeb420f283e}{' '}
                    {item.releasedScore === null
                      ? uiText.text_0765fd5b5dc0
                      : item.releasedScore + uiText.text_a624a1e41ffd + item.maximumScore}
                  </p>
                  {item.guardianVisibleFeedback && (
                    <p className={s.bodyText}>{item.guardianVisibleFeedback}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={uiText.text_248322604318} />
          )}
          <Pager page={page} total={q.data.totalCount} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
