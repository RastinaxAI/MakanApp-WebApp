import { test, expect, type BrowserContext } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
test('school API roles and independent unassigned class boundaries', async ({ browser }) => {
  const fixture = JSON.parse(await readFile('docs/school-live-qa.json', 'utf8'));
  const id = fixture.ids.classId,
    examId = fixture.ids.examId;
  test.skip(
    !id || !examId,
    'Run the authorized school workflow to establish its QA fixtures first.',
  );
  const contexts: BrowserContext[] = [];
  const report: { checks: Record<string, unknown>; responses: unknown[]; limitations: string[] } = {
    checks: {},
    responses: [],
    limitations: [],
  };
  const origin = 'http://127.0.0.1:3130';
  async function api(context: BrowserContext, path: string, method = 'GET', data?: unknown) {
    const state = await (await context.request.get('/api/client/session')).json();
    return context.request.fetch('/api/client/backend' + path, {
      method,
      data,
      headers: { Origin: origin, 'X-Makan-Context': state.revision },
    });
  }
  async function login(role: string, phone: string) {
    const context = await browser.newContext({ baseURL: origin });
    contexts.push(context);
    const challenge = await context.request.post('/api/client/auth/challenge', {
      headers: { Origin: origin },
      data: { phoneNumber: phone },
    });
    const login = await context.request.post('/api/client/auth/verify', {
      headers: { Origin: origin },
      data: {
        phoneNumber: phone,
        challengeId: (await challenge.json()).challengeId,
        code: '123456',
        deviceName: 'Makan school access QA ' + role,
      },
    });
    expect(login.ok()).toBeTruthy();
    const spaces = await (await api(context, '/api/v1/workspaces/me')).json();
    const space = spaces.find((w: any) => w.workspaceType === 'Organization' && w.role === role);
    expect(
      (
        await api(context, '/api/v1/workspaces/select', 'POST', {
          workspaceType: 'Organization',
          membershipId: space.membershipId,
          role,
        })
      ).ok(),
    ).toBeTruthy();
    return context;
  }
  async function evidence(name: string, response: any) {
    const data = await response.json().catch(() => null);
    report.responses.push({
      name,
      status: response.status(),
      code: data?.code,
      traceId: data?.traceId,
    });
    return data;
  }
  try {
    const manager = await login('Manager', '09120000104'),
      teacher = await login('Teacher', '09120000102'),
      student = await login('Student', '09120000101'),
      parent = await login('Parent', '09120000103');
    const classes = await (await api(manager, '/api/v1/academic/classes')).json();
    const source = classes.find((c: any) => c.id === id);
    expect(source.title).toContain('آزمون');
    const created = classes.some((c: any) => c.title.startsWith('آزمون دسترسی بدون ثبت‌نام'))
      ? null
      : await api(manager, '/api/v1/academic/classes', 'POST', {
          title: 'آزمون دسترسی بدون ثبت‌نام — ' + Date.now(),
          academicPeriodId: source.academicPeriodId,
          courseId: source.courseId,
          capacity: 2,
          activateImmediately: true,
        });
    if (created) expect(created.ok()).toBeTruthy();
    const unrelated = created
      ? await created.json()
      : classes.find((c: any) => c.title.startsWith('آزمون دسترسی بدون ثبت‌نام'));
    for (const [name, context] of [
      ['Teacher', teacher],
      ['Student', student],
    ] as const) {
      const response = await api(context, '/api/v1/academic/classes');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      report.checks[name + 'UnassignedClassHidden'] = !data.some((c: any) => c.id === unrelated.id);
    }
    const teacherPeople = await api(teacher, '/api/v1/organization/people?page=1&pageSize=30');
    await evidence('teacher organization directory denied', teacherPeople);
    expect(teacherPeople.status()).toBe(403);
    const editor = await api(student, '/api/v1/academic/exams/' + examId + '/editor');
    await evidence('student answer-key editor denied', editor);
    expect(editor.status()).toBe(403);
    const parentClasses = await api(parent, '/api/v1/academic/classes');
    await evidence('parent general classes denied', parentClasses);
    expect(parentClasses.status()).toBe(403);
    const childless = await api(
      parent,
      '/api/v1/reports/parent/assignments?PageNumber=1&PageSize=30',
    );
    await evidence('parent without selected child', childless);
    expect(childless.status()).toBe(404);
    const session = await api(teacher, '/api/v1/academic/classes/' + id + '/sessions', 'POST', {
      title: 'جلسهٔ آزمایشی نقش معلم',
      startUtc: new Date(Date.now() + 3600000).toISOString(),
      endUtc: new Date(Date.now() + 7200000).toISOString(),
      timeZoneId: 'Asia/Tehran',
      meetingUrl: 'https://example.com/makan-qa',
    });
    await evidence('teacher creates assigned-class session', session);
    report.checks.teacherSessionCreated = session.ok();
    const classWrite = await api(teacher, '/api/v1/academic/classes', 'POST', {
      title: 'آزمون ساخت کلاس با نقش معلم — ' + Date.now(),
      academicPeriodId: source.academicPeriodId,
      courseId: source.courseId,
      capacity: 2,
      activateImmediately: true,
    });
    await evidence('teacher creates school class', classWrite);
    report.checks.teacherCanCreateClass = classWrite.ok();
    const resolved = await api(manager, '/api/v1/people/resolve', 'POST', {
      username: 'dev.Parent',
      phoneNumber: null,
    });
    const profile = await evidence('manager resolves seeded parent identity', resolved);
    report.checks.managerCanResolveParent = profile?.isDiscoverable === true;
    await api(student, '/api/v1/workspaces/select', 'POST', {
      workspaceType: 'Personal',
      membershipId: null,
      role: null,
    });
    const personal = await api(student, '/api/v1/academic/classes');
    await evidence('personal workspace school BFF denied', personal);
    expect(personal.status()).toBe(403);
    for (const [name, value] of Object.entries(report.checks))
      if (value === false)
        report.limitations.push(
          name + ' is not supported by this backend behavior; not a passing server capability.',
        );
  } finally {
    await writeFile('docs/school-access-qa.json', JSON.stringify(report, null, 2) + '\n');
    for (const context of contexts) {
      await context.request
        .post('/api/client/auth/logout', { headers: { Origin: origin } })
        .catch(() => {});
      await context.close();
    }
  }
});
