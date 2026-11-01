'use client';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Copy, MoreHorizontal, Reply } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import s from './messenger.module.css';
import t from './messaging-theme.module.css';

export function MessageBubble({
  children,
  own,
  sequence,
  text,
  onReply,
}: {
  children: ReactNode;
  own: boolean;
  sequence: number;
  text: string | null;
  onReply?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const replyRequested = useRef(false);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }
  useEffect(() => cancelPress, []);
  return (
    <Menu.Root dir="rtl" open={open} onOpenChange={setOpen}>
      <article
        className={`${s.bubble} ${own ? s.own : ''}`}
        data-message-direction={own ? 'outgoing' : 'incoming'}
        onPointerDown={(event) => {
          cancelPress();
          if (
            event.pointerType !== 'touch' ||
            (!text && !onReply) ||
            (event.target as HTMLElement).closest('button,a,video,audio')
          )
            return;
          press.current = {
            x: event.clientX,
            y: event.clientY,
            timer: setTimeout(() => {
              press.current = null;
              setOpen(true);
            }, 450),
          };
        }}
        onPointerMove={(event) => {
          if (
            press.current &&
            Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10
          )
            cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(event) => {
          if (text || onReply) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
        {(text || onReply) && (
          <Menu.Trigger asChild>
            <button className={s.messageOptions} aria-label={'گزینه‌های پیام ' + sequence}>
              <MoreHorizontal size={17} />
            </button>
          </Menu.Trigger>
        )}
        {notice && (
          <small className={s.copyNotice} role="status">
            {notice}
          </small>
        )}
      </article>
      <Menu.Portal>
        <Menu.Content
          className={`dropdown ${t.theme} ${t.menu}`}
          sideOffset={6}
          align="end"
          onCloseAutoFocus={(event) => {
            if (replyRequested.current) {
              event.preventDefault();
              replyRequested.current = false;
              onReply?.();
            }
          }}
        >
          {onReply && (
            <Menu.Item
              onSelect={() => {
                replyRequested.current = true;
              }}
            >
              <Reply size={20} />
              پاسخ به پیام
            </Menu.Item>
          )}
          {text && (
            <Menu.Item
              onSelect={() => {
                if (!navigator.clipboard) {
                  setNotice('کپی متن در این مرورگر در دسترس نیست.');
                  return;
                }
                void navigator.clipboard
                  .writeText(text)
                  .then(() => setNotice('متن پیام کپی شد.'))
                  .catch(() => setNotice('اجازهٔ کپی متن داده نشد.'));
              }}
            >
              <Copy size={20} />
              کپی متن
            </Menu.Item>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
