import { test, expect, login, fixture, origin } from './test';
import * as copy from '@/content/fa';
import { draftPrefix } from '@/lib/draft-storage';
import { mkdir } from 'node:fs/promises';
const t = copy.integration80c,
  cid = '00000000-0000-4000-8000-000000001800',
  aid = '00000000-0000-4000-8000-000000001803',
  eid = '00000000-0000-4000-8000-000000001806',
  base = '/personal/extracurricular/classes/' + cid;
const api = '/api/client/backend/api/v1/personal-classes';
test('formation survives a lost acknowledgement and submits the same server draft once', async ({
  page,
  context,
  request,
}) => {
  const session = await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: {} });
  await context.addInitScript(
    ({ key, draft }) =>
      !sessionStorage.getItem(key) &&
      sessionStorage.setItem(key, JSON.stringify({ version: 1, draft })),
    {
      key: draftPrefix + 'extracurricular:' + session.user.id,
      draft: {
        title: 'درخواست جدید تست',
        description: 'شرح کافی برای تشکیل کلاس مستقل و بررسی قرارداد جدید سرویس',
        subject: 'یادگیری گروهی',
        capacity: '۲۰',
        level: 'عمومی',
        admission: 'با پذیرش دعوت',
        managerUserId: session.user.id,
        teacherUserId: '',
        allowInvites: true,
        allowRequests: true,
        acceptedRules: true,
      },
    },
  );
  let lost = false;
  await page.route('**/api/client/backend/api/v1/personal-class-requests', async (route) => {
    if (route.request().method() === 'POST' && !lost) {
      lost = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.goto('/personal/extracurricular/requests/new?step=management');
  await page.getByRole('radio').nth(1).click();
  const teacherDialog = page.getByRole('dialog');
  await teacherDialog.getByLabel(t.target, { exact: true }).fill('09120000102');
  await teacherDialog.getByRole('button', { name: t.chooseTeacher, exact: true }).click();
  await expect(teacherDialog).toBeHidden();
  await page.goto('/personal/extracurricular/requests/new?step=review');
  await page.getByRole('button', { name: t.draft, exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: t.draft, exact: true }).click();
  await expect(page).toHaveURL(/\/requests\/[a-f0-9-]{36}$/);
  await page.getByRole('button', { name: t.submit, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /تأیید/ }).click();
  await expect(page.getByText(t.states.Submitted, { exact: true }).first()).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const creates = state.requests.filter(
    (r: { path: string; method: string }) =>
      r.path === '/api/v1/personal-class-requests' && r.method === 'POST',
  );
  expect(creates).toHaveLength(2);
  expect(creates[0].body).toEqual(creates[1].body);
  expect(creates[0].body.details.suggestedCapacity).toBe(20);
  expect(creates[0].body.details.suggestedTeacherUserId).toBe(
    '00000000-0000-4000-8000-000000000102',
  );
  expect(creates[0].body.details).not.toHaveProperty('organizationId');
});
test('formation list uses server pages and resets the page on status change', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: { requests: true } });
  await page.goto('/personal/extracurricular/requests');
  await expect(page.getByRole('link', { name: /درخواست 0/ })).toBeVisible();
  await page.getByRole('button', { name: /صفحه.*بعد/ }).click();
  await expect(page.getByRole('link', { name: /درخواست 30/ })).toBeVisible();
  await page.getByLabel(t.status, { exact: true }).selectOption('Submitted');
  await expect(page.getByText(t.noRequests)).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.some(
      (r: { query: { page: string; status: string } }) =>
        r.query?.page === '1' && r.query?.status === 'Submitted',
    ),
  ).toBe(true);
});
test('settings preserve edits after a real stale-version conflict and require review', async ({
  page,
  context,
  request,
}) => {
  const session = await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: {} });
  await page.goto(base + '/edit');
  await page.getByLabel(t.capacity, { exact: true }).fill('25');
  const form = page.locator('form').filter({ has: page.getByLabel(t.capacity, { exact: true }) });
  await form.getByLabel(t.reason).fill('تنظیم ظرفیت');
  expect(
    (
      await context.request.put(origin + api + '/' + cid + '/settings', {
        headers: { Origin: origin, 'X-Makan-Context': session.revision },
        data: {
          expectedVersion: 'MDAwMDAwMDE=',
          capacity: 22,
          acceptingJoinRequests: true,
          reason: 'ویرایش هم‌زمان',
        },
      })
    ).status(),
  ).toBe(200);
  await form.getByRole('button', { name: t.save, exact: true }).click();
  await expect(page.getByText(t.versionConflict).first()).toBeVisible();
  await expect(page.getByLabel(t.capacity, { exact: true })).toHaveValue('25');
  await form.getByRole('button', { name: t.refresh, exact: true }).click();
  await form.getByRole('button', { name: t.save, exact: true }).click();
  await expect(page.getByText(t.changed, { exact: true }).first()).toBeVisible();
});
test('a personal invitation is pending until explicitly accepted, and can be declined', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await request.post(fixture + '/__test__/personal-class', { data: { invitation: true } });
  await page.goto('/personal/extracurricular/invitations');
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: t.decline, exact: true }) });
  await form.getByLabel(t.reason).fill('زمان مناسب نیست');
  await form.getByRole('button', { name: t.decline, exact: true }).click();
  await expect(page.getByText(t.states.Declined, { exact: true })).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(state.requests.filter((r: { path: string }) => r.path.endsWith('/accept'))).toHaveLength(
    0,
  );
});
test('space repair accepts an empty 202 and keeps provisioning separate from success', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: {} });
  await page.goto(base + '/setup');
  await page.getByLabel(t.reason).fill('پیگیری آماده‌سازی');
  await page.getByRole('button', { name: t.repair, exact: true }).click();
  await expect(page.getByText(t.repairPending)).toBeVisible();
  await expect(page.getByText(t.states.Pending, { exact: true })).toBeVisible();
});
test('educational grants send both versions and do not derive permission from a teacher role', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: {} });
  await page.goto(base + '/members');
  const form = page.locator('form').filter({ has: page.getByLabel(t.grants, { exact: true }) });
  await form.getByLabel(t.grants, { exact: true }).selectOption(['AuthorAssignments', 'Grade']);
  await form.getByLabel(t.reason).fill('اختیار صریح آموزشی');
  await form.getByRole('button', { name: t.save, exact: true }).click();
  await expect(page.getByText(t.changed, { exact: true }).first()).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const command = state.requests.find(
    (r: { path: string; method: string }) =>
      r.method === 'PUT' && r.path.includes('/academic-permissions/'),
  );
  expect(command.body.expectedMembershipVersion).toBe('MDAwMDAwMDE=');
  expect(command.body.expectedGrantVersion).toBeNull();
  expect(command.body.capabilities).toBe('AuthorAssignments, Grade');
  expect(command.body.clientOperationId).toMatch(/^[a-f0-9-]{36}$/);
});
test('organization Teacher does not gain independent authoring without the returned capability', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Teacher', true);
  await request.post(fixture + '/__test__/personal-class', {
    data: { capabilities: { canAuthorAssignments: false, canAuthorExams: false, canGrade: false } },
  });
  await page.goto(base + '/assignments');
  await expect(page.getByRole('link', { name: t.authorAssignments, exact: true })).toHaveCount(0);
  await page.goto(base + '/assignments/new');
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel(copy.text_c864088e1061)).toHaveCount(0);
  await page.route(
    '**/api/client/backend/api/v1/academic/exams/*/student-preview',
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.exam.classRef = { kind: 'PersonalClass', classId: cid.replace('1800', '1809') };
      await route.fulfill({ response, json: body });
    },
  );
  await page.goto(base + '/exams/' + eid);
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByRole('button', { name: copy.text_974bdfc23e33, exact: true })).toHaveCount(
    0,
  );
});
test('personal learner saves and submits an independent assignment without school context', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', {
    data: { capabilities: { canAuthorAssignments: false, canAuthorExams: false, canGrade: false } },
  });
  await page.goto(base + '/assignments/' + aid + '/answer');
  const begin = page.getByRole('button', { name: copy.text_42c85a968ff2, exact: true });
  await expect(begin).toBeEnabled();
  await begin.click();
  await page
    .getByLabel(copy.text_e9579f397088, { exact: true })
    .fill('پاسخ ذخیره‌شده در کلاس مستقل');
  await page.getByRole('button', { name: copy.text_3377c18a0960, exact: true }).click();
  await page.getByRole('button', { name: copy.text_2f5412466e47, exact: true }).click();
  await expect(page).toHaveURL(/\/review\?attempt=/);
  const submit = page.getByRole('button', { name: /ارسال نهایی|تحویل نهایی/ }).first();
  await submit.click();
  await expect(page).toHaveURL(/\/receipt\?attempt=/);
  await expect(page.getByText(copy.text_db45f95e898b, { exact: true })).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter((r: { path: string }) => r.path.startsWith('/api/v1/organization/')),
  ).toHaveLength(0);
});
test('personal learner starts and resumes an exam with a server deadline', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', {
    data: { capabilities: { canAuthorAssignments: false, canAuthorExams: false, canGrade: false } },
  });
  await page.goto(base + '/exams/' + eid);
  await page.getByRole('button', { name: copy.text_974bdfc23e33, exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('پاسخ کوتاه بنویسید', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByLabel(/پاسخ پرسش/).fill('پاسخ پذیرفته‌شدهٔ آزمون مستقل');
  await page.getByRole('button', { name: /ذخیرهٔ پاسخ/ }).click();
  await page.getByRole('button', { name: 'مرور و تحویل آزمون', exact: true }).click();
  await page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'آزمون ثبت نهایی شد', exact: true }),
  ).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path.endsWith('/attempts/start') && r.method === 'POST',
    ),
  ).toHaveLength(1);
});
test('independent assignment files bind to the actual class, attach only after Ready and download through ACL', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', {
    data: { capabilities: { canAuthorAssignments: false, canAuthorExams: false, canGrade: false } },
  });
  await page.goto(base + '/assignments/' + aid + '/answer');
  await page.getByRole('button', { name: copy.text_42c85a968ff2, exact: true }).click();
  await page.getByLabel(copy.text_35cb5e51737d, { exact: true }).setInputFiles({
    name: 'independent.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-independent'),
  });
  await expect(page.getByText('independent.pdf', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: copy.text_1e229eb338a6 + 'independent.pdf', exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe('independent.pdf');
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const upload = state.requests.find(
    (r: { path: string; method: string }) => r.path === '/api/v1/files' && r.method === 'POST',
  );
  expect(upload.query.workspaceScope).toBe('Personal');
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path.endsWith('/attachments') && r.method === 'POST',
    ),
  ).toHaveLength(1);
});
test('revoked independent membership removes the previously loaded content', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: {} });
  await page.goto(base + '/assignments');
  await expect(page.getByText('تکلیف مستقل واقعی', { exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/personal-class-revoke');
  await page.reload();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByText('تکلیف مستقل واقعی', { exact: true })).toHaveCount(0);
});
test('new connected views keep mobile tablet desktop bounds and actual theme', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await request.post(fixture + '/__test__/personal-class', { data: {} });
  await mkdir('output/review/integration-80c', { recursive: true });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 390, 834, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, path] of [
        ['requests', '/personal/extracurricular/requests'],
        ['members', base + '/members'],
        ['learning', base + '/assignments'],
      ]) {
        await page.goto(path);
        await expect(
          page
            .getByRole('heading', {
              name: name === 'requests' ? t.requests : 'کلاس مستقل قرارداد جدید',
              exact: true,
            })
            .first(),
        ).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        if (name === 'members')
          await expect(page.getByLabel(t.grants, { exact: true })).toBeVisible();
        if (name === 'learning')
          await expect(page.getByText('تکلیف مستقل واقعی', { exact: true })).toBeVisible();
        await page.screenshot({
          path: `output/review/integration-80c/${theme}-${name}-${width}.png`,
          fullPage: true,
        });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true);
      }
    }
  }
});
