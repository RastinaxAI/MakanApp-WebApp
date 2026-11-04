'use client';
import * as uiText from '@/content/fa';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { usePersonal } from '@/features/personal/provider';
import { Button } from '@/components/ui/button';
import s from './connected.module.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ReferenceScreen,
  referenceNodeKey,
  type ReferenceControl,
} from '@/features/reference/screen';
const base = '/personal/extracurricular';
const destinations: Record<string, string> = {
  آموزشگاه: '/personal/education',
  فوق‌برنامه: base,
  دستیار: '/personal/assistant',
  پیام‌ها: '/personal/messages',
  پروفایل: '/personal/profile',
};
export function useFrameActions(fallback: string) {
  const router = useRouter(),
    { session } = usePersonal();
  const [notice, setNotice] = useState('');
  const name =
    session.user.displayName ||
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    uiText.text_8b4cb595cd35;
  return {
    name,
    notice,
    setNotice,
    router,
    action: (control: ReferenceControl) => {
      if (control.kind === 'navigation') {
        const destination = destinations[control.label];
        if (destination) router.push(destination);
        return;
      }
      if (control.label === uiText.common_back) {
        router.push(fallback);
        return;
      }
      if (control.label === uiText.text_9b1651192a2c) {
        router.push('/personal/notifications');
        return;
      }
      if (control.label === uiText.text_739d6daf2013) {
        setNotice(uiText.text_ac7f20593202);
        return;
      }
      setNotice(uiText.text_8ffd373a72b0);
    },
  };
}
export function FrameNotice({ message, close }: { message: string; close: () => void }) {
  return (
    <Dialog
      open={!!message}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent title={uiText.text_2224cd680a48}>
        <p>{message}</p>
        <div className="confirm-actions">
          <Button onClick={close}>{uiText.text_b90ffe172b6d}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function StaticConnectedFrame({
  id,
  title,
  children,
  back = base,
}: {
  id: string;
  back?: string;
  title?: string;
  children: ReactNode;
}) {
  const frame = useFrameActions(back);
  const body = <main className={'app-body ' + s.body}>{children}</main>;
  const key =
    referenceNodeKey(id, 'app-body') ??
    referenceNodeKey(id, 'chat-bg') ??
    referenceNodeKey(id, 'desk-body');
  if (!key) throw new Error('Missing connected body slot');
  const footer = referenceNodeKey(id, 'fixed-actions'),
    composer = referenceNodeKey(id, 'composer');
  const overlays = ['veil', 'sheet-modal']
    .map((c) => referenceNodeKey(id, c))
    .filter((v): v is string => !!v);
  return (
    <>
      <ReferenceScreen
        id={id}
        bindings={{
          heading: { title, subtitle: uiText.text_22e1884c93fc },
          onAction: frame.action,
          onChange: () => {},
          replacements: {
            [key]: body,
            ...(footer ? { [footer]: null } : {}),
            ...(composer ? { [composer]: null } : {}),
            ...Object.fromEntries(overlays.map((k) => [k, null])),
          },
        }}
      />
      <FrameNotice message={frame.notice} close={() => frame.setNotice('')} />
    </>
  );
}
