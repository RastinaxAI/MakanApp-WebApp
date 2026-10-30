import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
test('final school review: real roles, bounded schedule, responsive views and recovered receipt', async ({
  browser,
}) => {
  const fixture = JSON.parse(await readFile('docs/school-live-qa.json', 'utf8'));
  test.skip(!fixture.ids?.examId, 'Requires the authorized school workflow fixtures.');
  const report: { checks: unknown[]; schedule: unknown[]; errors: string[]; failures: unknown[] } =
    {
      checks: [],
      schedule: [],
      errors: [],
      failures: [],
    };
  const origin = 'http://127.0.0.1:3130';
  for (const [role, phone, title] of [
    ['Manager', '09120000104', 'مدیریت آموزشگاه'],
    ['Teacher', '09120000102', 'میز کار معلم'],
    ['Student', '09120000101', 'مسیر یادگیری من'],
    ['Parent', '09120000103', 'فرزندان من'],
  ]) {
    const context = await browser.newContext({ baseURL: origin, timezoneId: 'Asia/Tehran' });
    const page = await context.newPage();
    const tracked: Promise<void>[] = [];
    page.on('pageerror', (error) => report.errors.push(role + ': ' + error.message));
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/api/client/backend/'))
        tracked.push(
          response
            .json()
            .then((problem) => {
              report.failures.push({
                role,
                path: new URL(response.url()).pathname,
                status: response.status(),
                code: problem.code,
                traceId: problem.traceId,
              });
            })
            .catch(() => {}),
        );
    });
    page.on('response', (response) => {
      if (response.url().includes('/academic/schedule'))
        tracked.push(
          (async () => {
            const url = new URL(response.url());
            expect(url.searchParams.get('fromUtc')).toBeTruthy();
            expect(url.searchParams.get('toUtc')).toBeTruthy();
            report.schedule.push({
              role,
              status: response.status(),
              from: url.searchParams.get('fromUtc'),
              to: url.searchParams.get('toUtc'),
            });
            expect(response.ok()).toBeTruthy();
          })(),
        );
    });
    try {
      const challenge = await context.request.post('/api/client/auth/challenge', {
        headers: { Origin: origin },
        data: { phoneNumber: phone },
      });
      const login = await context.request.post('/api/client/auth/verify', {
        headers: { Origin: origin },
        data: {
          phoneNumber: phone,
          challengeId: (await challenge.json()).challengeId,
          code: '123456',
          deviceName: 'Makan final school review ' + role,
        },
      });
      expect(login.ok()).toBeTruthy();
      let state = await (await context.request.get('/api/client/session')).json();
      const spaces = await (
        await context.request.get('/api/client/backend/api/v1/workspaces/me', {
          headers: { 'X-Makan-Context': state.revision },
        })
      ).json();
      const space = spaces.find((w: any) => w.role === role);
      const selection = await context.request.post('/api/client/backend/api/v1/workspaces/select', {
        headers: { Origin: origin, 'X-Makan-Context': state.revision },
        data: { workspaceType: 'Organization', membershipId: space.membershipId, role },
      });
      expect(selection.ok()).toBeTruthy();
      await page.goto('/personal/education');
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      if (role === 'Parent')
        await page.getByRole('button', { name: /Development Student/ }).click();
      await expect(
        page.getByRole('status', { name: 'در حال دریافت اطلاعات', exact: true }),
      ).toHaveCount(0);
      await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
      for (const [width, height, name] of [
        [1440, 1000, 'desktop'],
        [820, 1180, 'tablet'],
        [390, 844, 'mobile'],
      ] as const) {
        await page.setViewportSize({ width, height });
        await page.screenshot({
          path: 'docs/screenshots/school/' + role.toLowerCase() + '-overview-' + name + '.png',
        });
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
        report.checks.push({ role, view: name, scrollWidth, width });
      }
      if (role === 'Teacher') {
        await page.goto('/personal/education/classes/' + fixture.ids.classId);
        await page
          .getByRole('navigation', { name: 'بخش‌های کلاس' })
          .getByRole('button', { name: 'دانش‌آموزان', exact: true })
          .click();
        await expect(
          page.getByRole('cell', { name: 'Development Student', exact: true }),
        ).toBeVisible();
        await expect(page.getByRole('cell', { name: 'تحویل‌شده', exact: true })).toBeVisible();
        await page.screenshot({ path: 'docs/screenshots/school/teacher-class-final-mobile.png' });
      }
      if (role === 'Student') {
        await page.goto('/personal/education/exams/' + fixture.ids.examId);
        await expect(page.getByRole('button', { name: 'شروع آزمون', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'مشاهدهٔ رسید ثبت آزمون', exact: true }).click();
        await expect(page.getByText(/پاسخ از 2 پرسش/)).toBeVisible();
        await page.screenshot({
          path: 'docs/screenshots/school/student-recovered-receipt-mobile.png',
        });
      }
      await Promise.all(tracked);
    } catch (error) {
      report.failures.push({
        role,
        message: error instanceof Error ? error.message : String(error),
        visibleText: (await page.locator('body').innerText()).slice(0, 5000),
      });
      await writeFile('docs/school-final-review.json', JSON.stringify(report, null, 2) + '\n');
      await page.screenshot({ path: 'docs/screenshots/school/review-failure.png' });
      throw error;
    } finally {
      await context.request
        .post('/api/client/auth/logout', { headers: { Origin: origin } })
        .catch(() => {});
      await context.close();
    }
  }
  await writeFile('docs/school-final-review.json', JSON.stringify(report, null, 2) + '\n');
  expect(report.errors).toEqual([]);
});
