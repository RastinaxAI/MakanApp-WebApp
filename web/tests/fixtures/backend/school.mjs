import { ids, id, make, sample, schemas, paged, classRow, assignment } from './state.mjs';
import { referenceDashboard } from './design-case.mjs';
export function schoolRoute({ state, url, body, auth, send, req }) {
  const p = url.pathname,
    role = auth.context.activeRole;
  const lessonAttachments = (fileIds = []) => {
    const assets = fileIds.map((id) => state.files.get(id)?.asset);
    if (
      assets.some(
        (a) =>
          !a ||
          a.status !== 'Ready' ||
          a.uploadedByUserId !== auth.user.id ||
          a.organizationId !== auth.context.organizationId,
      )
    )
      return null;
    return assets.map((a) =>
      make('LessonAttachmentResult', {
        fileAssetId: a.id,
        fileName: a.originalFileName,
        contentType: a.contentType,
        sizeBytes: a.sizeBytes,
        status: a.status,
        isAvailable: true,
        downloadUrl: null,
      }),
    );
  };
  if (
    !p.startsWith('/api/v1/academic/') &&
    !p.startsWith('/api/v1/organization/') &&
    !p.startsWith('/api/v1/dashboards/')
  )
    return false;
  if (auth.context.workspaceType !== 'Organization')
    return send({ code: 'ORGANIZATION_WORKSPACE_REQUIRED' }, 403);
  if (p === '/api/v1/academic/classes') {
    if (req.method === 'POST' && role !== 'Manager')
      return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    return send(
      req.method === 'POST' ? { ...classRow(), ...body } : (state.designClasses ?? [classRow()]),
    );
  }
  if (p.startsWith('/api/v1/dashboards/')) {
    if (role === 'Parent' && state.parentChildren) {
      const child = state.parentChildren.find(
        (c) =>
          c.learnerOrganizationPersonId === auth.context.subjectOrganizationPersonId &&
          c.organizationId === auth.context.organizationId &&
          c.relationStatus === 'Active',
      );
      return send({
        ...referenceDashboard(role, auth.context),
        selectedLearner: child
          ? {
              learnerOrganizationPersonId: child.learnerOrganizationPersonId,
              displayName: child.displayName,
            }
          : null,
      });
    }
    return send(
      state.dashboardOverrides[role] ??
        (state.design
          ? referenceDashboard(role, auth.context)
          : make(role + 'DashboardDto', { organizationId: ids.org })),
    );
  }
  if (p === '/api/v1/academic/schedule')
    return send(
      state.schedule.filter(
        (row) =>
          Date.parse(row.startUtc) >= Date.parse(url.searchParams.get('fromUtc')) &&
          Date.parse(row.startUtc) <= Date.parse(url.searchParams.get('toUtc')),
      ),
    );
  if (p === '/api/v1/academic/courses')
    return send(
      paged(
        'SchoolPageOfCourseResult',
        [make('CourseResult', { id: id(12), title: 'ریاضی', organizationId: ids.org })],
        url,
      ),
    );
  if (p === '/api/v1/academic/periods')
    return send(
      paged(
        'SchoolPageOfAcademicPeriodResult',
        [
          make('AcademicPeriodResult', {
            id: id(13),
            title: 'دورهٔ نمونه',
            organizationId: ids.org,
          }),
        ],
        url,
      ),
    );
  if (p === '/api/v1/organization/members')
    return role === 'Manager'
      ? send(paged('SchoolPageOfSchoolMemberResult', [], url))
      : send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
  if (p === '/api/v1/organization/people') return send(paged('OrganizationPeoplePage', [], url));
  if (p.endsWith('/learners') || p.endsWith('/teachers'))
    return send(
      paged(
        p.endsWith('/learners')
          ? 'SchoolPageOfClassLearnerResult'
          : 'SchoolPageOfClassTeacherResult',
        [],
        url,
      ),
    );
  if (p === `/api/v1/academic/classes/${ids.class}/lessons`) {
    if (req.method === 'POST') {
      if (!['Teacher', 'Manager'].includes(role))
        return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
      const existing = [...state.lessons.values()].find(
        (l) => l.clientOperationId === body.clientOperationId,
      );
      if (existing) return send(existing);
      const attachments = lessonAttachments(body.fileAssetIds);
      if (!attachments) return send({ code: 'FILE_NOT_AVAILABLE' }, 409);
      const row = make('ClassLessonResult', {
        ...body,
        id: id(2000 + state.lessons.size),
        organizationId: ids.org,
        classId: ids.class,
        title: body.title,
        body: body.body ?? '',
        status: 'Draft',
        version: '1',
        attachments,
      });
      state.lessons.set(row.id, row);
      return send(row, 201);
    }
    return send(
      paged(
        'SchoolPageOfClassLessonResult',
        [...state.lessons.values()].filter((l) => role !== 'Student' || l.status === 'Published'),
        url,
      ),
    );
  }
  if (p.startsWith('/api/v1/academic/lessons/')) {
    const lid = p.split('/')[5],
      l = state.lessons.get(lid);
    if (!l || role === 'Parent' || (role === 'Student' && l.status !== 'Published'))
      return send({ code: 'LESSON_NOT_FOUND' }, 404);
    if (req.method !== 'GET') {
      if (!['Teacher', 'Manager'].includes(role) || l.status !== 'Draft')
        return send({ code: 'LESSON_IMMUTABLE' }, 409);
      if (body.expectedVersion !== l.version) return send({ code: 'VERSION_CONFLICT' }, 409);
      if (p.endsWith('/publish')) {
        l.status = 'Published';
        l.version = String(Number(l.version) + 1);
      } else {
        const attachments = lessonAttachments(body.fileAssetIds);
        if (!attachments) return send({ code: 'FILE_NOT_AVAILABLE' }, 409);
        Object.assign(l, body, {
          body: body.body ?? '',
          attachments,
          version: String(Number(l.version) + 1),
        });
      }
    }
    return send(l);
  }
  if (p === `/api/v1/academic/classes/${ids.class}/assignments`) return send([assignment()]);
  if (p === `/api/v1/academic/assignments/${ids.assignment}`) return send(assignment());
  if (p === `/api/v1/academic/assignments/${ids.assignment}/attempts/me`)
    return send(state.attempt ? [state.attempt] : []);
  if (p === `/api/v1/academic/assignments/${ids.assignment}/attempts` && req.method === 'POST') {
    if (role !== 'Student') return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    state.attempt ??= make('SubmissionAttemptResult', {
      id: ids.attempt,
      organizationId: ids.org,
      assignmentId: ids.assignment,
      status: 'Draft',
      contentVisible: true,
      answerText: null,
      rowVersion: 'draft-1',
      attemptNumber: 1,
      submittedAtUtc: null,
      attachments: [],
    });
    return send(state.attempt, 201);
  }
  if (p.startsWith(`/api/v1/academic/submission-attempts/${ids.attempt}`)) {
    if (role !== 'Student' || !state.attempt) return send({ code: 'SUBMISSION_NOT_FOUND' }, 404);
    if (p.includes('/attachments')) {
      if (state.attempt.status !== 'Draft') return send({ code: 'SUBMISSION_NOT_DRAFT' }, 409);
      if (
        (req.method === 'DELETE'
          ? url.searchParams.get('expectedRowVersion')
          : body.expectedRowVersion) !== state.attempt.rowVersion
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      if (req.method === 'POST') {
        const file = state.files.get(body.fileAssetId)?.asset;
        if (!file || file.uploadedByUserId !== auth.user.id || file.status !== 'Ready')
          return send({ code: 'FILE_NOT_AVAILABLE' }, 404);
        if (!state.attempt.attachments.some((a) => a.fileAssetId === file.id))
          state.attempt.attachments.push(
            make('SubmissionAttachmentResult', {
              fileAssetId: file.id,
              originalFileName: file.originalFileName,
              contentType: file.contentType,
              sizeBytes: file.sizeBytes,
              fileStatus: file.status,
            }),
          );
      } else if (req.method === 'DELETE')
        state.attempt.attachments = state.attempt.attachments.filter(
          (a) => a.fileAssetId !== p.split('/').at(-1),
        );
      else return send({ code: 'METHOD_NOT_ALLOWED' }, 405);
      state.attempt.rowVersion = 'attachments-' + Date.now() + '-' + Math.random();
      return send(state.attempt);
    }
    if (req.method === 'PATCH') {
      if (body.expectedRowVersion !== state.attempt.rowVersion)
        return send({ code: 'VERSION_CONFLICT' }, 409);
      Object.assign(state.attempt, {
        answerText: body.answerText,
        rowVersion: 'draft-' + Date.now(),
        lastSavedAtUtc: new Date().toISOString(),
      });
    }
    if (p.endsWith('/submit')) {
      if (body.expectedRowVersion !== state.attempt.rowVersion)
        return send({ code: 'VERSION_CONFLICT' }, 409);
      state.attempt.status = 'Submitted';
      state.attempt.submittedAtUtc = new Date().toISOString();
      return send(
        make('SubmissionReceipt', {
          ...state.attempt,
          submissionAttemptId: ids.attempt,
          assignmentId: ids.assignment,
          status: 'Submitted',
        }),
      );
    }
    return send({ ...state.attempt, privateEvaluatorNote: 'PRIVATE EVALUATOR NOTE MUST NOT LEAK' });
  }
  if (p === '/api/v1/academic/exams')
    return send([
      make('StudentExamSummary', {
        id: ids.exam,
        classId: ids.class,
        classTitle: 'کلاس نمونه',
        title: 'آزمون آزمایشی',
        publicationState: 'Published',
        rules: make('StudentExamRules', {
          availableFromUtc: '2020-01-01T00:00:00Z',
          availableUntilUtc: '2099-01-01T00:00:00Z',
          durationMinutes: 30,
          maxAttempts: 2,
          maxScore: 30,
        }),
      }),
    ]);
  if (p === `/api/v1/academic/exams/${ids.exam}/student-preview`)
    return send(
      make('StudentSafeExamPreview', {
        exam: make('StudentExamSummary', {
          id: ids.exam,
          title: 'آزمون آزمایشی',
          publicationState: 'Published',
          rules: make('StudentExamRules', {
            availableFromUtc: '2020-01-01T00:00:00Z',
            availableUntilUtc: '2099-01-01T00:00:00Z',
            durationMinutes: 30,
            maxAttempts: 2,
            maxScore: 30,
          }),
        }),
        questions: [],
      }),
    );
  if (p.endsWith(`/exams/${ids.exam}/attempts/me/active`))
    return state.examAttempt
      ? send(state.examAttempt)
      : send({ code: 'EXAM_ATTEMPT_NOT_FOUND' }, 404);
  if (p.endsWith(`/exams/${ids.exam}/attempts/me`))
    return send(state.examAttempt ? [make('StudentExamAttemptSummaryDto', state.examAttempt)] : []);
  if (p.endsWith(`/exams/${ids.exam}/attempts/start`)) {
    state.examAttempt = make('StudentExamAttemptDto', {
      examAttemptId: ids.examAttempt,
      examId: ids.exam,
      examVersionId: id(601),
      status: 'InProgress',
      serverNowUtc: new Date().toISOString(),
      effectiveDeadlineUtc: new Date(Date.now() + 1800000).toISOString(),
      attemptNumber: 1,
      questions: state.design
        ? Array.from({ length: 10 }, (_, i) =>
            make('StudentExamAttemptQuestionDto', {
              attemptQuestionId: i === 2 ? ids.question : id(8100 + i),
              displayOrder: i + 1,
              questionType: 'ObjectiveSingleChoice',
              prompt:
                i === 2
                  ? 'مقدار x در معادلهٔ زیر کدام است؟\n2x + 3 = 11'
                  : `پرسش نمونهٔ ${i + 1} را پاسخ دهید.`,
              score: 4,
              options: ['۲', '۴', '۶', '۸'].map((text, j) =>
                make('StudentExamAttemptOptionDto', { id: id(8200 + i * 10 + j), text }),
              ),
            }),
          )
        : [
            make('StudentExamAttemptQuestionDto', {
              attemptQuestionId: ids.question,
              questionType: 'Descriptive',
              prompt: 'دو به اضافهٔ دو چند می‌شود؟',
              attachmentPolicy: state.examFilePolicy ?? null,
              score: 30,
              options: [],
            }),
          ],
    });
    return send(state.examAttempt, 201);
  }
  if (p === `/api/v1/academic/exam-attempts/${ids.examAttempt}`)
    return role === 'Student' && state.examAttempt
      ? send(state.examAttempt)
      : send({ code: 'NOT_FOUND' }, 404);
  if (p.includes(`/exam-attempts/${ids.examAttempt}`)) {
    const lease = make('ExamWriteLeaseDto', {
      examAttemptId: ids.examAttempt,
      isCurrentSessionWriter: true,
      writeLeaseVersion: 1,
      answerSetVersion: state.answerSetVersion,
      serverNowUtc: new Date().toISOString(),
    });
    if (p.endsWith('/answers') && req.method === 'GET')
      return send(
        make('StudentExamAnswersDto', {
          examAttemptId: ids.examAttempt,
          answers: state.examAnswers,
          writeLease: lease,
          answerSetVersion: state.answerSetVersion,
        }),
      );
    if (p.includes('/answers/') && req.method === 'PUT') {
      state.answerSetVersion++;
      const oldAnswer = state.examAnswers.find(
        (a) => a.examAttemptQuestionId === p.split('/').at(-1),
      );
      const row = make('StudentCurrentExamAnswerDto', {
        ...oldAnswer,
        ...body,
        examAttemptQuestionId: p.split('/').at(-1),
        revisionNumber: (oldAnswer?.revisionNumber ?? 0) + 1,
        answerSetVersion: state.answerSetVersion,
      });
      state.examAnswers = [
        ...state.examAnswers.filter((x) => x.examAttemptQuestionId !== row.examAttemptQuestionId),
        row,
      ];
      return send(
        make('ExamAnswerReceiptDto', {
          examAttemptId: ids.examAttempt,
          examAttemptQuestionId: ids.question,
          answerSetVersion: state.answerSetVersion,
          writeLeaseVersion: 1,
          revisionNumber: 1,
          status: 'Accepted',
        }),
      );
    }
    if (p.endsWith('/write-lease')) return send(lease);
    if (p.endsWith('/finalize')) {
      state.examAttempt.status = 'Finalized';
      return send(
        make('ExamFinalReceiptDto', {
          examAttemptId: ids.examAttempt,
          examId: ids.exam,
          status: 'Finalized',
          attemptNumber: 1,
          finalizedAtUtc: new Date().toISOString(),
          answeredQuestionCount: state.examAnswers.length,
          totalQuestionCount: 1,
        }),
      );
    }
    if (p.endsWith('/receipt'))
      return state.examAttempt?.status === 'Finalized'
        ? send(
            make('ExamFinalReceiptDto', {
              examAttemptId: ids.examAttempt,
              examId: ids.exam,
              status: 'Finalized',
              attemptNumber: 1,
              finalizedAtUtc: new Date().toISOString(),
              answeredQuestionCount: state.examAnswers.length,
              totalQuestionCount: 1,
            }),
          )
        : send({ code: 'EXAM_NOT_FINALIZED' }, 409);
  }
  return false;
}
