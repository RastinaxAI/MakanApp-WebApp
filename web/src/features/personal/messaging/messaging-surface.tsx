import type { ReactNode } from 'react';
import t from './messaging-theme.module.css';

/** Local messenger palette; never changes the education or assistant theme. */
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
