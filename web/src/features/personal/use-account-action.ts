'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePersonal } from './provider';
export function useAccountAction() {
  const { call, session } = usePersonal(),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run<T>(path: string, body?: unknown, method = 'POST'): Promise<T | undefined> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const value = await call<T>(path, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!alive.current) return;
      await cache.invalidateQueries({ queryKey: ['personal', session.user.id, session.revision] });
      return value;
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { run, busy, error };
}
