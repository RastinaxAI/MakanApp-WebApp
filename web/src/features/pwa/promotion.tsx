'use client';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { InstallHelp } from './install-help';

export { installDismissalKey } from './install-preferences';

export function InstallPromotion({
  canPrompt,
  onInstall,
  onDismiss,
}: {
  canPrompt: boolean;
  onInstall: () => Promise<void>;
  onDismiss: () => void;
}) {
  const [help, setHelp] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <>
      <aside className="pwa-promotion" aria-label="پیشنهاد نصب ماکان">
        <button
          className="pwa-promotion-close"
          aria-label="بستن پیشنهاد نصب ماکان"
          onClick={onDismiss}
        >
          <X size={20} />
        </button>
        <span className="pwa-promotion-icon" aria-hidden="true">
          <Download size={24} />
        </span>
        <div>
          <strong>ماکان همیشه در دسترس شما</strong>
          <p>برنامه را نصب کنید و از آیکون آن روی دستگاه وارد شوید.</p>
          {failed && <p role="alert">نصب آغاز نشد. دوباره تلاش کنید یا راهنمای نصب را ببینید.</p>}
        </div>
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            if (!canPrompt) return setHelp(true);
            setBusy(true);
            setFailed(false);
            try {
              await onInstall();
            } catch {
              setFailed(true);
              setHelp(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'در حال آماده‌سازی…' : 'نصب ماکان'}
        </Button>
      </aside>
      <InstallHelp open={help} onOpenChange={setHelp} />
    </>
  );
}
