'use client';
import {
  HttpTransportType,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { ConversationSelectionProvider } from './selection';
import { AccountReplay } from './account-replay';
import { queuedSnapshotRefresh } from './snapshot-refresh';
import { request } from '@/lib/api/client';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
type LiveState = 'connecting' | 'live' | 'fallback';
type Live = { state: LiveState; subscribe: (id: string) => () => void };
const Context = createContext<Live>({ state: 'fallback', subscribe: () => () => {} });
export function MessagingLiveProvider({
  userId,
  revision,
  children,
  onContextInvalidated,
}: {
  userId: string;
  revision: string;
  children: ReactNode;
  onContextInvalidated?: () => Promise<unknown> | void;
}) {
  const cache = useQueryClient(),
    [state, setState] = useState<LiveState>('connecting');
  const active = useRef(new Map<string, number>()),
    connection = useRef<ReturnType<HubConnectionBuilder['build']> | null>(null);
  const contextCheck = useRef(onContextInvalidated);
  contextCheck.current = onContextInvalidated;
  useEffect(() => {
    let disposed = false,
      starting = false,
      retry: ReturnType<typeof setTimeout> | undefined;
    const hub = new HubConnectionBuilder()
      .withUrl('/api/client/hub', {
        transport: HttpTransportType.LongPolling,
        headers: { 'X-Makan-Context': revision },
        withCredentials: true,
        logMessageContent: false,
      })
      .configureLogging(LogLevel.None)
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .build();
    connection.current = hub;
    const replayAbort = new AbortController();
    const invalidateScope = queuedSnapshotRefresh(
      async () => {
        await cache.invalidateQueries({ queryKey: ['personal', userId, revision] });
        if (!disposed) await contextCheck.current?.();
      },
      () => !disposed,
    );
    const readReplay = (path: string) =>
      request(
        '/api/client/backend' + path,
        { signal: replayAbort.signal },
        { revision, isCurrent: () => !disposed },
      ) as Promise<
        import('@/generated/api/schema').components['schemas']['AccountChangePageResult']
      >;
    // Personal and selected-workspace streams own distinct opaque cursors.
    const replay = new AccountReplay(readReplay, invalidateScope);
    const personalReplay = new AccountReplay(readReplay, invalidateScope, 'Personal');
    let replayTimer: ReturnType<typeof setTimeout> | undefined,
      replayPolling = false;
    async function catchUp() {
      if (disposed || replayPolling) return;
      replayPolling = true;
      clearTimeout(replayTimer);
      let delay = 5000;
      try {
        if (navigator.onLine && document.visibilityState === 'visible')
          delay = Math.min(...(await Promise.all([replay.catchUp(), personalReplay.catchUp()])));
      } catch {
        // A snapshot refresh can fail independently of reading the change stream.
      } finally {
        replayPolling = false;
      }
      if (!disposed) replayTimer = setTimeout(() => void catchUp(), delay);
    }
    const changed = () => {
      if (disposed) return;
      void cache.invalidateQueries({
        queryKey: ['personal', userId, revision],
        predicate: (query) =>
          query.queryKey[3] === 'messages' ||
          query.queryKey[3] === 'conversation-media' ||
          query.queryKey[3] === 'conversation-summary' ||
          String(query.queryKey[3]).startsWith('/api/v1/conversations'),
      });
    };
    async function subscribed() {
      if (disposed) return;
      for (const id of active.current.keys()) await hub.invoke('SubscribeConversation', id);
      if (!disposed) {
        setState('live');
        changed();
        void catchUp();
      }
    }
    function schedule() {
      clearTimeout(retry);
      if (!disposed) retry = setTimeout(() => void start(), 30000);
    }
    async function start() {
      if (
        disposed ||
        starting ||
        hub.state !== HubConnectionState.Disconnected ||
        !navigator.onLine ||
        document.visibilityState !== 'visible'
      )
        return;
      starting = true;
      setState('connecting');
      try {
        await hub.start();
        if (disposed) {
          await hub.stop();
          return;
        }
        await subscribed();
      } catch {
        await hub.stop().catch(() => {});
        if (!disposed) {
          setState('fallback');
          schedule();
        }
      } finally {
        starting = false;
      }
    }
    for (const event of ['ConversationChanged', 'PeerReadStateChanged', 'ChecklistChanged'])
      hub.on(event, changed);
    hub.on('ClientInvalidated', () => {
      void invalidateScope();
      void catchUp();
    });
    hub.onreconnecting(() => {
      if (!disposed) setState('connecting');
    });
    hub.onreconnected(() => {
      void subscribed().catch(() => {
        if (!disposed) {
          setState('fallback');
          void hub.stop();
          schedule();
        }
      });
    });
    hub.onclose(() => {
      if (!disposed) {
        setState('fallback');
        schedule();
      }
    });
    const resume = () => {
      if (!disposed) {
        changed();
        void catchUp();
        void start();
      }
    };
    const heartbeat = setInterval(() => {
      if (
        !disposed &&
        hub.state === HubConnectionState.Connected &&
        document.visibilityState === 'visible'
      )
        void hub.invoke('Heartbeat').catch(() => {});
    }, 25000);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    void start();
    void catchUp();
    return () => {
      disposed = true;
      replay.stop();
      personalReplay.stop();
      replayAbort.abort();
      clearTimeout(replayTimer);
      clearTimeout(retry);
      clearInterval(heartbeat);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
      if (connection.current === hub) connection.current = null;
      void hub.stop().catch(() => {});
    };
  }, [cache, userId, revision]);
  const value = useMemo<Live>(
    () => ({
      state,
      subscribe(id) {
        const count = active.current.get(id) ?? 0;
        active.current.set(id, count + 1);
        const hub = connection.current;
        if (!count && hub?.state === HubConnectionState.Connected)
          void hub.invoke('SubscribeConversation', id).catch(() => setState('fallback'));
        return () => {
          const remaining = (active.current.get(id) ?? 1) - 1;
          if (remaining) active.current.set(id, remaining);
          else {
            active.current.delete(id);
            if (hub?.state === HubConnectionState.Connected)
              void hub.invoke('UnsubscribeConversation', id).catch(() => {});
          }
        };
      },
    }),
    [state],
  );
  return (
    <Context.Provider value={value}>
      <ConversationSelectionProvider>{children}</ConversationSelectionProvider>
    </Context.Provider>
  );
}
export const useMessagingLive = () => useContext(Context);
