/** Observable store: one object, immutable-ish updates, batched notifications. */

export type Listener<T> = (state: T, prev: T) => void;

/**
 * localStorage access that degrades quietly: private mode, quota errors and
 * non-browser environments must never break boot.
 */
export function safeStorage(): Storage | null {
  try {
    const store = globalThis.localStorage;
    if (!store) return null;
    const probe = '__makan_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export interface Store<T> {
  get(): T;
  set(patch: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(fn: Listener<T>, immediate?: boolean): () => void;
}

export function createStore<T extends object>(initial: T, key?: string): Store<T> {
  let state: T = initial;
  const listeners = new Set<Listener<T>>();
  let queued = false;

  if (key) {
    const storage = safeStorage();
    try {
      const raw = storage?.getItem(key);
      if (raw) state = { ...state, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      /* corrupted local state must never break boot */
    }
  }

  const flush = () => {
    queued = false;
    for (const fn of [...listeners]) fn(state, state);
  };

  return {
    get: () => state,
    set(patch) {
      const prev = state;
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      if (key) {
        try {
          safeStorage()?.setItem(key, JSON.stringify(state));
        } catch {
          /* quota / private mode: state stays in memory */
        }
      }
      if (queued) return;
      queued = true;
      queueMicrotask(flush);
    },
    subscribe(fn, immediate = false) {
      listeners.add(fn);
      if (immediate) fn(state, state);
      return () => listeners.delete(fn);
    },
  };
}

/** Derive a value from state; recomputes on every notification. */
export function select<T extends object, R>(store: Store<T>, fn: (s: T) => R): () => R {
  return () => fn(store.get());
}