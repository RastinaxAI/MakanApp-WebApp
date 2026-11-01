import { test, expect, login, fixture, origin } from './test';
import { mkdir } from 'node:fs/promises';
const group = '00000000-0000-4000-8000-000000000950';
const base = '/personal/messages/' + group;
for (const kind of ['groups', 'channels'])
  test(`${kind}: two-step creation persists information and invited contacts, then creates once`, async ({
    page,
    context,
    request,
  }) => {
    await login(context, 'Teacher');
    await page.goto('/personal/messages/new?kind=' + kind);
    const label = kind === 'groups' ? 'گروه' : 'کانال';
    await page.getByLabel('نام ' + label, { exact: true }).fill('گفتگوی جدید آزمون');
    await page.getByLabel('توضیحات (اختیاری)', { exact: true }).fill('توضیحات حفظ‌شده');
    await expect(page.getByRole('heading', { name: 'اعضای اولیه از مخاطبین' })).toHaveCount(0);
    let state = await (await request.get(fixture + '/__test__/state')).json();
    expect(
      state.requests.filter((r: { path: string }) => r.path === '/api/v1/contacts'),
    ).toHaveLength(0);
    await page.getByRole('button', { name: 'انتخاب مخاطبین', exact: true }).click();
    await expect(page).toHaveURL(/step=members/);
    await page.getByRole('checkbox').first().check();
    await page.reload();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    await page.getByRole('button', { name: 'ویرایش', exact: true }).click();
    await expect(page.getByLabel('نام ' + label, { exact: true })).toHaveValue('گفتگوی جدید آزمون');
    await page.getByRole('button', { name: 'انتخاب مخاطبین', exact: true }).click();
    state = await (await request.get(fixture + '/__test__/state')).json();
    expect(
      state.requests.filter(
        (r: { path: string; method: string }) =>
          r.path === '/api/v1/conversations/' + kind && r.method === 'POST',
      ),
    ).toHaveLength(0);
    await page.getByRole('button', { name: 'ساخت ' + label, exact: true }).click();
    await expect(page).toHaveURL(/\/messages\/[a-f0-9-]{36}$/);
    state = await (await request.get(fixture + '/__test__/state')).json();
    const writes = state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path === '/api/v1/conversations/' + kind && r.method === 'POST',
    );
    expect(writes).toHaveLength(1);
    expect(writes[0].body.initialParticipantUserIds).toHaveLength(1);
    expect(writes[0].body.scope).toBe('Personal');
    const storage = await page.evaluate(() =>
      Object.keys(sessionStorage).filter((k) => k.startsWith('makan-create:')),
    );
    expect(storage).toHaveLength(0);
  });

test('unknown creation failure retries the identical operation after reload, without creating in the information step', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/messages/new?kind=groups');
  await page.getByLabel('نام گروه', { exact: true }).fill('بازیابی درخواست');
  await page.getByRole('button', { name: 'انتخاب مخاطبین', exact: true }).click();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/groups', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'ساخت گروه', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ویرایش', exact: true })).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'پیگیری همین درخواست', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'پیگیری همین درخواست', exact: true }).click();
  await expect(page).toHaveURL(/\/messages\/[a-f0-9-]{36}$/);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const writes = state.requests.filter(
    (r: { path: string; method: string }) =>
      r.path === '/api/v1/conversations/groups' && r.method === 'POST',
  );
  expect(writes).toHaveLength(2);
  expect(writes[1].body).toEqual(writes[0].body);
});

test('owner edits information, adds a contact, changes administrator role and removes membership with confirmed server responses', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await page.goto(base + '/edit');
  await page.getByLabel('نام گروه', { exact: true }).fill('نام تازهٔ گفتگو');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/info', method: 'PATCH', status: 503 },
  });
  await page.getByRole('button', { name: 'ذخیرهٔ اطلاعات', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('نام گروه', { exact: true })).toHaveValue('نام تازهٔ گفتگو');
  await page.getByRole('button', { name: 'ذخیرهٔ اطلاعات', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('اطلاعات گفتگو ذخیره شد.');
  await page.getByRole('link', { name: 'اعضا', exact: true }).click();
  await page.getByRole('button', { name: 'افزودن عضو', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('جستجوی عضو جدید').fill('Parent');
  await dialog.getByRole('button', { name: 'جستجو', exact: true }).click();
  await expect(dialog.getByText('کاربر آزمایشی Parent', { exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/members', method: 'POST', status: 503 },
  });
  await dialog.getByRole('button', { name: 'افزودن', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'افزودن', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'افزودن عضو', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'صفحهٔ بعد', exact: true }).click();
  await page.getByRole('button', { name: 'مدیریت عضو آزمایشی دوم', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'ارتقا به مدیر', exact: true }).click();
  await dialog.getByRole('button', { name: 'تأیید تغییر', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/عضو فعال · مدیر/)).toBeVisible();
  await page.getByRole('button', { name: 'مدیریت عضو آزمایشی دوم', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'حذف از گفتگو', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید تغییر', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/حذف‌شده/)).toBeVisible();
});

test('school Teacher cannot mutate another conversation owner data, including through direct API requests', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  const session = await login(context, 'Teacher');
  await page.goto(base + '/members');
  await expect(page.getByRole('button', { name: 'افزودن عضو', exact: true })).toHaveCount(0);
  const response = await context.request.patch(
    origin + '/api/client/backend/api/v1/conversations/' + group + '/info',
    {
      headers: { Origin: origin, 'X-Makan-Context': session.revision },
      data: { title: 'غیرمجاز', description: null, expectedVersion: '1' },
    },
  );
  expect(response.status()).toBe(403);
  await page.goto(base + '/edit');
  await expect(page.getByRole('button', { name: 'ذخیرهٔ اطلاعات', exact: true })).toHaveCount(0);
});

test('unified inbox includes direct and official conversations without a personal-school switch in three layouts', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/official-spaces', { data: {} });
  await login(context, 'Teacher');
  await page.goto('/personal/messages');
  const list = page.getByLabel('فهرست گفتگوها', { exact: true });
  await expect(list.getByText('استاد آزمایشی', { exact: true })).toHaveCount(0);
  await expect(list.getByText('دانشجوی آزمایشی', { exact: true })).toBeVisible();
  await expect(list.getByText('گروه کلاس ریاضی', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'فضای گفتگوها', exact: true })).toHaveCount(0);
  await mkdir('output/review/messenger-management', { recursive: true });
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `output/review/messenger-management/inbox-${width}.png` });
  }
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const scopes = state.requests
    .filter((r: { path: string }) => r.path === '/api/v1/conversations')
    .map((r: { query: { scope: string } }) => r.query.scope);
  expect(scopes).toContain('Personal');
  expect(scopes).toContain('Organization');
});

test('unified inbox exhausts scope pagination independently and retains earlier conversations', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/inbox-pages', {
    data: { personal: 31, organization: 1 },
  });
  await login(context, 'Teacher');
  await page.goto('/personal/messages');
  const list = page.getByLabel('فهرست گفتگوها', { exact: true });
  await expect(list.getByText('گفتگوی حساب 1', { exact: true })).toBeVisible();
  await expect(list.getByText('گفتگوی حساب 31', { exact: true })).toHaveCount(0);
  await list.getByRole('button', { name: 'گفتگوهای بیشتر', exact: true }).click();
  await expect(list.getByText('گفتگوی حساب 31', { exact: true })).toBeAttached();
  await expect(list.getByText('گفتگوی حساب 1', { exact: true })).toBeAttached();
  await expect(list.getByRole('button', { name: 'گفتگوهای بیشتر', exact: true })).toHaveCount(0);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const reads = state.requests.filter((r: { path: string }) => r.path === '/api/v1/conversations');
  expect(
    reads.some(
      (r: { query: { scope: string; page: string } }) =>
        r.query.scope === 'Personal' && r.query.page === '2',
    ),
  ).toBe(true);
  expect(
    reads.some(
      (r: { query: { scope: string; page: string } }) =>
        r.query.scope === 'Organization' && r.query.page === '2',
    ),
  ).toBe(false);
});

test('creation and member management remain usable in both themes across mobile tablet desktop', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await mkdir('output/review/messenger-management', { recursive: true });
  for (const theme of ['light', 'dark']) {
    await page.addInitScript((v) => localStorage.setItem('makan-theme', v), theme);
    for (const kind of ['groups', 'channels']) {
      await page.goto('/personal/messages/new?kind=' + kind);
      await page
        .getByLabel(kind === 'groups' ? 'نام گروه' : 'نام کانال', { exact: true })
        .fill('نام آزمایشی بسیار بلند برای بررسی نمایش درست اطلاعات گفتگو');
      for (const [width, height] of [
        [390, 844],
        [834, 1194],
        [1440, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const formBox = await page.getByRole('main').locator('form').boundingBox();
        expect(formBox!.width).toBeGreaterThanOrEqual(width >= 834 ? 600 : 300);
        await page.screenshot({
          path: `output/review/messenger-management/${kind}-info-${theme}-${width}.png`,
        });
      }
      await page.getByRole('button', { name: 'انتخاب مخاطبین', exact: true }).click();
      await expect(page.getByRole('checkbox').first()).toBeVisible();
      for (const [width, height] of [
        [390, 844],
        [834, 1194],
        [1440, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: `output/review/messenger-management/${kind}-contacts-${theme}-${width}.png`,
        });
      }
    }
    await request.post(fixture + '/__test__/conversation-details', { data: {} });
    await page.goto(base + '/members');
    await page.getByRole('button', { name: 'صفحهٔ بعد', exact: true }).click();
    await page.getByRole('button', { name: 'مدیریت عضو آزمایشی دوم', exact: true }).click();
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.getByRole('dialog')).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `output/review/messenger-management/member-dialog-${theme}-${width}.png`,
      });
    }
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'مدیریت عضو آزمایشی دوم', exact: true }),
    ).toBeFocused();
  }
});

test('a definitive invitation-required rejection preserves the draft and reopens contacts without replaying the denied operation', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/messages/new?kind=groups');
  await page.getByLabel('نام گروه', { exact: true }).fill('گروه نیازمند دعوت');
  await page.getByRole('button', { name: 'انتخاب مخاطبین', exact: true }).click();
  await page.getByRole('checkbox').first().check();
  await request.post(fixture + '/__test__/fault', {
    data: {
      path: '/groups',
      method: 'POST',
      status: 409,
      code: 'CONVERSATION_INVITATION_REQUIRED',
    },
  });
  await page.getByRole('button', { name: 'ساخت گروه', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'عضویت این مخاطب به دعوت و پذیرش او نیاز دارد',
  );
  await expect(page.getByRole('button', { name: 'پیگیری همین درخواست', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('checkbox').first()).toBeEnabled();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
  await page.getByRole('button', { name: 'ویرایش', exact: true }).click();
  await expect(page.getByLabel('نام گروه', { exact: true })).toHaveValue('گروه نیازمند دعوت');
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path === '/api/v1/conversations/groups' && r.method === 'POST',
    ),
  ).toHaveLength(1);
});
