import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';
for (const kind of ['Direct', 'Saved']) {
  test(`${kind}: one bubble from sending through delayed receipt history without server-status text`, async ({
    page,
    context,
    request,
  }) => {
    await request.post(fixture + '/__test__/chat-kind', { data: { kind } });
    await login(context, 'Student', false);
    let freeze = true;
    let initial: unknown;
    await page.route(
      `**/api/client/backend/api/v1/conversations/${ids.chat}/messages?**`,
      async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        initial ??= body;
        if (freeze) await route.fulfill({ response, json: initial });
        else await route.fulfill({ response, json: body });
      },
    );
    await page.goto('/personal/messages/' + ids.chat);
    const history = page.getByLabel('پیام‌های گفتگو', { exact: true }),
      input = page.getByRole('textbox', { name: 'متن پیام', exact: true });
    await expect(input).toBeEditable();
    const text = 'پیام یکتای ' + kind;
    await history.evaluate((el, text) => {
      const samples: number[] = [];
      let seen = false;
      const capture = () => {
        const count = [...el.querySelectorAll('article')].filter(
          (n) => n.querySelector('p')?.textContent === text,
        ).length;
        if (count) seen = true;
        if (seen) samples.push(count);
      };
      const observer = new MutationObserver(capture);
      observer.observe(el, { childList: true, subtree: true, characterData: true });
      (window as unknown as { chatSamples: number[]; stopChatObserver: () => void }).chatSamples =
        samples;
      (window as unknown as { stopChatObserver: () => void }).stopChatObserver = () =>
        observer.disconnect();
    }, text);
    await input.fill(text);
    await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
    const bubble = history.locator('article').filter({ has: page.locator('p', { hasText: text }) });
    await expect(bubble).toHaveCount(1);
    await expect(bubble).toHaveAttribute('data-message-state', 'confirmed');
    await expect(bubble.getByLabel('ارسال‌شده', { exact: true })).toBeVisible();
    await expect(history.getByText('در سرور ثبت شد', { exact: false })).toHaveCount(0);
    await mkdir('output/review/chat-school-polish', { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `output/review/chat-school-polish/${kind}-confirmed-mobile.png`,
    });
    freeze = false;
    await expect(bubble).toHaveAttribute('data-message-state', 'history');
    await expect(bubble).toHaveCount(1);
    const samples = await page.evaluate(() => {
      const w = window as unknown as { chatSamples: number[]; stopChatObserver: () => void };
      w.stopChatObserver();
      return w.chatSamples;
    });
    expect(samples.length).toBeGreaterThan(1);
    expect(samples.every((count) => count === 1)).toBe(true);
    const state = await (await request.get(fixture + '/__test__/state')).json();
    expect(
      state.requests.filter(
        (r: { method: string; path: string }) =>
          r.method === 'POST' && r.path === `/api/v1/conversations/${ids.chat}/messages`,
      ),
    ).toHaveLength(1);
  });
}
test('failed send remains visible and is never rendered as confirmed', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/messages/' + ids.chat);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/messages', method: 'POST', status: 503 },
  });
  await page
    .getByRole('textbox', { name: 'متن پیام', exact: true })
    .fill('پیام ناموفق قابل پیگیری');
  await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  const bubble = page
    .getByLabel('پیام‌های گفتگو', { exact: true })
    .locator('article')
    .filter({ hasText: 'پیام ناموفق قابل پیگیری' });
  await expect(bubble).toHaveCount(1);
  await expect(bubble).toHaveAttribute('data-message-state', 'unconfirmed');
  await expect(
    bubble.getByRole('button', { name: 'تلاش دوباره با همین پیام', exact: true }),
  ).toBeVisible();
  await expect(bubble.getByLabel('ارسال‌شده', { exact: true })).toHaveCount(0);
});
test('a history refresh failure retains displayed messages while a real access denial hides them', async ({
  page,
  context,
  request,
}) => {
  await login(context, 'Student', false);
  await page.goto('/personal/messages/' + ids.chat);
  await page.getByRole('textbox', { name: 'متن پیام', exact: true }).fill('سابقه پایدار');
  await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
  const history = page.getByLabel('پیام‌های گفتگو', { exact: true });
  await expect(
    history.locator('[data-message-state="history"]').filter({ hasText: 'سابقه پایدار' }),
  ).toHaveCount(1);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/messages', method: 'GET', status: 503 },
  });
  await expect(history.getByRole('alert')).toBeVisible();
  await expect(history.getByText('سابقه پایدار', { exact: true })).toBeVisible();
  await history.getByRole('button', { name: 'دریافت دوباره', exact: true }).click();
  await expect(history.getByRole('alert')).toHaveCount(0);
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/messages', method: 'GET', status: 403 },
  });
  await expect(history).toHaveCount(0);
  await expect(page.getByText('سابقه پایدار', { exact: true })).toHaveCount(0);
});
for (const role of ['Personal', 'Student', 'Teacher', 'Parent', 'Manager']) {
  test(`school ${role}: icon and text rows stay aligned in mobile tablet desktop`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    await login(context, role, role !== 'Personal');
    await page.goto('/personal/education');
    const nav = page.getByRole('navigation', { name: 'بخش‌های آموزشگاه', exact: true });
    await expect(nav).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('status', { name: 'در حال دریافت اطلاعات', exact: true }),
    ).toHaveCount(0);
    await mkdir('output/review/chat-school-polish', { recursive: true });
    for (const [width, height] of [
      [320, 780],
      [390, 844],
      [700, 1000],
      [701, 1000],
      [834, 1194],
      [1024, 900],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      const links = await nav.getByRole('link').evaluateAll((nodes) =>
        nodes.map((n) => {
          const icon = n.querySelector('svg')!.getBoundingClientRect(),
            text = n.querySelector('span')!.getBoundingClientRect(),
            box = n.getBoundingClientRect();
          return {
            top: box.top,
            iconY: icon.top + icon.height / 2,
            textY: text.top + text.height / 2,
            height: box.height,
            width: box.width,
            iconWidth: icon.width,
          };
        }),
      );
      for (const link of links) {
        expect(link.height).toBeGreaterThanOrEqual(44);
        expect(link.iconWidth).toBe(20);
        const row = links.filter((x) => Math.abs(x.top - link.top) < 2);
        expect(
          Math.max(...row.map((x) => x.iconY)) - Math.min(...row.map((x) => x.iconY)),
        ).toBeLessThanOrEqual(2);
        expect(
          Math.max(...row.map((x) => x.textY)) - Math.min(...row.map((x) => x.textY)),
        ).toBeLessThanOrEqual(2);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if ([390, 834, 1440].includes(width))
        await page.screenshot({
          path: `output/review/chat-school-polish/school-${role}-${width}.png`,
        });
    }
    if (role === 'Teacher') {
      await page.goto(`/personal/education/classes/${ids.class}?tab=lessons`);
      await page.setViewportSize({ width: 390, height: 844 });
      const tabs = page.getByRole('navigation', { name: 'بخش‌های کلاس', exact: true });
      const tops = await tabs
        .locator('svg')
        .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top));
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
      await page.screenshot({ path: 'output/review/chat-school-polish/class-tabs-mobile.png' });
    }
  });
}
