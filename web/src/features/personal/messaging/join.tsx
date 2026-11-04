'use client';
import * as uiText from '@/content/fa';
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
        <h1>{uiText.text_769f4b226ba8}</h1>
      </header>
      <section className={c.panel}>
        {result ? (
          <div role="status">
            {redemptionState(result) === 'denied' ? (
              <>
                <h2>{uiText.text_7eb3656e5a7f}</h2>
                <p>{uiText.text_359af05980d7}</p>
              </>
            ) : redemptionState(result) === 'pending' ? (
              <>
                <h2>{uiText.text_69e404d12a5d}</h2>
                <p>{uiText.text_e22edc26122a}</p>
              </>
            ) : (
              <>
                <h2>
                  {result.alreadyMember ? uiText.text_0f4cdfe13480 : uiText.text_b1e513632610}
                </h2>
                <Button asChild>
                  <Link href={'/personal/messages/' + result.conversationId}>
                    {uiText.text_f0e20f906599}
                  </Link>
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
              {uiText.text_1be42c39e984}
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
            <p className={c.note}>{uiText.text_2f53ed20dec0}</p>
            <Button disabled={busy || !token.trim()} type="submit">
              {busy ? uiText.text_25384e522776 : uiText.text_ab3d1db5c4aa}
            </Button>
            {!!error && <ErrorState error={error} />}
          </form>
        )}
      </section>
    </MessagingSurface>
  );
}
