import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, withSessionLock } from '@/lib/server/session';
import { authenticatedFetch, checkOrigin, problem, safeResponse } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { clientValidator } from '@/lib/api/client-contract';
import { assertBinaryContent } from '@/lib/api/binary-response';
import { ApiError, parseProblem } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
async function decode<T>(response: Response, name: string): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      parseProblem(body, response.status, response.headers.get('Retry-After')),
    );
  const parsed = clientValidator({ $ref: '#/components/schemas/' + name }).safeParse(body);
  if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  return parsed.data as T;
}
async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  if (request.method === 'POST' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const parts = (await params).path ?? [],
    url = new URL(request.url),
    upload = request.method === 'POST' && !parts.length,
    metadata = request.method === 'GET' && parts.length === 1 && guid.test(parts[0]),
    content =
      request.method === 'GET' &&
      parts.length === 2 &&
      guid.test(parts[0]) &&
      parts[1] === 'content';
  if (!upload && !metadata && !content) return problem(404);
  const scope = url.searchParams.get('scope'),
    classId = url.searchParams.get('classId'),
    revision = url.searchParams.get('revision');
  if (
    content
      ? url.searchParams.size !== 1 || !revision || !/^\d+$/.test(revision) || Number(revision) < 1
      : !['Personal', 'Class', 'Organization'].includes(scope ?? '') ||
        url.searchParams.size !== (classId ? 2 : 1) ||
        (scope === 'Class' ? !classId || !guid.test(classId) : !!classId)
  )
    return problem(400);
  const type = request.headers.get('Content-Type') ?? '';
  if (upload && (!/^multipart\/form-data;\s*boundary=/i.test(type) || !request.body))
    return problem(415);
  const range = request.headers.get('Range');
  if (range && !/^bytes=\d*-\d*$/.test(range)) return problem(400);
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    const prepared = await withSessionLock(id, async () => {
      const state = await getClientState(id);
      if (!state) throw new ApiError(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      let session = await readSession(id);
      if (!session) throw new ApiError(401);
      if (!content && scope !== 'Personal') {
        if (
          state.context.workspaceType !== 'Organization' ||
          !['Teacher', 'Manager'].includes(state.context.activeRole ?? '') ||
          (scope === 'Organization' && state.context.activeRole !== 'Manager')
        )
          throw new ApiError(403);
        if (scope === 'Class') {
          const response = (
            await authenticatedFetch(id, session, '/api/v1/academic/classes/' + classId, {
              signal: request.signal,
            })
          ).response;
          if (!response.ok) throw new ApiError(response.status);
        }
      }
      let expectedContentType: string | undefined;
      if (content) {
        const source = await decode<components['schemas']['EducationalSourceResult']>(
          (
            await authenticatedFetch(
              id,
              session,
              `/api/v1/sources/${parts[0]}?revision=${revision}`,
              { signal: request.signal },
            )
          ).response,
          'EducationalSourceResult',
        );
        if (source.sourceId !== parts[0] || source.revision !== Number(revision))
          throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
        expectedContentType = source.file?.contentType;
        if (
          !source.capabilities.canDownload ||
          !source.fileReady ||
          !source.file ||
          source.scope === 'Library'
        )
          throw new ApiError(403);
      }
      session = await readSession(id);
      if (!session) throw new ApiError(401);
      return {
        revision: state.revision,
        userId: state.user.id,
        organizationId: scope === 'Personal' ? null : state.context.organizationId,
        token: session.accessToken,
        expectedContentType,
      };
    });
    async function current() {
      const state = await readSession(id!);
      if (!state) throw new ApiError(401);
      if (state.revision !== prepared.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      request.signal.throwIfAborted();
    }
    const body = upload
      ? request.body!.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            async transform(chunk, controller) {
              await current();
              controller.enqueue(chunk);
            },
          }),
        )
      : undefined;
    const path = content
      ? `/api/v1/sources/${parts[0]}/content?revision=${revision}`
      : upload
        ? '/api/v1/files' + (scope === 'Personal' ? '?workspaceScope=Personal' : '')
        : '/api/v1/files/' + parts[0];
    const response = await fetch(new URL(path, serverConfig().backend), {
      method: request.method,
      headers: {
        Authorization: 'Bearer ' + prepared.token,
        'Accept-Encoding': 'identity',
        ...(upload ? { 'Content-Type': type } : {}),
        ...(range ? { Range: range } : {}),
      },
      body,
      duplex: 'half',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]),
    } as RequestInit & { duplex: 'half' });
    await current();
    if (!response.ok) return safeResponse(response);
    if (!content) {
      const asset = await decode<components['schemas']['FileAssetResult']>(
        response,
        'FileAssetResult',
      );
      if (
        asset.uploadedByUserId !== prepared.userId ||
        asset.organizationId !== prepared.organizationId ||
        (!upload && asset.id !== parts[0])
      )
        throw new ApiError(403);
      return NextResponse.json(asset, { status: response.status, headers });
    }
    assertBinaryContent(response.headers);
    if (
      response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !==
      prepared.expectedContentType?.split(';')[0].trim().toLowerCase()
    )
      throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    const resultHeaders = new Headers(headers);
    for (const key of [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
      'Content-Disposition',
    ]) {
      const value = response.headers.get(key);
      if (value) resultHeaders.set(key, value);
    }
    resultHeaders.set(
      'Content-Disposition',
      response.headers.get('Content-Disposition') ?? 'attachment',
    );
    return new NextResponse(
      response.body?.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          async transform(chunk, controller) {
            await current();
            controller.enqueue(chunk);
          },
        }),
      ),
      { status: response.status, headers: resultHeaders },
    );
  } catch (e) {
    return problem(
      e instanceof ApiError ? e.status : 503,
      e instanceof ApiError ? e.problem.code : 'FILE_TRANSFER_UNAVAILABLE',
    );
  }
}
export { handler as GET, handler as POST };
