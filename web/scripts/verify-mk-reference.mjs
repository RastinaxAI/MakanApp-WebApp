import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const origin = process.env.MK_REVIEW_ORIGIN ?? 'http://127.0.0.1:3144',
  fixture = 'http://127.0.0.1:3464';
const output = 'output/review/mk-reference/flows';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function check(name, run) {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
      reducedMotion: 'reduce',
    }),
    page = await context.newPage(),
    errors = [];
  await context.addInitScript(() => {
    try {
      localStorage.setItem('makan:pwa-install-dismissed:v1', '1');
    } catch {}
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await context.request.post(fixture + '/__test__/reset');
  try {
    await run({ page, context });
    assert.deepEqual(errors, []);
    results.push({ name, passed: true });
  } catch (e) {
    await page
      .screenshot({ path: output + '/' + results.length + '-failure.png', fullPage: true })
      .catch(() => {});
    results.push({ name, passed: false, error: e.message, errors });
  } finally {
    await context.close();
    console.log((results.at(-1).passed ? 'PASS ' : 'FAIL ') + name);
  }
}
async function login(context, role = 'Student', school = true) {
  const phone = {
    Student: '09120000101',
    Teacher: '09120000102',
    Parent: '09120000103',
    Manager: '09120000104',
    Personal: '09120000199',
  }[role];
  const headers = { Origin: origin };
  let r = await context.request.post(origin + '/api/client/auth/challenge', {
    headers,
    data: { phoneNumber: phone },
  });
  assert.equal(r.status(), 202);
  r = await context.request.post(origin + '/api/client/auth/verify', {
    headers,
    data: {
      phoneNumber: phone,
      challengeId: (await r.json()).challengeId,
      code: '123456',
      deviceName: 'MK isolated verification',
    },
  });
  assert.equal(r.status(), 200);
  let state = await (await context.request.get(origin + '/api/client/session')).json();
  if (school && role !== 'Personal') {
    const spaces = await (
      await context.request.get(origin + '/api/client/backend/api/v1/workspaces/me', {
        headers: { 'X-Makan-Context': state.revision },
      })
    ).json();
    const w = spaces.find((x) => x.role === role);
    assert.ok(w);
    r = await context.request.post(origin + '/api/client/backend/api/v1/workspaces/select', {
      headers: { ...headers, 'X-Makan-Context': state.revision },
      data: { workspaceType: 'Organization', membershipId: w.membershipId, role: w.role },
    });
    assert.equal(r.status(), 200);
    state = await (await context.request.get(origin + '/api/client/session')).json();
  }
  return state;
}
async function go(page, id, scenario = '') {
  await page.goto(origin + '/preview/reference/' + id + (scenario ? '?scenario=' + scenario : ''));
  await page.locator('[data-mk-view="' + id + '"]').waitFor();
}
async function snapshot(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('makan-reference-preview-v1')));
}
async function confirm(page) {
  await page.getByRole('dialog').getByRole('button', { name: 'تأیید نهایی', exact: true }).click();
}
async function more(page) {
  await page.getByRole('button', { name: 'گزینه‌های بیشتر', exact: true }).click();
}
try {
  await check(
    'OTP sign in returns to the deep invitation; history does not reopen login',
    async ({ page }) => {
      await page.goto(origin + '/personal/extracurricular/invitations');
      await expect(page).toHaveURL(/\/enter/);
      await page.getByLabel('شماره همراه', { exact: true }).fill('۰۹۱۲۰۰۰۰۱۹۹');
      await page.getByRole('button', { name: 'دریافت کد تأیید', exact: true }).click();
      await page.getByLabel('کد ورود', { exact: true }).fill('۱۲۳۴۵۶');
      await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
      await expect(page).toHaveURL(/extracurricular\/invitations$/);
      await expect(page.getByRole('main')).toContainText(/دعوت/);
      await page.goBack();
      assert.ok(!new URL(page.url()).pathname.startsWith('/enter'));
    },
  );
  for (const role of ['Student', 'Teacher', 'Manager', 'Parent', 'Personal'])
    await check(
      role + ' authorized connected landing and five destinations',
      async ({ page, context }) => {
        await login(context, role, role !== 'Personal');
        await page.goto(origin + '/personal/education');
        await page.locator('[data-mk-view]').waitFor();
        for (const name of ['آموزشگاه', 'فوق‌برنامه', 'دستیار', 'پیام‌ها', 'پروفایل'])
          await expect(
            page.locator('.tabbar').getByRole('link', { name, exact: true }),
          ).toBeVisible();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await page.screenshot({ path: output + '/' + role + '-education.png' });
        await page.goto(origin + '/personal/profile');
        await expect(page.locator('[data-mk-view="MK-47"]')).toBeVisible();
        await expect(page.getByText('sara.ahmadi', { exact: true })).toHaveCount(0);
      },
    );
  await check(
    'ordinary account wizard persists refresh and never invents a formation API',
    async ({ page, context }) => {
      await login(context, 'Personal', false);
      await page.goto(origin + '/personal/extracurricular/requests/new?step=details');
      await page.getByRole('button', { name: 'ادامه: مخاطبان', exact: true }).click();
      await expect(page.locator('.err[role=alert]').first()).toContainText(/نام کلاس|هدف کلاس/);
      await page.getByLabel('نام کلاس', { exact: true }).fill('کلاس بدون آموزشگاه');
      await page
        .getByLabel('هدف و شرح کلاس', { exact: true })
        .fill('تمرین و یادگیری مستقل با بازخورد محترمانه و حفظ حریم همه اعضای کلاس.');
      await page.getByLabel('موضوع', { exact: true }).selectOption('هنر');
      await page.reload();
      await expect(page.getByLabel('نام کلاس', { exact: true })).toHaveValue('کلاس بدون آموزشگاه');
      await page.getByRole('button', { name: 'ادامه: مخاطبان', exact: true }).click();
      await page.getByLabel('این کلاس برای چه کسانی است؟', { exact: true }).fill('همه علاقه‌مندان');
      await page.getByLabel('ظرفیت پیشنهادی', { exact: true }).fill('۲۰');
      await page.getByLabel('قواعد حضور', { exact: true }).fill('احترام و حفظ حریم اعضا');
      await page.getByRole('button', { name: 'ادامه: مدیریت و مدرس', exact: true }).click();
      await expect(page.getByRole('radio', { name: 'فعلاً بدون مدرس', exact: true })).toBeChecked();
      await page.getByRole('button', { name: 'ادامه: بازبینی درخواست', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'ارسال برای بررسی · هنوز فعال نیست', exact: true }),
      ).toBeDisabled();
      const state = await (await context.request.get(fixture + '/__test__/state')).json();
      assert.equal(
        state.requests.filter((r) => r.method === 'POST' && /personal-classes/.test(r.path)).length,
        0,
      );
    },
  );
  await check(
    'privacy saves a genuine versioned response; session list is connected',
    async ({ page, context }) => {
      await login(context);
      await page.goto(origin + '/personal/settings/privacy');
      await page.getByLabel('دریافت پیام مستقیم', { exact: true }).selectOption('Nobody');
      await page.getByRole('button', { name: 'ثبت تنظیمات', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('تنظیمات در سرور ثبت شد');
      await page.reload();
      await expect(page.getByLabel('دریافت پیام مستقیم', { exact: true })).toHaveValue('Nobody');
      await page.goto(origin + '/personal/settings/devices');
      await expect(page.getByRole('main')).toContainText('دستگاه فعلی');
    },
  );
  await check(
    'resource upload destination survives refresh; readiness stays independent',
    async ({ page, context }) => {
      await login(context);
      await page.goto(origin + '/personal/resources');
      await page.getByRole('button', { name: 'افزودن منبع', exact: true }).click();
      await expect(page).toHaveURL(/upload=1&scope=Personal/);
      await page.reload();
      await expect(page.getByLabel('عنوان منبع', { exact: true })).toBeVisible();
      await page.getByLabel('عنوان منبع', { exact: true }).fill('منبع بررسی مرجع');
      await page.getByLabel('دلیل ثبت', { exact: true }).fill('بررسی در داده آزمایشی');
      await page.getByLabel('فایل منبع', { exact: true }).setInputFiles({
        name: 'review.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF'),
      });
      await page.getByRole('button', { name: 'ثبت منبع', exact: true }).click();
      await expect(page).toHaveURL(/resources\/[a-f0-9-]{36}$/);
      await expect(page.getByText('هوش مصنوعی: آماده نیست', { exact: true })).toBeVisible();
    },
  );
  await check(
    'unready AI source is disabled while its file remains readable',
    async ({ page, context }) => {
      await login(context, 'Student', false);
      await page.goto(origin + '/personal/assistant');
      await page.getByRole('button', { name: 'انتخاب منابع', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const choices = page.getByRole('dialog').getByRole('checkbox');
      await expect(choices.first()).toBeVisible();
      assert.ok((await choices.count()) > 0);
      await expect(choices.first()).toBeDisabled();
    },
  );
  await check(
    'legacy direct-create link enters the reviewed formation wizard',
    async ({ page, context }) => {
      await login(context, 'Personal', false);
      await page.goto(origin + '/personal/classes/new');
      await expect(page).toHaveURL(/extracurricular\/requests\/new/);
    },
  );
  await check(
    'preview formation revises one request and retries the same class/group/channel',
    async ({ page }) => {
      await go(page, 'MK-13');
      await page.getByRole('button', { name: 'ادامه: مخاطبان', exact: true }).click();
      await page.getByRole('button', { name: 'ادامه: مدیریت و مدرس', exact: true }).click();
      await page.getByRole('button', { name: 'ادامه: بازبینی درخواست', exact: true }).click();
      await page.getByRole('button', { name: 'ارسال برای بررسی', exact: true }).click();
      await expect(page).toHaveURL(/MK-17$/);
      const submitted = (await snapshot(page)).state.requests[0];
      assert.equal(submitted.status, 'Submitted');
      await go(page, 'MK-19');
      await page
        .getByLabel('پیام قابل نمایش به درخواست‌دهنده', { exact: true })
        .fill('هدف و شرایط پذیرش را روشن‌تر بنویسید.');
      await page.getByRole('button', { name: 'درخواست اصلاح', exact: true }).click();
      await confirm(page);
      await expect(page).toHaveURL(/MK-18$/);
      await page.getByRole('button', { name: 'اصلاح و ارسال دوباره', exact: true }).click();
      await page
        .getByLabel('هدف و شرح کلاس', { exact: true })
        .fill('هدف اصلاح‌شده کلاس با تمرین هفتگی و بازخورد روشن و محترمانه برای اعضا.');
      await page.getByRole('button', { name: 'ادامه: مخاطبان', exact: true }).click();
      await page.getByRole('button', { name: 'ادامه: مدیریت و مدرس', exact: true }).click();
      await page.getByRole('button', { name: 'ادامه: بازبینی درخواست', exact: true }).click();
      await page.getByRole('button', { name: 'ارسال برای بررسی', exact: true }).click();
      await expect(page).toHaveURL(/MK-17$/);
      assert.equal((await snapshot(page)).state.requests[0].id, submitted.id);
      await go(page, 'MK-19');
      await page.getByRole('button', { name: 'تأیید و آماده‌سازی', exact: true }).click();
      await confirm(page);
      await expect(page).toHaveURL(/MK-20$/);
      let state = (await snapshot(page)).state;
      const cls = state.classes.find((c) => c.id === state.requests[0].classId);
      assert.ok(cls);
      await more(page);
      await page
        .getByRole('button', { name: 'دریافت نتیجهٔ آماده‌سازی نمونه', exact: true })
        .click();
      await expect(page).toHaveURL(/MK-21$/);
      await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
      await expect(page).toHaveURL(/MK-22$/);
      state = (await snapshot(page)).state;
      const retried = state.classes.find((c) => c.id === cls.id);
      assert.deepEqual(
        [retried.id, retried.group.id, retried.channel.id],
        [cls.id, cls.group.id, cls.channel.id],
      );
      assert.equal(retried.channel.ready, true);
      await page.getByRole('button', { name: 'شروع مدیریت کلاس', exact: true }).click();
      await confirm(page);
      await expect(page).toHaveURL(/MK-24$/);
      await more(page);
      await page.getByRole('button', { name: 'بایگانی کلاس', exact: true }).click();
      await confirm(page);
      await expect(page).toHaveURL(/MK-25$/);
      assert.equal(
        (await snapshot(page)).state.classes.find((c) => c.id === cls.id).status,
        'Archived',
      );
    },
  );
  await check('alternate manager requires a separate account and acceptance', async ({ page }) => {
    await go(page, 'MK-19');
    await page
      .getByRole('combobox', { name: 'مدیر نهایی', exact: true })
      .selectOption('مریم رضایی؛ مدیر جایگزین');
    await page.getByRole('button', { name: 'تأیید و آماده‌سازی', exact: true }).click();
    await confirm(page);
    await expect(page).toHaveURL(/MK-20$/);
    let state = (await snapshot(page)).state;
    const cls = state.classes.find((c) => c.id === state.requests[0].classId);
    assert.equal(cls.managerAccepted, false);
    assert.equal(
      cls.members.some((m) => m.userId === 'preview-sara'),
      false,
    );
    await more(page);
    await page
      .getByRole('button', { name: 'ورود با حساب آزمایشی مدیر جایگزین', exact: true })
      .click();
    await more(page);
    await page.getByRole('button', { name: 'پذیرش مسئولیت پیشنهادی', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'مسئولیت مدیر' })).toBeVisible();
    assert.equal(
      (await snapshot(page)).state.classes.find((c) => c.id === cls.id).managerAccepted,
      true,
    );
  });
  await check(
    'preview invitation needs consent and adds only one local membership',
    async ({ page }) => {
      await go(page, 'MK-27');
      const rules = page.getByRole('checkbox');
      await rules.uncheck();
      await page.getByRole('button', { name: 'پذیرش دعوت', exact: true }).click();
      await expect(page.locator('.err[role=alert]')).toContainText('قواعد');
      await rules.check();
      await page.getByRole('button', { name: 'پذیرش دعوت', exact: true }).click();
      await confirm(page);
      await expect(page.getByRole('button', { name: 'پذیرش دعوت', exact: true })).toBeDisabled();
      const state = (await snapshot(page)).state;
      assert.equal(
        state.classes[0].members.filter((m) => m.userId === 'preview-sara' && m.status === 'Active')
          .length,
        1,
      );
    },
  );
  await check('pending join grants no access and can be withdrawn', async ({ page }) => {
    await go(page, 'MK-28');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'ارسال درخواست عضویت', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('تا تصمیم مدیر');
    let state = (await snapshot(page)).state;
    assert.equal(
      state.classes[0].members.some((m) => m.userId === 'preview-sara'),
      false,
    );
    await page.getByRole('button', { name: 'انصراف از درخواست', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'منصرف' })).toBeVisible();
    state = (await snapshot(page)).state;
    assert.equal(state.joins.find((j) => j.userId === 'preview-sara').status, 'Cancelled');
  });
  await check(
    'full capacity is visible and an expired invitation has no acceptance action',
    async ({ page }) => {
      await go(page, 'MK-28', 'capacity-full');
      await expect(page.getByRole('status').filter({ hasText: 'ظرفیت کلاس تکمیل' })).toBeVisible();
      await go(page, 'MK-27', 'invitation-expired');
      await expect(page.getByRole('button', { name: 'پذیرش دعوت', exact: true })).toBeDisabled();
    },
  );
  await check('inbox search and filters change rows, then restore them', async ({ page }) => {
    await go(page, 'MK-35');
    assert.equal(await page.locator('.chat-row').count(), 5);
    await page.getByRole('button', { name: 'کانال‌ها', exact: true }).click();
    assert.equal(await page.locator('.chat-row').count(), 1);
    await page.getByRole('button', { name: 'همه', exact: true }).click();
    await page.getByLabel('جستجو در پیام‌ها', { exact: true }).fill('نامی که نیست');
    await expect(page.getByText('نتیجه‌ای پیدا نشد', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'پاک‌کردن جستجو و فیلتر', exact: true }).click();
    assert.equal(await page.locator('.chat-row').count(), 5);
  });
  await check(
    'source selection counts only ready sources and prevents empty submit',
    async ({ page }) => {
      await go(page, 'MK-39');
      const checks = page.getByRole('checkbox');
      assert.equal(await checks.count(), 2);
      await checks.first().click();
      await expect(
        page.getByRole('button', { name: 'استفاده از ۰ منبع', exact: true }),
      ).toBeDisabled();
      await checks.nth(1).click();
      await expect(
        page.getByRole('button', { name: 'استفاده از ۱ منبع', exact: true }),
      ).toBeEnabled();
    },
  );
  await check('message sheet traps keyboard focus and Escape closes it', async ({ page }) => {
    await go(page, 'MK-37');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'بستن');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'پاسخ');
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/MK-36$/);
  });
  await check(
    'theme follows the device and preserves explicit choice on refresh',
    async ({ page, context }) => {
      await login(context, 'Personal', false);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(origin + '/personal/settings/appearance');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.getByRole('radio', { name: 'روشن', exact: true }).check();
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.getByRole('radio', { name: 'مطابق دستگاه', exact: true }).check();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    },
  );
  await check(
    'invitation account selection, expiry and consent survive the preview flow',
    async ({ page }) => {
      await go(page, 'MK-26');
      await page.getByLabel('جستجوی حساب', { exact: true }).fill('مریم');
      await page.getByRole('button', { name: /مریم رحیمی.*maryam.r/ }).click();
      await page.getByRole('button', { name: 'اعتبار دعوت', exact: true }).click();
      await page.getByLabel('تاریخ پایان دعوت', { exact: true }).fill('2026-11-12');
      await page.getByLabel('پیام دعوت', { exact: true }).fill('دعوت با تاریخ و پیام انتخابی');
      await page.getByRole('button', { name: 'ارسال دعوت', exact: true }).click();
      await confirm(page);
      await expect(page.getByRole('dialog')).toContainText('مریم رحیمی');
      let state = (await snapshot(page)).state;
      const invite = state.invitations.find((i) => i.userId === 'preview-invite-maryam');
      assert.equal(invite.message, 'دعوت با تاریخ و پیام انتخابی');
      assert.ok(invite.expiresAt.startsWith('2026-11-12'));
      await page
        .getByRole('button', { name: 'بررسی با حساب آزمایشی دعوت‌شده', exact: true })
        .click();
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'پذیرش دعوت', exact: true }).click();
      await confirm(page);
      state = (await snapshot(page)).state;
      assert.equal(
        state.classes[0].members.filter(
          (m) => m.userId === 'preview-invite-maryam' && m.status === 'Active',
        ).length,
        1,
      );
    },
  );
  await check(
    'editing and ending the selected member changes local data only',
    async ({ page }) => {
      await go(page, 'MK-30');
      await page.getByRole('button', { name: /مریم رضاییعضو آموزشی/ }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByLabel('نام نمایشی در کلاس', { exact: true }).fill('مریم در کارگاه');
      await page.getByLabel('یادداشت مدیریتی', { exact: true }).fill('یادداشت محلی انتخاب‌شده');
      await page.getByRole('button', { name: 'ذخیره اطلاعات', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'اطلاعات محلی عضو' })).toBeVisible();
      let state = (await snapshot(page)).state;
      const target = state.classes[0].members.find((m) => m.localName === 'مریم در کارگاه');
      assert.equal(target.name, 'مریم رضایی');
      assert.equal(target.note, 'یادداشت محلی انتخاب‌شده');
      await page.getByRole('button', { name: 'پایان عضویت', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('مریم در کارگاه');
      await page.getByLabel('دلیل پایان عضویت', { exact: true }).fill('پایان همکاری نمونه');
      await dialog.getByRole('button', { name: 'پایان عضویت', exact: true }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'عضویت در پیش‌نمایش پایان' }),
      ).toBeVisible();
      state = (await snapshot(page)).state;
      assert.equal(state.classes[0].members.find((m) => m.id === target.id).status, 'Removed');
      assert.equal(
        state.classes[0].members.find((m) => m.name === 'نازنین موسوی').status,
        'Active',
      );
    },
  );
  await check(
    'the review queue decides the selected request and requires a public reason',
    async ({ page }) => {
      await go(page, 'MK-19');
      await page.getByRole('button', { name: /باشگاه کتاب‌خوانیمریم/ }).click();
      await page.getByRole('button', { name: 'رد درخواست', exact: true }).click();
      await expect(page.locator('.err[role=alert]')).toContainText('دلیل قابل نمایش');
      await page
        .getByLabel('پیام قابل نمایش به درخواست‌دهنده', { exact: true })
        .fill('دلیل تصمیم برای درخواست انتخاب‌شده');
      await page.getByRole('button', { name: 'رد درخواست', exact: true }).click();
      await confirm(page);
      await expect(page).toHaveURL(/MK-12$/);
      const state = (await snapshot(page)).state;
      assert.equal(state.requests.find((r) => r.id === 'request-book').status, 'Rejected');
      assert.equal(state.requests[0].status, 'UnderReview');
    },
  );
  await check(
    'conflict dismissal retains the form and rejected/cancelled requests are reproducible',
    async ({ page }) => {
      await go(page, 'MK-55');
      await page.getByRole('button', { name: 'بازگشت به ویرایش', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByLabel('نام کلاس', { exact: true }).fill('نام حفظ‌شده پس از تعارض');
      await page.reload();
      await expect(page.getByLabel('نام کلاس', { exact: true })).toHaveValue(
        'نام حفظ‌شده پس از تعارض',
      );
      await go(page, 'MK-12', 'rejected');
      await expect(page.locator('.card').first()).toContainText('ردشده');
      await go(page, 'MK-12', 'cancelled');
      await expect(page.locator('.card').first()).toContainText('لغوشده');
    },
  );
  await check(
    'reviewer teacher selection stays with its own request and the accepted manager may also teach',
    async ({ page }) => {
      await go(page, 'MK-19');
      await page
        .getByRole('combobox', { name: 'مدرس پیشنهادی', exact: true })
        .selectOption('سارا احمدی؛ مدرس پیشنهادی');
      await page.getByLabel('یادداشت داخلی ناظر', { exact: true }).fill('یادداشت همین درخواست');
      await page.getByRole('button', { name: /باشگاه کتاب‌خوانیمریم/ }).click();
      await expect(page.getByLabel('یادداشت داخلی ناظر', { exact: true })).not.toHaveValue(
        'یادداشت همین درخواست',
      );
      await page
        .locator('.queue')
        .getByRole('button', { name: /کارگاه داستان‌نویسی/ })
        .click();
      await expect(page.getByLabel('یادداشت داخلی ناظر', { exact: true })).toHaveValue(
        'یادداشت همین درخواست',
      );
      await expect(page.getByRole('combobox', { name: 'مدرس پیشنهادی', exact: true })).toHaveValue(
        'سارا احمدی؛ مدرس پیشنهادی',
      );
      await page.getByRole('button', { name: 'تأیید و آماده‌سازی', exact: true }).click();
      await confirm(page);
      await expect(page).toHaveURL(/MK-20$/);
      const state = (await snapshot(page)).state;
      const cls = state.classes.find((c) => c.id === state.requests[0].classId);
      assert.equal(cls.teacherUserId, 'preview-sara');
      assert.deepEqual(cls.members[0].roles, ['Manager', 'Teacher']);
    },
  );
} finally {
  await browser.close();
  await fs.writeFile(
    output + '/results.json',
    JSON.stringify(
      {
        syntheticBackend: true,
        origin,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        tests: results,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify({
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    }),
  );
  if (results.some((r) => !r.passed)) process.exitCode = 1;
}
