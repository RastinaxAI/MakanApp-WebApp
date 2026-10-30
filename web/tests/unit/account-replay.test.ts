import { describe, expect, it, vi } from 'vitest';
import { AccountReplay } from '@/features/personal/messaging/account-replay';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
type Page = components['schemas']['AccountChangePageResult'];
const page = (patch: Partial<Page> = {}): Page => ({
  retryAfterMilliseconds: null,
  changes: [],
  nextCursor: 'opaque cursor +/',
  hasMore: false,
  watermark: '1',
  epoch: 'epoch-1',
  contextRevision: 'context-1',
  ...patch,
});
describe('account replay lifecycle', () => {
  it('isolates personal and selected-workspace opaque cursors', async () => {
    const personalRead = vi.fn().mockResolvedValue(page({ nextCursor: 'personal-only' }));
    const selectedRead = vi.fn().mockResolvedValue(page({ nextCursor: 'selected-only' }));
    const personal = new AccountReplay(personalRead, vi.fn(), 'Personal'),
      selected = new AccountReplay(selectedRead, vi.fn());
    await Promise.all([personal.catchUp(), selected.catchUp()]);
    await Promise.all([personal.catchUp(), selected.catchUp()]);
    const p = new URL(personalRead.mock.calls[1][0], 'http://test'),
      w = new URL(selectedRead.mock.calls[1][0], 'http://test');
    expect(p.searchParams.get('scope')).toBe('Personal');
    expect(w.searchParams.has('scope')).toBe(false);
    expect(p.searchParams.get('cursor')).toBe('personal-only');
    expect(w.searchParams.get('cursor')).toBe('selected-only');
  });
  it('refreshes hints from an accepted page even if the following page fails', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(page({ hasMore: true, nextCursor: 'accepted-page' }))
      .mockRejectedValueOnce(new ApiError(503))
      .mockResolvedValue(page());
    const invalidate = vi.fn(),
      replay = new AccountReplay(read, invalidate);
    await replay.catchUp();
    expect(invalidate).toHaveBeenCalledTimes(1);
    await replay.catchUp();
    expect(new URL(read.mock.calls[2][0], 'http://test').searchParams.get('cursor')).toBe(
      'accepted-page',
    );
  });
  it('does not blindly replay invalid or forbidden requests until a new lifecycle', async () => {
    for (const status of [400, 403]) {
      const read = vi
          .fn()
          .mockRejectedValue(new ApiError(status, { code: 'REALTIME_INVALID_QUERY' })),
        replay = new AccountReplay(read, vi.fn());
      await replay.catchUp();
      await replay.catchUp();
      expect(read).toHaveBeenCalledTimes(1);
    }
  });
  it('bootstraps once, encodes opaque cursors and refreshes authoritative snapshots', async () => {
    const read = vi.fn().mockResolvedValue(page()),
      invalidate = vi.fn();
    const replay = new AccountReplay(read, invalidate);
    await replay.catchUp();
    await replay.catchUp();
    expect(read.mock.calls[0][0]).not.toContain('cursor=');
    expect(new URL(read.mock.calls[1][0], 'http://test').searchParams.get('cursor')).toBe(
      'opaque cursor +/',
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
  it('deduplicates replayed event hints and drains all pages', async () => {
    const event = {
      eventId: 'event-1',
      streamVersion: '1',
      conversation: null,
      invalidation: null,
    };
    const read = vi
      .fn()
      .mockResolvedValueOnce(page({ changes: [event], hasMore: true, nextCursor: '2' }))
      .mockResolvedValue(page({ changes: [event], nextCursor: '3' }));
    const invalidate = vi.fn(),
      replay = new AccountReplay(read, invalidate);
    await replay.catchUp();
    await replay.catchUp();
    expect(read).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
  it('retains the last successful cursor after a temporary failure', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(page())
      .mockRejectedValueOnce(
        new ApiError(503, { code: 'REALTIME_TEMPORARILY_UNAVAILABLE', retryAfter: 12 }),
      )
      .mockResolvedValue(page());
    const replay = new AccountReplay(read, vi.fn());
    await replay.catchUp();
    expect(await replay.catchUp()).toBe(12000);
    await replay.catchUp();
    expect(read.mock.calls[1][0]).toBe(read.mock.calls[2][0]);
  });
  it('discards invalid cursors and refreshes snapshots on resync or context boundary changes', async () => {
    for (const reset of [
      new ApiError(409, { code: 'REALTIME_RESYNC_REQUIRED' }),
      page({ contextRevision: 'context-2' }),
    ]) {
      const read = vi.fn().mockResolvedValueOnce(page());
      if (reset instanceof Error) read.mockRejectedValueOnce(reset);
      else read.mockResolvedValueOnce(reset);
      read.mockResolvedValue(page());
      const invalidate = vi.fn(),
        replay = new AccountReplay(read, invalidate);
      await replay.catchUp();
      expect(await replay.catchUp()).toBe(1000);
      await replay.catchUp();
      expect(read.mock.calls[2][0]).not.toContain('cursor=');
      expect(invalidate).toHaveBeenCalledTimes(3);
    }
  });
  it('ignores late responses after disposal and never shares a cursor with a new session', async () => {
    let resolve!: (p: Page) => void;
    const invalidate = vi.fn(),
      read = vi.fn(
        () =>
          new Promise<Page>((r) => {
            resolve = r;
          }),
      );
    const replay = new AccountReplay(read, invalidate),
      pending = replay.catchUp();
    replay.stop();
    resolve(page());
    await pending;
    expect(invalidate).not.toHaveBeenCalled();
    await replay.catchUp();
    expect(read).toHaveBeenCalledTimes(1);
    const otherRead = vi.fn().mockResolvedValue(page());
    await new AccountReplay(otherRead, invalidate).catchUp();
    expect(otherRead.mock.calls[0][0]).not.toContain('cursor=');
  });
});
