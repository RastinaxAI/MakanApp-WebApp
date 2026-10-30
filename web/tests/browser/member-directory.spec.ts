import { test, expect, login, fixture } from './test';
import { mkdir } from 'node:fs/promises';
const base = '/personal/education';
test('member directory uses server filters, clear record actions and responsive cards', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/directory-case');
  await login(context, 'Manager');
  await page.goto(base + '/members');
  await expect(
    page.getByRole('heading', { name: 'اعضای آموزشگاه', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'مشاهدهٔ پروندهٔ معلم اول', exact: true }),
  ).toBeVisible();
  const noRecord = page
    .getByRole('row')
    .filter({ has: page.getByText('معلم دوم', { exact: true }) });
  await expect(noRecord).toContainText('پرونده متصل نیست');
  await expect(noRecord.getByRole('link')).toHaveCount(0);
  await mkdir('output/review/member-directory', { recursive: true });
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const button = page.getByRole('link', { name: 'مشاهدهٔ پروندهٔ معلم اول', exact: true });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeGreaterThanOrEqual(42);
    await page
      .getByRole('heading', { name: 'اعضای آموزشگاه', exact: true, level: 1 })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `output/review/member-directory/members-${width}.png`,
      fullPage: true,
    });
  }
  const filtered = page.waitForRequest(
    (r) =>
      r.url().includes('/organization/members?') &&
      new URL(r.url()).searchParams.get('Role') === 'Teacher',
  );
  await page
    .getByRole('group', { name: 'نقش اعضا' })
    .getByRole('button', { name: 'معلمان', exact: true })
    .click();
  await filtered;
  await expect(page.getByText('دانش‌آموز اول', { exact: true })).toHaveCount(0);
  await page.getByLabel('جستجوی اعضای آموزشگاه', { exact: true }).fill('معلم اول');
  const searched = page.waitForRequest(
    (r) =>
      r.url().includes('/organization/members?') &&
      new URL(r.url()).searchParams.get('Search') === 'معلم اول',
  );
  await page.getByRole('button', { name: 'جستجو', exact: true }).click();
  await searched;
  await expect(page.getByText('معلم دوم', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'مشاهدهٔ پروندهٔ معلم اول', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'معلم اول', exact: true })).toBeVisible();
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/review/member-directory/record-${width}.png`,
      fullPage: true,
    });
  }
  await expect(page.getByRole('heading', { name: 'مشخصات فردی', exact: true })).toBeVisible();
  await expect(page.getByText('حساب متصل است', { exact: true })).toBeVisible();
});
test('read-only person flags remain authoritative and a failed member read can be retried', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/directory-case');
  await login(context, 'Manager');
  await page.goto(base + '/people/00000000-0000-4000-8000-000000000833');
  await expect(page.getByRole('heading', { name: 'دانش‌آموز دوم', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ویرایش پرونده', exact: true })).toHaveCount(0);
  await page.goto(base + '/people/00000000-0000-4000-8000-000000000833/edit');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('دسترسی محدود');
  await page.route('**/api/client/backend/api/v1/organization/members?*', async (route) => {
    const restored = await page.evaluate(() =>
      document.documentElement.hasAttribute('data-fixture-directory-restored'),
    );
    return restored
      ? route.continue()
      : route.fulfill({ status: 503, json: { code: 'FIXTURE_INJECTED_FAILURE' } });
  });
  await page.goto(base + '/members');
  await expect(
    page.getByRole('heading', { name: 'اعضای آموزشگاه', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  // Restore only after the real retry click. Earlier recovery could let a background
  // refresh remove the error button before Playwright had clicked it.
  await page.evaluate(() => {
    document.addEventListener(
      'click',
      (event) => {
        if (
          event.isTrusted &&
          event.target instanceof Element &&
          event.target.closest('button')?.textContent?.trim() === 'دریافت دوباره'
        )
          document.documentElement.setAttribute('data-fixture-directory-restored', '');
      },
      { capture: true },
    );
  });
  await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).click();
  await expect(page.getByText('معلم اول', { exact: true })).toBeVisible();
});
test('person list and editor stay readable on all layouts and preserve a failed draft', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Manager');
  await page.goto(base + '/people/new');
  await page.getByLabel('نام', { exact: true }).fill('سارا');
  await page.getByLabel('نام خانوادگی', { exact: true }).fill('احمدی');
  await page
    .getByLabel('دلیل ثبت یا تغییر پرونده', { exact: true })
    .fill('ثبت پرونده برای شروع دوره');
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/review/member-directory/editor-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'بازبینی اطلاعات', exact: true }).click();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/organization/people', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'تأیید و ثبت', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'بازگشت و ویرایش', exact: true }).click();
  await expect(page.getByLabel('نام', { exact: true })).toHaveValue('سارا');
  await page.getByRole('button', { name: 'بازبینی اطلاعات', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید و ثبت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
  await page.goto(base + '/people');
  await expect(
    page.getByRole('link', { name: 'مشاهدهٔ پروندهٔ سارا احمدی', exact: true }),
  ).toBeVisible();
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `output/review/member-directory/records-${width}.png`,
      fullPage: true,
    });
  }
});
