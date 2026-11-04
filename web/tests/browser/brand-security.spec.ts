import { test, expect, login, fixture, origin } from './test';
test('phone and code reject typed letters and normalize Persian and Arabic numerals', async ({
  page,
}) => {
  await page.goto('/enter');
  let input = page.getByLabel('شماره همراه', { exact: true });
  await input.pressSequentially('abcسلام');
  await expect(input).toHaveValue('');
  await input.fill('۰۹۱۲۰۰۰۰۱۹۹');
  await expect(input).toHaveValue('09120000199');
  await page.getByRole('button', { name: 'دریافت کد تأیید', exact: true }).click();
  input = page.getByLabel('کد ورود', { exact: true });
  await expect(input).toBeVisible();
  await input.pressSequentially('abسلام');
  await expect(input).toHaveValue('');
  await input.fill('١٢٣٤٥٦');
  await expect(input).toHaveValue('123456');
  await page.getByRole('button', { name: 'ویرایش شماره', exact: true }).click();
  await page.getByRole('button', { name: 'دریافت کد تأیید', exact: true }).click();
  await expect(page.getByLabel('کد ورود', { exact: true })).toBeVisible();
});
test('logo stays in both login steps and the action follows its field instead of sticking to the viewport', async ({
  page,
}) => {
  for (const width of [320, 390, 834, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/enter');
    const form = page.getByRole('region', { name: 'ورود به حساب ماکان' });
    await expect(form.getByRole('img', { name: 'لوگوی ماکان' })).toBeVisible();
    const field = (await page.getByLabel('شماره همراه', { exact: true }).boundingBox())!,
      action = (await page
        .getByRole('button', { name: 'دریافت کد تأیید', exact: true })
        .boundingBox())!;
    expect(action.y - field.y - field.height).toBeGreaterThan(20);
    expect(action.y - field.y - field.height).toBeLessThan(120);
    expect(action.y + action.height).toBeLessThan(960);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel('شماره همراه', { exact: true }).fill('09120000199');
    await page.getByRole('button', { name: 'دریافت کد تأیید', exact: true }).click();
    await expect(page.getByLabel('کد ورود', { exact: true })).toBeVisible();
    await expect(form.getByRole('img', { name: 'لوگوی ماکان' })).toBeVisible();
  }
});
test('assistant studio goes back to the assistant and the retired class destination redirects', async ({
  page,
  context,
}) => {
  await login(context, 'Personal', false);
  await page.goto('/personal/assistant/studio');
  const back = page.getByRole('banner').getByRole('link', { name: 'بازگشت', exact: true });
  await expect(back).toHaveAttribute('href', '/personal/assistant');
  await back.click();
  await expect(page).toHaveURL(/\/personal\/assistant$/);
  for (const path of [
    '/personal/classes',
    '/personal/classes/00000000-0000-4000-8000-000000000002',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/personal\/extracurricular$/);
  }
  await page.goto('/personal/profile/preferences');
  await expect(page.getByRole('link', { name: 'کلاس‌های شخصی', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('main').getByRole('link', { name: 'فوق‌برنامه', exact: true }),
  ).toBeVisible();
});
test('restored profile logout ends the current session after confirmation', async ({
  page,
  context,
}) => {
  await login(context, 'Student');
  await page.goto('/personal/profile');
  await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'خروج از حساب', exact: true }).click();
  await expect(page).toHaveURL(/\/enter$/);
  expect((await context.request.get('/api/client/session')).status()).toBe(401);
});
test('forged or missing origins never forward an authentication mutation', async ({ request }) => {
  for (const value of [undefined, 'null', 'https://attacker.invalid', 'http://127.0.0.1:3133']) {
    const headers: Record<string, string> = {};
    if (value) headers.Origin = value;
    const response = await request.post('/api/client/auth/challenge', {
      headers,
      data: { phoneNumber: '09120000199' },
    });
    expect(response.status()).toBe(403);
  }
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter((r: { path: string }) => r.path.includes('/auth/otp/')),
  ).toHaveLength(0);
});
test('injection and malformed authentication payloads are rejected before the upstream service', async ({
  request,
}) => {
  for (const body of [
    null,
    [],
    { phoneNumber: '<script>alert(1)</script>' },
    { phoneNumber: "0912' OR 1=1--" },
    { phoneNumber: { toString: '09120000199' } },
    {
      phoneNumber: '09120000199',
      code: '12a456',
      challengeId: '00000000-0000-4000-8000-000000000002',
    },
  ]) {
    const verify = body && !Array.isArray(body) && 'code' in body;
    const response = await request.post('/api/client/auth/' + (verify ? 'verify' : 'challenge'), {
      headers: { Origin: origin },
      data: body,
    });
    expect(response.status()).toBe(400);
    expect(response.headers()['set-cookie']).toBeUndefined();
  }
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter((r: { path: string }) => r.path.includes('/auth/otp/')),
  ).toHaveLength(0);
});
test('an oversized authentication body is rejected before upstream processing', async ({
  request,
}) => {
  const response = await request.post('/api/client/auth/challenge', {
    headers: { Origin: origin },
    data: { phoneNumber: '09120000199', deviceName: 'x'.repeat(65536) },
  });
  expect(response.status()).toBe(413);
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter((r: { path: string }) => r.path.includes('/auth/otp/')),
  ).toHaveLength(0);
});
test('proxy rejects owner namespaces, encoded traversal and arbitrary destinations', async ({
  request,
}) => {
  for (const path of [
    'api/admin/v1/me',
    'api/v1/platform/organizations',
    'https:%2F%2Fattacker.invalid',
    'api/v1/conversations/%2e%2e%2fprivate',
    'api/v1/files/%252e%252e%252fprivate',
    'api/v1/conversations/not-a-guid/messages',
  ]) {
    const response = await request.get('/api/client/backend/' + path);
    expect([400, 401, 403, 404]).toContain(response.status());
  }
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter(
      (r: { path: string }) => r.path.includes('admin') || r.path.includes('attacker'),
    ),
  ).toHaveLength(0);
});
test('context spoofing and unauthorized membership selection cannot change the current role', async ({
  request,
  context,
}) => {
  const current = await login(context, 'Manager');
  const payload = {
    workspaceType: 'Organization',
    membershipId: '00000000-0000-4000-8000-000000000777',
    role: 'Manager',
  };
  let response = await context.request.post('/api/client/backend/api/v1/workspaces/select', {
    headers: { Origin: origin, 'X-Makan-Context': 'forged-context' },
    data: payload,
  });
  expect(response.status()).toBe(409);
  response = await context.request.post('/api/client/backend/api/v1/workspaces/select', {
    headers: { Origin: origin, 'X-Makan-Context': current.revision },
    data: payload,
  });
  expect(response.status()).toBe(403);
  const after = await (await context.request.get('/api/client/session')).json();
  expect(after.context).toEqual(current.context);
  expect((await request.get('/api/client/backend/api/admin/v1/organizations')).status()).toBe(404);
});
test('session responses expose no tokens and carry private no-store headers', async ({
  context,
}) => {
  await login(context, 'Personal', false);
  const response = await context.request.get('/api/client/session');
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(response.headers()['cache-control']).toContain('private');
  const body = await response.text();
  expect(body).not.toContain('accessToken');
  expect(body).not.toContain('refreshToken');
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === 'makan_client_session')!;
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe('Strict');
});
test('profile renders a stored HTML payload as text without executing it', async ({
  page,
  context,
}) => {
  const state = await login(context, 'Personal', false),
    payload = '<img src=x onerror="window.__makanPwned=1">';
  await page.route('**/api/client/session', (route) =>
    route.fulfill({ json: { ...state, user: { ...state.user, displayName: payload } } }),
  );
  await page.goto('/personal/profile');
  await expect(page.getByRole('heading', { name: payload, exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, '__makanPwned'))).toBe(false);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});
test('security headers prevent framing and restrict external connections', async ({ request }) => {
  const response = await request.get('/enter'),
    headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("connect-src 'self'");
});
test('a slow OTP service releases the form within its deadline without silently retrying', async ({
  page,
  request,
}) => {
  await request.post(fixture + '/__test__/fault', {
    data: { path: '/auth/otp/challenges', method: 'POST', delay: 12000 },
  });
  await page.goto('/enter');
  await page.getByLabel('شماره همراه', { exact: true }).fill('09120000199');
  const action = page.getByRole('button', { name: 'دریافت کد تأیید', exact: true });
  const start = Date.now();
  await action.click();
  await expect(
    page.getByRole('alert').and(page.locator(':not(#__next-route-announcer__)')),
  ).toContainText('پاسخ سرویس ورود طول کشید', {
    timeout: 15000,
  });
  expect(Date.now() - start).toBeLessThan(13500);
  await expect(action).toBeEnabled();
  const state = await (await request.get(fixture + '/__test__/state')).json();
  expect(
    state.requests.filter((r: { path: string }) => r.path === '/api/v1/auth/otp/challenges'),
  ).toHaveLength(1);
});
