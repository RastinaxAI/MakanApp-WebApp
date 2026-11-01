import { test, expect, login, fixture, origin } from './test';
import { mkdir } from 'node:fs/promises';
const id = '00000000-0000-4000-8000-000000000950',
  base = '/personal/messages/' + id;
test('mute is confirmed by the service and a failed change never shows false success', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await page.goto(base + '/info');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/mute', method: 'PUT', status: 503 },
  });
  await page.getByRole('button', { name: 'بی‌صدا', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'بی‌صدا', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'بی‌صدا', exact: true }).click();
  await expect(page.getByRole('button', { name: 'فعال‌کردن صدا', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'فعال‌کردن صدا', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'فعال‌کردن صدا', exact: true }).click();
  await expect(page.getByRole('button', { name: 'بی‌صدا', exact: true })).toBeVisible();
});
test('invite link creation retries with one command, requires approval, then can be revoked', async ({
  page,
  context,
  request,
  browser,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: { type: 'Channel' } });
  await login(context, 'Student', false);
  await page.goto(base + '/invites');
  await page.getByRole('button', { name: 'لینک جدید', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('حداکثر تعداد استفاده').fill('2');
  await dialog.getByRole('checkbox').check();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/invite-links', method: 'POST', status: 503 },
  });
  await dialog.getByRole('button', { name: 'ساخت لینک دعوت', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByLabel('حداکثر تعداد استفاده')).toHaveValue('2');
  await expect(dialog.getByLabel('حداکثر تعداد استفاده')).toBeDisabled();
  await dialog.getByRole('button', { name: 'تلاش مجدد', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const url = await page.getByLabel('لینک دعوت جدید').inputValue();
  expect(url).toContain('/personal/messages/join#token=');
  const other = await browser.newContext();
  await login(other, 'Parent', false);
  const recipient = await other.newPage();
  await recipient.goto(url);
  await expect(
    recipient.getByRole('button', { name: 'پیوستن به گفتگو', exact: true }),
  ).toBeEnabled();
  await recipient.getByRole('button', { name: 'پیوستن به گفتگو', exact: true }).click();
  await expect(recipient.getByRole('heading', { name: 'درخواست عضویت ارسال شد' })).toBeVisible();
  await expect(recipient.getByRole('link', { name: 'ورود به گفتگو', exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'تأیید', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByText('پذیرفته‌شده', { exact: true })).toBeVisible();
  await recipient.goto(base + '/info');
  await expect(
    recipient.getByRole('heading', { name: 'اطلاعات کانال', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'لغو لینک', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByText('لغوشده', { exact: true })).toBeVisible();
  await recipient.goto(url);
  await recipient.getByRole('button', { name: 'پیوستن به گفتگو', exact: true }).click();
  await expect(recipient.getByRole('main').getByRole('alert')).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const creates = state.requests.filter(
    (r: { method: string; path: string }) =>
      r.method === 'POST' && r.path.endsWith('/invite-links'),
  );
  expect(creates).toHaveLength(2);
  expect(creates[0].body).toEqual(creates[1].body);
  await other.close();
});
test('topic draft survives errors and status changes only after server confirmation', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  await login(context, 'Student', false);
  await page.goto(base + '/topics');
  await page.getByLabel('نام موضوع', { exact: true }).fill('پرسش‌های کلاس');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/topics', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'ایجاد موضوع', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('نام موضوع', { exact: true })).toHaveValue('پرسش‌های کلاس');
  await page.getByRole('button', { name: 'تلاش مجدد', exact: true }).click();
  await expect(page.getByText('پرسش‌های کلاس', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'بستن', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
  await expect(page.getByRole('button', { name: 'بازکردن', exact: true })).toBeVisible();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  const posts = state.requests.filter(
    (r: { method: string; path: string }) => r.method === 'POST' && r.path.endsWith('/topics'),
  );
  expect(posts).toHaveLength(2);
  expect(posts[0].body).toEqual(posts[1].body);
});
test('non owners never see invite management and the service rejects a direct mutation', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/conversation-details', { data: {} });
  const session = await login(context, 'Teacher', false);
  await page.goto(base + '/invites');
  await expect(page.getByRole('button', { name: 'لینک جدید', exact: true })).toHaveCount(0);
  const response = await context.request.post(
    origin + '/api/client/backend/api/v1/conversations/' + id + '/invite-links',
    {
      headers: { Origin: origin, 'X-Makan-Context': session.revision },
      data: {
        clientLinkId: crypto.randomUUID(),
        expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),
        maximumUses: 1,
        requiresApproval: false,
      },
    },
  );
  expect(response.status()).toBe(403);
});
test('reference group and channel surfaces keep RTL, focus and touch targets in both themes at three sizes', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(180000);
  await login(context, 'Student', false);
  await mkdir('output/review/telegram-details', { recursive: true });
  for (const theme of ['light', 'dark']) {
    await page.goto('/personal/messages');
    await page.evaluate((value) => {
      localStorage.setItem('makan-theme', value);
      document.documentElement.dataset.theme = value;
    }, theme);
    for (const kind of ['Group', 'Channel']) {
      await request.post(fixture + '/__test__/conversation-details', { data: { type: kind } });
      for (const section of [
        'info',
        'edit',
        'settings',
        'members',
        'media',
        'invites',
        ...(kind === 'Group' ? ['topics'] : []),
      ]) {
        await page.goto(base + '/' + section);
        await expect(
          page.getByRole('heading', { name: 'گفتگوی آزمایشی جزئیات', exact: true }),
        ).toBeVisible();
        const heading = {
          info: kind === 'Channel' ? 'اطلاعات کانال' : 'اطلاعات گروه',
          edit: kind === 'Channel' ? 'ویرایش کانال' : 'ویرایش گروه',
          settings: kind === 'Channel' ? 'مدیریت کانال' : 'مدیریت گروه',
          members: 'اعضای گفتگو',
          media: 'رسانه‌ها و فایل‌ها',
          invites: 'لینک‌های دعوت',
          topics: 'موضوعات گروه',
        }[section];
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
        for (const [width, height] of [
          [390, 844],
          [834, 1194],
          [1440, 1000],
        ]) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
          if (section === 'settings') {
            const layout = await page
              .getByRole('radio')
              .first()
              .evaluate((el) => {
                const title = el.closest('label')!.querySelector('strong')!.getBoundingClientRect();
                return {
                  direction: getComputedStyle(el.closest('label')!).flexDirection,
                  offset: Math.abs(el.getBoundingClientRect().top - title.top),
                };
              });
            expect(layout.direction).toBe('row');
            expect(layout.offset).toBeLessThanOrEqual(8);
          }
          await page.screenshot({
            path: `output/review/telegram-details/${kind}-${section}-${theme}-${width}.png`,
          });
        }
        if (section === 'edit') {
          const action = page.getByRole('button', { name: 'انتخاب تصویر جدید', exact: true });
          await action.click();
          await expect(page.getByRole('dialog')).toContainText('هنوز در دسترس نیست');
          await page.keyboard.press('Escape');
          await expect(action).toBeFocused();
          const box = await action.boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  }
});
