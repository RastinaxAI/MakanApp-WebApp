import { ids, id, make } from './state.mjs';
// An explicitly seeded local fixture, never a proxy or fallback for production.
export function seedAssessments(state) {
  const fileData = Buffer.from('%PDF-fixture\n');
  const attachment = make('SubmissionAttachmentResult', {
    fileAssetId: id(940),
    originalFileName: 'پاسخ.pdf',
    contentType: 'application/pdf',
    sizeBytes: fileData.length,
    fileStatus: 'Ready',
  });
  const submission = make('SubmissionForEvaluationResult', {
    submissionAttemptId: ids.attempt,
    assignmentId: ids.assignment,
    assignmentVersionId: id(931),
    classId: ids.class,
    assignmentTitle: 'تکلیف ارزیابی آزمایشی',
    studentDisplayName: 'دانش‌آموز آزمایشی',
    attemptNumber: 1,
    isLate: false,
    maxScore: 20,
    answerText: 'پاسخ کامل دانش‌آموز برای ارزیابی',
    attachments: [attachment],
  });
  state.assessments = {
    submission,
    evaluation: null,
    releasedEvaluation: null,
    grade: null,
    releasedGrade: null,
  };
  state.files.set(id(940), {
    asset: make('FileAssetResult', {
      id: id(940),
      organizationId: ids.org,
      uploadedByUserId: id(101),
      originalFileName: 'پاسخ.pdf',
      contentType: 'application/pdf',
      sizeBytes: fileData.length,
      status: 'Ready',
    }),
    data: fileData,
  });
}
export function seedAssignmentDraft(state) {
  seedAssessments(state);
  state.assessments.assignment = make('AssignmentResult', {
    id: ids.assignment,
    organizationId: ids.org,
    classId: ids.class,
    classTitle: 'کلاس نمونه',
    status: 'Draft',
    versionId: id(931),
    versionNumber: 1,
    title: 'پیش‌نویس تکلیف',
    description: 'شرح پیش‌نویس',
    dueAtUtc: '2099-01-01T10:00:00Z',
    allowLateSubmission: false,
    maxAttempts: 1,
    maxScore: 20,
    assignmentRowVersion: '1',
    versionRowVersion: '1',
  });
}
export function assessmentRoute({ state, url, body, auth, req, send }) {
  const a = state.assessments;
  if (!a) return false;
  const p = url.pathname,
    author = ['Teacher', 'Manager'].includes(auth.context.activeRole),
    parent = auth.context.activeRole === 'Parent';
  if (!/\/academic\/(evaluations|submission-attempts|exam-attempts|exams|assignments)/.test(p))
    return false;
  const authorized = () =>
    auth.context.workspaceType === 'Organization' && auth.context.organizationId === ids.org;
  const deny = () => send({ code: 'NOT_FOUND' }, 404);
  const changeVersion = (row) => {
    row.rowVersion = String(Number(row.rowVersion) + 1);
  };
  if (
    a.assignment &&
    (p === `/api/v1/academic/assignments/${ids.assignment}` ||
      p === `/api/v1/academic/assignments/${ids.assignment}/publish`)
  ) {
    const v = a.assignment;
    if (!authorized() || (!author && v.status === 'Draft')) return deny();
    if (req.method === 'GET') return send(v);
    if (
      !author ||
      v.status !== 'Draft' ||
      body.expectedAssignmentRowVersion !== v.assignmentRowVersion ||
      body.expectedVersionRowVersion !== v.versionRowVersion
    )
      return send({ code: 'VERSION_CONFLICT' }, 409);
    if (p.endsWith('/publish')) v.status = 'Published';
    else Object.assign(v, body);
    v.assignmentRowVersion = String(Number(v.assignmentRowVersion) + 1);
    v.versionRowVersion = String(Number(v.versionRowVersion) + 1);
    return send(
      p.endsWith('/publish')
        ? make('PublishAssignmentResult', { assignment: v, recipientCount: 1 })
        : v,
    );
  }
  if (p === '/api/v1/academic/evaluations/queue') {
    if (!authorized() || !author) return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    const value = a.evaluation,
      status = value
        ? value.status === 'Draft' && value.supersedesEvaluationRevisionId
          ? 'CorrectionDraft'
          : value.status
        : 'AwaitingEvaluation';
    const filter = url.searchParams.get('reviewStatus');
    if (
      (url.searchParams.has('assignmentId') &&
        url.searchParams.get('assignmentId') !== ids.assignment) ||
      (filter && filter !== status) ||
      url.searchParams.get('isLate') === 'true'
    )
      return send([]);
    return send([
      make('EvaluationQueueItemResult', {
        ...a.submission,
        reviewStatus: status,
        evaluationRevisionNumber: value?.revisionNumber ?? null,
        score: value?.score ?? null,
      }),
    ]);
  }
  if (p === `/api/v1/academic/assignments/${ids.assignment}/attempts/me`) {
    if (!authorized() || auth.role !== 'Student') return deny();
    return send([
      make('SubmissionAttemptResult', {
        id: ids.attempt,
        assignmentId: ids.assignment,
        assignmentVersionId: id(931),
        organizationId: ids.org,
        classId: ids.class,
        attemptNumber: 1,
        answerText: a.submission.answerText,
        status: 'Submitted',
        contentVisible: true,
        attachments: a.submission.attachments,
        rowVersion: '1',
      }),
    ]);
  }
  if (p === `/api/v1/academic/exams/${ids.exam}/attempts/me`)
    return authorized() && auth.role === 'Student'
      ? send([
          make('StudentExamAttemptSummaryDto', {
            examAttemptId: ids.examAttempt,
            examVersionId: id(932),
            attemptNumber: 1,
            status: 'Finalized',
          }),
        ])
      : deny();
  if (p === `/api/v1/academic/exams/${ids.exam}/grading`) {
    if (!authorized() || !author) return deny();
    const status = a.grade
      ? a.grade.status === 'Draft' && a.grade.supersedesExamGradeRevisionId
        ? 'CorrectionDraft'
        : a.grade.status
      : 'AwaitingGrading';
    if (url.searchParams.has('status') && url.searchParams.get('status') !== status)
      return send([]);
    return send([
      make('ExamGradingQueueItemDto', {
        examAttemptId: ids.examAttempt,
        examId: ids.exam,
        examVersionId: id(932),
        classId: ids.class,
        examTitle: 'آزمون ارزیابی آزمایشی',
        studentDisplayName: 'دانش‌آموز آزمایشی',
        attemptNumber: 1,
        maximumScore: 20,
        status,
        gradeRevisionNumber: a.grade?.revisionNumber ?? null,
        requiresManualReview: true,
      }),
    ]);
  }
  const match = /^\/api\/v1\/academic\/(submission-attempts|exam-attempts)\/([^/]+)\/(.+)$/.exec(p);
  if (!match) return false;
  const [, kind, attempt, action] = match;
  if (!/^(evaluation|result|guardian-result|grading|grade)/.test(action)) return false;
  if (!authorized() || attempt !== (kind === 'submission-attempts' ? ids.attempt : ids.examAttempt))
    return deny();
  if (action === 'result' || action === 'guardian-result') {
    if (
      action === 'result'
        ? auth.role !== 'Student'
        : !parent || auth.context.subjectOrganizationPersonId !== id(501)
    )
      return deny();
    const guardian = action === 'guardian-result';
    if (kind === 'submission-attempts') {
      const v = a.releasedEvaluation;
      if (!v) return send({ code: 'RESULT_NOT_RELEASED' }, 404);
      return send(
        make(guardian ? 'ParentReleasedResult' : 'StudentReleasedResult', {
          submissionAttemptId: ids.attempt,
          assignmentId: ids.assignment,
          assignmentVersionId: id(931),
          evaluationRevisionNumber: v.revisionNumber,
          score: v.score,
          maxScore: 20,
          ...(guardian
            ? { guardianVisibleFeedback: v.guardianVisibleFeedback }
            : { learnerFeedback: v.learnerFeedback }),
          releasedAtUtc: v.releasedAtUtc,
        }),
      );
    }
    const g = a.releasedGrade;
    return send(
      make(guardian ? 'GuardianExamResultDto' : 'StudentExamResultDto', {
        examAttemptId: ids.examAttempt,
        examId: ids.exam,
        examVersionId: id(932),
        attemptNumber: 1,
        releaseStatus: g ? 'Released' : a.grade ? 'AwaitingRelease' : 'AwaitingGrading',
        gradeRevisionNumber: g?.revisionNumber ?? null,
        score: g?.totalScore ?? null,
        maximumScore: g ? 20 : null,
        releasedAtUtc: g?.releasedAtUtc ?? null,
        ...(guardian
          ? { guardianVisibleFeedback: g?.guardianVisibleFeedback ?? null }
          : { learnerFeedback: g?.learnerFeedback ?? null }),
      }),
    );
  }
  if (!author) return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
  if (kind === 'submission-attempts') {
    if (action === 'evaluation/submission') return send(a.submission);
    if (action === 'evaluation' && req.method === 'GET')
      return a.evaluation ? send(a.evaluation) : deny();
    if (action === 'evaluation' && req.method === 'PUT') {
      if (
        (a.evaluation &&
          (a.evaluation.status !== 'Draft' ||
            body.expectedRowVersion !== a.evaluation.rowVersion)) ||
        (!a.evaluation && body.expectedRowVersion !== null)
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      if (!Number.isFinite(body.score) || body.score < 0 || body.score > 20)
        return send({ code: 'VALIDATION_FAILED' }, 400);
      a.evaluation = make('EvaluatorEvaluationResult', {
        ...a.evaluation,
        ...body,
        id: a.evaluation?.id ?? id(933),
        submissionAttemptId: ids.attempt,
        maxScore: 20,
        revisionNumber: a.evaluation?.revisionNumber ?? 1,
        status: 'Draft',
        rowVersion: String(Number(a.evaluation?.rowVersion ?? 0) + 1),
      });
      return send(a.evaluation);
    }
    if (action === 'evaluation/release') {
      const v = a.evaluation;
      if (!v || v.status !== 'Draft' || body.expectedRowVersion !== v.rowVersion)
        return send({ code: 'VERSION_CONFLICT' }, 409);
      v.status = 'Released';
      v.releasedAtUtc = new Date().toISOString();
      changeVersion(v);
      a.releasedEvaluation = { ...v };
      return send(
        make('GradeReleaseResult', {
          submissionAttemptId: ids.attempt,
          evaluationRevisionId: v.id,
          revisionNumber: v.revisionNumber,
          score: v.score,
          releasedAtUtc: v.releasedAtUtc,
          evaluationRowVersion: v.rowVersion,
        }),
      );
    }
    if (action === 'evaluation/corrections') {
      const old = a.evaluation;
      if (
        !old ||
        old.status !== 'Released' ||
        old.rowVersion !== body.expectedReleasedEvaluationRowVersion ||
        !body.correctionReason?.trim()
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      a.evaluation = make('EvaluatorEvaluationResult', {
        ...old,
        ...body,
        id: id(934),
        supersedesEvaluationRevisionId: old.id,
        status: 'Draft',
        revisionNumber: old.revisionNumber + 1,
        rowVersion: '1',
        releasedAtUtc: null,
      });
      return send(a.evaluation, 201);
    }
  } else {
    if (action === 'grading' && req.method === 'POST') {
      a.grade ??= make('ExamGradeDto', {
        examGradeRevisionId: id(935),
        examAttemptId: ids.examAttempt,
        examId: ids.exam,
        examVersionId: id(932),
        classId: ids.class,
        examTitle: 'آزمون ارزیابی آزمایشی',
        studentDisplayName: 'دانش‌آموز آزمایشی',
        attemptNumber: 1,
        revisionNumber: 1,
        totalScore: 0,
        maximumScore: 20,
        status: 'Draft',
        rowVersion: '1',
        questions: [
          make('ExamQuestionGradeDto', {
            examAttemptQuestionId: ids.question,
            questionVersionId: id(936),
            displayOrder: 1,
            questionType: 'Descriptive',
            prompt: 'روش حل مسئله را توضیح دهید.',
            isAnswered: true,
            textAnswer: 'راه حل دانش‌آموز',
            attachments:
              state.examAnswers.find((a) => a.examAttemptQuestionId === ids.question)
                ?.attachments ?? [],
            awardedScore: 0,
            maximumScore: 20,
            gradingMode: 'Manual',
            isReviewed: false,
          }),
        ],
      });
      return send(a.grade);
    }
    if (action === 'grading' && req.method === 'GET') return a.grade ? send(a.grade) : deny();
    if (!a.grade) return deny();
    const g = a.grade;
    if (action.startsWith('grading/questions/') && req.method === 'PATCH') {
      if (
        g.status !== 'Draft' ||
        body.expectedGradeRowVersion !== g.rowVersion ||
        action.split('/').at(-1) !== ids.question
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      if (!Number.isFinite(body.awardedScore) || body.awardedScore < 0 || body.awardedScore > 20)
        return send({ code: 'VALIDATION_FAILED' }, 400);
      Object.assign(g.questions[0], { ...body, isReviewed: true });
      g.totalScore = body.awardedScore;
      changeVersion(g);
      return send(g);
    }
    if (action === 'grading/complete') {
      if (
        g.status !== 'Draft' ||
        body.expectedGradeRowVersion !== g.rowVersion ||
        !g.questions.every((q) => q.isReviewed)
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      Object.assign(g, { ...body, status: 'ReadyForRelease' });
      changeVersion(g);
      return send(g);
    }
    if (action === 'grade/release') {
      if (g.status !== 'ReadyForRelease' || g.rowVersion !== body.expectedGradeRowVersion)
        return send({ code: 'VERSION_CONFLICT' }, 409);
      g.status = 'Released';
      g.releasedAtUtc = new Date().toISOString();
      changeVersion(g);
      a.releasedGrade = structuredClone(g);
      return send(
        make('ExamGradeReleaseDto', {
          examAttemptId: ids.examAttempt,
          examGradeRevisionId: g.examGradeRevisionId,
          gradeRevisionNumber: g.revisionNumber,
          totalScore: g.totalScore,
          maximumScore: 20,
          releasedAtUtc: g.releasedAtUtc,
          gradeRowVersion: g.rowVersion,
        }),
      );
    }
    if (action === 'grade/corrections') {
      if (
        g.status !== 'Released' ||
        body.expectedReleasedGradeRowVersion !== g.rowVersion ||
        !body.correctionReason?.trim()
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      a.grade = make('ExamGradeDto', {
        ...g,
        ...body,
        examGradeRevisionId: id(937),
        supersedesExamGradeRevisionId: g.examGradeRevisionId,
        status: 'Draft',
        releasedAtUtc: null,
        rowVersion: '1',
        revisionNumber: g.revisionNumber + 1,
      });
      return send(a.grade, 201);
    }
  }
  return deny();
}
