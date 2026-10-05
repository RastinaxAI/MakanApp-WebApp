/**
 * Install flow.
 *
 * iOS Safari does not implement `beforeinstallprompt`, so the A2HS sheet with
 * Share → Add to Home Screen steps is the *primary* path on iPhone; the native
 * prompt is used everywhere else. Both are only offered once the app is not
 * already running standalone.
 */

import { createStore } from './store';

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unsupported';

export interface InstallState {
  platform: InstallPlatform;
  canNativePrompt: boolean;
  installed: boolean;
  /** Dedupe nagging: ask again after this many days if declined. */
  dismissedAt: number | null;
}

const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export const install = createStore<InstallState>({
  platform: 'unsupported',
  canNativePrompt: false,
  installed: false,
  dismissedAt: (() => {
    try {
      const raw = localStorage.getItem('makan.install.dismissedAt');
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  })(),
});

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detect(): InstallState['platform'] {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'unsupported' : 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function initInstall(): void {
  install.set({ platform: detect(), installed: isStandalone() });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    install.set({ canNativePrompt: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    install.set({ installed: true, canNativePrompt: false });
    try {
      localStorage.removeItem('makan.install.dismissedAt');
    } catch {
      /* ignore */
    }
  });
}

/** True when we should surface an install affordance. */
export function shouldOffer(): boolean {
  const s = install.get();
  if (s.installed) return false;
  if (s.dismissedAt && Date.now() - s.dismissedAt < SNOOZE_MS) return false;
  if (s.platform === 'ios') return true;
  return s.canNativePrompt;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (isStandalone()) return 'unavailable';
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  install.set({ canNativePrompt: false });
  if (choice.outcome === 'dismissed') dismissInstall();
  return choice.outcome;
}

export function dismissInstall(): void {
  const at = Date.now();
  try {
    localStorage.setItem('makan.install.dismissedAt', String(at));
  } catch {
    /* private mode */
  }
  install.set({ dismissedAt: at });
}

/** Re-check on visibility change (user may have added it from the share sheet). */
export function watchStandalone(): void {
  document.addEventListener('visibilitychange', () => {
    if (isStandalone() && !install.get().installed) install.set({ installed: true, canNativePrompt: false });
  });
}

/* ------------------------------------------------------- service worker */

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* registration failure must not block the app */
    });
  });
}