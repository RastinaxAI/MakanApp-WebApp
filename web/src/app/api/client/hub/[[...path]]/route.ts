import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, writeSession, withSessionLock } from '@/lib/server/session';
import { checkOrigin, problem } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { ApiError } from '@/lib/api/errors';
import { negotiation, notificationFrames, validateHubControl } from '@/lib/messaging-hub-protocol';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
async function controlBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new ApiError(413);
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  if (request.method !== 'GET' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const segments = (await params).path ?? [];
  const negotiate = segments.length === 1 && segments[0] === 'negotiate';
  if ((segments.length && !negotiate) || (negotiate && request.method !== 'POST'))
    return problem(404);
  const url = new URL(request.url),
    query = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (!['id', 'negotiateVersion', '_'].includes(key) || query.has(key) || value.length > 2048)
      return problem(400);
    query.set(key, value);
  }
  if (negotiate ? query.get('negotiateVersion') !== '1' || query.has('id') : !query.get('id'))
    return problem(400);
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    let payload: string | undefined;
    if (!negotiate && request.method === 'POST') {
      if (Number(request.headers.get('content-length') ?? 0) > 65536) return problem(413);
      payload = await controlBody(request);
      if (new TextEncoder().encode(payload).length > 65536) return problem(413);
      try {
        validateHubControl(payload);
      } catch {
        return problem(400, 'UNSUPPORTED_HUB_CONTROL');
      }
    }
    const prepared = await withSessionLock(id, async () => {
      const state = await getClientState(id);
      if (!state) throw new ApiError(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      const session = await readSession(id);
      if (!session) throw new ApiError(401);
      if (!negotiate) {
        const entry = session.messagingConnections?.find(
          (entry) => entry.hash === hash(query.get('id')!) && entry.revision === state.revision,
        );
        if (!entry) throw new ApiError(404);
        entry.createdAt = Date.now();
        await writeSession(id, session);
      }
      return { revision: state.revision, token: session.accessToken };
    });
    // Never keep the session refresh/mutation lock while waiting for a long poll.
    const upstream = await fetch(
      new URL(
        '/hubs/messaging' + (negotiate ? '/negotiate' : '') + '?' + query,
        serverConfig().backend,
      ),
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${prepared.token}`,
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: payload,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(request.method === 'GET' ? 120000 : 25000),
        ]),
      },
    );
    const latest = await readSession(id);
    if (!latest) return problem(401);
    if (latest.revision !== prepared.revision) return problem(409, 'CONTEXT_CHANGED');
    if (!upstream.ok)
      return problem(
        [400, 401, 403, 404, 409, 429].includes(upstream.status) ? upstream.status : 503,
        'MESSAGING_CONNECTION_UNAVAILABLE',
      );
    if (negotiate) {
      const result = negotiation(await upstream.json());
      await withSessionLock(id, async () => {
        const session = await readSession(id);
        if (!session) throw new ApiError(401);
        if (session.revision !== prepared.revision)
          throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
        const entries = (session.messagingConnections ?? []).filter(
          (entry) =>
            entry.revision === prepared.revision && entry.createdAt > Date.now() - 5 * 60 * 1000,
        );
        if (entries.length >= 16) throw new ApiError(429);
        await writeSession(id, {
          ...session,
          messagingConnections: [
            ...entries,
            {
              hash: hash(result.connectionToken),
              revision: prepared.revision,
              createdAt: Date.now(),
            },
          ],
        });
      });
      return NextResponse.json(result, { headers });
    }
    if (request.method === 'DELETE') {
      await withSessionLock(id, async () => {
        const session = await readSession(id);
        if (session)
          await writeSession(id, {
            ...session,
            messagingConnections: session.messagingConnections?.filter(
              (entry) => entry.hash !== hash(query.get('id')!),
            ),
          });
      });
      return new NextResponse(null, { status: 202, headers });
    }
    if (upstream.status === 204) return new NextResponse(null, { status: 204, headers });
    if (request.method === 'POST') return new NextResponse(null, { status: 200, headers });
    const body = await upstream.text();
    if (body.length > 2 * 1024 * 1024) return problem(502, 'INVALID_HUB_RESPONSE');
    return new NextResponse(notificationFrames(body), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'text/plain;charset=UTF-8' },
    });
  } catch (error) {
    return problem(
      error instanceof ApiError ? error.status : 503,
      error instanceof ApiError ? error.problem.code : 'MESSAGING_CONNECTION_UNAVAILABLE',
    );
  }
}
export { handler as GET, handler as POST, handler as DELETE };
