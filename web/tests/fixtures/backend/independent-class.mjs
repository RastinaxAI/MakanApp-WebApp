import { randomUUID } from 'node:crypto';
import { make, id } from './state.mjs';
const cid = id(1800),
  rid = id(1801),
  mid = id(1802),
  aid = id(1803),
  eid = id(1806),
  sid = id(1804),
  xid = id(1807);
const version = (n) => Buffer.from(String(n).padStart(8, '0')).toString('base64');
const caps = {
  canManageMembers: true,
  canManageRoles: true,
  canManageSpaces: true,
  canAuthorAssignments: true,
  canAuthorExams: true,
  canGrade: true,
  canArchive: true,
  canViewOwnResults: true,
};
const ref = { kind: 'PersonalClass', classId: cid };
const page = (items, url, academic = false) => {
  const p = Number(url.searchParams.get('page') ?? url.searchParams.get('Page') ?? 1),
    size = Number(url.searchParams.get('pageSize') ?? url.searchParams.get('PageSize') ?? 30);
  return {
    items: items.slice((p - 1) * size, p * size),
    page: p,
    pageSize: size,
    totalCount: items.length,
    ...(academic ? { total: items.length } : {}),
  };
};
export function seedIndependent(state, options = {}) {
  state.independent = {
    options,
    requests: new Map(),
    operations: new Map(),
    invitations: [],
    joins: [],
    transfers: [],
    grants: [],
    revision: 1,
    removed: false,
    class: make('PersonalClassDto', {
      id: cid,
      hostUserId: id(199),
      managerUserId: id(199),
      title: 'کلاس مستقل قرارداد جدید',
      state: 'Active',
      capacity: 20,
      acceptingJoinRequests: true,
      version: version(1),
      capabilities: { ...caps, ...options.capabilities },
      isHost: true,
    }),
    members: [
      make('PersonalClassMembershipDto', {
        id: mid,
        userId: id(199),
        localRoles: 'Manager',
        delegatedCapabilities: 'None',
        status: 'Active',
        version: version(1),
      }),
    ],
    assignment: make('AssignmentResult', {
      id: aid,
      organizationId: null,
      classId: cid,
      classTitle: 'کلاس مستقل',
      classRef: ref,
      title: 'تکلیف مستقل واقعی',
      description: 'پاسخ این تکلیف در کلاس مستقل ثبت می‌شود.',
      status: options.draft ? 'Draft' : 'Published',
      dueAtUtc: '2099-12-01T12:00:00Z',
      maxAttempts: 3,
      maxScore: 20,
      assignmentRowVersion: version(1),
      versionRowVersion: version(1),
    }),
    exam: make('ExamEditorDto', {
      id: eid,
      organizationId: null,
      classId: cid,
      classTitle: 'کلاس مستقل',
      classRef: ref,
      title: 'آزمون مستقل',
      description: 'آزمون دارای زمان سرور',
      status: options.draft ? 'Draft' : 'Published',
      versionStatus: options.draft ? 'Draft' : 'Published',
      availableFromUtc: '2026-01-01T00:00:00Z',
      availableUntilUtc: '2099-12-01T00:00:00Z',
      durationMinutes: 10,
      maxAttempts: 3,
      maxScore: 20,
      examRowVersion: version(1),
      versionRowVersion: version(1),
      questions: [],
    }),
    submission: null,
    attempt: null,
    answers: [],
    evaluation: null,
    grade: null,
  };
  if (options.invitation)
    state.independent.invitations.push(
      make('PersonalClassInvitationDto', {
        id: id(1810),
        personalClassId: cid,
        destinationUserId: id(101),
        status: 'Pending',
        version: version(1),
        expiresAtUtc: '2099-12-01T00:00:00Z',
        accepted: false,
      }),
    );
  if (options.requests)
    for (let i = 0; i < 32; i++) {
      const r = make('PersonalClassRequestDto', {
        id: id(1900 + i),
        requesterUserId: id(199),
        details: {
          title: 'درخواست ' + i,
          purpose: 'بررسی تشکیل',
          description: null,
          suggestedCapacity: 20,
          suggestedManagerUserId: null,
          suggestedTeacherUserId: null,
        },
        status: 'Draft',
        version: version(1),
        capabilities: {
          canEdit: true,
          canSubmit: true,
          canCancel: true,
          canRespondToChanges: false,
        },
      });
      state.independent.requests.set(r.id, r);
    }
  return { classId: cid, requestId: rid, assignmentId: aid, examId: eid };
}
export function independentRoute({ state, url, body, auth, req, res, send }) {
  const p = url.pathname,
    m = req.method,
    x = state.independent;
  const blank = p.includes('/academic/')
    ? { items: [], page: 1, pageSize: 30, total: 0, totalCount: 0 }
    : page([], url);
  if (!x) {
    if (
      [
        '/api/v1/personal-classes/page',
        '/api/v1/personal-classes/invitations/page',
        '/api/v1/personal-class-requests',
        '/api/v1/personal-classes/manager-transfers',
      ].includes(p) &&
      m === 'GET'
    )
      return send(blank);
    return false;
  }
  const pc = '/api/v1/personal-classes',
    pr = '/api/v1/personal-class-requests';
  const bump = (row) => {
    row.version = version(++x.revision);
    return row;
  };
  const fail = (code, status = 409) => send({ code }, status);
  const expected = (row) => body.expectedVersion === row.version;
  const memo = (kind, fn) => {
    const key = kind + ':' + body.clientOperationId;
    const old = x.operations.get(key);
    if (old) {
      if (old.payload !== JSON.stringify(body)) return fail('IDEMPOTENCY_CONFLICT');
      return send(old.value);
    }
    const value = fn();
    x.operations.set(key, { payload: JSON.stringify(body), value });
    return send(value);
  };
  if (
    x.removed &&
    (p.includes(cid) || p.includes(aid) || p.includes(sid) || p.includes(eid) || p.includes(xid))
  )
    return fail('NOT_FOUND', 404);
  if (p === pc + '/page') return send(page([x.class], url));
  if (p === pc + '/invitations/page') return send(page(x.invitations, url));
  if (p === pr && m === 'GET')
    return send(
      page(
        [...x.requests.values()].filter(
          (r) => !url.searchParams.get('status') || r.status === url.searchParams.get('status'),
        ),
        url,
      ),
    );
  if (p === pr && m === 'POST')
    return memo('request', () => {
      const row = make('PersonalClassRequestDto', {
        id: randomUUID(),
        requesterUserId: auth.user.id,
        details: body.details,
        status: 'Draft',
        version: version(1),
        capabilities: {
          canEdit: true,
          canSubmit: true,
          canCancel: true,
          canRespondToChanges: false,
        },
      });
      x.requests.set(row.id, row);
      return row;
    });
  const r = /^\/api\/v1\/personal-class-requests\/([^/]+)(?:\/(submit|cancel|history))?$/.exec(p);
  if (r) {
    const row = x.requests.get(r[1]);
    if (!row) return fail('NOT_FOUND', 404);
    if (r[2] === 'history')
      return send(
        page(
          [
            make('PersonalClassDecisionDto', {
              id: rid,
              action: row.status,
              reason: 'تاریخچهٔ آزمون',
            }),
          ],
          url,
        ),
      );
    if (m === 'GET') return send(row);
    if (!expected(row)) return fail('PERSONAL_CLASS_VERSION_CONFLICT');
    if (r[2] === 'submit') {
      row.status = 'Submitted';
      row.capabilities = {
        canEdit: false,
        canSubmit: false,
        canCancel: true,
        canRespondToChanges: false,
      };
    } else if (r[2] === 'cancel') {
      row.status = 'Cancelled';
      row.capabilities = {
        canEdit: false,
        canSubmit: false,
        canCancel: false,
        canRespondToChanges: false,
      };
    } else row.details = body.details;
    return send(bump(row));
  }
  if (p === `${pc}/${cid}` && m === 'GET') return send(x.class);
  if (p === `${pc}/${cid}/spaces`)
    return send(
      make('OfficialSpacesPairResult', {
        sourceKind: 'PersonalClass',
        sourceId: cid,
        organizationId: null,
        version: version(1),
        group: make('OfficialSpaceEndpointResult', {
          conversationId: id(950),
          state: 'Ready',
          capabilities: { canRead: true, canSend: true, canManage: true },
        }),
        channel: make('OfficialSpaceEndpointResult', {
          conversationId: id(950),
          state: 'Pending',
          capabilities: { canRead: false, canSend: false, canManage: false },
        }),
      }),
    );
  if (p === `${pc}/${cid}/spaces/repair`) {
    if (!x.class.capabilities.canManageSpaces) return fail('FORBIDDEN', 403);
    if (!expected(x.class)) return fail('VERSION_CONFLICT');
    res.writeHead(202);
    res.end();
    return true;
  }
  if (p === `${pc}/${cid}/history`)
    return send(
      page(
        [make('PersonalClassHistoryItem', { id: rid, action: 'Active', resourceType: 'Class' })],
        url,
      ),
    );
  if (p === `${pc}/${cid}/memberships`) return send(page(x.members, url));
  if (p === `${pc}/${cid}/academic-permissions` && m === 'GET') return send(page(x.grants, url));
  if (p.startsWith(`${pc}/${cid}/academic-permissions/`)) {
    if (!x.class.capabilities.canManageRoles) return fail('FORBIDDEN', 403);
    const member = x.members.find((m) => m.id === p.split('/').at(-1)),
      grant = x.grants.find((g) => g.membershipId === member?.id);
    if (
      !member ||
      body.expectedMembershipVersion !== member.version ||
      body.expectedGrantVersion !== (grant?.version ?? null)
    )
      return fail('VERSION_CONFLICT');
    return memo('grant', () => {
      const g = make('PersonalClassAcademicPermissionDto', {
        id: grant?.id ?? randomUUID(),
        personalClassId: cid,
        membershipId: member.id,
        capabilities: body.capabilities,
        isEffective: true,
        version: version(++x.revision),
      });
      x.grants = x.grants.filter((v) => v.membershipId !== member.id).concat(g);
      return g;
    });
  }
  if (p.startsWith(`${pc}/${cid}/memberships/`)) {
    const member = x.members.find((m) => m.id === p.split('/')[6]);
    if (!member) return fail('NOT_FOUND', 404);
    if (!expected(member)) return fail('VERSION_CONFLICT');
    if (m === 'DELETE') {
      member.status = 'Ended';
      return send(null, 204);
    }
    Object.assign(member, {
      localRoles: body.roles,
      delegatedCapabilities: body.delegatedCapabilities,
    });
    return send(bump(member));
  }
  if (p === `${pc}/${cid}/invitations`)
    return memo('invite', () => {
      const row = make('PersonalClassInvitationDto', {
        id: randomUUID(),
        personalClassId: cid,
        destinationUserId: body.destinationUserId,
        localRoles: body.localRoles ?? 'Learner',
        delegatedCapabilities: 'None',
        status: 'Pending',
        version: version(1),
        expiresAtUtc: '2099-12-01T00:00:00Z',
      });
      x.invitations.push(row);
      return row;
    });
  const invitation = new RegExp(`^${pc}/invitations/([^/]+)/(accept|decline|revoke)$`).exec(p);
  if (invitation) {
    const row = x.invitations.find((r) => r.id === invitation[1]);
    if (!row) return fail('NOT_FOUND', 404);
    if (invitation[2] === 'accept') {
      row.status = 'Accepted';
      row.accepted = true;
      return send(x.class);
    }
    if (!expected(row)) return fail('VERSION_CONFLICT');
    row.status = invitation[2] === 'decline' ? 'Declined' : 'Revoked';
    return send(bump(row));
  }
  if (p === pc + '/join-requests') return send(page(x.joins, url));
  if (p === `${pc}/${cid}/join-requests`)
    return memo('join', () => {
      const row = make('PersonalClassJoinDto', {
        id: randomUUID(),
        personalClassId: cid,
        userId: auth.user.id,
        status: 'Pending',
        version: version(1),
      });
      x.joins.push(row);
      return row;
    });
  if (p.startsWith(pc + '/join-requests/')) {
    const row = x.joins.find((j) => j.id === p.split('/')[5]);
    if (!row) return fail('NOT_FOUND', 404);
    if (!expected(row)) return fail('VERSION_CONFLICT');
    row.status = body.decision;
    return send(bump(row));
  }
  if (p === pc + '/manager-transfers') return send(page(x.transfers, url));
  if (p === `${pc}/${cid}/manager-transfers`)
    return memo('transfer', () => {
      const row = make('PersonalClassTransferDto', {
        id: randomUUID(),
        personalClassId: cid,
        targetUserId: body.targetUserId,
        previousManagerUserId: auth.user.id,
        status: 'Pending',
        reason: body.reason,
        version: version(1),
      });
      x.transfers.push(row);
      return row;
    });
  if (p.startsWith(pc + '/manager-transfers/')) {
    const row = x.transfers.find((j) => j.id === p.split('/')[5]);
    if (!row || row.targetUserId !== auth.user.id) return fail('NOT_FOUND', 404);
    if (!expected(row)) return fail('VERSION_CONFLICT');
    row.status = body.decision;
    return send(bump(row));
  }
  if (
    [
      `${pc}/${cid}/settings`,
      `${pc}/${cid}/archive`,
      `${pc}/${cid}/activate`,
      `${pc}/${cid}/suspend`,
    ].includes(p)
  ) {
    if (!expected(x.class)) return fail('VERSION_CONFLICT');
    if (p.endsWith('/settings'))
      Object.assign(x.class, {
        capacity: body.capacity,
        acceptingJoinRequests: body.acceptingJoinRequests,
      });
    else {
      x.class.state = p.endsWith('/archive')
        ? 'Archived'
        : p.endsWith('/suspend')
          ? 'Suspended'
          : 'Active';
      x.class.archived = x.class.state === 'Archived';
    }
    return send(bump(x.class));
  }
  const assignmentPath = '/api/v1/academic/assignments/' + aid,
    submissionPath = '/api/v1/academic/submission-attempts/' + sid,
    examPath = '/api/v1/academic/exams/' + eid;
  if (p === `/api/v1/academic/personal-classes/${cid}/assignments`) {
    if (m === 'POST') {
      if (!x.class.capabilities.canAuthorAssignments) return fail('FORBIDDEN', 403);
      Object.assign(x.assignment, body, { status: 'Draft' });
      return send(x.assignment, 201);
    }
    return send(page([x.assignment], url, true));
  }
  if (p === `/api/v1/academic/personal-classes/${cid}/exams`) {
    if (m === 'POST') {
      if (!x.class.capabilities.canAuthorExams) return fail('FORBIDDEN', 403);
      Object.assign(x.exam, body, { status: 'Draft', versionStatus: 'Draft' });
      return send(x.exam, 201);
    }
    return send(
      page(
        [
          make('StudentExamSummary', {
            id: eid,
            classId: cid,
            classRef: ref,
            title: x.exam.title,
            description: x.exam.description,
            classTitle: 'کلاس مستقل',
          }),
        ],
        url,
        true,
      ),
    );
  }
  if (p === assignmentPath) {
    if (m === 'PATCH') {
      if (!x.class.capabilities.canAuthorAssignments) return fail('FORBIDDEN', 403);
      Object.assign(x.assignment, body);
    }
    return send(x.assignment);
  }
  if (p === assignmentPath + '/publish') {
    if (!x.class.capabilities.canAuthorAssignments) return fail('FORBIDDEN', 403);
    x.assignment.status = 'Published';
    return send(
      make('PublishAssignmentResult', {
        assignment: x.assignment,
        publicationReceipt: make('AcademicPublicationReceipt'),
      }),
    );
  }
  if (p === assignmentPath + '/attempts') {
    if (!x.submission)
      x.submission = make('SubmissionAttemptResult', {
        id: sid,
        organizationId: null,
        classRef: ref,
        assignmentId: aid,
        assignmentVersionId: x.assignment.versionId,
        personalClassMembershipId: mid,
        status: 'Draft',
        contentVisible: true,
        answerText: '',
        attachments: [],
        attemptNumber: 1,
        rowVersion: version(1),
      });
    return send(x.submission);
  }
  if (p === assignmentPath + '/attempts/me') return send(x.submission ? [x.submission] : []);
  if (p === submissionPath) {
    return x.submission ? send(x.submission) : fail('NOT_FOUND', 404);
  }
  if (p === submissionPath + '/draft') {
    if (body.expectedRowVersion !== x.submission?.rowVersion)
      return fail('SUBMISSION_VERSION_CONFLICT');
    x.submission.answerText = body.answerText;
    x.submission.rowVersion = version(++x.revision);
    return send(x.submission);
  }
  if (p === submissionPath + '/attachments') {
    const f = state.files.get(body.fileAssetId);
    if (!f || f.asset.personalClassId !== cid) return fail('NOT_FOUND', 404);
    x.submission.attachments.push(
      make('SubmissionAttachmentResult', {
        fileAssetId: f.asset.id,
        originalFileName: f.asset.originalFileName,
        contentType: f.asset.contentType,
        sizeBytes: f.asset.sizeBytes,
        fileStatus: 'Ready',
      }),
    );
    x.submission.rowVersion = version(++x.revision);
    return send(x.submission);
  }
  if (p === submissionPath + '/submit') {
    x.submission.status = 'Submitted';
    x.submission.submittedAtUtc = new Date().toISOString();
    return send(
      make('SubmissionReceipt', {
        submissionAttemptId: sid,
        assignmentId: aid,
        assignmentVersionId: x.submission.assignmentVersionId,
        status: 'Submitted',
        submittedAtUtc: x.submission.submittedAtUtc,
        attemptNumber: 1,
        rowVersion: x.submission.rowVersion,
      }),
    );
  }
  if (p === submissionPath + '/result') return fail('RESULT_NOT_RELEASED', 404);
  if (p === examPath + '/editor') {
    if (!x.class.capabilities.canAuthorExams) return fail('FORBIDDEN', 403);
    return send(x.exam);
  }
  if (p === examPath + '/student-preview')
    return send(
      make('StudentSafeExamPreview', {
        exam: make('StudentExamSummary', {
          id: eid,
          classId: cid,
          classRef: ref,
          classTitle: 'کلاس مستقل',
          title: x.exam.title,
          description: x.exam.description,
          rules: make('StudentExamRules', {
            durationMinutes: 10,
            maxAttempts: 3,
            maxScore: 20,
            availableFromUtc: '2026-01-01T00:00:00Z',
            availableUntilUtc: '2099-01-01T00:00:00Z',
          }),
        }),
        questions: [],
      }),
    );
  if (p === examPath + '/attempts/me')
    return send(
      x.attempt
        ? [
            make('StudentExamAttemptSummaryDto', {
              examAttemptId: xid,
              status: x.attempt.status,
              attemptNumber: 1,
            }),
          ]
        : [],
    );
  if (p === examPath + '/attempts/me/active')
    return x.attempt?.status === 'InProgress'
      ? send(x.attempt)
      : fail('EXAM_ATTEMPT_NOT_FOUND', 404);
  if (p === examPath + '/attempts/start')
    return memo('start', () => {
      x.attempt ??= make('StudentExamAttemptDto', {
        examAttemptId: xid,
        examId: eid,
        status: 'InProgress',
        attemptNumber: 1,
        serverNowUtc: new Date().toISOString(),
        effectiveDeadlineUtc: new Date(Date.now() + 600000).toISOString(),
        startedAtUtc: new Date().toISOString(),
        questions: [
          make('StudentExamAttemptQuestionDto', {
            attemptQuestionId: id(1808),
            questionType: 'Descriptive',
            prompt: 'پاسخ کوتاه بنویسید',
            attachmentPolicy: null,
          }),
        ],
      });
      return x.attempt;
    });
  const xp = '/api/v1/academic/exam-attempts/' + xid;
  if (p === xp) return x.attempt ? send(x.attempt) : fail('NOT_FOUND', 404);
  if (p === xp + '/answers')
    return send(
      make('StudentExamAnswersDto', {
        examAttemptId: xid,
        answers: x.answers,
        writeLease: make('ExamWriteLeaseDto', {
          isCurrentSessionWriter: true,
          writeLeaseVersion: 1,
          serverNowUtc: new Date().toISOString(),
        }),
      }),
    );
  if (p === xp + '/write-lease')
    return send(
      make('ExamWriteLeaseDto', {
        isCurrentSessionWriter: true,
        writeLeaseVersion: 1,
        serverNowUtc: new Date().toISOString(),
      }),
    );
  if (p.startsWith(xp + '/answers/') && m === 'PUT') {
    const answer = make('StudentCurrentExamAnswerDto', {
      examAttemptQuestionId: id(1808),
      textAnswer: body.textAnswer,
      selectedOptionId: null,
      revisionNumber: 1,
      attachments: [],
    });
    x.answers = [answer];
    return send(make('ExamAnswerReceiptDto', { ...answer, answerSetVersion: 1 }));
  }
  if (p === xp + '/finalize' || p === xp + '/receipt') {
    x.attempt.status = 'Finalized';
    return send(
      make('ExamFinalReceiptDto', {
        examAttemptId: xid,
        status: 'Finalized',
        finalizedAtUtc: new Date().toISOString(),
        answeredQuestionCount: x.answers.length,
        totalQuestionCount: 1,
      }),
    );
  }
  if (p === '/api/v1/academic/evaluations/queue') return send([]);
  return false;
}
