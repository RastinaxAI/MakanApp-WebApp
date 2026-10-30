import { test, expect, login, fixture, ids, origin } from './test';
import { mkdir } from 'node:fs/promises';
const base = '/personal/education',
  id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('multi-selection preserves successful members and retries only unresolved additions', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/manager-case');
  await login(context, 'Manager');
  await page.goto(`${base}/classes/${ids.class}/teachers/new`);
  for (const name of ['معلم اول', 'معلم دوم'])
    await page.getByRole('checkbox', { name: 'انتخاب ' + name, exact: true }).check();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/teachers', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'افزودن ۲ نفر به کلاس', exact: true }).click();
  await expect(page.getByText('به کلاس اضافه شد', { exact: true })).toHaveCount(1);
  await expect(page.getByText('ثبت تأیید نشد؛ وضعیت را بررسی کنید', { exact: true })).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'بررسی و تلاش دوباره', exact: true }).click();
  await expect(page.getByText('به کلاس اضافه شد', { exact: true })).toHaveCount(2);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const commands = state.requests.filter(
    (r: { path: string; method: string }) => r.path.endsWith('/teachers') && r.method === 'POST',
  );
  expect(commands).toHaveLength(3);
  expect(
    commands.filter(
      (r: { body: { teacherMembershipId: string } }) => r.body.teacherMembershipId === id(821),
    ),
  ).toHaveLength(1);
});
test('Manager has a dedicated workspace and reports; other roles cannot enter manager reports', async ({
  page,
  context,
  request,
  browser,
}) => {
  await request.post(fixture + '/__test__/manager-case');
  await login(context, 'Manager');
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'مدیریت آموزشگاه', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'بخش‌های آموزشگاه' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ایجاد کلاس', exact: true })).toBeVisible();
  await mkdir('test-results/manager-workspace', { recursive: true });
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: `test-results/manager-workspace/dashboard-${width}.png` });
  }
  await page.goto(base + '/reports');
  const filteredRequest = page.waitForRequest(
    (r) =>
      r.url().includes('/reports/manager/teacher-workload') &&
      new URL(r.url()).searchParams.get('ClassId') === ids.class,
  );
  await page.getByLabel('کلاس گزارش', { exact: true }).selectOption(ids.class);
  await filteredRequest;
  for (const name of ['حضور کلاس‌ها', 'تکلیف‌ها و آزمون‌ها', 'ثبت‌نام‌ها']) {
    await page
      .getByRole('navigation', { name: 'نوع گزارش مدیر' })
      .getByRole('link', { name, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'گزارشی در این محدوده ثبت نشده است', exact: true }),
    ).toBeVisible();
  }
  await page.goto(base + '/members');
  for (const [role, name] of [
    ['Teacher', 'معلم اول'],
    ['Student', 'دانش‌آموز دوم'],
    ['Parent', 'والد آزمایشی'],
  ]) {
    await page
      .getByRole('group', { name: 'نقش اعضا' })
      .getByRole('button', {
        name: (
          { Teacher: 'معلمان', Student: 'دانش‌آموزان', Parent: 'والدین' } as Record<string, string>
        )[role],
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('cell').filter({ has: page.getByText(name, { exact: true }) }),
    ).toBeVisible();
  }
  for (const role of ['Teacher', 'Student', 'Parent']) {
    const other = await browser.newContext({ baseURL: origin });
    try {
      const state = await login(other, role);
      const p = await other.newPage();
      await p.goto(base + '/reports');
      await expect(p.getByRole('main').getByRole('alert')).toContainText('دسترسی محدود');
      expect(
        (
          await other.request.get(
            origin +
              '/api/client/backend/api/v1/reports/manager/teacher-workload?PageNumber=1&PageSize=30',
            { headers: { 'X-Makan-Context': state.revision } },
          )
        ).status(),
      ).toBe(403);
    } finally {
      await other.close();
    }
  }
});
test('Manager creates a class, assigns multiple teachers and students, then removes only the selected class relationships', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/manager-case');
  await login(context, 'Manager');
  await page.goto(base + '/classes/new');
  await page.getByLabel('نام کلاس', { exact: true }).fill('کلاس مدیریت چندعضوی');
  await page.getByLabel('ظرفیت کلاس', { exact: true }).fill('20');
  await page.getByLabel('درس از کاتالوگ', { exact: true }).selectOption({ label: 'ریاضی' });
  await page.getByLabel('دوره از کاتالوگ', { exact: true }).selectOption({ label: 'دورهٔ نمونه' });
  await page.getByRole('button', { name: 'بازبینی اطلاعات', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید و ثبت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'کلاس ایجاد شد', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'انتخاب معلمان کلاس', exact: true }).click();
  await expect(page).toHaveURL(/\/classes\/[0-9a-f-]+\/teachers\/new$/);
  const classId = page.url().split('/classes/')[1].split('/')[0];
  for (const name of ['معلم اول', 'معلم دوم'])
    await page.getByRole('checkbox', { name: 'انتخاب ' + name, exact: true }).check();
  await page.getByRole('button', { name: 'افزودن ۲ نفر به کلاس', exact: true }).click();
  await expect(page.getByText('به کلاس اضافه شد', { exact: true })).toHaveCount(2);
  await page.goto(`${base}/classes/${classId}/enrollments/new`);
  for (const name of ['دانش‌آموز اول', 'دانش‌آموز دوم'])
    await page.getByRole('checkbox', { name: 'انتخاب ' + name, exact: true }).check();
  await page.getByRole('button', { name: 'افزودن ۲ نفر به کلاس', exact: true }).click();
  await expect(page.getByText('به کلاس اضافه شد', { exact: true })).toHaveCount(2);
  await page.goto(`${base}/classes/${classId}`);
  await expect(page.getByRole('cell', { name: 'دانش‌آموز دوم', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'نوع اعضای کلاس' })
    .getByRole('link', { name: 'معلمان', exact: true })
    .click();
  await expect(page.getByRole('cell', { name: 'معلم اول', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ایجاد جلسه', exact: true })).toHaveCount(0);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/end', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'حذف از کلاس · معلم اول', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'حذف از این کلاس', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'حذف از این کلاس', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'حذف از کلاس · معلم اول', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'حذف از کلاس · معلم دوم', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'نوع اعضای کلاس' })
    .getByRole('link', { name: 'دانش‌آموزان', exact: true })
    .click();
  await page.getByRole('button', { name: 'حذف از کلاس · دانش‌آموز اول', exact: true }).click();
  await dialog.getByRole('button', { name: 'حذف از این کلاس', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'انصراف از کلاس', exact: true })).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string; method: string }) =>
        r.path.endsWith('/enrollments') && r.method === 'POST',
    ),
  ).toHaveLength(2);
  expect(
    state.requests.some(
      (r: { body: { finalStatus?: string } }) => r.body?.finalStatus === 'Withdrawn',
    ),
  ).toBe(true);
  await page
    .getByRole('navigation', { name: 'بخش‌های مدیریت کلاس' })
    .getByRole('link', { name: 'عملکرد کلاس', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'گزارش عملکرد کلاس', exact: true })).toBeVisible();
  await expect(page.getByText('هنوز محاسبه نشده', { exact: true })).toHaveCount(2);
  await page
    .getByRole('navigation', { name: 'بخش‌های مدیریت کلاس' })
    .getByRole('link', { name: 'معلمان و دانش‌آموزان', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'نوع اعضای کلاس' })
    .getByRole('link', { name: 'معلمان', exact: true })
    .click();
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const remove = page.getByRole('button', { name: 'حذف از کلاس · معلم دوم', exact: true });
    await remove.scrollIntoViewIfNeeded();
    const box = await remove.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/manager-workspace/class-controls-${width}.png` });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page
      .getByRole('heading', { name: 'کلاس مدیریت چندعضوی', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/manager-workspace/class-${width}.png`,
      fullPage: true,
    });
  }
});
test('Guardian invitation is retryable, revocable and only becomes a relationship after explicit parent consent', async ({
  page,
  context,
  request,
  browser,
}) => {
  await request.post(fixture + '/__test__/manager-case');
  await login(context, 'Manager');
  const invite = async () => {
    await page.goto(base + '/guardians/new');
    await page.getByLabel('پروندهٔ فرزند', { exact: true }).selectOption(id(833));
    await page.getByLabel('نام کاربری والد', { exact: true }).fill('test.Parent');
    await page.getByLabel('زمان انقضای دعوت', { exact: true }).fill('1405/08/15 12:00');
    await page.getByLabel('دلیل دعوت والد', { exact: true }).fill('دسترسی والد برای پیگیری فرزند');
    await page.getByRole('button', { name: 'ارسال دعوت والد', exact: true }).click();
  };
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/guardian-invitations', method: 'POST', status: 503 },
  });
  await invite();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'بررسی دوبارهٔ همان دعوت', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'دعوت در انتظار تأیید والد', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'لغو دعوت', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'تأیید لغو دعوت', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'لغوشده', exact: true })).toBeVisible();
  await invite();
  await expect(
    page.getByRole('heading', { name: 'دعوت در انتظار تأیید والد', exact: true }),
  ).toBeVisible();
  const parent = await browser.newContext({ baseURL: origin });
  try {
    await login(parent, 'Parent');
    const p = await parent.newPage();
    await p.goto(base + '/invitations');
    await expect(
      p
        .getByRole('article')
        .filter({ has: p.getByRole('button', { name: 'پذیرش دعوت', exact: true }) })
        .getByText('دانش‌آموز دوم', { exact: true }),
    ).toBeVisible();
    const accept = p.getByRole('button', { name: 'پذیرش دعوت', exact: true });
    await expect(accept).toBeDisabled();
    await p.getByLabel('رابطهٔ والد با فرزند مشخص‌شده در همین آموزشگاه را تأیید می‌کنم.').check();
    await accept.click();
    await expect(accept).toHaveCount(0);
  } finally {
    await parent.close();
  }
  await page.goto(base + '/guardians');
  await expect(page.getByRole('heading', { name: 'دانش‌آموز دوم', exact: true })).toBeVisible();
  const row = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'دانش‌آموز دوم', exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'پایان دسترسی والد', exact: true }) })
    .last();
  await row.getByLabel('دلیل تغییر دسترسی والد', { exact: true }).fill('پایان رابطه پس از بررسی');
  await row.getByRole('button', { name: 'پایان دسترسی والد', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'پایان رابطه', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'پایان دسترسی والد', exact: true })).toHaveCount(1);
  await page.goto(base + '/invitations');
  await expect(
    page.getByRole('heading', { name: 'مدیریت دعوت‌های آموزشگاه', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/فهرست یکپارچهٔ دعوت‌های ارسالی هنوز/)).toBeVisible();
});
