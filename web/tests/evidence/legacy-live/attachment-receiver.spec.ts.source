import { expect, test } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Isolated CLIENT rendering test. History, read cursor and file bytes are intercepted here only.
// This does not establish a real recipient, server authorization or delivery.
test('explicit client fixtures: image, video, cancel, retry and file save', async ({ browser }) => {
  const origin = 'http://127.0.0.1:3130',
    conversationId = 'd68c2b5d-9bbe-48a4-bbd1-39fc60d685ea';
  const context = await browser.newContext({
    baseURL: origin,
    acceptDownloads: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const report: { mode: string; checks: Record<string, unknown>; errors: string[] } = {
    mode: 'CLIENT FIXTURES ONLY: mocked message history, read cursor and file content in isolated Playwright context; not real delivery.',
    checks: {},
    errors: [],
  };
  page.on('pageerror', (error) => report.errors.push(error.message));
  let release: () => void = () => {};
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
        deviceName: 'Makan receiver client fixture QA',
      },
    });
    expect(login.ok()).toBeTruthy();
    const state = await (await context.request.get('/api/client/session')).json();
    const result = await context.request.get(
      '/api/client/backend/api/v1/conversations/' + conversationId + '/messages?limit=30',
      { headers: { 'X-Makan-Context': state.revision } },
    );
    expect(result.ok()).toBeTruthy();
    const template = (await result.json()).messages[0];
    expect(template).toBeTruthy();
    const assets = [
      {
        id: 'a1111111-1111-4111-8111-111111111111',
        name: 'receiver-fixture.png',
        file: 'public/icons/makan-192.png',
        type: 'image/png',
        kind: 'Image',
      },
      {
        id: 'a2222222-2222-4222-8222-222222222222',
        name: 'receiver-fixture.mp4',
        file: 'tests/fixtures/media-test-video.mp4',
        type: 'video/mp4',
        kind: 'Video',
      },
      {
        id: 'a3333333-3333-4333-8333-333333333333',
        name: 'receiver-fixture.txt',
        file: 'tests/fixtures/media-test-file.txt',
        type: 'text/plain',
        kind: 'File',
      },
    ];
    const bytes = await Promise.all(assets.map((asset) => readFile(asset.file)));
    const messages = assets.map((asset, index) => ({
      ...template,
      messageId: asset.id,
      clientMessageId: asset.id,
      sequence: 900 + index,
      kind: asset.kind,
      text: 'نمونهٔ آزمون دریافت — ' + asset.kind,
      reply: null,
      attachments: [
        {
          fileAssetId: asset.id,
          fileName: asset.name,
          contentType: asset.type,
          sizeBytes: bytes[index].length,
          createdAtUtc: template.sentAtUtc,
          kind: asset.kind,
        },
      ],
    }));
    await page.route(
      '**/api/client/backend/api/v1/conversations/' + conversationId + '/messages?*',
      (route) => route.fulfill({ json: { messages, nextBeforeSequence: null } }),
    );
    await page.route(
      '**/api/client/backend/api/v1/conversations/' + conversationId + '/read',
      (route) => route.fulfill({ status: 204 }),
    );
    let attempts = 0;
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      await page.route('**/api/client/files/' + asset.id + '/content?*', async (route) => {
        if (index === 2) {
          attempts++;
          if (attempts === 1)
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          if (attempts === 2) {
            await route.fulfill({ status: 503, json: { code: 'FILE_TRANSFER_UNAVAILABLE' } });
            return;
          }
        }
        await route
          .fulfill({
            status: 200,
            contentType: 'application/octet-stream',
            body: bytes[index],
            headers: { 'Content-Length': String(bytes[index].length) },
          })
          .catch(() => {});
      });
    }
    await page.goto('/personal/messages/' + conversationId);
    await expect(page.getByText('نمونهٔ آزمون دریافت — File', { exact: true })).toBeVisible();
    const download = page.getByRole('button', { name: 'دریافت receiver-fixture.txt', exact: true });
    await download.click();
    await page
      .getByRole('button', { name: 'توقف دریافت receiver-fixture.txt', exact: true })
      .click();
    release();
    await expect(page.getByText('دریافت متوقف شد.', { exact: true })).toBeVisible();
    await download.click();
    await expect(
      page.getByText('انتقال فایل انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.', {
        exact: true,
      }),
    ).toBeVisible();
    await download.click();
    const saved = page.waitForEvent('download');
    await page.getByRole('link', { name: 'ذخیرهٔ receiver-fixture.txt', exact: true }).click();
    const actualDownload = await saved;
    await mkdir('tmp/media-qa', { recursive: true });
    const savedPath = path.resolve('tmp/media-qa/received-fixture.txt');
    await actualDownload.saveAs(savedPath);
    expect(await readFile(savedPath)).toEqual(bytes[2]);
    report.checks.file =
      'Cancel, explicit retry after 503, save and byte equality passed against local fixture.';
    await page.getByText('نمونهٔ آزمون دریافت — Video', { exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'دریافت receiver-fixture.mp4', exact: true }).click();
    const video = page.locator('video[controls]');
    await expect(video).toBeVisible();
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.duration))
      .toBeGreaterThan(0);
    report.checks.video =
      'Local MP4 fixture decoded with native controls; not a real server video.';
    await page.getByText('نمونهٔ آزمون دریافت — Image', { exact: true }).scrollIntoViewIfNeeded();
    const image = page.getByRole('img', { name: 'receiver-fixture.png', exact: true });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBe(192);
    report.checks.image =
      'Lazy authenticated-transport UI and blob preview render the local PNG fixture.';
    const fits = await page.locator('[aria-label="پیام‌های گفتگو"] article').evaluateAll((nodes) =>
      nodes.every((node) => {
        const parent = node.getBoundingClientRect();
        return [...node.querySelectorAll('img,video,audio')].every((media) => {
          const rect = media.getBoundingClientRect();
          return rect.left >= parent.left && rect.right <= parent.right;
        });
      }),
    );
    expect(fits).toBe(true);
    report.checks.mobileContainment = 'Media stays inside its message bubble.';
    await mkdir('docs/screenshots/navigation-media', { recursive: true });
    await page.screenshot({
      path: 'docs/screenshots/navigation-media/receiver-client-fixture-mobile.png',
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: 'docs/screenshots/navigation-media/receiver-client-fixture-desktop.png',
    });
    expect(report.errors).toEqual([]);
  } finally {
    release();
    await writeFile(
      'docs/attachment-receiver-client-qa.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await context.request
      .post('/api/client/auth/logout', { headers: { Origin: origin } })
      .catch(() => {});
    await context.close();
  }
});
