import { test, expect, login, fixture } from './test';
import { mkdir } from 'node:fs/promises';

test.use({
  viewport: { width: 390, height: 844 },
  video: { mode: 'on', size: { width: 390, height: 844 } },
});

const id = '00000000-0000-4000-8000-000000000950';
const output = 'output/review/telegram-reference';
for (const theme of ['light', 'dark']) {
  for (const type of ['Group', 'Channel']) {
    test(`${type} ${theme}: reference message rows retain identity, reply focus and draft through resizing`, async ({
      page,
      context,
      request,
    }) => {
      await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
      await request.post(fixture + '/__test__/design');
      await request.post(fixture + '/__test__/conversation-details', {
        data: { type, messages: true },
      });
      await login(context, 'Student', false);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const readCursor = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/conversations/${id}/read`) &&
          response.request().method() === 'POST',
      );
      await page.goto('/personal/messages/' + id);
      const history = page.getByLabel('پیام‌های گفتگو', { exact: true });
      const first = history.locator('[data-message-state="history"]').first();
      await expect(history.locator('[data-message-state="history"]')).toHaveCount(4);
      expect((await readCursor).status()).toBe(204);
      await expect(
        page.getByRole('button', { name: 'خواندن هنوز تأیید نشده؛ تلاش دوباره', exact: true }),
      ).toHaveCount(0);
      await expect(first.getByText('مریم رضایی', { exact: true })).toBeVisible();
      await mkdir(output, { recursive: true });
      const field = page.getByRole('textbox', { name: 'متن پیام', exact: true });
      for (const width of [320, 390, 834, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.evaluate(() => document.fonts.ready);
        const geometry = await first.evaluate((el) => {
          const identity = el.querySelector('strong')!.getBoundingClientRect();
          const content = el.querySelector('p')!.getBoundingClientRect();
          return { identity: identity.toJSON(), content: content.toJSON() };
        });
        expect(geometry.identity.bottom).toBeLessThanOrEqual(geometry.content.y);
        expect(Math.abs(geometry.identity.right - geometry.content.right)).toBeLessThanOrEqual(2);
        expect(geometry.content.width).toBeGreaterThan(200);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(field).toBeInViewport();
        await page.screenshot({ path: `${output}/${type}-chat-${theme}-${width}.png` });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await first.getByRole('button', { name: 'گزینه‌های پیام 1', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: 'پاسخ به پیام', exact: true }).click();
      await expect(field).toBeFocused();
      await field.fill('پیش‌نویس پاسخ به پیام گروه');
      await page.setViewportSize({ width: 834, height: 1000 });
      await expect(field).toHaveValue('پیش‌نویس پاسخ به پیام گروه');
      await expect(history.locator('[data-message-state="history"]')).toHaveCount(4);
      await page.getByRole('link', { name: 'اطلاعات گفتگو', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/messages/${id}/info$`));
      await expect(
        page.getByRole('heading', {
          name: type === 'Group' ? 'اطلاعات گروه' : 'اطلاعات کانال',
          exact: true,
        }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
