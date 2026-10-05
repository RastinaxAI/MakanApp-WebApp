/** Network state. Offline is a first-class mode, not an error page. */

import { app, setOnline } from '../data/app-state';

export function watchNetwork(): void {
  const sync = () => setOnline(navigator.onLine);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
}

export function isOfflineOverride(): boolean {
  return !app.get().online;
}

/** Simulated round-trip so pending states are visible in the demo. */
export function wait(ms = 420): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}