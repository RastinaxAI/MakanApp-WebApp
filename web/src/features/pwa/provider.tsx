'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { installDismissalKey, installPromotionAllowed } from './install-preferences';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
const InstallPromotion = dynamic(() => import('./promotion').then((m) => m.InstallPromotion));

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type Pwa = {
  registration: ServiceWorkerRegistration | null;
  installed: boolean;
  installPrompt: InstallEvent | null;
  secure: boolean;
  error: boolean;
  ready: boolean;
  install: () => Promise<void>;
};
const PwaContext = createContext<Pwa | null>(null);
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installed, setInstalled] = useState(false);
  const [secure, setSecure] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  function dismissPromotion() {
    setDismissed(true);
    try {
      localStorage.setItem(installDismissalKey, '1');
    } catch {}
  }
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(installDismissalKey) === '1');
    } catch {
      setDismissed(false);
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === installDismissalKey && event.newValue === '1') setDismissed(true);
    };
    window.addEventListener('storage', storageChanged);
    const media = window.matchMedia('(display-mode: standalone)');
    const updateInstalled = () =>
      setInstalled(
        media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    updateInstalled();
    media.addEventListener('change', updateInstalled);
    setSecure(window.isSecureContext);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallEvent);
    };
    const didInstall = () => {
      setInstalled(true);
      setInstallPrompt(null);
      dismissPromotion();
    };
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', didInstall);
    let alive = true;
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((reg) => {
          if (!alive) return;
          setRegistration(reg);
          void navigator.serviceWorker.ready.then(() => {
            if (alive) setReady(true);
          });
          reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            worker?.addEventListener('statechange', () => {
              if (alive && worker.state === 'redundant' && !reg.active) setError(true);
            });
          });
        })
        .catch(() => {
          if (alive) setError(true);
        });
    }
    return () => {
      alive = false;
      media.removeEventListener('change', updateInstalled);
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', didInstall);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);
  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'dismissed' || choice.outcome === 'accepted') dismissPromotion();
  }
  return (
    <PwaContext.Provider
      value={{ registration, installed, installPrompt, secure, error, ready, install }}
    >
      {children}
      {secure && !installed && !dismissed && installPromotionAllowed(pathname) && (
        <InstallPromotion
          canPrompt={!!installPrompt}
          onInstall={install}
          onDismiss={dismissPromotion}
        />
      )}
    </PwaContext.Provider>
  );
}
export function usePwa() {
  const value = useContext(PwaContext);
  if (!value) throw new Error('PwaProvider required');
  return value;
}
