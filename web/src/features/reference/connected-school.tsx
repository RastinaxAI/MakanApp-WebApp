'use client';

import type { ReactNode } from 'react';
import { usePersonal } from '@/features/personal/provider';
import './blueprints.css';
import './screen.css';
import s from './school-surface.module.css';
export function ReferenceSchoolFrame({ children }: { children?: ReactNode }) {
  const { session } = usePersonal();
  const role = session.context.activeRole;
  const id =
    session.context.workspaceType !== 'Organization'
      ? 'MK-59'
      : role === 'Manager'
        ? 'MK-08'
        : role === 'Teacher'
          ? 'MK-07'
          : role === 'Parent'
            ? 'MK-09'
            : 'MK-04';
  return (
    <div className={`mk-ui ${s.surface}`} data-mk-view={id}>
      {children}
    </div>
  );
}
