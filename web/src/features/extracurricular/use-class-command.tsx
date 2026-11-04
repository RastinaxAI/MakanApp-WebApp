'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePersonal } from '@/features/personal/provider';
import { ApiError } from '@/lib/api/errors';
import { ErrorState } from '@/components/ui/states';
import { integration80c as t } from '@/content/fa';
import { draftPrefix } from '@/lib/draft-storage';

import { freezeIntent, type MutationIntent as Intent } from '@/lib/api/mutation-intent';
export function useClassCommand(scope: string) {
  const { call, session } = usePersonal(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState('');
  const pending = useRef(false),
    alive = useRef(true);
  const key =
    draftPrefix + 'class-command:' + session.user.id + ':' + session.revision + ':' + scope;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run<T>(
    path: string,
    payload?: Record<string, unknown>,
    options: { method?: string; idempotent?: boolean } = {},
  ): Promise<{ value: T } | undefined> {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setSuccess('');
    const method = options.method ?? 'POST';
    try {
      let body = payload;
      if (options.idempotent && payload) {
        let previous: Intent | undefined;
        try {
          previous = JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? undefined;
        } catch {}
        const intent = freezeIntent(previous, path, payload, method);
        // Persist before sending: retries after a lost ACK keep the same payload and operation ID.
        sessionStorage.setItem(key, JSON.stringify(intent));
        body = intent.body;
      }
      const value = await call<T>(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!alive.current) return;
      if (options.idempotent) sessionStorage.removeItem(key);
      setSuccess(t.changed);
      await cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
      return { value };
    } catch (e) {
      if (alive.current && !(e instanceof Error && e.name === 'AbortError')) {
        setError(e);
        if (e instanceof ApiError && [403, 409, 412].includes(e.status))
          await cache.invalidateQueries({
            queryKey: ['personal', session.user.id, session.revision],
          });
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return {
    run,
    busy,
    error,
    feedback: (
      <>
        {!!error && <ErrorState error={error} />}
        {error instanceof ApiError && [409, 412].includes(error.status) && (
          <p role="alert">{t.versionConflict}</p>
        )}
        {success && <p role="status">{success}</p>}
      </>
    ),
  };
}
