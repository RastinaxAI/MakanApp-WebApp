import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';

const output = 'output/review/chat-education-layout';
const sizes = [
  [320, 780],
  [390, 844],
  [700, 1000],
  [834, 1194],
  [1440, 1000],
];

for (const theme of ['light', 'dark']) {
  for (const [language, name] of [
    ['fa', 'استاد محمدرضا ناظری — آموزشگاه زبان و برنامه‌نویسی ماکان'],
    ['en', 'Development Teacher — Advanced Programming and Mathematics'],
  ]) {
    test(`chat header ${theme} ${language}: avatar stays beside the title and controls never overlap`, async ({
      page,
      context,
      request,
    }) => {
      await context.addInitScript((value) => localStorage.setItem('makan-theme', value), theme);
      await request.post(fixture + '/__test__/chat-kind', {
        data: { kind: 'Direct', displayName: name },
      });
      await login(context, 'Student', false);
      await page.goto('/personal/messages/' + ids.chat);
      const header = page.locator('[data-chat-header]');
      const identity = header.getByRole('link', { name: 'اطلاعات گفتگو', exact: true });
      await expect(identity.getByRole('heading')).toHaveText(name);
      await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeEditable();
      await mkdir(output, { recursive: true });
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => document.fonts.ready);
        const geometry = await identity.evaluate((el) => {
          const avatar = el.querySelector(':scope > span')!.getBoundingClientRect();
          const title = el.querySelector('h2')!.getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return { avatar: avatar.toJSON(), title: title.toJSON(), box: box.toJSON() };
        });
        expect(geometry.avatar.x).toBeGreaterThanOrEqual(geometry.title.right);
        expect(geometry.avatar.x - geometry.title.right).toBeLessThanOrEqual(12);
        expect(geometry.title.width).toBeGreaterThan(90);
        expect(geometry.box.height).toBeGreaterThanOrEqual(44);
        const menu = header.getByRole('button', { name: 'گزینه‌های گفتگو', exact: true });
        const menuBox = (await menu.boundingBox())!;
        expect(menuBox.width).toBeGreaterThanOrEqual(44);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(geometry.box.x);
        expect(geometry.avatar.width).toBeGreaterThanOrEqual(40);
        if (width < 768) {
          const back = header.getByRole('link', { name: 'بازگشت به فهرست گفتگوها', exact: true });
          const backBox = (await back.boundingBox())!;
          expect(backBox.x).toBeGreaterThanOrEqual(geometry.box.right);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if ([390, 834, 1440].includes(width))
          await page.screenshot({ path: `${output}/header-${theme}-${language}-${width}.png` });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const menu = header.getByRole('button', { name: 'گزینه‌های گفتگو', exact: true });
      await menu.click();
      await expect(page.getByRole('menuitem', { name: 'رسانه و فایل', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await identity.click();
      await expect(page).toHaveURL(new RegExp(`/messages/${ids.chat}/info$`));
    });
  }
}

test('dark inbox uses slate surfaces, readable previews, pill filters and an accessible compose button', async ({
  page,
  context,
  request,
}) => {
  await context.addInitScript(() => localStorage.setItem('makan-theme', 'dark'));
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.goto('/personal/messages');
  const inbox = page.getByLabel('فهرست گفتگوها', { exact: true });
  await expect(inbox.getByText('مریم رضایی', { exact: true })).toBeVisible();
  expect(await inbox.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(29, 41, 53)',
  );
  const contrast = await inbox.evaluate((el) => {
    const luminance = (rgb: string) => {
      const [r, g, b] = rgb
        .match(/\d+/g)!
        .slice(0, 3)
        .map((value) => {
          const c = Number(value) / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const preview = el.querySelector(
      'a[href*="/messages/"] > span:last-child > span:last-child > span',
    )!;
    const badge = el.querySelector('b[aria-label]')!;
    return {
      preview: ratio(getComputedStyle(preview).color, getComputedStyle(el).backgroundColor),
      badge: ratio(getComputedStyle(badge).color, getComputedStyle(badge).backgroundColor),
    };
  });
  expect(contrast.preview).toBeGreaterThanOrEqual(4.5);
  expect(contrast.badge).toBeGreaterThanOrEqual(4.5);
  const filters = inbox.getByRole('navigation', { name: 'نوع گفتگوها', exact: true });
  expect(
    await filters.evaluate((el) => parseFloat(getComputedStyle(el).borderRadius)),
  ).toBeGreaterThanOrEqual(20);
  await expect(filters.getByRole('button', { name: 'همه', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const compose = inbox.getByRole('button', { name: 'ایجاد گفت‌وگو یا مخاطب', exact: true });
    const box = (await compose.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThan(height);
    expect(
      await compose.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [r.top + 5, r.bottom - 5].every((y) =>
          el.contains(document.elementFromPoint(r.left + r.width / 2, y)),
        );
      }),
    ).toBe(true);
    if (width < 1024) {
      const bottomNav = (await page
        .getByRole('navigation', { name: 'ناوبری حساب شخصی', exact: true })
        .boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(bottomNav.y - 8);
    }
    await compose.click();
    await expect(page.getByRole('menuitem', { name: 'ایجاد گروه', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(compose).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if ([390, 834, 1440].includes(width)) {
      await mkdir(output, { recursive: true });
      await page.screenshot({ path: `${output}/inbox-dark-${width}.png` });
    }
  }
  await inbox.getByRole('textbox', { name: 'جستجوی گفتگوها', exact: true }).fill('مریم');
  await inbox.getByRole('button', { name: 'انجام جستجوی گفتگو', exact: true }).click();
  await expect(page).toHaveURL(/q=/);
  await filters.getByRole('button', { name: 'گروه‌ها', exact: true }).click();
  await expect(page).toHaveURL(/filter=Group/);
});

for (const role of ['Student', 'Teacher']) {
  test(`school weekly agenda ${role}: compact dates, usable controls, real range requests and current-week reset`, async ({
    page,
    context,
    request,
  }) => {
    await login(context, role);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    await request.post(fixture + '/__test__/education-case', {
      data: {
        sessions: [
          {
            id: ids.class,
            classId: ids.class,
            classTitle: 'کلاس ریاضی و علوم',
            title: 'جلسهٔ حل تمرین و پاسخ به پرسش‌های دانش‌آموزان',
            startUtc: today.toISOString(),
            endUtc: new Date(today.getTime() + 3600000).toISOString(),
            status: 'Scheduled',
          },
        ],
      },
    });
    await page.goto('/personal/education/schedule');
    const controls = page.getByRole('navigation', { name: 'جابه‌جایی هفته', exact: true });
    const week = controls.locator('[aria-live]');
    const current = controls.getByRole('button', { name: 'هفتهٔ جاری', exact: true });
    await expect(current).toBeDisabled();
    await expect(
      page.getByRole('heading', { name: 'جلسهٔ حل تمرین و پاسخ به پرسش‌های دانش‌آموزان' }),
    ).toBeVisible();
    const first = await week.textContent();
    await mkdir(output, { recursive: true });
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      const boxes = await controls.getByRole('button').evaluateAll((nodes) =>
        nodes.map((el) => {
          const rect = el.getBoundingClientRect();
          return { rect: rect.toJSON(), width: el.clientWidth, scrollWidth: el.scrollWidth };
        }),
      );
      for (const { rect, width, scrollWidth } of boxes) {
        expect(rect.height).toBeGreaterThanOrEqual(44);
        expect(scrollWidth).toBeLessThanOrEqual(width + 1);
      }
      const dateBox = (await week.boundingBox())!;
      expect(dateBox.height).toBeLessThan(60);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if ([390, 834, 1440].includes(width))
        await page.screenshot({ path: `${output}/school-${role}-${width}.png` });
    }
    const nextResponse = page.waitForResponse((r) => r.url().includes('/academic/schedule?'));
    await controls.getByRole('button', { name: 'هفتهٔ بعد', exact: true }).click();
    expect((await nextResponse).status()).toBe(200);
    await expect(week).not.toHaveText(first!);
    await expect(current).toBeEnabled();
    await expect(
      page.getByRole('heading', { name: 'برای این هفته جلسه‌ای ثبت نشده است' }),
    ).toBeVisible();
    await current.click();
    await expect(week).toHaveText(first!);
    await expect(current).toBeDisabled();
    await expect(
      page.getByRole('heading', { name: 'جلسهٔ حل تمرین و پاسخ به پرسش‌های دانش‌آموزان' }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    const nav = page.getByRole('navigation', { name: 'بخش‌های آموزشگاه', exact: true });
    await nav.getByRole('link', { name: 'کلاس‌ها', exact: true }).click();
    await expect(page.getByRole('link', { name: /کلاس آزمایشی ریاضی/ })).toBeVisible();
    await nav.getByRole('link', { name: 'دعوت‌ها', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'دعوت‌های من', exact: true })).toBeVisible();
  });
}
