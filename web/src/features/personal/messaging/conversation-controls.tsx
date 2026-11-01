'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, ChevronLeft, type LucideIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
import { usePersonal } from '../provider';
import c from './conversation-pages.module.css';
import t from './messaging-theme.module.css';
type S = components['schemas'];
export function SettingRow({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: LucideIcon;
  title: string;
  value?: string;
  href: string;
}) {
  return (
    <Link href={href} className={c.settingRow}>
      <Icon size={22} />
      <span>{title}</span>
      {value && <small>{value}</small>}
      <ChevronLeft size={17} />
    </Link>
  );
}
export function UnavailableSetting({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={c.settingRow}>
          <Icon size={22} />
          <span>{title}</span>
          <small>غیرفعال</small>
          <ChevronLeft size={17} />
        </button>
      </DialogTrigger>
      <DialogContent
        className={`${t.theme} ${t.dialog} ${c.detailDialog}`}
        title={title}
        description={description}
      >
        <p className={c.note}>
          این گزینه هنوز فعال نشده است و تغییری در تنظیمات شما ایجاد نمی‌کند.
        </p>
      </DialogContent>
    </Dialog>
  );
}
export function MuteAction({ summary }: { summary: S['ConversationSummaryResult'] }) {
  const { session, call } = usePersonal(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false);
  return (
    <div>
      <button
        disabled={busy}
        className={c.quickButton}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError(undefined);
          try {
            const result = await call<S['ConversationUserStateResult']>(
              `/api/v1/conversations/${summary.conversationId}/mute`,
              {
                method: summary.isMuted ? 'DELETE' : 'PUT',
                ...(!summary.isMuted
                  ? { body: JSON.stringify({ mode: 'Permanent', mutedUntilUtc: null }) }
                  : {}),
              },
            );
            if (result.conversationId !== summary.conversationId)
              throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
            const key = [
              'personal',
              session.user.id,
              session.revision,
              'conversation-summary',
              summary.conversationId,
            ];
            await cache.cancelQueries({ queryKey: key });
            cache.setQueryData<S['ConversationSummaryResult']>(key, (old) =>
              old
                ? {
                    ...old,
                    isMuted: result.isMuted,
                    muteMode: result.muteMode,
                    mutedUntilUtc: result.mutedUntilUtc,
                  }
                : old,
            );
            void cache.invalidateQueries({
              queryKey: ['personal', session.user.id, session.revision],
            });
          } catch (err) {
            setError(err);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        {summary.isMuted ? <BellOff size={23} /> : <Bell size={23} />}
        <span>{busy ? 'در حال ثبت…' : summary.isMuted ? 'فعال‌کردن صدا' : 'بی‌صدا'}</span>
      </button>
      {!!error && <ErrorState error={error} />}
    </div>
  );
}
