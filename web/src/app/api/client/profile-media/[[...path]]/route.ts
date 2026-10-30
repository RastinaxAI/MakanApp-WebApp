import { assertBinaryContent } from '@/lib/api/binary-response';
import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, withSessionLock } from '@/lib/server/session';
import { checkOrigin, problem, safeResponse } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError, parseProblem } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const imageType = (type: string) => ['image/jpeg', 'image/png'].includes(type.toLowerCase());
const privateHeaders = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
async function asset(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      parseProblem(data, response.status, response.headers.get('Retry-After')),
    );
  const parsed = clientValidator({ $ref: '#/components/schemas/FileAssetResult' }).safeParse(data);
  if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  return parsed.data as components['schemas']['FileAssetResult'];
}
async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  if (request.method === 'POST' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const parts = (await params).path ?? [];
  const url = new URL(request.url);
  if (url.search) return problem(400, 'INVALID_QUERY_PARAMETER');
  const upload = request.method === 'POST' && parts.length === 0;
  const metadata = request.method === 'GET' && parts.length === 2 && parts[1] === 'metadata';
  if (
    !upload &&
    !(request.method === 'GET' && (parts.length === 1 || metadata) && guid.test(parts[0]))
  )
    return problem(404);
  const type = request.headers.get('Content-Type') ?? '';
  if (upload && (!/^multipart\/form-data;\s*boundary=/i.test(type) || !request.body))
    return problem(415, 'FILE_MULTIPART_REQUIRED');
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    const prepared = await withSessionLock(id, async () => {
      const state = await getClientState(id);
      if (!state) throw new ApiError(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      const session = await readSession(id);
      if (!session) throw new ApiError(401);
      return { revision: state.revision, userId: state.user.id, token: session.accessToken };
    });
    async function ensureCurrent() {
      const current = await readSession(id!);
      if (!current) throw new ApiError(401);
      if (current.revision !== prepared.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      request.signal.throwIfAborted();
    }
    async function upstream(path: string, init: RequestInit = {}) {
      return fetch(new URL(path, serverConfig().backend), {
        ...init,
        headers: {
          Authorization: 'Bearer ' + prepared.token,
          'Accept-Encoding': 'identity',
          ...(init.headers ?? {}),
        },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]),
      });
    }
    if (upload) {
      const body = request.body!.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          async transform(chunk, controller) {
            await ensureCurrent();
            controller.enqueue(chunk);
          },
        }),
      );
      const response = await upstream('/api/v1/files?workspaceScope=Personal', {
        method: 'POST',
        headers: { 'Content-Type': type },
        body,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' });
      await ensureCurrent();
      if (!response.ok) return safeResponse(response);
      const result = await asset(response);
      await ensureCurrent();
      if (result.uploadedByUserId !== prepared.userId || result.organizationId !== null)
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      if (!imageType(result.contentType)) return problem(415, 'PROFILE_PHOTO_TYPE_NOT_ALLOWED');
      return NextResponse.json(result, { status: response.status, headers: privateHeaders });
    }
    const result = await asset(await upstream('/api/v1/files/' + parts[0]));
    await ensureCurrent();
    if (result.id !== parts[0]) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    if (!imageType(result.contentType)) return problem(415, 'PROFILE_PHOTO_TYPE_NOT_ALLOWED');
    if (metadata) {
      if (result.uploadedByUserId !== prepared.userId) return problem(403);
      return NextResponse.json(result, { headers: privateHeaders });
    }
    if (result.status !== 'Ready') return problem(404, 'PROFILE_PHOTO_UNAVAILABLE');
    // The backend authorizes the asset itself; identity visibility is never inferred from its ID.
    const response = await upstream('/api/v1/files/' + parts[0] + '/content');
    await ensureCurrent();
    if (!response.ok) return safeResponse(response);
    assertBinaryContent(response.headers);
    if (!response.body) return problem(502, 'FILE_CONTENT_UNAVAILABLE');
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          await ensureCurrent();
          const chunk = await reader.read();
          await ensureCurrent();
          if (chunk.done) controller.close();
          else controller.enqueue(chunk.value);
        } catch (error) {
          await reader.cancel().catch(() => {});
          controller.error(error);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason);
      },
    });
    return new NextResponse(stream, {
      status: response.status,
      headers: {
        ...privateHeaders,
        'Content-Type': result.contentType.toLowerCase(),
        'Content-Disposition':
          'inline; filename="profile-photo.' +
          (result.contentType.toLowerCase() === 'image/png' ? 'png' : 'jpg') +
          '"',
      },
    });
  } catch (error) {
    return problem(
      error instanceof ApiError
        ? error.status
        : error instanceof Error && error.name === 'TimeoutError'
          ? 504
          : 503,
      error instanceof ApiError ? error.problem.code : 'FILE_TRANSFER_UNAVAILABLE',
    );
  }
}
export { handler as GET, handler as POST };
