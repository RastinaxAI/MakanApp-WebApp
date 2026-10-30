/** Serialize refreshes while preserving hints received during an in-flight read. */
export function queuedSnapshotRefresh(refresh: () => Promise<unknown>, isActive: () => boolean) {
  let running: Promise<void> | undefined;
  let dirty = false;
  return (): Promise<void> => {
    if (!isActive()) return Promise.resolve();
    dirty = true;
    if (!running) {
      // Start after assignment, and release the lock inside the same continuation
      // as the final dirty check. A hint must not get stranded in a .finally gap.
      running = Promise.resolve().then(async () => {
        try {
          while (dirty && isActive()) {
            dirty = false;
            await refresh();
          }
        } finally {
          running = undefined;
        }
      });
    }
    return running;
  };
}
