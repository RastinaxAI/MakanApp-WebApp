'use client';
import * as uiText from '@/content/fa';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Copy, MoreHorizontal, Reply, Forward, Bookmark, Flag, X } from 'lucide-react';
import { MessageActions, type MessageActionMode } from './message-actions';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { components } from '@/generated/api/schema';
import { ProfileAvatar } from '../profile-photo';
import s from './messenger.module.css';
import t from './messaging-theme.module.css';
type MessageAuthor = Pick<
  components['schemas']['SafeMessagingIdentityResult'],
  'displayName' | 'profilePhoto'
>;

export function MessageBubble({
  children,
  own,
  sequence,
  text,
  onReply,
  sender,
  message,
  canForward = false,
}: {
  children: ReactNode;
  own: boolean;
  sequence: number;
  text: string | null;
  onReply?: () => void;
  sender?: components['schemas']['SafeMessagingIdentityResult'];
  message?: components['schemas']['ConversationMessageResult'];
  canForward?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionMode, setActionMode] = useState<MessageActionMode | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null),
    actionRequested = useRef(false);
  const replyRequested = useRef(false);
  const menuAvailable = !!text || !!onReply || (!!message && !message.isDeleted);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }
  useEffect(() => cancelPress, []);
  return (
    <>
      <Menu.Root dir="rtl" open={open} onOpenChange={setOpen}>
        <article
          className={`${s.bubble} ${own ? s.own : ''} ${sender ? s.feedMessage : ''}`}
          data-message-state="history"
          data-message-direction={own ? 'outgoing' : 'incoming'}
          onPointerDown={(event) => {
            cancelPress();
            if (
              event.pointerType !== 'touch' ||
              !menuAvailable ||
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
            if (menuAvailable) {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <MessageBody sender={sender}>
            {children}
            {notice && (
              <small className={s.copyNotice} role="status">
                {notice}
              </small>
            )}
          </MessageBody>
          {menuAvailable && (
            <Menu.Trigger asChild>
              <button
                ref={trigger}
                className={s.messageOptions}
                aria-label={uiText.text_712d44364071 + sequence}
              >
                <MoreHorizontal size={17} />
              </button>
            </Menu.Trigger>
          )}
        </article>
        <Menu.Portal>
          <div>
            {open && (
              <div
                className={s.messageMenuBackdrop}
                aria-hidden="true"
                onPointerDown={() => setOpen(false)}
              />
            )}
            <Menu.Content
              className={`dropdown ${t.theme} ${t.menu} mk-message-menu`}
              sideOffset={6}
              align="end"
              onCloseAutoFocus={(event) => {
                if (actionRequested.current) {
                  event.preventDefault();
                  actionRequested.current = false;
                  return;
                }
                if (replyRequested.current) {
                  event.preventDefault();
                  replyRequested.current = false;
                  onReply?.();
                }
              }}
            >
              <div className={s.messageMenuTitle}>{uiText.text_78ddf2493e4e}</div>
              {onReply && (
                <Menu.Item
                  onSelect={() => {
                    replyRequested.current = true;
                  }}
                >
                  <Reply size={20} />
                  {uiText.text_a6340bbd29bf}
                </Menu.Item>
              )}
              {text && (
                <Menu.Item
                  onSelect={() => {
                    if (!navigator.clipboard) {
                      setNotice(uiText.text_97a497a7284d);
                      return;
                    }
                    void navigator.clipboard
                      .writeText(text)
                      .then(() => setNotice(uiText.text_02a2175c0160))
                      .catch(() => setNotice(uiText.text_e75b2f3a2657));
                  }}
                >
                  <Copy size={20} />
                  {uiText.text_fcc5b6fed863}
                </Menu.Item>
              )}
              {canForward &&
                (['forward', 'save'] as const).map((mode) => (
                  <Menu.Item
                    key={mode}
                    onSelect={() => {
                      actionRequested.current = true;
                      setActionMode(mode);
                    }}
                  >
                    {mode === 'forward' ? <Forward size={20} /> : <Bookmark size={20} />}{' '}
                    {mode === 'forward' ? uiText.text_ab182e469ee4 : uiText.text_479a5da6e735}
                  </Menu.Item>
                ))}
              {message && !message.isDeleted && (
                <Menu.Item
                  onSelect={() => {
                    actionRequested.current = true;
                    setActionMode('report');
                  }}
                >
                  <Flag size={20} />
                  {uiText.text_09d292dded16}
                </Menu.Item>
              )}
              <Menu.Item onSelect={() => setOpen(false)}>
                <X size={20} />
                {uiText.text_db4167d969dc}
              </Menu.Item>
            </Menu.Content>
          </div>
        </Menu.Portal>
      </Menu.Root>
      {message && (
        <MessageActions
          mode={actionMode}
          message={message}
          onSuccess={setNotice}
          onClose={() => {
            setActionMode(null);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      )}
    </>
  );
}

/** Keep local, confirmed and received group messages in the same geometry. */
export function MessageBody({ sender, children }: { sender?: MessageAuthor; children: ReactNode }) {
  return (
    <>
      {sender && (
        <ProfileAvatar
          photo={sender.profilePhoto}
          name={sender.displayName}
          className={s.senderAvatar}
        />
      )}
      <div className={s.messageContent}>
        {sender && (
          <strong className={s.messageSender} dir="auto">
            {sender.displayName}
          </strong>
        )}
        {children}
      </div>
    </>
  );
}
