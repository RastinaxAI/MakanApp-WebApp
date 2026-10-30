'use client';
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
      وضعیت نمایش فضای شخصی هنوز مشخص نشده است. امکانات مجاز حساب شما از منوی اصلی در دسترس‌اند.
    </p>
  ) : null;
}
