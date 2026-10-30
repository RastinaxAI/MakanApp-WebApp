'use client';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { request, type ContextGuard } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { fileTransfer, type TransferOptions } from '@/lib/api/file-transfer';
import { clearDraftStorage } from '@/lib/draft-storage';
import type { ClientState } from '@/lib/server/client-session';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MessagingLiveProvider } from './messaging/live';
type ClientAccess = {
  session: ClientState;
  changing: boolean;
  reload: () => Promise<void>;
  call: <T>(path: string, init?: RequestInit) => Promise<T>;
  transfer: <T>(path: string, options: TransferOptions) => Promise<T>;
  selectWorkspace: (
    value: components['schemas']['SelectWorkspaceCommand'],
    destination?:
      | '/personal'
      | '/personal/contacts'
      | '/personal/messages'
      | '/personal/messages?view=organization',
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const PersonalContext = createContext<ClientAccess | null>(null);
export function PersonalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [cache] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 15000, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  const [session, setSession] = useState<ClientState | null>(null),
    [error, setError] = useState<unknown>(),
    [changing, setChanging] = useState(false);
  const generation = useRef(0),
    loadAbort = useRef<AbortController | null>(null),
    loadMode = useRef<'foreground' | 'background' | null>(null),
    current = useRef<ClientState | null>(null);
  const reload = useCallback(
    async (quiet = false) => {
      const previous = current.current;
      const background = quiet && previous !== null;
      // Realtime/visibility hints must not cancel a deliberate workspace/child
      // transition and leave its loading screen waiting on an aborted request.
      if (background && loadMode.current === 'foreground') return;
      const epoch = background ? generation.current : ++generation.current;
      loadAbort.current?.abort();
      const controller = new AbortController();
      loadAbort.current = controller;
      loadMode.current = background ? 'background' : 'foreground';
      if (!background) {
        setChanging(true);
        await cache.cancelQueries();
      }
      if (epoch !== generation.current || controller.signal.aborted) return;
      if (!background) cache.clear();
      try {
        const next = await request<ClientState>(
          '/api/client/session',
          { signal: controller.signal },
          { revision: '', isCurrent: () => epoch === generation.current },
        );
        if (epoch !== generation.current || controller.signal.aborted) return;
        // A visibility check must not remount a form or invalidate its pending save
        // when the server confirms the same identity and access context.
        if (background && previous.user.id === next.user.id && previous.revision === next.revision)
          return;
        if (background) {
          const changedEpoch = ++generation.current;
          await cache.cancelQueries();
          if (generation.current !== changedEpoch || controller.signal.aborted) return;
          cache.clear();
        }
        current.current = next;
        setSession(next);
        setError(undefined);
      } catch (e) {
        if (epoch !== generation.current || controller.signal.aborted) return;
        current.current = null;
        setSession(null);
        cache.clear();
        if (e instanceof ApiError && e.status === 401) router.replace('/enter');
        else setError(e);
      } finally {
        if (loadAbort.current === controller) {
          loadMode.current = null;
          setChanging(false);
        }
      }
    },
    [cache, router],
  );
  useEffect(() => {
    void reload();
    const channel = new BroadcastChannel('makan-client-session');
    const update = () => void reload();
    const visible = () => {
      if (document.visibilityState === 'visible') void reload(true);
    };
    const expired = () => {
      generation.current++;
      loadAbort.current?.abort();
      current.current = null;
      setSession(null);
      void cache.cancelQueries();
      cache.clear();
      router.replace('/enter');
    };
    channel.onmessage = update;
    window.addEventListener('makan:expired', expired);
    document.addEventListener('visibilitychange', visible);
    return () => {
      generation.current++;
      loadAbort.current?.abort();
      channel.close();
      window.removeEventListener('makan:expired', expired);
      document.removeEventListener('visibilitychange', visible);
      void cache.cancelQueries();
      cache.clear();
    };
  }, [cache, reload, router]);
  function broadcast() {
    const channel = new BroadcastChannel('makan-client-session');
    channel.postMessage('changed');
    channel.close();
  }
  const renderedEpoch = generation.current;
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const selected = session;
    if (!selected) throw new ApiError(401);
    if (current.current !== selected || renderedEpoch !== generation.current)
      throw new DOMException('The action belongs to an earlier account or context.', 'AbortError');
    const epoch = renderedEpoch;
    const guard: ContextGuard = {
      revision: selected.revision,
      isCurrent: () => current.current === selected && epoch === generation.current,
      onContextChanged: () => void reload(),
    };
    const result = await request<T>(
      path.startsWith('/api/client/security/sessions') ? path : '/api/client/backend' + path,
      init,
      guard,
    );
    if (current.current !== selected || epoch !== generation.current)
      throw new DOMException(
        'The response belongs to an earlier account or context.',
        'AbortError',
      );
    return result;
  }
  async function selectWorkspace(
    value: components['schemas']['SelectWorkspaceCommand'],
    destination:
      | '/personal'
      | '/personal/contacts'
      | '/personal/messages'
      | '/personal/messages?view=organization' = '/personal',
  ) {
    const epoch = generation.current;
    const selected = current.current;
    setChanging(true);
    try {
      await cache.cancelQueries();
      if (epoch !== generation.current || current.current !== selected) return;
      cache.clear();
      await call('/api/v1/workspaces/select', { method: 'POST', body: JSON.stringify(value) });
      broadcast();
      await reload();
      router.push(destination);
    } catch (e) {
      if (
        epoch !== generation.current ||
        current.current !== selected ||
        (e instanceof Error && e.name === 'AbortError')
      )
        return;
      setError(e);
    } finally {
      if (epoch === generation.current) setChanging(false);
    }
  }
  async function transfer<T>(path: string, options: TransferOptions): Promise<T> {
    const selected = session,
      epoch = renderedEpoch;
    if (!selected) throw new ApiError(401);
    const guard: ContextGuard = {
      revision: selected.revision,
      isCurrent: () => current.current === selected && generation.current === epoch,
      onContextChanged: () => void reload(),
    };
    const value = await fileTransfer<T>(path, options, guard);
    if (!guard.isCurrent!()) throw new DOMException('Earlier account or context.', 'AbortError');
    return value;
  }
  async function logout() {
    setChanging(true);
    try {
      await cache.cancelQueries();
      await request('/api/client/auth/logout', { method: 'POST' });
      try {
        clearDraftStorage(sessionStorage);
      } catch {}
      generation.current++;
      loadAbort.current?.abort();
      current.current = null;
      setSession(null);
      cache.clear();
      broadcast();
      router.replace('/enter');
    } catch (e) {
      setError(e);
    } finally {
      setChanging(false);
    }
  }
  if (error)
    return (
      <div className="bootstrap">
        <ErrorState error={error} onRetry={() => void reload()} />
      </div>
    );
  if (!session || changing)
    return (
      <div className="bootstrap">
        <LoadingSkeleton />
      </div>
    );
  return (
    <PersonalContext.Provider
      value={{ session, changing, reload, call, transfer, selectWorkspace, logout }}
    >
      <QueryClientProvider client={cache}>
        <MessagingLiveProvider
          key={session.user.id + ':' + session.revision}
          userId={session.user.id}
          revision={session.revision}
          onContextInvalidated={() => reload(true)}
        >
          {children}
        </MessagingLiveProvider>
      </QueryClientProvider>
    </PersonalContext.Provider>
  );
}
export function usePersonal() {
  const value = useContext(PersonalContext);
  if (!value) throw new Error('PersonalProvider required');
  return value;
}
export function usePersonalApi<T>(
  path: string,
  options: { enabled?: boolean; poll?: number } = {},
) {
  const { session, call } = usePersonal();
  return useQuery<T>({
    queryKey: ['personal', session.user.id, session.revision, path],
    queryFn: ({ signal }) => call<T>(path, { signal }),
    enabled: options.enabled ?? true,
    refetchInterval: options.poll ?? false,
  });
}
