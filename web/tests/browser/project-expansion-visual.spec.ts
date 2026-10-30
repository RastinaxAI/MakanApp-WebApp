import { test, expect, login, ids } from './test';
import { mkdir } from 'node:fs/promises';

test('expanded workflow and account pages preserve RTL, visible controls and responsive bounds', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const folder = 'output/review/project-expansion';
  await mkdir(folder, { recursive: true });
  const groups = [
    {
      role: 'Manager',
      pages: [
        ['class-create', '/personal/education/classes/new', 'نام کلاس'],
        ['person-create', '/personal/education/people/new', 'نام'],
        ['course-create', '/personal/education/courses/new', 'عنوان درس'],
        ['period-create', '/personal/education/periods/new', 'عنوان دوره'],
      ],
    },
    {
      role: 'Teacher',
      pages: [
        ['session-create', `/personal/education/classes/${ids.class}/sessions/new`, 'عنوان جلسه'],
        ['exam-create', `/personal/education/classes/${ids.class}/exams/new`, 'عنوان آزمون'],
      ],
    },
    {
      role: 'Student',
      pages: [
        ['notification-preference', '/personal/settings/notifications/Messages', 'اعلان دستگاه'],
        ['devices', '/personal/settings/devices', ''],
        ['notifications', '/personal/notifications', ''],
      ],
    },
  ];
  for (const group of groups) {
    await login(context, group.role);
    for (const [name, url, field] of group.pages) {
      await page.goto(url);
      if (field) await expect(page.getByLabel(field, { exact: true })).toBeVisible();
      else await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const [width, height] of [
        [390, 844],
        [834, 1194],
        [1440, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        await page.locator('main').evaluate((el) => {
          el.scrollTop = 0;
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        expect(await page.locator('form form').count()).toBe(0);
        await page.screenshot({ path: `${folder}/${name}-${width}.png` });
      }
    }
  }
  await page.goto('/personal/settings/appearance');
  await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
  await page.goto('/personal/settings/notifications/Messages');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('اعلان دستگاه', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${folder}/notification-preference-dark-390.png` });
});
