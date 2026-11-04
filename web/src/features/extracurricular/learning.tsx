'use client';
import Link from 'next/link';
import { useState } from 'react';
import { integration80c as t } from '@/content/fa';
import { usePersonalApi } from '@/features/personal/provider';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { AcademicScope } from '@/features/personal/school/academic-scope';
import { AssignmentFormPage, AssignmentDetail } from '@/features/personal/school/learning';
import { AssignmentEditPage } from '@/features/personal/school/assignment-editor';
import { ExamEditor, StudentExam } from '@/features/personal/school/exams';
import { ExamCreatePage, QuestionCreatePage } from '@/features/personal/school/creation-pages';
import { ExamReviewPage } from '@/features/personal/school/exam-review';
import { SubmissionFlow } from '@/features/personal/school/submission-flow';
import {
  AssignmentEvaluationQueue,
  AssignmentEvaluationPage,
} from '@/features/personal/school/assignment-evaluation';
import { ExamGradingQueue, ExamGradingPage } from '@/features/personal/school/exam-grading';
import { AssessmentHistory, AssessmentResult } from '@/features/personal/school/assessment-results';
import { Pager } from '@/features/personal/school/shared';
import { StaticConnectedFrame } from './frame';
import { academicCapabilities, classApi, classBase, type S } from './api-model';

export function IndependentLearning({ classId, section }: { classId: string; section: string[] }) {
  const q = usePersonalApi<S['PersonalClassDto']>(`${classApi}/${classId}`, { poll: 10000 });
  const [area, id, stage, detail] = section;
  const capabilities = q.data ? academicCapabilities(q.data) : null;
  const author = area === 'assignments' ? capabilities?.assignments : capabilities?.exams;
  const grading =
    ['submissions', 'exam-submissions', 'evaluations'].includes(area) ||
    ['submissions', 'evaluations', 'grading'].includes(stage);
  const editing =
    id === 'new' ||
    (['edit', 'questions', 'publish-review', 'review'].includes(stage) &&
      !(area === 'assignments' && stage === 'review'));
  const denied = grading ? !capabilities?.grade : editing ? !author : false;
  let content;
  if (q.isPending) content = <LoadingSkeleton />;
  else if (q.isError) content = <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  else if (!capabilities || denied) content = <ErrorState error={new ApiError(403)} />;
  else {
    const base = `${classBase}/classes/${classId}`;
    if (area === 'learning')
      content = (
        <div className="list">
          <Link className="row" href={base + '/assignments'}>
            {t.assignments}
          </Link>
          <Link className="row" href={base + '/exams'}>
            {t.exams}
          </Link>
        </div>
      );
    else if (area === 'evaluations') content = <AssignmentEvaluationQueue />;
    else if (area === 'submissions')
      content =
        stage === 'result' ? (
          <AssessmentResult id={id} />
        ) : (
          <AssignmentEvaluationPage id={id} review={stage === 'evaluation-review'} />
        );
    else if (area === 'exam-submissions')
      content =
        stage === 'result' ? (
          <AssessmentResult id={id} exam />
        ) : (
          <ExamGradingPage
            id={id}
            questionId={stage === 'questions' ? detail : undefined}
            review={stage === 'grading-review'}
          />
        );
    else if (!id)
      content = <AcademicList classId={classId} exam={area === 'exams'} canAuthor={!!author} />;
    else if (area === 'assignments')
      content =
        id === 'new' ? (
          <AssignmentFormPage classId={classId} />
        ) : stage === 'edit' || stage === 'publish-review' ? (
          <AssignmentEditPage id={id} publish={stage === 'publish-review'} />
        ) : ['answer', 'review', 'receipt'].includes(stage) ? (
          capabilities.ownResults ? (
            <SubmissionFlow id={id} stage={stage as 'answer' | 'review' | 'receipt'} />
          ) : (
            <ErrorState error={new ApiError(403)} />
          )
        ) : ['evaluations', 'submissions'].includes(stage) ? (
          <AssignmentEvaluationQueue assignmentId={id} />
        ) : stage === 'history' ? (
          <AssessmentHistory id={id} />
        ) : (
          <AssignmentDetail id={id} teach={capabilities.assignments || capabilities.grade} />
        );
    else
      content =
        id === 'new' ? (
          <ExamCreatePage classId={classId} />
        ) : stage === 'questions' ? (
          <QuestionCreatePage id={id} />
        ) : ['review', 'publish-review'].includes(stage) ? (
          <ExamReviewPage id={id} />
        ) : ['grading', 'submissions'].includes(stage) ? (
          <ExamGradingQueue examId={id} />
        ) : stage === 'history' ? (
          <AssessmentHistory id={id} exam />
        ) : stage === 'edit' || capabilities.exams ? (
          <ExamEditor id={id} />
        ) : capabilities.ownResults ? (
          <StudentExam id={id} />
        ) : (
          <ErrorState error={new ApiError(403)} />
        );
    content = <AcademicScope value={{ classId, ...capabilities }}>{content}</AcademicScope>;
  }
  return (
    <StaticConnectedFrame
      id={area === 'exams' ? 'MK-66' : 'MK-44'}
      title={q.data?.title ?? t.learning}
    >
      {content}
    </StaticConnectedFrame>
  );
}
function AcademicList({
  classId,
  exam,
  canAuthor,
}: {
  classId: string;
  exam: boolean;
  canAuthor: boolean;
}) {
  const [page, setPage] = useState(1),
    area = exam ? 'exams' : 'assignments',
    base = `${classBase}/classes/${classId}/${area}`;
  const q = usePersonalApi<
    S['AcademicPageOfAssignmentResult'] | S['AcademicPageOfStudentExamSummary']
  >(`/api/v1/academic/personal-classes/${classId}/${area}?Page=${page}&PageSize=30`);
  if (
    q.isSuccess &&
    q.data.items.some((v) => v.classRef?.kind !== 'PersonalClass' || v.classRef.classId !== classId)
  )
    return <ErrorState error={new ApiError(502)} />;
  return (
    <>
      {canAuthor && (
        <Link className="btn" href={base + '/new'}>
          {exam ? t.authorExams : t.authorAssignments}
        </Link>
      )}
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {q.data.items.map((v) => (
            <Link className="card" key={v.id} href={base + '/' + v.id}>
              <h3>{v.title}</h3>
              <p>{v.description}</p>
            </Link>
          ))}
          {!q.data.items.length && <p>{t.noItems}</p>}
          <Pager page={page} total={q.data.totalCount ?? q.data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
