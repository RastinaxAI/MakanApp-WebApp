import { test, expect, login, ids, fixture } from './test';
test('Teacher uses independent lesson create, edit and review pages; Student reads only Published', async ({
  page,
  context,
  request,
  browser,
}) => {
  await login(context, 'Teacher');
  await page.goto(`/personal/education/classes/${ids.class}/lessons/new`);
  await page.getByLabel('عنوان درس و جزوه', { exact: true }).fill('جزوهٔ آزمایشی مستقل');
  await page.getByLabel('متن درس', { exact: true }).fill('متن درس نمونه برای بررسی ذخیره و انتشار');
  await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true }).click();
  await expect(page).toHaveURL(/\/lessons\/.+\/review$/);
  const lessonId = page.url().split('/').at(-2)!;
  await expect(
    page.getByText('متن درس نمونه برای بررسی ذخیره و انتشار', { exact: true }),
  ).toBeVisible();
  const student = await browser.newContext({ baseURL: 'http://127.0.0.1:3132' });
  const state = await login(student);
  const draft = await student.request.get(
    `/api/client/backend/api/v1/academic/lessons/${lessonId}`,
    { headers: { 'X-Makan-Context': state.revision } },
  );
  expect(draft.status()).toBe(404);
  await page.getByRole('link', { name: 'ویرایش پیش‌نویس', exact: true }).click();
  await page.getByLabel('متن درس', { exact: true }).fill('متن ویرایش‌شده');
  await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس', exact: true }).click();
  await expect(page).toHaveURL(/\/review$/);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'انتشار درس', exact: true }).click();
  await expect(
    page.getByText('این درس منتشر شده است و ویرایش آن در این نسخه امکان‌پذیر نیست.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await student.request.get(`/api/client/backend/api/v1/academic/lessons/${lessonId}`, {
        headers: { 'X-Makan-Context': state.revision },
      })
    ).ok(),
  ).toBeTruthy();
  await student.close();
  const record = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    record.requests.filter(
      (r: { path: string; method: string }) => r.path.endsWith('/publish') && r.method === 'POST',
    ),
  ).toHaveLength(1);
});
test('exam saves an answer and shows a receipt only after accepted finalization', async ({
  page,
  context,
  request,
}) => {
  await login(context);
  await page.goto(`/personal/education/exams/${ids.exam}`);
  await page.getByRole('button', { name: 'شروع آزمون', exact: true }).click();
  const text = page.getByLabel('پاسخ پرسش 1', { exact: true });
  await text.fill('چهار');
  await page.getByRole('button', { name: 'مرور پاسخ‌ها', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'بازگشت به پاسخ‌ها', exact: true }).click();
  await page.getByRole('button', { name: 'ذخیرهٔ پاسخ 1', exact: true }).click();
  await page.getByRole('button', { name: 'مرور پاسخ‌ها', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true })).toBeEnabled();
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/finalize', method: 'POST', status: 503 },
  });
  await page.getByRole('button', { name: 'ثبت نهایی آزمون', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'آزمون ثبت نهایی شد' })).toHaveCount(0);
  await page.getByRole('button', { name: 'تلاش مجدد برای ثبت نهایی', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'آزمون ثبت نهایی شد', exact: true }),
  ).toBeVisible();
});
