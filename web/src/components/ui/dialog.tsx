'use client';
import * as uiText from '@/content/fa';
import { dismissJalaliPickerWithin } from '@/lib/jalali-picker-state';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './button';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  description,
  children,
  side = false,
  onCloseAutoFocus,
  className = '',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: boolean;
  onCloseAutoFocus?: React.ComponentProps<typeof DialogPrimitive.Content>['onCloseAutoFocus'];
  className?: string;
}) {
  const content = useRef<HTMLDivElement>(null);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content
        ref={content}
        dir="rtl"
        className={`dialog-content ${side ? 'sheet-content' : ''} ${className}`}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={(event) => {
          if (dismissJalaliPickerWithin(content.current)) event.preventDefault();
        }}
      >
        <div className="dialog-heading">
          <div>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              {description ?? uiText.text_ac2d64a54b28}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close asChild>
            <Button aria-label={uiText.text_313cbecb4dd3} size="icon" variant="ghost">
              <X size={19} />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
