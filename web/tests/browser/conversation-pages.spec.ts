import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';
const group = '00000000-0000-4000-8000-000000000950';
const base = '/personal/messages/' + group;
test('conversation members and media follow server pagination and a media filter restarts its cursor', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await page.goto(base + '/info');
  await expect(page.getByText('توضیحات معتبر گروه آزمایشی', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'اعضا', exact: true }).click();
  await expect(page.getByText('مالک آزمایشی گفتگو', { exact: true })).toBeVisible();
  await expect(page.getByText('عضو آزمایشی دوم', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'صفحهٔ بعد', exact: true }).click();
  await expect(page.getByText('عضو آزمایشی دوم', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'صفحهٔ بعد', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'رسانه و فایل', exact: true }).click();
  await expect(page.getByText('جزوه-50.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'نمایش بیشتر', exact: true }).click();
  await expect(page.getByText('جزوه-20.pdf', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'نمایش بیشتر', exact: true })).toHaveCount(0);
  const filtered = page.waitForRequest(
    (r) => r.url().includes('/media?') && r.url().includes('kind=Image'),
  );
  await page.getByLabel('نوع رسانه', { exact: true }).selectOption('Image');
  expect((await filtered).url()).not.toContain('beforeSequence');
  await expect(page.getByText('رسانه‌ای در این بخش نیست', { exact: true })).toBeVisible();
  await page.getByLabel('نوع رسانه', { exact: true }).selectOption('');
  await expect(page.getByText('جزوه-50.pdf', { exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/conversation-details', {
    data: { mediaTitle: 'فایل تازه' },
  });
  await expect(page.getByText('فایل تازه-50.pdf', { exact: true })).toBeVisible();
});
test('conversation settings retain failed selections and leave confirmation retains failure until accepted', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await page.goto(base + '/settings');
  await page.getByLabel('نمایان‌بودن', { exact: true }).selectOption('Public');
  await page.getByLabel('تاریخچه برای عضو جدید', { exact: true }).selectOption('FullHistory');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/settings', method: 'PATCH', status: 409 },
  });
  await page.getByRole('button', { name: 'ثبت تنظیمات گفتگو' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('نمایان‌بودن', { exact: true })).toHaveValue('Public');
  await page.getByRole('button', { name: 'ثبت تنظیمات گفتگو' }).click();
  await expect(page.getByText('تنظیمات گفتگو ثبت شد.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'اطلاعات', exact: true }).click();
  await expect(page.getByText('عمومی', { exact: true })).toBeVisible();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/leave', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'ترک گروه', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ترک گفتگو', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'ترک گفتگو', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/messages$/);
});
test('education roles do not grant group ownership and system managed conversation does not expose manual management', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Teacher', false);
  await page.goto(base + '/settings');
  await expect(page.getByRole('button', { name: 'ثبت تنظیمات گفتگو' })).toHaveCount(0);
  await request.post(fixture + '/__test__/conversation-details', { data: { system: true } });
  await login(context, 'Student', false);
  await page.goto(base + '/info');
  await expect(
    page.getByText('عضویت و مدیریت این فضای رسمی تابع دسترسی آموزشی معتبر است.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'ترک گروه', exact: true })).toHaveCount(0);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(state.requests.some((r: { method: string }) => r.method === 'PATCH')).toBe(false);
});
test('direct conversation info is reached from chat and archive uses confirmed user state', async ({
  page,
  context,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/messages/' + ids.chat);
  await page.getByRole('link', { name: 'اطلاعات گفتگو', exact: true }).click();
  await expect(page).toHaveURL(/\/info$/);
  await page.getByRole('button', { name: 'آرشیو گفتگو', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page).toHaveURL(/filter=Archived/);
  await page.goto('/personal/messages/' + ids.chat + '/info');
  await expect(page.getByRole('button', { name: 'بازگرداندن به گفتگوها' })).toBeVisible();
});
test('conversation detail pages preserve RTL and layout at mobile tablet and desktop', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await mkdir('output/review/conversation-pages', { recursive: true });
  for (const section of ['info', 'members', 'settings', 'media']) {
    await page.goto(base + '/' + section);
    await expect(
      page.getByRole('heading', { name: 'گفتگوی آزمایشی جزئیات', exact: true }),
    ).toBeVisible();
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `output/review/conversation-pages/${section}-${width}.png` });
      if (width < 1024 && ['info', 'settings'].includes(section)) {
        await page.getByRole('main').evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        const action = page.getByRole('button', {
          name: section === 'info' ? 'ترک گروه' : 'ثبت تنظیمات گفتگو',
          exact: true,
        });
        await expect(action).toBeInViewport();
        const actionBox = await action.boundingBox();
        const dock = await page
          .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
          .filter({ visible: true })
          .boundingBox();
        expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(dock!.y - 8);
      }
    }
  }
});
