'use client';
import * as uiText from '@/content/fa';
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
      <aside className="pwa-promotion" aria-label={uiText.text_c2f894f9b8af}>
        <button
          className="pwa-promotion-close"
          aria-label={uiText.text_09772f118ff8}
          onClick={onDismiss}
        >
          <X size={20} />
        </button>
        <span className="pwa-promotion-icon" aria-hidden="true">
          <Download size={24} />
        </span>
        <div>
          <strong>{uiText.text_45f7a9ae6e18}</strong>
          <p>{uiText.text_63fb724daa3f}</p>
          {failed && <p role="alert">{uiText.text_1cc6e6f2da23}</p>}
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
          {busy ? uiText.text_069a6fab0822 : uiText.text_79e2c5a64efc}
        </Button>
      </aside>
      <InstallHelp open={help} onOpenChange={setHelp} />
    </>
  );
}
