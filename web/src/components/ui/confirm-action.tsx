'use client';
import { useRef, useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogTrigger } from './dialog';
import { ErrorState } from './states';

/** Keep the dialog and its retry action open until the server confirms the mutation. */
export function ConfirmAction({
  title,
  description,
  trigger,
  confirm = 'تأیید',
  onConfirm,
  disabled = false,
  destructive = false,
}: {
  title: string;
  description: string;
  trigger: string;
  confirm?: string;
  onConfirm: () => Promise<boolean>;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!lock.current) {
          setOpen(v);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={destructive ? 'destructive' : 'outline'} disabled={disabled}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="confirm-actions">
          <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
            انصراف
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError(undefined);
              try {
                if (await onConfirm()) setOpen(false);
              } catch (problem) {
                setError(problem);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? 'در حال انجام…' : confirm}
          </Button>
        </div>
        {!!error && <ErrorState error={error} />}
      </DialogContent>
    </Dialog>
  );
}
