import { randomUUID } from 'node:crypto';
import { make, classRow } from './state.mjs';
export function emitReplay(state, body) {
  state.replay ??= { events: [], cursors: new Map() };
  if (body.classTitle) state.designClasses = [{ ...classRow(), title: body.classTitle }];
  state.replay.events.push({
    userId: body.userId,
    event: make('AccountChangeResult', {
      eventId: randomUUID(),
      streamVersion: String(state.replay.events.length + 1),
      conversation: null,
      invalidation: {
        key: 'SchoolChanged',
        eventId: randomUUID(),
        resourceId: null,
        contextRevision: 'fixture',
        streamVersion: String(state.replay.events.length + 1),
        occurredAtUtc: new Date().toISOString(),
        payloadVersion: 1,
        traceId: null,
      },
    }),
  });
}
export function replayRoute({ state, url, auth, send }) {
  if (url.pathname !== '/api/v1/realtime/changes') return false;
  state.replay ??= { events: [], cursors: new Map() };
  const r = state.replay,
    cursor = url.searchParams.get('cursor'),
    key = JSON.stringify([auth.user.id, auth.context, url.searchParams.get('scope')]),
    previous = cursor ? r.cursors.get(cursor) : undefined;
  if (cursor && previous?.key !== key) return send({ code: 'REALTIME_RESYNC_REQUIRED' }, 409);
  const position = r.events.length,
    nextCursor = randomUUID();
  r.cursors.set(nextCursor, { key, position });
  return send(
    make('AccountChangePageResult', {
      changes: previous
        ? r.events
            .slice(previous.position)
            .filter((e) => e.userId === auth.user.id)
            .map((e) => e.event)
        : [],
      nextCursor,
      hasMore: false,
      watermark: String(position),
      epoch: 'fixture-epoch',
      contextRevision: key,
      retryAfterMilliseconds: 1000,
    }),
  );
}
