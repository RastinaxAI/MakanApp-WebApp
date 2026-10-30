import { id, ids, make, classRow, paged } from './state.mjs';
export function seedManagerCase(state) {
  const members = ['معلم اول', 'معلم دوم', 'دانش‌آموز اول', 'دانش‌آموز دوم', 'والد آزمایشی'].map(
    (displayName, i) =>
      make('SchoolMemberResult', {
        userId: id(810 + i),
        personId: id(840 + i),
        membershipId: id(820 + i),
        organizationPersonId: id(830 + i),
        displayName,
        membershipStatus: 'Active',
        activeRoles: [i < 2 ? 'Teacher' : i < 4 ? 'Student' : 'Parent'],
        version: '1',
        roleAssignments: [],
        profilePhoto: null,
      }),
  );
  state.managerCase = {
    members,
    classes: [classRow()],
    teachers: [],
    learners: [],
    relations: [
      make('SchoolGuardianRelationDto', {
        id: id(850),
        organizationId: ids.org,
        guardianUserId: id(814),
        learnerOrganizationPersonId: id(832),
        status: 'Active',
        rowVersion: '1',
      }),
    ],
    invitations: [],
  };
}
export function managerRoute({ state, auth, url, req, body, send }) {
  const m = state.managerCase,
    p = url.pathname;
  if (!m) return false;
  const org =
    auth.context.workspaceType === 'Organization' && auth.context.organizationId === ids.org;
  const manager = org && auth.context.activeRole === 'Manager';
  const deny = () => send({ code: 'MANAGER_ROLE_REQUIRED' }, 403);
  if (p === '/api/v1/dashboards/manager')
    return manager
      ? send(
          make('ManagerDashboardDto', {
            organizationId: ids.org,
            operationalCounts: make('ManagerOperationalCounts', {
              activeClassCount: m.classes.length,
              enrolledLearnerCount: m.learners.filter((x) => x.status === 'Active').length,
              teacherCount: m.members.filter((x) => x.activeRoles.includes('Teacher')).length,
            }),
            pendingInvitationCount: m.invitations.filter((x) => x.status === 'Pending').length,
          }),
        )
      : deny();
  if (p === '/api/v1/invitations' && auth.role === 'Parent')
    return send(
      m.invitations.map((x) =>
        make('InvitationResult', {
          id: x.id,
          organizationId: ids.org,
          organizationName: 'آموزشگاه آزمایشی مدیر',
          invitedByUserId: id(104),
          role: 'Parent',
          status: x.status,
          expiresAtUtc: x.expiresAtUtc,
          guardianLearnerOrganizationPersonId: x.learnerOrganizationPersonId,
          guardianLearnerDisplayName: m.members.find(
            (y) => y.organizationPersonId === x.learnerOrganizationPersonId,
          )?.displayName,
          requiresGuardianConsent: true,
        }),
      ),
    );
  const accept = /^\/api\/v1\/invitations\/([^/]+)\/accept$/.exec(p);
  if (accept && auth.role === 'Parent') {
    const row = m.invitations.find((x) => x.id === accept[1]);
    if (!row || row.status !== 'Pending') return send({ code: 'INVITATION_NOT_PENDING' }, 409);
    if (!body.confirmGuardianRelation)
      return send({ code: 'GUARDIAN_INVITATION_CONSENT_REQUIRED' }, 400);
    row.status = 'Accepted';
    m.relations.push(
      make('SchoolGuardianRelationDto', {
        id: id(850 + m.relations.length),
        organizationId: ids.org,
        guardianUserId: auth.user.id,
        learnerOrganizationPersonId: row.learnerOrganizationPersonId,
        status: 'Active',
        rowVersion: '1',
      }),
    );
    return send(
      make('AcceptInvitationResult', {
        invitationId: row.id,
        organizationId: ids.org,
        organizationName: 'آموزشگاه آزمایشی مدیر',
        role: 'Parent',
      }),
    );
  }
  if (p === '/api/v1/organization/members') {
    if (!manager) return deny();
    const role = url.searchParams.get('Role'),
      search = url.searchParams.get('Search') ?? '';
    return send(
      paged(
        'SchoolPageOfSchoolMemberResult',
        m.members.filter(
          (x) =>
            (!role || x.activeRoles.includes(role)) &&
            x.displayName.includes(search) &&
            (!url.searchParams.get('Status') ||
              x.membershipStatus === url.searchParams.get('Status')),
        ),
        url,
      ),
    );
  }
  if (p === '/api/v1/organization/people') {
    if (!manager) return deny();
    return send(
      paged(
        'OrganizationPeoplePage',
        m.members
          .filter((x) => x.activeRoles.includes('Student'))
          .map((x) =>
            make('OrganizationPersonDto', {
              id: x.organizationPersonId,
              organizationId: ids.org,
              displayName: x.displayName,
              firstName: x.displayName,
              lastName: 'آزمایشی',
              status: 'Active',
              canEditNames: true,
              isAccountLinked: true,
              rowVersion: '1',
              personRowVersion: '1',
            }),
          ),
        url,
      ),
    );
  }
  if (/^\/api\/v1\/organization\/people\/[^/]+$/.test(p) && req.method === 'GET') {
    if (!manager) return deny();
    const x = m.members.find((x) => x.organizationPersonId === p.split('/').at(-1));
    return x
      ? send(
          make('OrganizationPersonDto', {
            id: x.organizationPersonId,
            organizationId: ids.org,
            displayName: x.displayName,
            firstName: x.firstName ?? x.displayName,
            lastName: x.lastName ?? 'آزمایشی',
            status: 'Active',
            canEditNames: x.canEditNames ?? true,
            isAccountLinked: x.isAccountLinked ?? true,
            rowVersion: '1',
            personRowVersion: '1',
          }),
        )
      : send({ code: 'NOT_FOUND' }, 404);
  }
  if (p === '/api/v1/academic/classes') {
    if (!org) return deny();
    if (req.method === 'GET') return send(m.classes);
    if (!manager) return deny();
    const row = { ...classRow(), ...body, id: id(860 + m.classes.length) };
    m.classes.push(row);
    return send(row, 201);
  }
  const roster =
    /^\/api\/v1\/academic\/classes\/([^/]+)\/(teachers|learners|enrollments)(?:\/([^/]+)\/end)?$/.exec(
      p,
    );
  if (roster) {
    const [, classId, kind, relationId] = roster;
    if (!m.classes.some((c) => c.id === classId) || !org)
      return send({ code: 'CLASS_NOT_FOUND' }, 404);
    if (req.method !== 'GET' && !manager) return deny();
    const teacher = kind === 'teachers',
      rows = teacher ? m.teachers : m.learners;
    const response = (x) =>
      make(teacher ? 'TeacherAssignmentResult' : 'EnrollmentResult', {
        ...x,
        id: teacher ? x.teacherAssignmentId : x.enrollmentId,
        organizationId: ids.org,
        classId,
      });
    if (req.method === 'GET')
      return send(
        paged(
          teacher ? 'SchoolPageOfClassTeacherResult' : 'SchoolPageOfClassLearnerResult',
          rows.filter((x) => x.classId === classId),
          url,
        ),
      );
    if (relationId) {
      const row = rows.find(
        (x) =>
          (teacher ? x.teacherAssignmentId : x.enrollmentId) === relationId &&
          x.classId === classId,
      );
      if (!row) return send({ code: 'NOT_FOUND' }, 404);
      row.status = teacher ? 'Ended' : body.finalStatus;
      row.endedAtUtc = new Date().toISOString();
      return send(response(row));
    }
    const member = m.members.find((x) =>
      teacher
        ? x.membershipId === body.teacherMembershipId && x.activeRoles.includes('Teacher')
        : x.organizationPersonId === body.learnerOrganizationPersonId &&
          x.activeRoles.includes('Student'),
    );
    if (!member) return send({ code: 'MEMBER_NOT_FOUND' }, 404);
    if (
      rows.some((x) => x.classId === classId && x.userId === member.userId && x.status === 'Active')
    )
      return send({ code: 'ALREADY_ASSIGNED' }, 409);
    const row = make(teacher ? 'ClassTeacherResult' : 'ClassLearnerResult', {
      ...member,
      classId,
      status: 'Active',
      version: '1',
      ...(teacher
        ? { teacherAssignmentId: id(880 + rows.length), teacherMembershipId: member.membershipId }
        : {
            enrollmentId: id(890 + rows.length),
            learnerOrganizationPersonId: member.organizationPersonId,
          }),
    });
    rows.push(row);
    return send(response(row), 201);
  }
  if (p.startsWith('/api/v1/reports/manager/')) {
    if (!manager) return deny();
    if (p.includes('/classes/'))
      return send(
        make('ManagerClassPerformanceDto', {
          classId: p.split('/').at(-1),
          classTitle: 'کلاس ریاضی',
          activeLearnerCount: m.learners.filter((x) => x.status === 'Active').length,
          assignmentAveragePercentage: null,
          examAveragePercentage: null,
        }),
      );
    const kind = p.split('/').at(-1),
      names = {
        'teacher-workload': 'ManagerTeacherWorkloadReportItem',
        attendance: 'ManagerAttendanceReportItem',
        assessments: 'ManagerAssessmentReportItem',
        enrollments: 'ManagerEnrollmentReportItem',
      },
      name = names[kind];
    if (!name) return false;
    const rows =
      kind === 'teacher-workload'
        ? m.members
            .filter((x) => x.activeRoles.includes('Teacher'))
            .map((x) =>
              make(name, {
                teacherMembershipId: x.membershipId,
                teacherDisplayName: x.displayName,
                activeClassCount: m.teachers.filter(
                  (t) => t.teacherMembershipId === x.membershipId && t.status === 'Active',
                ).length,
                completedSessionCount: 3,
              }),
            )
        : [];
    return send({
      ...paged('ReportPageOf' + name, rows, url),
      pageNumber: Number(url.searchParams.get('PageNumber') ?? 1),
    });
  }
  if (p === '/api/v1/organization/guardian-relations')
    return manager ? send(paged('SchoolGuardianRelationsPage', m.relations, url)) : deny();
  const rel = /^\/api\/v1\/organization\/guardian-relations\/([^/]+)\/(activate|end|revoke)$/.exec(
    p,
  );
  if (rel) {
    if (!manager) return deny();
    const row = m.relations.find((x) => x.id === rel[1]);
    if (!row) return send({ code: 'NOT_FOUND' }, 404);
    if (row.rowVersion !== body.expectedRowVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    row.status = rel[2] === 'end' ? 'Ended' : rel[2] === 'revoke' ? 'Revoked' : 'Active';
    row.rowVersion = String(Number(row.rowVersion) + 1);
    return send(row);
  }
  const invite = /^\/api\/v1\/organization\/people\/([^/]+)\/guardian-invitations$/.exec(p);
  if (invite) {
    if (!manager) return deny();
    if (
      !m.members.some(
        (x) => x.organizationPersonId === invite[1] && x.activeRoles.includes('Student'),
      )
    )
      return send({ code: 'NOT_FOUND' }, 404);
    const old = m.invitations.find((x) => x.operation === body.clientOperationId);
    if (old) return send(old);
    const row = make('SchoolGuardianInvitationResult', {
      id: id(900 + m.invitations.length),
      organizationId: ids.org,
      learnerOrganizationPersonId: invite[1],
      status: 'Pending',
      expiresAtUtc: body.expiresAtUtc,
      version: '1',
      nextAction: 'AwaitGuardianConsent',
      operation: body.clientOperationId,
    });
    m.invitations.push(row);
    return send(row, 201);
  }
  const revoke = /^\/api\/v1\/organization\/guardian-invitations\/([^/]+)\/revoke$/.exec(p);
  if (revoke) {
    if (!manager) return deny();
    const row = m.invitations.find((x) => x.id === revoke[1]);
    if (!row) return send({ code: 'NOT_FOUND' }, 404);
    if (row.version !== body.expectedRowVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    row.status = 'Revoked';
    row.version = '2';
    return send(row);
  }
  return false;
}
