import { test, expect, login, fixture, origin } from './test';
import { mkdir } from 'node:fs/promises';
const group = '00000000-0000-4000-8000-000000000950',
  source = '00000000-0000-4000-8000-000000001500',
  library = '00000000-0000-4000-8000-000000001503';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4hkAAAAASUVORK5CYII=',
  'base64',
);
const pdf = { name: 'source.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') };
test('source upload waits for Ready, then retries one frozen create operation after reload', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/resources');
  await page.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
  await page.getByLabel('عنوان منبع', { exact: true }).fill('منبع ثبت پایدار');
  await page.getByLabel('دلیل ثبت', { exact: true }).fill('آزمون ثبت منبع');
  await page.getByLabel('فایل منبع', { exact: true }).setInputFiles(pdf);
  await request.post(fixture + '/__test__/next-file-status', { data: { status: 'Pending' } });
  await page.getByRole('button', { name: 'ثبت منبع', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('فایل هنوز آماده نیست');
  let state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) => r.path === '/api/v1/sources' && r.method === 'POST',
    ),
  ).toHaveLength(0);
  await request.post(fixture + '/__test__/ready-files');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/sources', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'بررسی فایل و ثبت منبع', exact: true }).click();
  await expect(page.getByRole('button', { name: 'پیگیری ثبت منبع', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel('عنوان منبع', { exact: true })).toHaveValue('منبع ثبت پایدار');
  await page.getByRole('button', { name: 'پیگیری ثبت منبع', exact: true }).click();
  await expect(page).toHaveURL(/\/resources\/[a-f0-9-]{36}$/);
  await expect(page.getByText('هوش مصنوعی: آماده نیست', { exact: true })).toBeVisible();
  state = await (await request.get(fixture + '/__test__/state')).json();
  const creates = state.requests.filter(
    (r: { path: string; method: string }) => r.path === '/api/v1/sources' && r.method === 'POST',
  );
  expect(creates).toHaveLength(2);
  expect(creates[0].body).toEqual(creates[1].body);
  expect(creates[0].body.classId).toBeNull();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) => r.path === '/api/v1/files' && r.method === 'POST',
    ),
  ).toHaveLength(1);
});
test('source edit preserves text across opaque version conflict and explicitly adopts the refreshed version', async ({
  page,
  context,
}) => {
  const session = await login(context, 'Student', false);
  await page.goto('/personal/resources/' + source);
  await page.getByLabel('عنوان پیش‌نویس', { exact: true }).fill('نوشتهٔ حفظ‌شده');
  await page.getByLabel('دلیل تغییر', { exact: true }).fill('بازبینی');
  const external = await context.request.patch(
    origin + `/api/client/backend/api/v1/sources/${source}/draft`,
    {
      headers: { Origin: origin, 'X-Makan-Context': session.revision },
      data: {
        title: 'ویرایش هم‌زمان',
        description: null,
        reason: 'آزمون تعارض',
        expectedVersion: 'opaque-source-0',
      },
    },
  );
  expect(external.status()).toBe(200);
  // Replay may reveal the changed version before the user's save. Both paths
  // must preserve the draft and require explicit adoption of the new version.
  const adoptVersion = page.getByRole('button', {
    name: 'ادامهٔ ویرایش با نسخهٔ جدید',
    exact: true,
  });
  if (!(await adoptVersion.isVisible())) {
    try {
      await page
        .getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true })
        .click({ timeout: 1500 });
    } catch {
      await expect(adoptVersion).toBeVisible();
    }
  }
  await expect(adoptVersion).toBeVisible();
  await expect(page.getByLabel('عنوان پیش‌نویس', { exact: true })).toHaveValue('نوشتهٔ حفظ‌شده');
  await page.getByRole('button', { name: 'ادامهٔ ویرایش با نسخهٔ جدید', exact: true }).click();
  await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'نوشتهٔ حفظ‌شده', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'انتشار منبع', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByText(/منتشرشده · فعال/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'دریافت فایل منبع', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('sample.pdf');
});
test('Library stays metadata-only and forged binary transfer is denied', async ({
  page,
  context,
}) => {
  const session = await login(context, 'Student', false);
  await page.goto('/personal/resources');
  await page.getByRole('combobox', { name: 'فضای منابع', exact: true }).selectOption('Library');
  await page.getByRole('link', { name: 'کتابخانهٔ عمومی آزمایشی', exact: true }).click();
  await expect(page.getByText('این صفحه فقط اطلاعات کتابخانه را نمایش می‌دهد.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'دریافت فایل منبع', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('عنوان پیش‌نویس', { exact: true })).toHaveCount(0);
  expect(
    (
      await context.request.get(origin + `/api/client/source-files/${library}/content?revision=1`, {
        headers: { 'X-Makan-Context': session.revision },
      })
    ).status(),
  ).toBe(403);
});
test('assistant preflight preserves real source selection when retrieval is unavailable', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal/assistant');
  await request.post(fixture + '/__test__/source-ai-ready', { data: { sourceId: source } });
  await page.getByRole('button', { name: 'انتخاب منابع', exact: true }).click();
  const real = page.getByRole('region', { name: 'منابع متصل به سرور', exact: true });
  const selected = real.getByRole('checkbox', {
    name: 'انتخاب منبع واقعی منبع شخصی آزمایشی',
    exact: true,
  });
  await selected.check();
  await real.getByRole('button', { name: 'بررسی دسترسی منابع', exact: true }).click();
  await expect(real.getByRole('status')).toContainText(
    'بازیابی محتوای منابع برای هوش مصنوعی هنوز روی سرور فعال نیست',
  );
  await expect(selected).toBeChecked();
  const state = await (await request.get(fixture + '/__test__/state')).json(),
    ai = state.requests.filter((r: { path: string }) => r.path.startsWith('/api/v1/ai/'));
  expect(ai).toHaveLength(1);
  expect(ai[0].path).toBe('/api/v1/ai/sources/preflight');
  expect(ai[0].body.selectedSourceIds).toEqual([source]);
});
test('independent edit permission does not grant settings, members or invitations', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await request.post(fixture + '/__test__/release-154', {
    data: { capabilities: { '00000000-0000-4000-8000-000000000101': { canEditInfo: true } } },
  });
  await login(context, 'Student', false);
  await page.goto(`/personal/messages/${group}/edit`);
  await expect(page.getByLabel('نام گروه', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'لینک‌های دعوت', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'اعضا و مدیران', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'نوع گروه', exact: true })).toHaveCount(0);
  await page.getByLabel('نام گروه', { exact: true }).fill('ویرایش مجاز');
  await page.getByRole('button', { name: 'ذخیرهٔ اطلاعات', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('اطلاعات گفتگو ذخیره شد.');
});
test('conversation photo uses Ready file and opaque version; retry preserves one upload', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await page.goto(`/personal/messages/${group}/edit`);
  await page
    .getByLabel('انتخاب تصویر جدید', { exact: true })
    .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await request.post(fixture + '/__test__/next-file-status', { data: { status: 'Pending' } });
  await page.getByRole('button', { name: 'ثبت عکس گفتگو', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('عکس هنوز آماده نشده');
  await request.post(fixture + '/__test__/ready-files');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/photo', method: 'PUT', status: 412 },
  });
  await page.getByRole('button', { name: 'بررسی و ثبت عکس', exact: true }).click();
  await expect(page.getByAltText('پیش‌نمایش عکس گفتگو')).toBeVisible();
  await page.getByRole('button', { name: 'ثبت عکس گفتگو', exact: true }).click();
  await expect(page.getByRole('button', { name: 'حذف عکس گفتگو', exact: true })).toBeVisible();
  let state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) => r.path === '/api/v1/files' && r.method === 'POST',
    ),
  ).toHaveLength(1);
  const writes = state.requests.filter(
    (r: { path: string; method: string }) => r.path.endsWith('/photo') && r.method === 'PUT',
  );
  expect(writes).toHaveLength(2);
  expect(writes[0].body.expectedVersion).toBe('1');
  expect(writes[1].body.fileAssetId).toBe(writes[0].body.fileAssetId);
  await page.getByRole('button', { name: 'حذف عکس گفتگو', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByRole('button', { name: 'حذف عکس گفتگو', exact: true })).toHaveCount(0);
});
test('initial invitations are pending rather than active membership and use server expiry', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/release-154', { data: { pendingInitial: true } });
  await login(context, 'Student', false);
  await page.goto('/personal/messages/new?kind=groups');
  await page.getByLabel('نام گروه', { exact: true }).fill('دعوت در انتظار');
  await page.getByRole('button', { name: 'انتخاب مخاطبین', exact: true }).click();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'ساخت گروه', exact: true }).click();
  await expect(page.getByLabel('نتیجه اعضای اولیه', { exact: true })).toContainText(
    'این افراد هنوز عضو فعال نیستند',
  );
  await expect(page.getByText(/انقضای دعوت/)).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json(),
    create = state.requests.find(
      (r: { path: string; method: string }) =>
        r.path === '/api/v1/conversations/groups' && r.method === 'POST',
    );
  expect(Object.keys(create.body).some((key) => /expir|days/i.test(key))).toBe(false);
});
for (const role of ['Student', 'Teacher', 'Manager'])
  test(`${role} sees authorized class sources and only permitted upload controls`, async ({
    page,
    context,
  }) => {
    await login(context, role);
    await page.goto('/personal/resources');
    await page.getByRole('combobox', { name: 'فضای منابع', exact: true }).selectOption('Class');
    await page
      .getByRole('combobox', { name: 'کلاس منبع', exact: true })
      .selectOption('00000000-0000-4000-8000-000000000002');
    await expect(page.getByRole('link', { name: 'منبع آموزشی Class', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'افزودن منبع', exact: true })).toHaveCount(
      role === 'Student' ? 0 : 1,
    );
    if (role !== 'Student') {
      await page.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
      await expect(page.getByRole('region', { name: 'افزودن منبع', exact: true })).toBeVisible();
      await expect(page).toHaveURL(/scope=Class&classId=/);
      await page.goBack();
    }
    if (role === 'Manager') {
      await mkdir('output/review/release-154c437', { recursive: true });
      for (const width of [390, 834, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: `output/review/release-154c437/sources-${width}.png`,
          fullPage: true,
        });
      }
    }
  });

test('definitive source validation rejection unlocks the retained draft without uploading again', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/resources');
  await page.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
  await page.getByLabel('عنوان منبع', { exact: true }).fill('نیازمند اصلاح');
  await page.getByLabel('دلیل ثبت', { exact: true }).fill('ثبت آزمایشی');
  await page.getByLabel('فایل منبع', { exact: true }).setInputFiles(pdf);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/sources', method: 'POST', status: 400 },
  });
  await page.getByRole('button', { name: 'ثبت منبع', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('عنوان منبع', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('عنوان منبع', { exact: true })).toHaveValue('نیازمند اصلاح');
  await page.getByLabel('عنوان منبع', { exact: true }).fill('عنوان اصلاح‌شده');
  await page.getByRole('button', { name: 'ثبت منبع', exact: true }).click();
  await expect(page).toHaveURL(/resources\/[a-f0-9-]{36}$/);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const creates = state.requests.filter(
    (row: { path: string; method: string }) =>
      row.path === '/api/v1/sources' && row.method === 'POST',
  );
  expect(creates).toHaveLength(2);
  expect(creates[0].body.clientOperationId).not.toBe(creates[1].body.clientOperationId);
  expect(creates[0].body.fileAssetId).toBe(creates[1].body.fileAssetId);
  expect(
    state.requests.filter(
      (row: { path: string; method: string }) =>
        row.path === '/api/v1/files' && row.method === 'POST',
    ),
  ).toHaveLength(1);
});

test('source version conflict keeps its uploaded file and requires explicit review before a new version', async ({
  page,
  context,
  request,
}) => {
  const session = await login(context, 'Student', false);
  await page.goto('/personal/resources/' + source);
  const editor = page.getByRole('region', { name: 'نسخهٔ جدید منبع', exact: true });
  await editor.getByLabel('دلیل ثبت', { exact: true }).fill('نسخهٔ تازه');
  await editor.getByLabel('فایل منبع', { exact: true }).setInputFiles(pdf);
  const changed = await context.request.patch(
    origin + `/api/client/backend/api/v1/sources/${source}/draft`,
    {
      headers: { Origin: origin, 'X-Makan-Context': session.revision },
      data: {
        title: 'منبع شخصی آزمایشی',
        description: null,
        reason: 'ویرایش هم‌زمان',
        expectedVersion: 'opaque-source-0',
      },
    },
  );
  expect(changed.status()).toBe(200);
  await editor.getByRole('button', { name: 'ثبت نسخهٔ جدید', exact: true }).click();
  await expect(
    editor.getByRole('button', { name: 'بازبینی کردم؛ ادامهٔ نسخهٔ جدید', exact: true }),
  ).toBeVisible();
  await expect(editor.getByLabel('فایل منبع', { exact: true })).toBeDisabled();
  await editor
    .getByRole('button', { name: 'بازبینی کردم؛ ادامهٔ نسخهٔ جدید', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await editor.getByRole('button', { name: 'ثبت نسخهٔ جدید', exact: true }).click();
  await expect(page.getByText(/ویرایش ۲/)).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json(),
    versions = state.requests.filter(
      (row: { path: string; method: string }) =>
        row.path.endsWith('/sources/' + source + '/versions') && row.method === 'POST',
    );
  expect(versions).toHaveLength(2);
  expect(versions[0].body.fileAssetId).toBe(versions[1].body.fileAssetId);
  expect(versions[0].body.expectedVersion).not.toBe(versions[1].body.expectedVersion);
  expect(
    state.requests.filter(
      (row: { path: string; method: string }) =>
        row.path === '/api/v1/files' && row.method === 'POST',
    ),
  ).toHaveLength(1);
});
