import { assertBinaryContent } from '@/lib/api/binary-response';
import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, withSessionLock } from '@/lib/server/session';
import { authenticatedFetch, checkOrigin, safeResponse } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError, parseProblem } from '@/lib/api/errors';
import type { components } from '@/generated/api/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const privateHeaders = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
async function decoded<T>(
  response: Response,
  schema: Parameters<typeof clientValidator>[0],
): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, parseProblem(body, response.status));
  const value = clientValidator(schema).safeParse(body);
  if (!value.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  return value.data as T;
}
async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  try {
    if (request.method === 'POST' && !checkOrigin(request))
      throw new ApiError(403, { code: 'ORIGIN_REJECTED' });
    const parts = (await params).path ?? [],
      url = new URL(request.url);
    const upload = request.method === 'POST' && parts.length === 0;
    const content = request.method === 'GET' && parts.length === 2 && parts[1] === 'content';
    const metadata = request.method === 'GET' && parts.length === 1;
    if (!upload && (!(content || metadata) || !guid.test(parts[0]))) throw new ApiError(404);
    const classId = url.searchParams.get('classId'),
      lessonId = url.searchParams.get('lessonId');
    if (
      url.searchParams.size !== 1 ||
      (content ? !lessonId || !guid.test(lessonId) : !classId || !guid.test(classId))
    )
      throw new ApiError(400);
    const type = request.headers.get('Content-Type') ?? '';
    if (upload && (!/^multipart\/form-data;\s*boundary=/i.test(type) || !request.body))
      throw new ApiError(415);
    const id = await clientSessionId();
    if (!id) throw new ApiError(401);
    const prepared = await withSessionLock(id, async () => {
      const state = await getClientState(id);
      if (!state) throw new ApiError(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      if (state.context.workspaceType !== 'Organization')
        throw new ApiError(403, { code: 'ORGANIZATION_WORKSPACE_REQUIRED' });
      const session = await readSession(id);
      if (!session) throw new ApiError(401);
      if (content) {
        const lesson = await decoded<components['schemas']['ClassLessonResult']>(
          (
            await authenticatedFetch(id, session, '/api/v1/academic/lessons/' + lessonId, {
              signal: request.signal,
            })
          ).response,
          { $ref: '#/components/schemas/ClassLessonResult' },
        );
        if (lesson.id !== lessonId || lesson.organizationId !== state.context.organizationId)
          throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
        if (
          !lesson.attachments.some(
            (a) => a.fileAssetId === parts[0] && a.isAvailable && a.status === 'Ready',
          )
        )
          throw new ApiError(404);
      } else {
        if (!['Teacher', 'Manager'].includes(state.context.activeRole ?? ''))
          throw new ApiError(403);
        const classes = await decoded<components['schemas']['ClassResult'][]>(
          (
            await authenticatedFetch(id, session, '/api/v1/academic/classes', {
              signal: request.signal,
            })
          ).response,
          { type: 'array', items: { $ref: '#/components/schemas/ClassResult' } },
        );
        if (
          !classes.some(
            (c) =>
              c.id === classId &&
              c.organizationId === state.context.organizationId &&
              c.status === 'Active',
          )
        )
          throw new ApiError(404);
      }
      return {
        revision: state.revision,
        userId: state.user.id,
        organizationId: state.context.organizationId,
        token: session.accessToken,
      };
    });
    async function current() {
      const latest = await readSession(id!);
      if (!latest) throw new ApiError(401);
      if (latest.revision !== prepared.revision)
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
    const response = await fetch(
      new URL(
        upload ? '/api/v1/files' : '/api/v1/files/' + parts[0] + (content ? '/content' : ''),
        serverConfig().backend,
      ),
      {
        method: request.method,
        headers: {
          Authorization: 'Bearer ' + prepared.token,
          'Accept-Encoding': 'identity',
          ...(upload ? { 'Content-Type': type } : {}),
        },
        body,
        duplex: 'half',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]),
      } as RequestInit & { duplex: 'half' },
    );
    await current();
    if (!response.ok) return safeResponse(response);
    if (!content) {
      const asset = await decoded<components['schemas']['FileAssetResult']>(response, {
        $ref: '#/components/schemas/FileAssetResult',
      });
      if (
        asset.uploadedByUserId !== prepared.userId ||
        asset.organizationId !== prepared.organizationId ||
        (!upload && asset.id !== parts[0])
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      await current();
      return NextResponse.json(asset, { status: response.status, headers: privateHeaders });
    }
    assertBinaryContent(response.headers);
    if (!response.body) throw new ApiError(502);
    const reader = response.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          await current();
          const chunk = await reader.read();
          await current();
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
    const headers = new Headers({
      ...privateHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="makan-lesson-file.bin"',
    });
    const length = response.headers.get('Content-Length');
    if (length && /^\d+$/.test(length) && !response.headers.get('Content-Encoding'))
      headers.set('Content-Length', length);
    return new NextResponse(stream, { status: response.status, headers });
  } catch (error) {
    const err =
      error instanceof ApiError ? error : new ApiError(503, { code: 'FILE_TRANSFER_UNAVAILABLE' });
    return NextResponse.json(
      { ...err.problem, status: err.status },
      { status: err.status, headers: privateHeaders },
    );
  }
}
export { handler as GET, handler as POST };
