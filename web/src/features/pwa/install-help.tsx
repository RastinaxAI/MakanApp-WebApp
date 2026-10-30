'use client';
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
      <DialogContent
        title="نصب برنامهٔ ماکان"
        description="روش نصب به مرورگر و دستگاه شما بستگی دارد."
      >
        <ol className="pwa-instructions">
          <li>
            <strong>Android و رایانه</strong>
            <p>
              منوی Chrome یا Edge را باز کنید و گزینه «نصب برنامه» یا «افزودن به صفحه اصلی» را
              انتخاب کنید.
            </p>
          </li>
          <li>
            <strong>iPhone و iPad</strong>
            <p>
              نشانی امن ماکان را در Safari باز کنید. از Share، گزینه Add to Home Screen را بزنید؛
              سپس برنامه را از آیکون صفحه اصلی باز کنید.
            </p>
          </li>
        </ol>
        <p className="field-help">
          اگر گزینه نصب دیده نمی‌شود، مرورگر را به‌روز کنید و مطمئن شوید نشانی برنامه HTTPS است.
          برای کار با داده‌های ماکان، اینترنت لازم است.
        </p>
      </DialogContent>
    </Dialog>
  );
}
