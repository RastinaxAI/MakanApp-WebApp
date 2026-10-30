import { test as base, expect, type BrowserContext } from '@playwright/test';
export { expect };
export const origin = 'http://127.0.0.1:3132';
export const fixture = 'http://127.0.0.1:3457';
export const ids = {
  org: '00000000-0000-4000-8000-000000000001',
  class: '00000000-0000-4000-8000-000000000002',
  assignment: '00000000-0000-4000-8000-000000000003',
  attempt: '00000000-0000-4000-8000-000000000004',
  lesson: '00000000-0000-4000-8000-000000000005',
  exam: '00000000-0000-4000-8000-000000000006',
  chat: '00000000-0000-4000-8000-000000000009',
};
export const test = base.extend<{ resetBackend: void }>({
  resetBackend: [
    async ({ request }, use) => {
      expect((await request.post(fixture + '/__test__/reset')).ok()).toBeTruthy();
      const state = await (await request.get(fixture + '/__test__/state')).json();
      expect(state.attempt).toBeNull();
      await use();
    },
    { auto: true },
  ],
  context: async ({ context }, use) => {
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (
        ['data:', 'blob:', 'about:'].includes(u.protocol) ||
        ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)
      )
        return route.continue();
      throw Error('External network forbidden in browser tests: ' + u.origin);
    });
    await use(context);
  },
});
export async function login(
  context: BrowserContext,
  role = 'Student',
  school = true,
  options: { showInstallOffer?: boolean } = {},
) {
  // Existing flow tests represent a user who dismissed the install offer. Dedicated
  // install tests opt into the fresh-browser experience and exercise persistence.
  if (!options.showInstallOffer)
    await context.addInitScript(() => {
      try {
        localStorage.setItem('makan:pwa-install-dismissed:v1', '1');
      } catch {}
    });
  const phone = (
    {
      Student: '09120000101',
      Teacher: '09120000102',
      Parent: '09120000103',
      Manager: '09120000104',
      Personal: '09120000199',
    } as Record<string, string>
  )[role];
  const headers = { Origin: origin };
  const c = await context.request.post(origin + '/api/client/auth/challenge', {
    headers,
    data: { phoneNumber: phone },
  });
  expect(c.status()).toBe(202);
  const v = await context.request.post(origin + '/api/client/auth/verify', {
    headers,
    data: {
      phoneNumber: phone,
      challengeId: (await c.json()).challengeId,
      code: '123456',
      deviceName: 'Isolated client test',
    },
  });
  expect(v.status(), await v.text()).toBe(200);
  let state = await (await context.request.get(origin + '/api/client/session')).json();
  if (school && role !== 'Personal') {
    const spaces = await (
      await context.request.get(origin + '/api/client/backend/api/v1/workspaces/me', {
        headers: { 'X-Makan-Context': state.revision },
      })
    ).json();
    const w = spaces.find((x: { role: string }) => x.role === role);
    expect(w).toBeTruthy();
    expect(
      (
        await context.request.post(origin + '/api/client/backend/api/v1/workspaces/select', {
          headers: { ...headers, 'X-Makan-Context': state.revision },
          data: { workspaceType: 'Organization', membershipId: w.membershipId, role: w.role },
        })
      ).ok(),
    ).toBeTruthy();
    state = await (await context.request.get(origin + '/api/client/session')).json();
  }
  return state;
}
