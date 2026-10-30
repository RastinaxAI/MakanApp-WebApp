import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const origin = 'http://127.0.0.1:3130';
const conversationId = 'd68c2b5d-9bbe-48a4-bbd1-39fc60d685ea';
const screenshotDir = path.resolve('docs/screenshots/navigation-media');
test('four destinations, profile settings, source workspace and real attachment workflow', async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: origin, acceptDownloads: true });
  const page = await context.newPage();
  const report: {
    checkedAt: string;
    mode: string;
    checks: Record<string, unknown>;
    screens: unknown[];
    media: unknown[];
    network: unknown[];
    errors: string[];
  } = {
    checkedAt: new Date().toISOString(),
    mode: 'Isolated Playwright project QA; real seeded Student API. No browser cookies or JWTs exported.',
    checks: {},
    screens: [],
    media: [],
    network: [],
    errors: [],
  };
  page.on('pageerror', (error) => report.errors.push(error.message));
  const diagnostics: Promise<void>[] = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (
      !url.pathname.startsWith('/api/client/files') &&
      !(
        url.pathname.endsWith('/' + conversationId + '/messages') &&
        response.request().method() === 'POST'
      )
    )
      return;
    diagnostics.push(
      (async () => {
        const detail = response.headers()['content-type']?.includes('json')
          ? await response.json().catch(() => ({}))
          : {};
        report.network.push({
          path: url.pathname,
          method: response.request().method(),
          status: response.status(),
          code: detail.code,
          traceId: detail.traceId,
          errors: detail.errors,
          fileStatus: detail.status,
          fileId: detail.id,
          sizeBytes: detail.sizeBytes,
        });
      })(),
    );
  });
  await mkdir(screenshotDir, { recursive: true });
  await mkdir('tmp/media-qa', { recursive: true });
  async function screenshot(name: string) {
    await expect(page.locator('main')).toBeVisible();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      headerHeight: document.querySelector('header')?.getBoundingClientRect().height,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
    await page.screenshot({ path: path.join(screenshotDir, name + '.png'), fullPage: false });
    report.screens.push({ name, ...metrics });
  }
  async function state() {
    const response = await context.request.get('/api/client/session');
    expect(response.ok()).toBeTruthy();
    return response.json();
  }
  async function api(apiPath: string, method = 'GET', data?: unknown) {
    const current = await state();
    return context.request.fetch('/api/client/backend' + apiPath, {
      method,
      headers: { Origin: origin, 'X-Makan-Context': current.revision },
      data,
    });
  }
  try {
    const challenge = await context.request.post('/api/client/auth/challenge', {
      headers: { Origin: origin },
      data: { phoneNumber: '09120000101' },
    });
    expect(challenge.ok()).toBeTruthy();
    const login = await context.request.post('/api/client/auth/verify', {
      headers: { Origin: origin },
      data: {
        phoneNumber: '09120000101',
        challengeId: (await challenge.json()).challengeId,
        code: '123456',
        deviceName: 'Makan navigation/media project QA',
      },
    });
    expect(login.ok()).toBeTruthy();
    report.checks.authenticated = true;
    const initialState = await state();
    report.checks.initialWorkspace = initialState.context.workspaceType;
    report.checks.cookieFlags = (await context.cookies()).map(
      ({ name, secure, domain, path, sameSite }) => ({ name, secure, domain, path, sameSite }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/personal');
    await expect(page.getByRole('heading', { name: 'آموزشگاه‌های من', exact: true })).toBeVisible();
    const nav = page.locator('nav[aria-label="ناوبری حساب شخصی"]:visible');
    await expect(nav.getByRole('link')).toHaveText([
      'آموزشگاه',
      'دستیار ماکان',
      'پیام‌ها',
      'حساب من',
    ]);
    const header = page.locator('header').first();
    await expect(header.getByRole('link', { name: 'ماکان؛ آموزشگاه' })).toBeVisible();
    await expect(header.locator('a[href="/personal/profile"]')).not.toBeVisible();
    await expect(header.getByRole('button', { name: /حالت (تاریک|روشن)/ })).toHaveCount(0);
    expect(await header.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
      84,
    );
    report.checks.mobileNavigation = ['آموزشگاه', 'دستیار ماکان', 'پیام‌ها', 'حساب من'];
    report.checks.mobileHeader = 'Brand and context/role only; at least 84px tall.';
    await screenshot('education-mobile');
    await page.goto('/personal/profile');
    await page.getByRole('link', { name: 'تنظیمات', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'تنظیمات', exact: true })).toBeVisible();
    await screenshot('settings-mobile');
    await page.getByRole('link', { name: /ظاهر برنامه/ }).click();
    await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.getByRole('radio', { name: 'تاریک', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'روشن', exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    report.checks.theme = 'Dark saved across reload, restored to light through account settings.';
    await page.goto('/personal/settings/privacy');
    await expect(page.getByRole('heading', { name: 'حریم خصوصی', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'حساب‌های مسدودشده', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await screenshot('privacy-mobile');
    await page.goto('/personal/settings/blocked');
    await expect(page.getByRole('heading', { name: 'حساب‌های مسدودشده', level: 1 })).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(0);
    report.checks.separateSettings =
      'Privacy and blocked accounts use distinct routes; no privacy write or block change.';
    await page.goto('/personal/assistant');
    await expect(page.getByRole('heading', { name: 'دستیار ماکان', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'پرسش از دستیار' })).toBeDisabled();
    await expect(header.getByRole('link', { name: 'ماکان؛ آموزشگاه' })).toBeVisible();
    await expect(nav).toBeVisible();
    await screenshot('assistant-mobile');
    await page.getByRole('button', { name: 'گشت در نمونه', exact: true }).click();
    await page.getByRole('tab', { name: 'منابع', exact: true }).click();
    await expect(page.getByRole('button', { name: /ساختار و کار یاخته/ })).toBeVisible();
    await page
      .getByRole('checkbox', { name: 'انتخاب یادداشت‌های کلاس زیست', exact: true })
      .uncheck();
    await page.getByRole('tab', { name: 'گفتگو', exact: true }).click();
    await page.getByRole('button', { name: 'ایده‌های اصلی را خلاصه کن', exact: true }).click();
    await expect(page.getByText('پاسخ نمایشی', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'مشاهدهٔ استناد 1', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'بستن', exact: true }).press('Escape');
    await expect(page.getByRole('button', { name: 'مشاهدهٔ استناد 1', exact: true })).toBeFocused();
    await page.getByRole('tab', { name: 'استودیو', exact: true }).click();
    await page.getByRole('button', { name: /فلش‌کارت/ }).click();
    await page
      .getByRole('button', { name: 'نمایش یا پنهان‌کردن پاسخ فلش‌کارت', exact: true })
      .click();
    await expect(page.getByText('غشای یاخته', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'بستن', exact: true }).click();
    report.checks.assistant =
      'Explicit sample mode; source selection, sample chat, citation focus and flashcard work. No AI call or billing.';
    for (const viewport of [
      { width: 820, height: 1180 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await screenshot('assistant-' + (viewport.width === 820 ? 'tablet' : 'desktop'));
    }
    await page.goto('/personal/settings/appearance');
    await page.getByRole('radio', { name: 'تاریک', exact: true }).check();
    await page.goto('/personal/assistant');
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot('assistant-dark-mobile');
    await page.goto('/personal/settings/appearance');
    await page.getByRole('radio', { name: 'روشن', exact: true }).check();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/personal/messages/' + conversationId);
    await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'افزودن پیوست', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'افزودن پیوست', exact: true }).click();
    for (const name of ['دوربین', 'عکس از گالری', 'ویدئو از گالری', 'فایل از دستگاه'])
      await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible();
    await screenshot('attachment-menu-desktop');
    await page.keyboard.press('Escape');
    expect(await page.locator('input[aria-label="عکاسی با دوربین"]').getAttribute('capture')).toBe(
      'environment',
    );
    report.checks.camera =
      'Native capture input configured; no physical camera or permission tested.';
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator('input[aria-label="انتخاب عکس از گالری"]')
      .setInputFiles([
        path.resolve('public/icons/makan-192.png'),
        path.resolve('public/icons/makan-192.png'),
      ]);
    const preview = page.getByRole('dialog');
    await expect(preview.locator('article')).toHaveCount(2);
    await screenshot('preview-multiple-mobile');
    await preview
      .getByRole('button', { name: /حذف از انتخاب‌ها:/ })
      .first()
      .click();
    await expect(preview.locator('article')).toHaveCount(1);
    await preview.getByRole('button', { name: /حذف از انتخاب‌ها:/ }).click();
    await preview.getByRole('button', { name: 'بستن', exact: true }).click();
    await expect(page.getByRole('button', { name: 'افزودن پیوست', exact: true })).toBeFocused();
    report.checks.multiplePreview =
      'Two images previewed; removal and focus restoration checked without upload.';
    await page.setViewportSize({ width: 1440, height: 1000 });
    const conversation = await api('/api/v1/conversations/' + conversationId);
    expect(conversation.ok()).toBeTruthy();
    expect((await conversation.json()).title).toContain('آزمون');
    await writeFile(
      'tmp/media-qa/makan-file-qa.txt',
      'آزمون انتقال فایل ماکان؛ این فایل دادهٔ شخصی ندارد.\n',
    );
    const generated = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d')!;
      const stream = canvas.captureStream(5);
      const mime = ['video/mp4;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((value) =>
        MediaRecorder.isTypeSupported(value),
      )!;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      return new Promise<{ mime: string; bytes: number[] }>((resolve) => {
        let count = 0;
        const draw = setInterval(() => {
          ctx.fillStyle = count++ % 2 ? '#1169b8' : '#0f766e';
          ctx.fillRect(0, 0, 160, 120);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px sans-serif';
          ctx.fillText('Makan media QA', 14, 62);
        }, 100);
        recorder.onstop = async () => {
          clearInterval(draw);
          stream.getTracks().forEach((track) => track.stop());
          resolve({
            mime: recorder.mimeType,
            bytes: [
              ...new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer()),
            ],
          });
        };
        recorder.start(100);
        setTimeout(() => recorder.stop(), 1500);
      });
    });
    const videoExtension = generated.mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    expect(generated.bytes.length).toBeGreaterThan(100);
    const videoPath = 'tmp/media-qa/makan-video-qa.' + videoExtension;
    await writeFile(videoPath, new Uint8Array(generated.bytes));
    const fixtures = [
      { kind: 'image', file: 'public/icons/makan-192.png', input: 'انتخاب عکس از گالری' },
      { kind: 'video', file: videoPath, input: 'انتخاب ویدئو از گالری' },
      { kind: 'file', file: 'tmp/media-qa/makan-file-qa.txt', input: 'انتخاب فایل از دستگاه' },
    ];
    if (process.env.MAKAN_RUN_MEDIA_WRITE_TESTS === '1') {
      for (const fixture of fixtures) {
        const caption = 'آزمون پیوست ' + fixture.kind + ' — ' + new Date().toISOString();
        await page
          .locator('input[aria-label="' + fixture.input + '"]')
          .setInputFiles(path.resolve(fixture.file));
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('textbox', { name: 'توضیح پیوست (اختیاری)' }).fill(caption);
        await screenshot('preview-' + fixture.kind);
        const uploadWaiting = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === '/api/client/files' &&
            response.request().method() === 'POST',
        );
        await dialog.getByRole('button', { name: /^ارسال .* پیوست$/ }).click();
        await Promise.race([
          dialog.waitFor({ state: 'hidden', timeout: 40000 }),
          dialog.getByRole('alert').first().waitFor({ state: 'visible', timeout: 40000 }),
        ]);
        const uploadResponse = await uploadWaiting;
        if (await dialog.isVisible()) {
          const failure = await dialog.getByRole('alert').first().innerText();
          const uploadProblem = await uploadResponse.json();
          expect(uploadResponse.status()).toBe(415);
          expect(uploadProblem.code).toBe('FILE_TYPE_NOT_ALLOWED');
          report.media.push({
            kind: fixture.kind,
            uploadSucceeded: false,
            uiFailure: failure,
            blockedBy: uploadProblem.code,
            traceId: uploadProblem.traceId,
          });
          await screenshot('upload-failure-' + fixture.kind);
          await dialog.getByRole('button', { name: /حذف از انتخاب‌ها:/ }).click();
          await dialog.getByRole('button', { name: 'بستن', exact: true }).click();
          continue;
        }
        expect(uploadResponse.status()).toBe(201);
        const uploaded = await uploadResponse.json();
        expect(uploaded.status).toBe('Ready');
        const selected = await state();
        const download = await context.request.get(
          '/api/client/files/' + uploaded.id + '/content?conversationId=' + conversationId,
          { headers: { 'X-Makan-Context': selected.revision } },
        );
        const downloadEvidence: Record<string, unknown> = { downloadStatus: download.status() };
        if (download.ok()) {
          const actualOwnFile = await download.body(),
            fixtureBytes = await readFile(fixture.file);
          expect(createHash('sha256').update(actualOwnFile).digest('hex')).toBe(
            createHash('sha256').update(fixtureBytes).digest('hex'),
          );
          Object.assign(downloadEvidence, {
            ownDownloadSha256Matches: true,
            bytes: actualOwnFile.length,
          });
        } else {
          const problem = await download.json();
          expect([403, 404]).toContain(download.status());
          Object.assign(downloadEvidence, {
            downloadBlockedBy: problem.code,
            downloadTraceId: problem.traceId,
          });
        }
        let message: any;
        for (let attempt = 0; attempt < 4 && !message; attempt++) {
          const history = await api(
            '/api/v1/conversations/' + conversationId + '/messages?limit=30',
          );
          expect(history.ok()).toBeTruthy();
          message = (await history.json()).messages.find(
            (item: { text: string }) => item.text === caption,
          );
          if (!message) await page.waitForTimeout(1000);
        }
        if (!message) {
          await Promise.allSettled(diagnostics);
          const rejection = report.network
            .filter((item: any) => item.method === 'POST' && item.path.endsWith('/messages'))
            .at(-1) as any;
          expect(rejection?.code).toBe('MESSAGE_SAFETY_REVIEW_REQUIRED');
          await expect(
            page
              .getByText(
                'این پیام برای ارسال به بررسی ایمنی نیاز دارد. برای پیگیری با پشتیبانی تماس بگیرید.',
              )
              .first(),
          ).toBeVisible();
          report.media.push({
            kind: fixture.kind,
            uploadSucceeded: true,
            fileId: uploaded.id,
            ...downloadEvidence,
            messagePersisted: false,
            blockedBy: rejection.code,
            traceId: rejection.traceId,
          });
          continue;
        }
        expect(message.attachments).toHaveLength(1);
        const attachment = message.attachments[0];
        const current = await state();
        const binary = await context.request.get(
          '/api/client/files/' +
            attachment.fileAssetId +
            '/content?conversationId=' +
            conversationId,
          { headers: { 'X-Makan-Context': current.revision } },
        );
        expect(binary.ok()).toBeTruthy();
        const actual = await binary.body(),
          expected = await readFile(fixture.file);
        expect(createHash('sha256').update(actual).digest('hex')).toBe(
          createHash('sha256').update(expected).digest('hex'),
        );
        report.media.push({
          kind: fixture.kind,
          uploadSucceeded: true,
          messagePersisted: true,
          downloadStatus: binary.status(),
          bytes: actual.length,
          sha256Matches: true,
          contentType: attachment.contentType,
          fileId: attachment.fileAssetId,
        });
      }
    } else
      report.checks.mediaWrites =
        'Skipped: enable MAKAN_RUN_MEDIA_WRITE_TESTS=1 for the authorized QA group.';
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'متن پیام', exact: true })).toBeVisible();
    await expect(
      page.locator('[aria-label="پیام‌های گفتگو"] [aria-label="در حال دریافت اطلاعات"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('[aria-label="فهرست گفتگوها"] [aria-label="در حال دریافت اطلاعات"]'),
    ).toHaveCount(0);
    await screenshot('messenger-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot('messenger-mobile');
    report.checks.browserErrors = report.errors;
    expect(report.errors).toEqual([]);
  } catch (error) {
    report.checks.failure = {
      message: error instanceof Error ? error.message : String(error),
      url: page.url(),
      visibleText: (
        await page
          .locator('body')
          .innerText()
          .catch(() => '')
      ).slice(0, 3500),
    };
    await page
      .screenshot({ path: path.join(screenshotDir, 'qa-failure.png'), fullPage: false })
      .catch(() => {});
    throw error;
  } finally {
    await Promise.allSettled(diagnostics);
    await writeFile(
      process.env.MAKAN_RUN_MEDIA_WRITE_TESTS === '1'
        ? 'docs/navigation-media-qa.json'
        : 'docs/navigation-media-ui-qa.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await context.request
      .post('/api/client/auth/logout', { headers: { Origin: origin } })
      .catch(() => {});
    await context.close();
  }
});
