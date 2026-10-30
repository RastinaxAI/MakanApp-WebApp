import { test, expect, login, fixture, origin, ids } from './test';
import { mkdir } from 'node:fs/promises';
const group = '00000000-0000-4000-8000-000000000970';
test('Manager opens the organization official group through its own binding', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/official-spaces', { data: {} });
  await login(context, 'Manager');
  await page.goto('/personal/education');
  await page
    .getByRole('region', { name: 'گروه و کانال رسمی آموزشگاه', exact: true })
    .getByRole('link', { name: 'ورود به گروه', exact: true })
    .click();
  await expect(page.getByText('گروه رسمی آموزشگاه', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
  // The home and room intentionally share a cached pair read. A second request
  // is required after a server capability change, not merely on navigation.
  await request.post(fixture + '/__test__/official-spaces', { data: { canRead: false } });
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toHaveCount(0);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string }) => r.path === '/api/v1/organization/official-spaces',
    ).length,
  ).toBeGreaterThanOrEqual(2);
});

for (const role of ['Student', 'Teacher', 'Parent', 'Manager'])
  test(`${role} retains the educational context while using personal capabilities`, async ({
    page,
    context,
    request,
  }) => {
    const before = await login(context, role);
    const initial = await (await request.get(fixture + '/__test__/state')).json();
    const selections = initial.requests.filter(
      (r: { path: string; method: string }) =>
        r.path === '/api/v1/workspaces/select' && r.method === 'POST',
    ).length;
    await page.goto('/personal/profile');
    const spaces = page.getByRole('region', { name: 'فضاهای من', exact: true });
    await expect(spaces.getByRole('button', { name: /حساب شخصی/ })).toHaveCount(0);
    await expect(spaces.getByRole('button', { name: /آموزشگاه/ })).toBeVisible();
    await page.goto('/personal/contacts');
    await expect(
      page.getByRole('button', { name: 'انتخاب فضا از پروفایل', exact: true }),
    ).toHaveCount(0);
    await page.goto('/personal/messages');
    await expect(
      page
        .getByRole('navigation', { name: 'فضای گفتگوها', exact: true })
        .getByRole('link', { name: 'شخصی', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    const after = await (await context.request.get(origin + '/api/client/session')).json();
    expect(after.context).toEqual(before.context);
    expect(after.revision).toBe(before.revision);
    const state = await (await request.get(fixture + '/__test__/state')).json();
    expect(
      state.requests.filter(
        (r: { path: string; method: string }) =>
          r.path === '/api/v1/workspaces/select' && r.method === 'POST',
      ),
    ).toHaveLength(selections);
    expect(
      state.requests.some(
        (r: { path: string; query: { scope?: string } }) =>
          r.path === '/api/v1/conversations' && r.query.scope === 'Personal',
      ),
    ).toBe(true);
    await expect
      .poll(async () => {
        const s = await (await request.get(fixture + '/__test__/state')).json();
        return new Set(
          s.requests
            .filter((r: { path: string }) => r.path === '/api/v1/realtime/changes')
            .map((r: { query: { scope?: string } }) => r.query.scope ?? 'Current'),
        ).size;
      })
      .toBe(2);
  });

test('a roleless user has a personal card; unresolved visibility is not guessed', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Personal', false);
  await page.goto('/personal/profile');
  const spaces = page.getByRole('region', { name: 'فضاهای من', exact: true });
  await expect(spaces.getByRole('button', { name: /حساب شخصی/ })).toBeVisible();
  await request.post(fixture + '/__test__/workspace-visibility', { data: { unresolved: true } });
  await page.reload();
  await expect(spaces.getByRole('button', { name: /حساب شخصی/ })).toHaveCount(0);
  await expect(spaces.getByRole('status')).toContainText('وضعیت نمایش فضای شخصی هنوز مشخص نشده');
  await page.goto('/personal/contacts');
  await expect(page.getByRole('button', { name: 'مخاطب جدید', exact: true })).toBeVisible();
});

test('Teacher sends a personal message and uploads a personal file without switching educational context', async ({
  page,
  context,
  browser,
  request,
}) => {
  const student = await browser.newContext({ baseURL: origin });
  try {
    await login(student, 'Student');
    const before = await login(context, 'Teacher');
    await page.goto('/personal/contacts');
    await page.getByRole('button', { name: 'مخاطب جدید', exact: true }).click();
    await page.getByLabel('شماره یا نام کاربری مخاطب', { exact: true }).fill('@test.Student');
    await page.getByRole('button', { name: 'پیدا کردن مخاطب', exact: true }).click();
    await page.getByRole('button', { name: 'شروع گفت‌وگو', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'متن پیام', exact: true })
      .fill('پیام شخصی با حفظ نقش استاد');
    await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
    await expect(page.getByLabel('پیام‌های گفتگو', { exact: true })).toContainText(
      'پیام شخصی با حفظ نقش استاد',
    );
    const upload = await context.request.post(
      origin + `/api/client/files?conversationId=${ids.chat}`,
      {
        headers: { Origin: origin, 'X-Makan-Context': before.revision },
        multipart: {
          File: {
            name: 'personal.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('personal-file-content'),
          },
        },
      },
    );
    expect(upload.status(), await upload.text()).toBe(201);
    const file = await upload.json();
    expect(file.organizationId).toBeNull();
    const download = await context.request.get(
      origin + `/api/client/files/${file.id}/content?conversationId=${ids.chat}`,
      { headers: { 'X-Makan-Context': before.revision } },
    );
    expect(download.status()).toBe(200);
    expect((await download.body()).toString()).toBe('personal-file-content');
    const after = await (await context.request.get(origin + '/api/client/session')).json();
    expect(after.context).toEqual(before.context);
    expect(after.revision).toBe(before.revision);
    const state = await (await request.get(fixture + '/__test__/state')).json();
    expect(
      state.requests.some(
        (r: { path: string; query: { workspaceScope?: string } }) =>
          r.path === '/api/v1/files' && r.query.workspaceScope === 'Personal',
      ),
    ).toBe(true);
  } finally {
    await student.close();
  }
});

test('official pair keeps a healthy group available, shows a structured card and reauthorizes its source', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/official-spaces', {
    data: { channelState: 'RepairRequired' },
  });
  await login(context, 'Teacher');
  await page.goto(`/personal/education/classes/${ids.class}?tab=lessons`);
  const pair = page.getByRole('region', { name: 'گروه و کانال رسمی کلاس', exact: true });
  await expect(pair.getByRole('link', { name: 'ورود به گروه', exact: true })).toBeVisible();
  await expect(pair.getByText('نیازمند بررسی آموزشگاه', { exact: true })).toBeVisible();
  await pair.getByRole('link', { name: 'ورود به گروه', exact: true }).click();
  const card = page.getByRole('region', { name: 'اعلان رسمی تکلیف', exact: true });
  await expect(card).toContainText('تکلیف جدید معلم');
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
  await mkdir('output/review/release-42c', { recursive: true });
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `output/review/release-42c/activity-${width}.png` });
  }
  await card.getByRole('link', { name: 'مشاهدهٔ تکلیف', exact: true }).click();
  await expect(page).toHaveURL(`/personal/education/assignments/${ids.assignment}`);
  await expect(page.getByRole('heading', { name: 'تکلیف آزمایشی', exact: true })).toBeVisible();
  const delivery = page.getByRole('region', { name: 'اطلاع‌رسانی انتشار', exact: true });
  await expect(delivery).toContainText('اعلان درج شده است');
  await expect(delivery).toContainText('در انتظار درج اعلان');
  await page.goto(`/personal/education/lessons/${ids.lesson}`);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.some(
      (r: { path: string; query: { kind?: string } }) =>
        r.path.endsWith('/activities') && r.query.kind === 'Lesson',
    ),
  ).toBe(false);
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path.includes('/official-spaces') && r.method !== 'GET',
    ),
  ).toHaveLength(0);
});

test('Ready without read permission and parent relationship never grant official access', async ({
  page,
  context,
  request,
  browser,
}) => {
  await request.post(fixture + '/__test__/official-spaces', { data: { canRead: false } });
  await login(context, 'Teacher');
  await page.goto(`/personal/education/classes/${ids.class}`);
  const pair = page.getByRole('region', { name: 'گروه و کانال رسمی کلاس', exact: true });
  await expect(pair.getByRole('link')).toHaveCount(0);
  await expect(pair.getByRole('button', { name: 'دسترسی ندارید', exact: true })).toHaveCount(2);
  await page.goto(`/personal/messages/${group}?view=organization`);
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toHaveCount(0);
  const parent = await browser.newContext({ baseURL: origin });
  try {
    const p = await login(parent, 'Parent');
    const denied = await parent.request.get(
      origin + `/api/client/backend/api/v1/organization/classes/${ids.class}/official-spaces`,
      { headers: { 'X-Makan-Context': p.revision } },
    );
    expect(denied.status()).toBe(403);
  } finally {
    await parent.close();
  }
});

test('revocation removes open official content while personal messaging remains available', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/official-spaces', { data: {} });
  const original = await login(context, 'Teacher');
  await page.goto(`/personal/messages/${group}?view=organization`);
  await expect(page.getByRole('region', { name: 'اعلان رسمی تکلیف', exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/official-spaces', { data: { revoked: true } });
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('region', { name: 'اعلان رسمی تکلیف', exact: true })).toHaveCount(0);
  await page.goto('/personal/messages');
  await expect(
    page
      .getByRole('navigation', { name: 'فضای گفتگوها', exact: true })
      .getByRole('link', { name: 'شخصی', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  const after = await (await context.request.get(origin + '/api/client/session')).json();
  expect(after.context).toEqual(original.context);
});

test('superseded cards disable the old CTA and refresh current activity and source without republishing', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/official-spaces', {
    data: { cardState: 'Superseded', actionable: false },
  });
  await login(context, 'Student');
  await page.goto(`/personal/messages/${group}?view=organization`);
  const card = page.getByRole('region', { name: 'اعلان رسمی تکلیف', exact: true });
  await expect(
    card.getByRole('button', { name: 'این نسخه قابل استفاده نیست', exact: true }),
  ).toBeDisabled();
  await expect(card.getByRole('link')).toHaveCount(0);
  await card.getByRole('button', { name: 'بررسی نسخهٔ جاری', exact: true }).click();
  await expect
    .poll(async () => {
      const s = await (await request.get(fixture + '/__test__/state')).json();
      return s.requests.some(
        (r: { path: string }) => r.path === `/api/v1/academic/assignments/${ids.assignment}`,
      );
    })
    .toBe(true);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(state.requests.some((r: { path: string }) => r.path.includes('/activities/'))).toBe(true);
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) => r.path.endsWith('/publish') && r.method === 'POST',
    ),
  ).toHaveLength(0);
});
