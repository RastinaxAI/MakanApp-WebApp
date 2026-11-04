'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download } from 'lucide-react';
import { useState } from 'react';
import { usePwa } from './provider';
import { InstallHelp } from './install-help';

export function InstallPanel({ compact = false }: { compact?: boolean }) {
  const { installed, installPrompt, install, secure, error } = usePwa();
  const [help, setHelp] = useState(false);
  if (installed)
    return compact ? null : (
      <p className="pwa-status">
        <CheckCircle2 size={19} />
        {uiText.text_a26d8fb684dc}
      </p>
    );
  return (
    <div className={compact ? 'pwa-install-compact' : 'pwa-install'}>
      {!compact && <p>{uiText.text_59e64a5b7f77}</p>}
      <Button variant="outline" onClick={() => (installPrompt ? void install() : setHelp(true))}>
        <Download size={18} />
        {uiText.text_25b10b0d03ba}
      </Button>
      {!compact && !secure && <p className="field-help">{uiText.text_637e02c8cc87}</p>}
      {!compact && error && (
        <p role="alert" className="field-help">
          {uiText.text_49a81da8ae60}
        </p>
      )}
      <InstallHelp open={help} onOpenChange={setHelp} />
    </div>
  );
}
