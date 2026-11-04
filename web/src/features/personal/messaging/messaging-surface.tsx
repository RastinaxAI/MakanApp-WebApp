import type { ReactNode } from 'react';
import t from './messaging-theme.module.css';

/** Messenger controls use the same semantic palette as the rest of the client. */
export function MessagingSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${t.theme} ${t.page} ${className}`} data-messaging-surface>
      {children}
    </div>
  );
}
