import { AsyncLocalStorage } from 'node:async_hooks';

type Waiter = { read: boolean; grant: (release: () => void) => void };
type Gate = { readers: number; writer: boolean; queue: Waiter[] };
const state = globalThis as typeof globalThis & { makanSessionGates?: Map<string, Gate> };
const gates = (state.makanSessionGates ??= new Map());
const context = new AsyncLocalStorage<string | null>();
export class ExclusiveSessionRequired extends Error {}
export const isSessionRead = (id: string) => context.getStore() === id;

function acquire(id: string, read: boolean): Promise<() => void> {
  const gate = gates.get(id) ?? { readers: 0, writer: false, queue: [] };
  gates.set(id, gate);
  function drain() {
    if (gate.writer) return;
    while (gate.queue.length) {
      const next = gate.queue[0];
      if (!next.read && gate.readers) return;
      gate.queue.shift();
      if (next.read) gate.readers++;
      else gate.writer = true;
      let released = false;
      next.grant(() => {
        if (released) return;
        released = true;
        if (next.read) gate.readers--;
        else gate.writer = false;
        drain();
        if (!gate.readers && !gate.writer && !gate.queue.length) gates.delete(id);
      });
      if (!next.read) return;
    }
  }
  return new Promise((resolve) => {
    gate.queue.push({ read, grant: resolve });
    drain();
  });
}
export async function withSessionLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const release = await acquire(id, false);
  try {
    return await context.run(null, fn);
  } finally {
    release();
  }
}
export async function withSessionRead<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const release = await acquire(id, true);
  let exclusive = false;
  try {
    return await context.run(id, fn);
  } catch (error) {
    if (!(error instanceof ExclusiveSessionRequired)) throw error;
    exclusive = true;
  } finally {
    release();
  }
  // Refresh credentials only after all shared readers leave. Retry only the GET handler.
  if (exclusive) return withSessionLock(id, fn);
  throw new Error('Session access failed');
}
