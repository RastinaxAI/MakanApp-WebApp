import { test, expect, login, fixture, ids } from './test';
import { mkdir } from 'node:fs/promises';
test('preference links and dialog buttons share one aligned responsive layout and restore focus', async ({
  page,
  context,
}) => {
  await login(context);
  await mkdir('test-results/preferences-weekly', { recursive: true });
  await page.goto('/personal/profile/preferences');
  const list = page.getByRole('region', { name: 'حساب و ترجیحات', exact: true }),
    rows = list.locator(':scope > a, :scope > button');
  await expect(rows.locator('strong')).toHaveText([
    'حریم خصوصی',
    'اعلان‌ها',
    'اشتراک و مصرف',
    'کلاس‌های شخصی',
    'امنیت و دستگاه‌ها',
    'مخاطبین',
    'تنظیمات',
  ]);
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    const boxes = await rows.evaluateAll((nodes) =>
      nodes.map((node) => ({
        row: node.getBoundingClientRect().toJSON(),
        icon: node.querySelector('span')!.getBoundingClientRect().toJSON(),
        chevron: node.lastElementChild!.getBoundingClientRect().toJSON(),
      })),
    );
    expect(boxes).toHaveLength(7);
    for (const box of boxes) {
      expect(box.row.height).toBeGreaterThanOrEqual(72);
      expect(Math.abs(box.row.width - boxes[0].row.width)).toBeLessThan(1);
      expect(Math.abs(box.icon.x - boxes[0].icon.x)).toBeLessThan(1);
      expect(Math.abs(box.chevron.x - boxes[0].chevron.x)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/preferences-weekly/preferences-${width}.png` });
  }
  await list.getByRole('link', { name: 'اعلان‌ها', exact: true }).click();
  await expect(page).toHaveURL(/settings\/notifications$/);
  await page.goBack();
  await list.getByRole('link', { name: 'حریم خصوصی', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/privacy$/);
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await page.goto('/personal/profile/preferences');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await list.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    'rgb(255, 255, 255)',
  );
  await page.screenshot({ path: 'test-results/preferences-weekly/preferences-dark-390.png' });
});

test('weekly agenda groups real session DTOs, keeps navigation clear and handles a failed next-week read', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await mkdir('test-results/preferences-weekly', { recursive: true });
  await page.goto(`/personal/education/classes/${ids.class}?tab=sessions`);
  const nav = page.getByRole('navigation', { name: 'جابه‌جایی هفته', exact: true }),
    range = nav.locator('[aria-live]');
  await expect(nav.getByRole('button')).toHaveCount(3);
  await expect(nav.getByRole('button', { name: 'هفتهٔ جاری', exact: true })).toBeDisabled();
  const first = await nav.getAttribute('data-week-start'),
    last = await nav.getAttribute('data-week-end');
  expect(new Date(first + 'T12:00:00Z').getUTCDay()).toBe(6);
  expect(new Date(last + 'T12:00:00Z').getUTCDay()).toBe(5);
  const when = (days: number) =>
    new Date(Date.parse(first + 'T12:00:00Z') + days * 86400000).toISOString();
  const night = await page.evaluate(
    (day) => {
      const start = new Date(day + 'T23:30:00'),
        end = new Date(start);
      end.setHours(end.getHours() + 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        endDay: [
          end.getFullYear(),
          String(end.getMonth() + 1).padStart(2, '0'),
          String(end.getDate()).padStart(2, '0'),
        ].join('-'),
      };
    },
    when(3).slice(0, 10),
  );
  await request.post(fixture + '/__test__/education-case', {
    data: {
      sessions: [
        {
          id: ids.lesson,
          classId: ids.class,
          classTitle: 'کلاس ریاضی',
          title: 'جلسهٔ شبانه',
          startUtc: night.start,
          endUtc: night.end,
          status: 'Scheduled',
        },
        {
          id: ids.class,
          classId: ids.class,
          classTitle: 'کلاس ریاضی',
          title: 'جلسهٔ همین هفته',
          startUtc: when(2),
          endUtc: new Date(Date.parse(when(2)) + 3600000).toISOString(),
          status: 'Scheduled',
          meetingUrl: 'https://example.com/class',
        },
        {
          id: ids.exam,
          classId: ids.class,
          classTitle: 'کلاس ریاضی',
          title: 'جلسهٔ هفتهٔ بعد',
          startUtc: when(9),
          endUtc: new Date(Date.parse(when(9)) + 3600000).toISOString(),
          status: 'Scheduled',
        },
        {
          id: ids.assignment,
          classId: ids.class,
          classTitle: 'کلاس ریاضی',
          title: 'جلسهٔ هفتهٔ قبل',
          startUtc: when(-5),
          endUtc: new Date(Date.parse(when(-5)) + 3600000).toISOString(),
          status: 'Scheduled',
        },
      ],
    },
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'جلسهٔ همین هفته', exact: true })).toBeVisible();
  const overnight = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'جلسهٔ شبانه', exact: true }) });
  await expect(overnight.locator('time')).toHaveAttribute('dateTime', night.endDay);
  await expect(page.getByRole('heading', { name: 'جلسهٔ هفتهٔ بعد', exact: true })).toHaveCount(0);
  const initial = await range.textContent();
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    const box = await nav.boundingBox();
    for (const button of await nav.getByRole('button').all()) {
      const b = await button.boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(44);
      expect(b!.x).toBeGreaterThanOrEqual(box!.x);
      expect(b!.x + b!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
    }
    const overlap = await nav.evaluate((node) => {
      const buttons = node.querySelectorAll('button'),
        title = node.querySelector('[aria-live]')!.getBoundingClientRect();
      return [...buttons].some((button) => {
        const r = button.getBoundingClientRect();
        return (
          r.left < title.right &&
          r.right > title.left &&
          r.top < title.bottom &&
          r.bottom > title.top
        );
      });
    });
    expect(overlap).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/preferences-weekly/weekly-${width}.png` });
  }
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/academic/schedule', method: 'GET', status: 503 },
  });
  await nav.getByRole('button', { name: 'هفتهٔ بعد', exact: true }).click();
  await expect(range).not.toHaveText(initial!);
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'برای این هفته جلسه‌ای ثبت نشده است', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'دریافت دوباره', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'جلسهٔ هفتهٔ بعد', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'جلسهٔ همین هفته', exact: true })).toHaveCount(0);
  await nav.getByRole('button', { name: 'هفتهٔ قبل', exact: true }).click();
  await expect(range).toHaveText(initial!);
  await expect(page.getByRole('heading', { name: 'جلسهٔ همین هفته', exact: true })).toBeVisible();
});
