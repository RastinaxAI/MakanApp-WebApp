import { expect, it } from 'vitest';
import {
  withSessionLock,
  withSessionRead,
  isSessionRead,
  ExclusiveSessionRequired,
} from '@/lib/server/session-lock';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
it('runs reads concurrently but gives queued writes priority over later reads', async () => {
  const releaseReads = deferred(),
    releaseWrite = deferred(),
    writeStarted = deferred();
  const started = [deferred(), deferred()];
  const order: string[] = [];
  const reads = started.map((s, i) =>
    withSessionRead('concurrent', async () => {
      expect(isSessionRead('concurrent')).toBe(true);
      order.push('read' + i);
      s.resolve();
      await releaseReads.promise;
    }),
  );
  await Promise.all(started.map((s) => s.promise));
  const writer = withSessionLock('concurrent', async () => {
    order.push('write');
    writeStarted.resolve();
    await releaseWrite.promise;
  });
  const later = withSessionRead('concurrent', async () => {
    order.push('later');
  });
  expect(order).toEqual(['read0', 'read1']);
  releaseReads.resolve();
  await writeStarted.promise;
  expect(order).toEqual(['read0', 'read1', 'write']);
  releaseWrite.resolve();
  await Promise.all([...reads, writer, later]);
  expect(order).toEqual(['read0', 'read1', 'write', 'later']);
});
it('releases shared access before refreshing exclusively and retries the read once', async () => {
  let calls = 0;
  const result = await withSessionRead('refresh', async () => {
    calls++;
    if (isSessionRead('refresh')) throw new ExclusiveSessionRequired();
    return 'fresh';
  });
  expect(result).toBe('fresh');
  expect(calls).toBe(2);
});
it('releases a failed read and never repeats arbitrary errors or mutations', async () => {
  let calls = 0;
  await expect(
    withSessionRead('failure', async () => {
      calls++;
      throw new Error('upstream');
    }),
  ).rejects.toThrow('upstream');
  expect(calls).toBe(1);
  expect(await withSessionLock('failure', async () => true)).toBe(true);
});
