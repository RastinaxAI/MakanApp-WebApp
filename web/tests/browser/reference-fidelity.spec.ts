import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { test, expect, login, ids, fixture } from './test';

test('current responsive geometry and historical route reference at 390, 834 and 1440', async ({
  page,
  context,
  request,
  browser,
}) => {
  expect((await request.post(fixture + '/__test__/design')).ok()).toBeTruthy();
  await login(context, 'Student');
  await mkdir('test-results/reference-match', { recursive: true });
  const reference = await browser.newPage();
  const html = await readFile('output/design/makan-responsive-prototype.html', 'utf8');
  await reference.setContent(html);
  await reference.addStyleTag({
    content:
      '.status{display:none!important} body.clean .canvas-wrap{zoom:1!important} .screen-index-label{display:none!important}',
  }); // Exclude simulated OS chrome and preview scaling; compare native viewport geometry.
  const metrics = [];
  try {
    for (const [device, width, height] of [
      ['mobile', 390, 844],
      ['tablet', 834, 1194],
      ['desktop', 1440, 1000],
    ] as const) {
      await page.setViewportSize({ width, height });
      await reference.setViewportSize({ width, height });
      await page.goto('/personal/education');
      await expect(page.locator('[data-education-upcoming] > section')).toHaveCount(3);
      const destinations = page
        .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
        .filter({ visible: true })
        .getByRole('link');
      await expect(destinations).toHaveCount(4);
      for (const [index, name] of ['آموزشگاه', 'دستیار ماکان', 'پیام‌ها', 'پروفایل'].entries()) {
        await expect(destinations.nth(index)).toHaveAccessibleName(name);
      }
      expect(
        await page
          .locator('header')
          .first()
          .evaluate((el) => Math.round(el.getBoundingClientRect().height)),
      ).toBe(device === 'mobile' ? 58 : 64);
      await page.screenshot({ path: `test-results/reference-match/S01-actual-${width}.png` });
      await reference.evaluate((device) => {
        document.body.classList.add('clean');
        const p = (
          window as unknown as {
            MakanPreview: { setDevice: (d: string) => void; go: (id: string) => void };
          }
        ).MakanPreview;
        p.setDevice(device);
        p.go('S01');
      }, device);
      await reference.screenshot({ path: `test-results/reference-match/S01-target-${width}.png` });
      metrics.push({
        screen: 'S01',
        width,
        note: 'School overview follows the newer explicit request: four destinations and three upcoming summaries; old featured-cover geometry is intentionally superseded.',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.goto('/personal/profile');
      await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /آموزشگاه آفتاب/ }).last()).toBeVisible();
      await page.screenshot({ path: `test-results/reference-match/U01-actual-${width}.png` });
      await reference.evaluate(() => {
        (window as unknown as { MakanPreview: { go: (id: string) => void } }).MakanPreview.go(
          'U01',
        );
      });
      await reference.screenshot({ path: `test-results/reference-match/U01-target-${width}.png` });
    }
    await login(context, 'Student', false);
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto('/personal/messages/' + ids.chat);
      await expect(
        page
          .getByLabel('پیام‌های گفتگو', { exact: true })
          .getByText('حتماً، تا جلسهٔ بعد.', { exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: `test-results/reference-match/C03-actual-${width}.png` });
    }
    await login(context, 'Teacher');
    page.on('dialog', (d) => void d.accept());
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(`/personal/education/classes/${ids.class}/lessons/new`);
      await page.getByLabel('عنوان درس و جزوه', { exact: true }).fill('معادله‌های خطی');
      await page
        .getByLabel('متن درس', { exact: true })
        .fill(
          'در یک معادله خطی، مجهول توان اول دارد. برای یافتن x، در دو طرف معادله عمل یکسان انجام می‌دهیم.',
        );
      await page.getByLabel('ترتیب نمایش', { exact: true }).fill('3');
      await page.getByText('یک موضوع روشن، یک درس تازه.', { exact: true }).click();
      const submit = page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true });
      await expect(submit).toBeInViewport();
      await expect(
        page.getByRole('navigation', { name: 'ناوبری حساب شخصی' }).filter({ visible: true }),
      ).toHaveCount(width >= 1024 ? 1 : 0);
      await page.screenshot({ path: `test-results/reference-match/T02-actual-${width}.png` });
    }
    await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);
    await page.getByRole('link', { name: 'ویرایش پیش‌نویس', exact: true }).click();
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(page.getByLabel('عنوان درس و جزوه', { exact: true })).toHaveValue(
        'معادله‌های خطی',
      );
      await page.screenshot({ path: `test-results/reference-match/T03-actual-${width}.png` });
    }
    await page.goto(`/personal/education/classes/${ids.class}/assignments/new`);
    for (const [width, height] of [
      [390, 844],
      [834, 1194],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(
        page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس تکلیف', exact: true }),
      ).toBeInViewport();
      await page.screenshot({ path: `test-results/reference-match/T05-actual-${width}.png` });
    }
  } finally {
    await reference.close();
  }
  await writeFile('test-results/reference-match/geometry.json', JSON.stringify(metrics, null, 2));
});

test('workspace selection is explicit and a Student cannot author a class assignment', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.goto('/personal/workspaces');
  await expect(page.getByRole('button', { name: /حساب شخصی/ })).toHaveCount(0);
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `test-results/reference-match/A04-actual-${width}.png` });
  }
  await page.getByRole('button', { name: /آموزشگاه آفتاب/ }).click();
  await expect(page).toHaveURL(/\/personal$/);
  await expect(page.getByRole('heading', { name: 'نمای آموزشگاه', exact: true })).toBeVisible();
  await page.goto(`/personal/education/classes/${ids.class}/assignments/new`);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('دسترسی محدود است');
  await expect(page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس تکلیف' })).toHaveCount(0);
});

test('Parent sees only the selected child dashboard and Manager uses the reference layout', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Parent');
  await page.goto('/personal/education');
  await page
    .getByRole('combobox', { name: 'انتخاب فرزند', exact: true })
    .selectOption('00000000-0000-4000-8000-000000000501');
  await expect(page.getByRole('heading', { name: 'سارا احمدی', exact: true })).toBeVisible();
  await expect(
    page.getByText('اطلاعات آموزشیِ منتشرشدهٔ سارا احمدی را اینجا دنبال کنید.', { exact: true }),
  ).toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `test-results/reference-match/P02-actual-${width}.png` });
  }
  await login(context, 'Manager');
  await page.goto('/personal/education');
  await expect(page.getByRole('heading', { name: 'مدیریت آموزشگاه', exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /پرونده‌ها و اعضا معلم، دانش‌آموز و والد/ }),
  ).toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `test-results/reference-match/M01-actual-${width}.png` });
  }
});

test('exam question navigation retains answers and exposes final review separately', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context);
  await page.goto(`/personal/education/exams/${ids.exam}`);
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  await page.getByRole('button', { name: 'سؤال بعد', exact: true }).click();
  await page.getByRole('button', { name: 'سؤال بعد', exact: true }).click();
  await page.getByRole('radio', { name: '۴', exact: true }).check();
  await page.getByRole('button', { name: 'ذخیرهٔ پاسخ 3', exact: true }).click();
  await expect(page.getByText('آخرین پاسخ ذخیره شد.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'سؤال قبل', exact: true }).click();
  await page.getByRole('button', { name: 'سؤال بعد', exact: true }).click();
  await expect(page.getByRole('radio', { name: '۴', exact: true })).toBeChecked();
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('[data-exam-room] > div').evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: `test-results/reference-match/S13-actual-${width}.png` });
  }
});

test('public introduction and phone sign-in follow the PDF without owner navigation', async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/welcome');
    await expect(
      page.getByRole('heading', { name: 'یادگیری، کنار هم.', exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/reference-match/W01-actual-${width}.png` });
    await page.goto('/enter');
    await expect(page.getByLabel('شماره همراه', { exact: true })).toBeVisible();
    await page.getByRole('heading', { name: 'به ماکان خوش آمدید' }).click();
    await page.screenshot({ path: `test-results/reference-match/A01-actual-${width}.png` });
  }
});

test('desktop inbox restores only a previously opened, currently filtered conversation', async ({
  page,
  context,
  request,
}) => {
  await request.post(fixture + '/__test__/design');
  await login(context, 'Student', false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/personal/messages');
  await expect(
    page.getByRole('heading', { name: 'گفت‌وگو از همین‌جا شروع می‌شود', exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('فهرست گفتگوها', { exact: true })
    .getByRole('link')
    .filter({ hasText: 'مریم رضایی' })
    .click();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
  await page.locator('aside').getByRole('link', { name: 'پیام‌ها', exact: true }).click();
  await expect(page).toHaveURL(/\/personal\/messages$/);
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'نوع گفتگوها' })
    .getByRole('button', { name: 'گروه‌ها', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'نوع گفتگوها' })
    .getByRole('button', { name: 'همه', exact: true })
    .click();
  await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [834, 1194],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toHaveCount(
      width === 390 ? 0 : 1,
    );
    await page.screenshot({ path: `test-results/reference-match/C01-actual-${width}.png` });
  }
});
