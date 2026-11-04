'use client';
import * as uiText from '@/content/fa';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function InstallHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={uiText.text_634d86f0abd3} description={uiText.text_214e55f2c675}>
        <ol className="pwa-instructions">
          <li>
            <strong>{uiText.text_df4631c953f0}</strong>
            <p>{uiText.text_524bf92925b0}</p>
          </li>
          <li>
            <strong>{uiText.text_da8675308c3f}</strong>
            <p>{uiText.text_921b0b990ebd}</p>
          </li>
        </ol>
        <p className="field-help">{uiText.text_8c7d9b94c4ce}</p>
      </DialogContent>
    </Dialog>
  );
}
