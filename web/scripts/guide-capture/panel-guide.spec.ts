import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect, login, ids, fixture } from '../../tests/browser/test';

test('capture the current panel with fictional data for the public user guide', async ({
  page,
  context,
  request,
}) => {
  const folder = 'docs/user-guide/images';
  await mkdir(folder, { recursive: true });
  const captures: string[] = [];
  page.on('dialog', (dialog) => void dialog.accept());
  async function capture(name: string, selector?: string, height?: number) {
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole('status', { name: 'در حال دریافت اطلاعات', exact: true }),
    ).toHaveCount(0);
    if (selector) {
      const box = await page.locator(selector).first().boundingBox();
      if (!box) throw Error('Missing guide screenshot target: ' + selector);
      await page.screenshot({
        path: `${folder}/${name}.png`,
        clip: { ...box, height: Math.min(height ?? box.height, box.height) },
      });
    } else await page.screenshot({ path: `${folder}/${name}.png` });
    captures.push(name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/enter');
  await capture('login', 'main > div', 450);
  await login(context);
  await page.goto('/personal/workspaces');
  await expect(
    page.getByRole('heading', { name: 'کجا ادامه می‌دهید؟', exact: true }),
  ).toBeVisible();
  await capture('workspaces', 'main', 300);
  await page.goto('/personal/education');
  await expect(page.getByRole('heading', { name: 'نمای آموزشگاه', exact: true })).toBeVisible();
  await capture('education-mobile');
  await page
    .getByRole('navigation', { name: 'ناوبری حساب شخصی' })
    .filter({ visible: true })
    .screenshot({ path: `${folder}/bottom-nav.png` });
  captures.push('bottom-nav');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture('sidebar', 'aside', 465);
  await page.setViewportSize({ width: 834, height: 1100 });
  await page.goto(`/personal/education/assignments/${ids.assignment}/answer`);
  await page.getByRole('button', { name: 'شروع پاسخ جدید', exact: true }).click();
  await page
    .getByLabel('پاسخ تکلیف', { exact: true })
    .fill('پاسخ خود را اینجا می‌نویسم و پیش از تحویل، آن را بازبینی می‌کنم.');
  await page.setViewportSize({ width: 390, height: 1200 });
  await page
    .getByRole('heading', { name: 'متن پاسخ شما', exact: true })
    .locator('..')
    .locator('..')
    .screenshot({ path: `${folder}/assignment.png` });
  captures.push('assignment');
  await page.setViewportSize({ width: 834, height: 1100 });
  await page.goto(`/personal/education/exams/${ids.exam}`);
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  await expect(page.getByLabel('پاسخ پرسش 1', { exact: true })).toBeVisible();
  await capture('exam', 'main', 300);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/personal/messages/' + ids.chat);
  await page
    .getByRole('textbox', { name: 'متن پیام', exact: true })
    .fill('سلام، دربارهٔ تکلیف امروز یک پرسش دارم.');
  await capture('chat');
  await page.goto('/personal/profile/preferences');
  await capture('preferences', 'main', 650);
  await page.setViewportSize({ width: 834, height: 1100 });
  await page.goto('/personal/assistant');
  await expect(page.getByRole('tab', { name: 'گفتگو', exact: true })).toBeVisible();
  await capture('assistant', 'main', 520);
  await login(context, 'Manager');
  await page.goto('/personal/education');
  await expect(page.getByRole('heading', { name: 'مدیریت آموزشگاه', exact: true })).toBeVisible();
  await capture('manager', 'main', 260);
  await request.post(fixture + '/__test__/parent-children', {
    data: {
      children: [
        {
          learnerOrganizationPersonId: '00000000-0000-4000-8000-000000000501',
          displayName: 'فرزند نمونه',
        },
      ],
    },
  });
  await login(context, 'Parent');
  await page.goto('/personal');
  await expect(page.getByRole('combobox', { name: 'انتخاب فرزند', exact: true })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'انتخاب فرزند', exact: true })
    .screenshot({ path: `${folder}/parent.png` });
  captures.push('parent');
  await request.post(fixture + '/__test__/education-case', {
    data: {
      invitations: [
        {
          id: ids.class,
          organizationName: 'آموزشگاه نمونهٔ ماکان',
          role: 'Parent',
          status: 'Pending',
          expiresAtUtc: '2027-01-01T12:00:00Z',
          guardianLearnerDisplayName: 'فرزند نمونه',
          requiresGuardianConsent: true,
        },
      ],
    },
  });
  await page.setViewportSize({ width: 390, height: 1200 });
  await page.goto('/personal/education/invitations');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('article').screenshot({ path: `${folder}/invitation.png` });
  captures.push('invitation');
  await writeFile(
    'docs/user-guide/captures.json',
    JSON.stringify(
      {
        environment:
          'isolated local fixture at 3132/3457; screenshots of current application code; fictional data',
        productionBackendWrites: false,
        captures,
      },
      null,
      2,
    ) + '\n',
  );
});
