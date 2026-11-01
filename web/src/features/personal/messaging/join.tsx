'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { PageBack } from '@/components/navigation/page-back';
import type { components } from '@/generated/api/schema';
import { usePersonal } from '../provider';
import { MessagingSurface } from './messaging-surface';
import c from './conversation-pages.module.css';
import { redemptionState } from './invite-link-model';
export function JoinConversation() {
  const { call, session } = usePersonal(),
    cache = useQueryClient();
  const [token, setToken] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [result, setResult] = useState<components['schemas']['InviteLinkRedemptionResult']>();
  const lock = useRef(false);
  useEffect(() => {
    setToken(new URLSearchParams(location.hash.slice(1)).get('token') ?? '');
  }, []);
  return (
    <MessagingSurface className={c.page}>
      <PageBack href="/personal/messages" />
      <header className={c.header}>
        <Link2 size={36} />
        <h1>پیوستن با لینک دعوت</h1>
      </header>
      <section className={c.panel}>
        {result ? (
          <div role="status">
            {redemptionState(result) === 'denied' ? (
              <>
                <h2>عضویت انجام نشد</h2>
                <p>
                  این درخواست رد، لغو یا منقضی شده است. برای دعوت تازه با مدیر گفتگو هماهنگ کنید.
                </p>
              </>
            ) : redemptionState(result) === 'pending' ? (
              <>
                <h2>درخواست عضویت ارسال شد</h2>
                <p>پس از تأیید مدیر، گفتگو در دسترس خواهد بود.</p>
              </>
            ) : (
              <>
                <h2>{result.alreadyMember ? 'شما عضو این گفتگو هستید' : 'عضویت شما تأیید شد'}</h2>
                <Button asChild>
                  <Link href={'/personal/messages/' + result.conversationId}>ورود به گفتگو</Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <form
            className={c.form}
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (lock.current || !token.trim()) return;
              lock.current = true;
              setBusy(true);
              setError(undefined);
              try {
                const value = await call<components['schemas']['InviteLinkRedemptionResult']>(
                  '/api/v1/messaging/invite-links/redeem',
                  { method: 'POST', body: JSON.stringify({ token: token.trim() }) },
                );
                setResult(value);
                setToken('');
                history.replaceState(null, '', location.pathname);
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
            <label>
              کد دعوت
              <input
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                required
                value={token}
                onChange={(ev) => setToken(ev.target.value)}
                disabled={busy}
              />
            </label>
            <p className={c.note}>
              با تأیید، درخواست پیوستن شما طبق تنظیمات دعوت برای سرویس ارسال می‌شود.
            </p>
            <Button disabled={busy || !token.trim()} type="submit">
              {busy ? 'در حال بررسی…' : 'پیوستن به گفتگو'}
            </Button>
            {!!error && <ErrorState error={error} />}
          </form>
        )}
      </section>
    </MessagingSurface>
  );
}
