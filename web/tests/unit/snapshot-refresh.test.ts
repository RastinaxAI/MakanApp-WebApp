import { describe, it, expect, vi } from 'vitest';
import { queuedSnapshotRefresh } from '@/features/personal/messaging/snapshot-refresh';

describe('snapshot invalidation during replay', () => {
  it('waits for a fresh read when another hint arrives during the current read', async () => {
    let release!: () => void;
    const refresh = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const invalidate = queuedSnapshotRefresh(refresh, () => true);
    const first = invalidate();
    await Promise.resolve();
    const second = invalidate();
    const third = invalidate();
    expect(refresh).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second, third]);
    // Coalesce overlapping hints, but never drop the read after their arrival.
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not start queued or new reads after context disposal', async () => {
    let active = true;
    let release!: () => void;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const invalidate = queuedSnapshotRefresh(refresh, () => active);
    const first = invalidate();
    await Promise.resolve();
    const pending = invalidate();
    active = false;
    release();
    await Promise.all([first, pending]);
    await invalidate();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('releases the lock after failure and lets the next hint retry', async () => {
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const invalidate = queuedSnapshotRefresh(refresh, () => true);
    await expect(invalidate()).rejects.toThrow('offline');
    await invalidate();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('preserves a hint queued at the completion boundary of an immediately resolved read', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const invalidate = queuedSnapshotRefresh(refresh, () => true);
    let late!: Promise<void>;
    const first = invalidate();
    queueMicrotask(() => {
      late = invalidate();
    });
    await first;
    await late;
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('also releases the lock when the refresh callback throws synchronously', async () => {
    const refresh = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('offline');
      })
      .mockResolvedValue(undefined);
    const invalidate = queuedSnapshotRefresh(refresh, () => true);
    await expect(invalidate()).rejects.toThrow('offline');
    await invalidate();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
