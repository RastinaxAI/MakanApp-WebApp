'use client';
import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
import { usePersonalApi } from './provider';
import s from './personal.module.css';

export function useWorkspaceSnapshot() {
  return usePersonalApi<components['schemas']['WorkspaceSnapshotResult']>(
    '/api/v1/workspaces/snapshot',
    { poll: 10000 },
  );
}
export function WorkspaceVisibilityNotice({
  snapshot,
}: {
  snapshot?: components['schemas']['WorkspaceSnapshotResult'];
}) {
  return snapshot?.personalWorkspaceVisible === null ? (
    <p className={s.muted} role="status">
      {uiText.text_2c65dfd06215}
    </p>
  ) : null;
}
