'use client';
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
        پنل به‌صورت برنامه روی این دستگاه باز شده است.
      </p>
    );
  return (
    <div className={compact ? 'pwa-install-compact' : 'pwa-install'}>
      {!compact && (
        <p>پنل ماکان را روی دستگاه نصب کنید تا از آیکون آن و در پنجره مستقل وارد شوید.</p>
      )}
      <Button variant="outline" onClick={() => (installPrompt ? void install() : setHelp(true))}>
        <Download size={18} />
        نصب پنل روی دستگاه
      </Button>
      {!compact && !secure && (
        <p className="field-help">
          برای نصب، نشانی امن HTTPS پنل را باز کنید. نشانی محلی فقط روی همین رایانه قابل استفاده
          است.
        </p>
      )}
      {!compact && error && (
        <p role="alert" className="field-help">
          آماده‌سازی نصب کامل نشد. اتصال را بررسی و صفحه را تازه کنید.
        </p>
      )}
      <InstallHelp open={help} onOpenChange={setHelp} />
    </div>
  );
}
