import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/lib/api/client';
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('late responses from a previous personal account or context', () => {
  it.each([200, 401])(
    'discards HTTP %i when the context changes during response body decoding',
    async (status) => {
      let release!: (value: unknown) => void;
      let current = true;
      const dispatchEvent = vi.fn();
      vi.stubGlobal('window', { dispatchEvent });
      const response = Response.json({}, { status });
      response.json = () =>
        new Promise((resolve) => {
          release = resolve;
        });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
      const pending = request(
        '/api/client/session',
        {},
        { revision: 'old', isCurrent: () => current },
      );
      await Promise.resolve();
      current = false;
      release({ previousAccount: true });
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      expect(dispatchEvent).not.toHaveBeenCalled();
    },
  );
  it('does not start a delayed write closure from an account or context that has already changed', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(
      request(
        '/api/backend/previous-context',
        { method: 'POST', body: '{}' },
        { revision: 'old', isCurrent: () => false },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([200, 401, 409])(
    'discards late HTTP %i before handling its data, expiry or context event',
    async (status) => {
      let release!: (response: Response) => void;
      const dispatchEvent = vi.fn(),
        changed = vi.fn();
      vi.stubGlobal('window', { dispatchEvent });
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              release = resolve;
            }),
        ),
      );
      let current = true;
      const pending = request(
        '/api/client/session',
        {},
        { revision: 'old', isCurrent: () => current, onContextChanged: changed },
      );
      current = false;
      release(Response.json({ code: 'CONTEXT_CHANGED', private: 'previous-account' }, { status }));
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      expect(dispatchEvent).not.toHaveBeenCalled();
      expect(changed).not.toHaveBeenCalled();
    },
  );
});
