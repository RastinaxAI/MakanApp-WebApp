import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const origin = 'http://127.0.0.1:3144',
  output = process.env.MK_REVIEW_OUTPUT ?? 'output/review/mk-v3/flows';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  results = [];
const go = async (page, id, scenario = '') => {
  await page.goto(origin + '/preview/reference/' + id + (scenario ? '?scenario=' + scenario : ''));
  await page.locator('[data-mk-view]').waitFor();
};
const state = (page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('makan-reference-education-v2') ?? 'null'));
async function check(name, callback, width = 390) {
  const context = await browser.newContext({
      viewport: { width, height: 1000 },
      locale: 'fa-IR',
      reducedMotion: 'reduce',
    }),
    page = await context.newPage(),
    errors = [],
    writes = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/')) writes.push(r.url());
  });
  try {
    await callback(page);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    results.push({ name, passed: true });
  } catch (e) {
    await page.screenshot({ path: output + '/' + results.length + '-failure.png' }).catch(() => {});
    results.push({ name, passed: false, error: e.message, errors });
  } finally {
    await context.close();
    console.log((results.at(-1).passed ? 'PASS ' : 'FAIL ') + name);
  }
}
try {
  await check('assignment review, publication, response and local receipt', async (page) => {
    await go(page, 'MK-60');
    await page.getByLabel('عنوان تکلیف', { exact: true }).fill('تمرین تازهٔ روایت');
    await page.getByRole('button', { name: 'ادامه: بازبینی انتشار', exact: true }).click();
    await expect(page).toHaveURL(/MK-61$/);
    await page.getByRole('button', { name: 'انتشار برای ۱۲ عضو', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'تأیید' })).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'انتشار برای ۱۲ عضو', exact: true }).click();
    await expect(page).toHaveURL(/MK-81$/);
    assert.equal((await state(page)).assignment.published, true);
    await go(page, 'MK-45');
    await page.getByRole('button', { name: 'نوشتن پاسخ', exact: true }).click();
    await page
      .getByLabel('متن پاسخ', { exact: true })
      .fill('پاسخ تازه برای بررسی جریان واقعی پیش‌نمایش');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'تحویل نهایی پاسخ', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'تأیید تحویل نمونه' }).click();
    await expect(page).toHaveURL(/MK-63$/);
    assert.equal((await state(page)).response.receipt, 'DEMO-TASK-0384');
    await expect(page.getByText('DEMO-TASK-0384', { exact: true })).toBeVisible();
  });
  await check(
    'grade save is private until publication; private notes are excluded',
    async (page) => {
      await go(page, 'MK-64');
      await page.getByLabel('نمره از ۲۰', { exact: true }).fill('۱۹');
      await page
        .getByLabel('بازخورد قابل نمایش به عضو', { exact: true })
        .fill('بازخورد عمومی اصلاح‌شده');
      await page.getByLabel('یادداشت خصوصی ارزیاب', { exact: true }).fill('PRIVATE-ONLY-TEST');
      await page.getByRole('button', { name: 'ذخیره ارزیابی', exact: true }).click();
      assert.equal((await state(page)).assignmentGrade.published, false);
      await go(page, 'MK-65');
      await expect(page.getByRole('heading', { name: 'نتیجه هنوز منتشر نشده است' })).toBeVisible();
      await expect(page.getByText('PRIVATE-ONLY-TEST')).toHaveCount(0);
      await go(page, 'MK-64');
      await page.getByRole('button', { name: 'بازبینی انتشار نتیجه', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'انتشار نتیجه نمونه', exact: true })
        .click();
      await expect(page).toHaveURL(/MK-65$/);
      await expect(page.getByText('PRIVATE-ONLY-TEST')).toHaveCount(0);
      assert.equal((await state(page)).assignmentGrade.published, true);
      assert.equal((await state(page)).assignmentGrade.score, 19);
      await expect(page.getByText('بازخورد عمومی اصلاح‌شده', { exact: true })).toBeVisible();
    },
  );
  await check(
    'exam authoring, member preview, timer, offline queue and final receipt',
    async (page) => {
      await go(page, 'MK-69');
      await page.getByRole('button', { name: 'ادامه: افزودن سؤال', exact: true }).click();
      await expect(page).toHaveURL(/MK-70$/);
      await page.getByRole('button', { name: 'ذخیره سؤال', exact: true }).click();
      await expect(page).toHaveURL(/MK-71$/);
      await page.getByRole('button', { name: /پیش‌نمایش عضو/ }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      assert.equal((await dialog.innerText()).includes('پاسخ صحیح'), false);
      await page.keyboard.press('Escape');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'انتشار آزمون', exact: true }).click();
      await page.getByRole('button', { name: 'شرایط و شروع', exact: true }).click();
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'شروع آزمون ۱۵ دقیقه‌ای', exact: true }).click();
      await expect(page).toHaveURL(/MK-68$/);
      const deadline = (await state(page)).attempt.deadline;
      await page.getByRole('radio', { name: 'مینا خوشحال بود.', exact: true }).check();
      await go(page, 'MK-78');
      await page.getByRole('radio', { name: 'مینا احساس خوبی داشت.', exact: true }).check();
      assert.equal((await state(page)).attempt.pending.q3, '2');
      assert.equal((await state(page)).attempt.deadline, deadline);
      await page.getByRole('button', { name: 'تلاش دوباره برای اتصال', exact: true }).click();
      await expect(page).toHaveURL(/MK-68$/);
      assert.deepEqual((await state(page)).attempt.pending, {});
      assert.equal((await state(page)).attempt.deadline, deadline);
      await page.getByRole('button', { name: 'مرور همه پاسخ‌ها', exact: true }).click();
      await page.getByRole('button', { name: 'ثبت نهایی با یک سؤال بی‌پاسخ', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'ثبت نهایی نمونه', exact: true })
        .click();
      await expect(page).toHaveURL(/MK-73$/);
      assert.equal((await state(page)).attempt.receipt, 'DEMO-EXAM-0128');
    },
  );
  await check('published correction retains the previous result', async (page) => {
    await go(page, 'MK-76');
    await page.getByRole('button', { name: 'انتشار اصلاحیه', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'تأیید' })).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'انتشار اصلاحیه', exact: true }).click();
    await expect(page).toHaveURL(/MK-74$/);
    const data = await state(page);
    assert.equal(data.examGrade.version, 2);
    assert.equal(data.examGrade.history[0].score, 17);
    assert.equal(data.examGrade.score, 18);
  });
  await check(
    'manager without education capability and revoked membership cannot author',
    async (page) => {
      await go(page, 'MK-60', 'manager-no-education');
      await expect(page.locator('[data-mk-view="MK-79"]')).toBeVisible();
      await expect(page.getByLabel('عنوان تکلیف', { exact: true })).toHaveCount(0);
      await go(page, 'MK-46', 'revoked');
      await expect(page.locator('[data-mk-view="MK-79"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'تحویل نهایی پاسخ', exact: true })).toHaveCount(
        0,
      );
    },
  );
  await check(
    'desktop question selection and member preview',
    async (page) => {
      await go(page, 'MK-82');
      await page.getByRole('button', { name: /سؤال ۱.*تستی.*۳ نمره/ }).click();
      await page.getByLabel('صورت سؤال', { exact: true }).fill('صورت سؤال ویرایش‌شده در دسکتاپ');
      await page.getByRole('radio', { name: 'مینا احساس خوبی داشت.', exact: true }).check();
      await page.getByRole('button', { name: 'ذخیره سؤال', exact: true }).click();
      assert.equal((await state(page)).exam.questions[0].correct, 2);
      assert.equal((await state(page)).exam.questions[0].prompt, 'صورت سؤال ویرایش‌شده در دسکتاپ');
      await page.getByRole('button', { name: 'دیدن پیش‌نمایش', exact: true }).click();
      await expect(
        page.getByRole('dialog').getByText('صورت سؤال ویرایش‌شده در دسکتاپ', { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('dialog').getByText('پاسخ صحیح', { exact: true })).toHaveCount(0);
    },
    1440,
  );
  await check(
    'desktop assignment row opens its submission queue',
    async (page) => {
      await go(page, 'MK-81');
      await page.getByRole('button', { name: 'جزئیات روایت یک اتفاق کوچک', exact: true }).click();
      await expect(page).toHaveURL(/MK-62$/);
    },
    1440,
  );
  await check(
    'a new desktop question remains selectable and editable',
    async (page) => {
      await go(page, 'MK-82');
      await page.getByRole('button', { name: 'افزودن سؤال', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'افزودن سؤال تشریحی', exact: true })
        .click();
      await expect(page.getByLabel('صورت سؤال', { exact: true })).toHaveValue('صورت سؤال تازه');
      await page.getByLabel('صورت سؤال', { exact: true }).fill('سؤال ششم نمونه');
      await page.getByRole('button', { name: 'ذخیره سؤال', exact: true }).click();
      assert.equal((await state(page)).exam.questions[5].prompt, 'سؤال ششم نمونه');
      await page.getByRole('button', { name: /سؤال ۶.*تشریحی/ }).click();
      await expect(page.getByLabel('صورت سؤال', { exact: true })).toHaveValue('سؤال ششم نمونه');
    },
    1440,
  );
} finally {
  await browser.close();
  await fs.writeFile(
    output + '/results.json',
    JSON.stringify({ synthetic: true, realBackendWrites: 0, results }, null, 2) + '\n',
  );
  if (results.some((r) => !r.passed)) process.exitCode = 1;
}
