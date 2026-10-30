import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';

test('one workspace click enters it once; a failed switch never claims entry', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.goto('/personal/workspaces');
  await expect(page.getByRole('button', { name: 'ادامه در این فضا', exact: true })).toHaveCount(0);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/workspaces/select', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: /آموزشگاه آفتاب/ }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ has: page.getByRole('heading', { name: 'اطلاعات دریافت نشد', exact: true }) }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/personal\/workspaces$/);
  const failed = await (await context.request.get('/api/client/session')).json();
  expect(failed.context.workspaceType).toBe('Personal');
  await page.reload();
  await expect(page.getByRole('button', { name: /آموزشگاه آفتاب/ })).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/workspaces/select', method: 'POST', delay: 600 },
  });
  await page.getByRole('button', { name: /آموزشگاه آفتاب/ }).evaluate((el: HTMLButtonElement) => {
    el.click();
    el.click();
  });
  await expect(page).toHaveURL(/\/personal$/);
  await expect(page.getByRole('heading', { name: 'نمای آموزشگاه', exact: true })).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path.endsWith('/workspaces/select') && r.method === 'POST',
    ),
  ).toHaveLength(2);
});

test('Parent chooses a child in a selector; switching hides previous content and failure preserves the selected child', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  const sara = '00000000-0000-4000-8000-000000000501',
    ali = '00000000-0000-4000-8000-000000000502';
  await request.post(fixture + '/__test__/parent-children', {
    data: {
      children: [
        { learnerOrganizationPersonId: sara, displayName: 'سارا احمدی' },
        { learnerOrganizationPersonId: ali, displayName: 'علی احمدی' },
        {
          learnerOrganizationPersonId: '00000000-0000-4000-8000-000000000503',
          displayName: 'فرزند آموزشگاه دیگر',
          organizationId: '00000000-0000-4000-8000-000000000099',
        },
      ],
    },
  });
  await login(context, 'Parent');
  await page.goto('/personal');
  const select = page.getByRole('combobox', { name: 'انتخاب فرزند', exact: true });
  await expect(select).toHaveValue('');
  await expect(select.getByRole('option', { name: 'فرزند آموزشگاه دیگر' })).toHaveCount(0);
  await select.selectOption(sara);
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: `/children/${ali}/select`, method: 'POST', delay: 1200, status: 503 },
  });
  await select.selectOption(ali);
  await expect(select).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole('alert')
      .filter({ has: page.getByRole('heading', { name: 'اطلاعات دریافت نشد', exact: true }) }),
  ).toBeVisible();
  await expect(select).toHaveValue(sara);
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
  await select.selectOption(ali);
  await expect(page.getByRole('heading', { name: 'علی احمدی', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toHaveCount(0);
  await expect(select).toHaveValue(ali);
  await mkdir('test-results/workspace-child-attachments', { recursive: true });
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/workspace-child-attachments/parent-${width}.png`,
      fullPage: true,
    });
  }
});

test('Teacher manages ready attachments, retains them after failure, checks Pending and saves only accepted files', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Teacher');
  await page.goto(`/personal/education/classes/${ids.class}/lessons/new`);
  await page.getByLabel('عنوان درس و جزوه', { exact: true }).fill('درس با پیوست‌های آماده');
  const picker = page.getByLabel('پیوست درس', { exact: true });
  const panel = page.getByRole('region', { name: 'پیوست‌های درس', exact: true });
  const file = (name: string) => ({
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7 test lesson\n%%EOF'),
  });
  const save = page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true });
  const chooser = page.waitForEvent('filechooser');
  await panel.getByRole('button', { name: 'انتخاب فایل', exact: true }).click();
  await (await chooser).setFiles(file('lesson.pdf'));
  await expect(panel.getByText('lesson.pdf', { exact: true })).toBeVisible();
  await expect(panel.getByText(/آمادهٔ ذخیره/)).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/api/v1/files', method: 'POST', status: 503 },
  });
  await picker.setInputFiles(file('failed.pdf'));
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(panel.getByText('lesson.pdf', { exact: true })).toBeVisible();
  await expect(panel.getByText('failed.pdf', { exact: true })).toHaveCount(0);
  await request.post(fixture + '/__test__/next-file-status', { data: { status: 'Pending' } });
  await picker.setInputFiles(file('pending.pdf'));
  await expect(panel.getByRole('button', { name: 'بررسی وضعیت فایل', exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  await request.post(fixture + '/__test__/ready-files');
  await panel.getByRole('button', { name: 'بررسی وضعیت فایل', exact: true }).click();
  await expect(save).toBeEnabled();
  await expect(
    panel.getByRole('button', { name: 'حذف پیوست pending.pdf', exact: true }),
  ).toBeVisible();
  await panel.getByRole('button', { name: 'حذف پیوست lesson.pdf', exact: true }).click();
  await expect(panel.getByText('lesson.pdf', { exact: true })).toHaveCount(0);
  await mkdir('test-results/workspace-child-attachments', { recursive: true });
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await panel.scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/workspace-child-attachments/teacher-files-${width}.png`,
    });
  }
  await save.click();
  await expect(page).toHaveURL(/\/lessons\/.+\/review$/);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const create = state.requests.find(
    (r: { path: string; method: string }) =>
      r.path.endsWith(`/classes/${ids.class}/lessons`) && r.method === 'POST',
  );
  expect(create.body.fileAssetIds).toHaveLength(1);
  const saved = await (await context.request.get('/api/client/session')).json();
  const lessonId = page.url().split('/').at(-2);
  const lesson = await (
    await context.request.get(`/api/client/backend/api/v1/academic/lessons/${lessonId}`, {
      headers: { 'X-Makan-Context': saved.revision },
    })
  ).json();
  expect(lesson.attachments.map((a: { fileName: string }) => a.fileName)).toEqual(['pending.pdf']);
});
