import { ids, id, make, paged, classRow } from './state.mjs';
// Local-only services for workflow regressions. These never proxy to an external API.
export function workflowRoute({ state, url, body, auth, req, send }) {
  const p = url.pathname,
    role = auth.context.activeRole,
    user = auth.user.id;
  state.workflow ??= {
    classes: [],
    courses: [],
    periods: [],
    people: new Map(),
    exams: new Map(),
    preferences: new Map(),
    notifications: new Map(),
  };
  const w = state.workflow;
  if (
    p === '/api/v1/notification-preferences' ||
    p.startsWith('/api/v1/notification-preferences/')
  ) {
    const org = url.searchParams.get('organizationId');
    if (org && org !== ids.org) return send({ code: 'NOT_FOUND' }, 404);
    const key = user + ':' + (org ?? 'personal');
    if (!w.preferences.has(key))
      w.preferences.set(
        key,
        [
          'Messages',
          'Assignments',
          'Results',
          'Sessions',
          'Reports',
          'Invitations',
          'AccountSecurity',
        ].map((category) =>
          make('NotificationPreferenceItem', {
            category,
            scope: org ? 'Organization' : 'Personal',
            organizationId: org,
            pushEnabled: true,
            smsEnabled: false,
            inAppEnabled: true,
            isMandatory: category === 'AccountSecurity',
            canDisablePush: category !== 'AccountSecurity',
            canDisableSms: category !== 'AccountSecurity',
            quietHoursEnabled: false,
            quietHoursStartLocal: null,
            quietHoursEndLocal: null,
            timeZoneId: null,
            rowVersion: '1',
          }),
        ),
      );
    const rows = w.preferences.get(key);
    if (req.method === 'GET') return send(rows);
    const row = rows.find((x) => x.category === p.split('/').at(-1));
    if (!row) return send({ code: 'NOT_FOUND' }, 404);
    if (body.expectedRowVersion !== row.rowVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    if (
      (!row.canDisablePush && !body.pushEnabled) ||
      (!row.canDisableSms && row.smsEnabled && !body.smsEnabled)
    )
      return send({ code: 'PREFERENCE_REQUIRED' }, 422);
    Object.assign(row, body, { rowVersion: String(Number(row.rowVersion) + 1), isExplicit: true });
    return send(row);
  }
  if (p === '/api/v1/notifications' || /^\/api\/v1\/notifications\/[^/]+\/read$/.test(p)) {
    if (!w.notifications.has(user))
      w.notifications.set(user, [
        make('NotificationItem', {
          id: id(Number(user.slice(-5)) + 4000),
          organizationId: ids.org,
          title: 'تکلیف جدید کلاس',
          body: 'تکلیف ریاضی برای کلاس شما منتشر شده است.',
          category: 'Educational',
          type: 'AssignmentPublished',
          resourceType: 'Assignment',
          resourceId: ids.assignment,
          readAtUtc: null,
        }),
      ]);
    const rows = w.notifications.get(user);
    if (req.method === 'GET')
      return send(
        paged(
          'NotificationPage',
          rows.filter((r) => url.searchParams.get('UnreadOnly') !== 'true' || !r.readAtUtc),
          url,
        ),
      );
    const row = rows.find((r) => r.id === p.split('/')[4]);
    if (!row) return send({ code: 'NOT_FOUND' }, 404);
    row.readAtUtc = new Date().toISOString();
    return send(row);
  }
  if (!p.startsWith('/api/v1/academic/') && !p.startsWith('/api/v1/organization/people'))
    return false;
  if (auth.context.workspaceType !== 'Organization')
    return send({ code: 'ORGANIZATION_WORKSPACE_REQUIRED' }, 403);
  if (p === '/api/v1/academic/classes') {
    if (req.method === 'GET') return send([...(state.designClasses ?? [classRow()]), ...w.classes]);
    if (role !== 'Manager') return send({ code: 'MANAGER_ROLE_REQUIRED' }, 403);
    const row = { ...classRow(), ...body, id: id(900 + w.classes.length) };
    w.classes.push(row);
    return send(row, 201);
  }
  for (const kind of ['courses', 'periods'])
    if (p === '/api/v1/academic/' + kind) {
      if (role !== 'Manager') return send({ code: 'MANAGER_ROLE_REQUIRED' }, 403);
      const name = kind === 'courses' ? 'CourseResult' : 'AcademicPeriodResult',
        page = kind === 'courses' ? 'SchoolPageOfCourseResult' : 'SchoolPageOfAcademicPeriodResult';
      const initial = make(name, {
        id: id(kind === 'courses' ? 12 : 13),
        title: kind === 'courses' ? 'ریاضی' : 'دورهٔ نمونه',
        organizationId: ids.org,
        status: 'Active',
      });
      if (req.method === 'GET') return send(paged(page, [initial, ...w[kind]], url));
      const row = make(name, {
        ...body,
        id: id(100 + w[kind].length),
        organizationId: ids.org,
        status: 'Active',
      });
      w[kind].push(row);
      return send(row, 201);
    }
  if (p === '/api/v1/organization/people' || /^\/api\/v1\/organization\/people\/[^/]+$/.test(p)) {
    if (role !== 'Manager') return send({ code: 'MANAGER_ROLE_REQUIRED' }, 403);
    if (req.method === 'POST') {
      const old = [...w.people.values()].find((x) => x.operation === body.clientOperationId);
      if (old) return send(old);
      const row = make('OrganizationPersonDto', {
        ...body,
        id: id(5000 + w.people.size),
        organizationId: ids.org,
        status: 'Active',
        isAccountLinked: false,
        canEditNames: true,
        rowVersion: '1',
        personRowVersion: '1',
        operation: body.clientOperationId,
      });
      w.people.set(row.id, row);
      return send(row, 201);
    }
    if (p.endsWith('/people'))
      return send(paged('OrganizationPeoplePage', [...w.people.values()], url));
    const row = w.people.get(p.split('/').at(-1));
    if (!row) return send({ code: 'NOT_FOUND' }, 404);
    if (req.method === 'PATCH') {
      if (
        body.expectedRowVersion !== row.rowVersion ||
        body.expectedPersonRowVersion !== row.personRowVersion
      )
        return send({ code: 'VERSION_CONFLICT' }, 409);
      Object.assign(row, body, { rowVersion: '2', personRowVersion: '2' });
    }
    return send(row);
  }
  if (/^\/api\/v1\/academic\/classes\/[^/]+\/sessions$/.test(p) && req.method === 'POST') {
    if (!['Teacher', 'Manager'].includes(role)) return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    if (Date.parse(body.endUtc) <= Date.parse(body.startUtc))
      return send({ code: 'SESSION_TIME_INVALID' }, 422);
    const row = make('SessionResult', {
      ...body,
      id: id(6000 + state.schedule.length),
      organizationId: ids.org,
      classId: p.split('/')[5],
      classTitle: 'کلاس ریاضی',
      status: 'Scheduled',
      rowVersion: '1',
    });
    state.schedule.push(row);
    return send(row, 201);
  }
  const session = /^\/api\/v1\/academic\/sessions\/([^/]+)(?:\/(cancel|complete))?$/.exec(p);
  if (session) {
    const row = state.schedule.find((x) => x.id === session[1]);
    if (!row) return send({ code: 'SESSION_NOT_FOUND' }, 404);
    if (req.method === 'GET') return send(row);
    if (!['Teacher', 'Manager'].includes(role)) return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    if (body.expectedRowVersion !== row.rowVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    if (row.status !== 'Scheduled') return send({ code: 'SESSION_NOT_SCHEDULED' }, 409);
    if (req.method === 'PATCH') Object.assign(row, body);
    else row.status = session[2] === 'cancel' ? 'Cancelled' : 'Completed';
    row.rowVersion = String(Number(row.rowVersion) + 1);
    return send(row);
  }
  if (/^\/api\/v1\/academic\/classes\/[^/]+\/exams$/.test(p) && req.method === 'POST') {
    if (!['Teacher', 'Manager'].includes(role)) return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    const row = make('ExamEditorDto', {
      ...body,
      id: id(7000 + w.exams.size),
      organizationId: ids.org,
      classId: p.split('/')[5],
      classTitle: 'ریاضی',
      versionStatus: 'Draft',
      status: 'Draft',
      questions: [],
      versionRowVersion: '1',
      examRowVersion: '1',
    });
    w.exams.set(row.id, row);
    return send(row, 201);
  }
  const exam = /^\/api\/v1\/academic\/exams\/([^/]+)\/(editor|questions|publish)$/.exec(p);
  if (exam) {
    if (!['Teacher', 'Manager'].includes(role)) return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    const row = w.exams.get(exam[1]);
    if (!row) return send({ code: 'EXAM_NOT_FOUND' }, 404);
    if (exam[2] === 'editor') return send(row);
    if (body.expectedVersionRowVersion !== row.versionRowVersion)
      return send({ code: 'VERSION_CONFLICT' }, 409);
    if (exam[2] === 'questions')
      row.questions.push(
        make('ExamEditorQuestionDto', {
          ...body,
          id: id(7100 + row.questions.length),
          options: (body.options ?? []).map((v, i) =>
            make('ExamEditorOptionDto', { ...v, id: id(7200 + i) }),
          ),
        }),
      );
    else row.versionStatus = 'Published';
    row.versionRowVersion = String(Number(row.versionRowVersion) + 1);
    return send(row);
  }
  return false;
}
