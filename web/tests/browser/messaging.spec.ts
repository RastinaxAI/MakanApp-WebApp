import { test, expect, login, ids, origin } from './test';
test('two isolated accounts exchange messages and update recipient inbox without reload', async ({
  browser,
}) => {
  const a = await browser.newContext({ baseURL: origin }),
    b = await browser.newContext({ baseURL: origin });
  try {
    await login(a, 'Student', false);
    await login(b, 'Teacher', false);
    const sender = await a.newPage(),
      receiver = await b.newPage();
    await receiver.goto('/personal/messages');
    await sender.goto('/personal/messages/' + ids.chat);
    await sender
      .getByRole('textbox', { name: 'متن پیام', exact: true })
      .fill('سلام آزمایشی از دانشجو');
    await sender.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
    await expect(receiver.getByText('سلام آزمایشی از دانشجو', { exact: true })).toBeVisible();
    await receiver.getByRole('link').filter({ hasText: 'سلام آزمایشی از دانشجو' }).click();
    await receiver
      .getByRole('textbox', { name: 'متن پیام', exact: true })
      .fill('پاسخ آزمایشی استاد');
    await receiver.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
    await expect(
      sender
        .getByLabel('پیام‌های گفتگو', { exact: true })
        .getByText('پاسخ آزمایشی استاد', { exact: true }),
    ).toBeVisible();
  } finally {
    await a.close();
    await b.close();
  }
});
for (const role of ['Parent', 'Manager'])
  test(`${role} cannot read a Student private conversation through the BFF`, async ({
    context,
    page,
  }) => {
    const state = await login(context, role, false);
    const r = await context.request.get(
      origin + `/api/client/backend/api/v1/conversations/${ids.chat}/messages?limit=30`,
      { headers: { 'X-Makan-Context': state.revision } },
    );
    expect(r.status()).toBe(404);
    await page.goto('/personal/messages/' + ids.chat);
    await expect(page.getByRole('textbox', { name: 'متن پیام' })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('PRIVATE EVALUATOR NOTE');
  });
