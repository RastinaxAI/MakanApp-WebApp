import { test, expect, login, fixture, ids, origin } from './test';
import { mkdir, readFile } from 'node:fs/promises';

for (const theme of ['light', 'dark']) {
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    test(`Telegram messenger ${theme} ${width}: usable list, chat and menus`, async ({
      page,
      context,
      request,
    }) => {
      await request.post(fixture + '/__test__/design');
      await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
      await login(context, 'Student', false);
      await page.setViewportSize({ width, height });
      await page.goto('/personal/messages');
      const inbox = page.getByLabel('فهرست گفتگوها', { exact: true });
      await expect(inbox.getByText('مریم رضایی', { exact: true })).toBeVisible();
      // The previous UI hid the unread number as a seven-pixel dot.
      const badge = inbox.getByLabel('۲ پیام خوانده‌نشده', { exact: true });
      await expect(badge).toHaveText('۲');
      expect(await badge.evaluate((el) => getComputedStyle(el).color)).not.toBe('rgba(0, 0, 0, 0)');
      const compose = page.getByRole('button', { name: 'ایجاد گفت‌وگو یا مخاطب' });
      await compose.click();
      await expect(page.getByRole('menuitem')).toHaveText([
        'ایجاد گروه',
        'ایجاد کانال',
        'مخاطبین',
        'آرشیو',
        'پیام‌های ذخیره‌شده',
      ]);
      await page.keyboard.press('Escape');
      await expect(compose).toBeFocused();
      await mkdir('output/review/telegram-messenger', { recursive: true });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `output/review/telegram-messenger/inbox-${theme}-${width}.png`,
      });
      await inbox.getByRole('link').filter({ hasText: 'مریم رضایی' }).click();
      const input = page.getByRole('textbox', { name: 'متن پیام', exact: true });
      await expect(input).toBeVisible();
      await input.fill('پیش‌نویس بررسی رابط');
      const outgoing = page.locator('[data-message-direction="outgoing"]').first();
      const incoming = page.locator('[data-message-direction="incoming"]').first();
      await expect(outgoing).toBeVisible();
      await expect(incoming).toBeVisible();
      const ownBox = await outgoing.boundingBox(),
        peerBox = await incoming.boundingBox();
      expect(ownBox!.x).toBeLessThan(peerBox!.x); // RTL: your messages remain on the left.
      expect(await outgoing.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
        theme === 'light' ? 'rgb(225, 255, 199)' : 'rgb(51, 51, 51)',
      );
      const room = page.locator('[data-message-room]');
      expect(await room.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
        theme === 'light' ? 'classic-wallpaper.png' : 'night-wallpaper.png',
      );
      const send = page.getByRole('button', { name: 'ارسال پیام', exact: true });
      const sendBox = await send.boundingBox();
      expect(sendBox!.y + sendBox!.height).toBeLessThanOrEqual(height);
      expect(sendBox!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `output/review/telegram-messenger/chat-${theme}-${width}.png`,
      });
      await page.getByRole('button', { name: 'گزینه‌های گفتگو', exact: true }).click();
      await expect(
        page.getByRole('menuitem', { name: 'اطلاعات گفتگو', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'رسانه و فایل', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'افزودن پیوست', exact: true }).click();
      await expect(page.getByRole('menuitem')).toHaveText([
        'دوربین',
        'عکس از گالری',
        'ویدئو از گالری',
        'فایل از دستگاه',
      ]);
      await page.screenshot({
        path: `output/review/telegram-messenger/attachments-${theme}-${width}.png`,
      });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'افزودن پیوست', exact: true })).toBeFocused();
    });
  }
}

test('chat survives live resizing and attachment failure retains both file and caption', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.goto('/personal/messages/' + ids.chat);
  const input = page.getByRole('textbox', { name: 'متن پیام', exact: true });
  await input.fill('توضیح حفظ‌شدهٔ فایل');
  for (const width of [390, 767, 768, 834, 1024, 1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(input).toHaveValue('توضیح حفظ‌شدهٔ فایل');
    const box = await input.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'افزودن پیوست' }).click();
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'فایل از دستگاه', exact: true }).click();
  await (
    await picker
  ).setFiles({
    name: 'برگه.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nfixture-only\n%%EOF'),
  });
  const dialog = page.getByRole('dialog', { name: 'ارسال پیوست', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveValue('توضیح حفظ‌شدهٔ فایل');
  expect(
    await dialog
      .getByRole('button', { name: 'ارسال ۱ پیوست', exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgb(0, 122, 255)');
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/api/v1/files', method: 'POST', status: 503 },
  });
  await dialog.getByRole('button', { name: /ارسال/ }).last().click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByText('برگه.pdf', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveValue('توضیح حفظ‌شدهٔ فایل');
  await page.screenshot({ path: 'output/review/telegram-messenger/upload-error-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'افزودن پیوست' })).toBeFocused();
  await expect(input).toHaveValue('توضیح حفظ‌شدهٔ فایل');
});

test('message context menu replies to the selected message and returns focus to the composer', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal/messages/' + ids.chat);
  await page.locator('[data-message-direction="incoming"]').first().click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'کپی متن', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: 'پاسخ به پیام', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'لغو پاسخ', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'لغو پاسخ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'لغو پاسخ', exact: true })).toHaveCount(0);
  const bubble = page.locator('[data-message-direction="incoming"]').first();
  await bubble.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 100, clientY: 150 });
  await expect(page.getByRole('menuitem', { name: 'پاسخ به پیام', exact: true })).toBeVisible();
  await bubble.dispatchEvent('pointerup', { pointerType: 'touch' });
  await page.keyboard.press('Escape');
});

test('messenger directory, creation and settings pages remain usable above navigation in both themes', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.goto('/personal/contacts');
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      localStorage.setItem('makan-theme', value);
      window.dispatchEvent(new Event('makan-theme-changed'));
    }, theme);
    for (const [path, name] of [
      ['/personal/contacts', 'مخاطبین شما'],
      ['/personal/messages/new?kind=groups', 'ایجاد گروه'],
      ['/personal/messages/new?kind=channels', 'ایجاد کانال'],
      ['/personal/settings/privacy', 'حریم خصوصی'],
      ['/personal/settings/blocked', 'حساب‌های مسدودشده'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name, exact: true, level: 1 })).toBeVisible();
      if (path.includes('/new?'))
        await expect(
          page.getByRole('textbox', {
            name: path.includes('groups') ? 'نام گروه' : 'نام کانال',
            exact: true,
          }),
        ).toBeVisible();
      else if (path.endsWith('/contacts'))
        await expect(page.getByText('مریم رضایی', { exact: true }).first()).toBeVisible();
      else if (path.endsWith('/privacy'))
        await expect(page.getByLabel('دریافت پیام مستقیم', { exact: true })).toBeVisible();
      else await expect(page.getByText('حساب مسدودشده‌ای ندارید', { exact: true })).toBeVisible();
      for (const width of [390, 834, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: `output/review/telegram-messenger/${path.includes('kind=groups') ? 'new-group' : path.includes('kind=channels') ? 'new-channel' : path.split('/').pop()}-${theme}-${width}.png`,
        });
      }
    }
  }
  await page.goto('/personal/contacts');
  await page.getByRole('button', { name: 'مخاطب جدید', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'شماره یا نام کاربری مخاطب', exact: true })
    .fill('@maryam.rezaei');
  await page.getByRole('button', { name: 'پیدا کردن مخاطب', exact: true }).click();
  await expect(page.getByRole('button', { name: 'شروع گفت‌وگو', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'شروع گفت‌وگو', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
});

test('photo video and file reach the other fixture account and download with identical bytes', async ({
  page,
  context,
  browser,
}) => {
  const recipient = await browser.newContext({ baseURL: origin });
  try {
    await login(context, 'Student', false);
    await login(recipient, 'Teacher', false);
    const receiver = await recipient.newPage();
    await receiver.goto('/personal/messages/' + ids.chat);
    await page.goto('/personal/messages/' + ids.chat);
    await page.getByRole('button', { name: 'افزودن پیوست' }).click();
    const picker = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'فایل از دستگاه', exact: true }).click();
    await (
      await picker
    ).setFiles([
      {
        name: 'photo.png',
        mimeType: 'image/png',
        buffer: await readFile('public/messaging/classic-wallpaper.png'),
      },
      {
        name: 'video.mp4',
        mimeType: 'video/mp4',
        buffer: await readFile('tests/fixtures/media-test-video.mp4'),
      },
      {
        name: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Makan fixture attachment bytes\n'),
      },
    ]);
    const dialog = page.getByRole('dialog', { name: 'ارسال پیوست', exact: true });
    await expect(dialog.locator('img')).toBeVisible();
    await expect(dialog.locator('video')).toBeVisible();
    await dialog.getByRole('button', { name: 'ارسال ۳ پیوست', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const history = receiver.getByLabel('پیام‌های گفتگو', { exact: true });
    await expect(history.getByText('notes.txt', { exact: true })).toBeVisible();
    await expect(history.getByRole('img', { name: 'photo.png', exact: true })).toBeVisible();
    expect(
      await history
        .getByRole('img', { name: 'photo.png', exact: true })
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    await history.getByRole('button', { name: 'دریافت video.mp4', exact: true }).click();
    await expect
      .poll(() => history.locator('video').evaluate((video: HTMLVideoElement) => video.duration))
      .toBeGreaterThan(0);
    await history.getByRole('button', { name: 'دریافت notes.txt', exact: true }).click();
    const download = receiver.waitForEvent('download');
    await history.getByRole('link', { name: 'ذخیرهٔ notes.txt', exact: true }).click();
    expect(await readFile((await (await download).path())!)).toEqual(
      Buffer.from('Makan fixture attachment bytes\n'),
    );
  } finally {
    await recipient.close();
  }
});
