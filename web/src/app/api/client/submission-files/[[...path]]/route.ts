import { assertBinaryContent } from '@/lib/api/binary-response';
import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, withSessionLock } from '@/lib/server/session';
import { authenticatedFetch, checkOrigin, safeResponse } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError, parseProblem } from '@/lib/api/errors';
import { submissionMimeTypes } from '@/lib/submission-file';
import type { components } from '@/generated/api/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type S = components['schemas'];
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const privateHeaders = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
async function decode<T>(
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
      url = new URL(request.url),
      attemptId = url.searchParams.get('attemptId');
    const upload = request.method === 'POST' && parts.length === 0,
      content = request.method === 'GET' && parts.length === 2 && parts[1] === 'content',
      metadata = request.method === 'GET' && parts.length === 1;
    if (!attemptId || !guid.test(attemptId) || url.searchParams.size !== 1) throw new ApiError(400);
    if (!upload && (!(content || metadata) || !guid.test(parts[0]))) throw new ApiError(404);
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
      const evaluator = ['Teacher', 'Manager'].includes(state.context.activeRole ?? '');
      if (
        state.context.workspaceType !== 'Organization' ||
        (!evaluator && state.context.activeRole !== 'Student')
      )
        throw new ApiError(403);
      // Evaluators can only download a Ready attachment proved by the authorized
      // evaluation read model. They cannot upload or inspect arbitrary assets.
      if (evaluator && !content) throw new ApiError(403);
      const initialSession = await readSession(id);
      if (!initialSession) throw new ApiError(401);
      let session = initialSession;
      const read = async <T>(path: string, schema: Parameters<typeof clientValidator>[0]) => {
        const upstream = await authenticatedFetch(id, session, path, { signal: request.signal });
        session = upstream.session;
        return decode<T>(upstream.response, schema);
      };
      if (evaluator) {
        const submission = await read<S['SubmissionForEvaluationResult']>(
          '/api/v1/academic/submission-attempts/' + attemptId + '/evaluation/submission',
          { $ref: '#/components/schemas/SubmissionForEvaluationResult' },
        );
        if (
          submission.submissionAttemptId !== attemptId ||
          !submission.attachments.some(
            (a) =>
              a.fileAssetId === parts[0] &&
              a.fileStatus === 'Ready' &&
              submissionMimeTypes.has(a.contentType),
          )
        )
          throw new ApiError(404);
      } else {
        const attempt = await read<S['SubmissionAttemptResult']>(
          '/api/v1/academic/submission-attempts/' + attemptId,
          { $ref: '#/components/schemas/SubmissionAttemptResult' },
        );
        if (
          attempt.id !== attemptId ||
          attempt.organizationId !== state.context.organizationId ||
          !attempt.contentVisible
        )
          throw new ApiError(404);
        const own = await read<S['SubmissionAttemptResult'][]>(
          '/api/v1/academic/assignments/' + attempt.assignmentId + '/attempts/me',
          { type: 'array', items: { $ref: '#/components/schemas/SubmissionAttemptResult' } },
        );
        if (
          !own.some(
            (a) =>
              a.id === attemptId &&
              a.assignmentId === attempt.assignmentId &&
              a.organizationId === state.context.organizationId &&
              a.contentVisible,
          )
        )
          throw new ApiError(404);
        if (!content && attempt.status !== 'Draft')
          throw new ApiError(409, { code: 'SUBMISSION_NOT_DRAFT' });
        if (
          content &&
          !attempt.attachments.some(
            (a) =>
              a.fileAssetId === parts[0] &&
              a.fileStatus === 'Ready' &&
              submissionMimeTypes.has(a.contentType),
          )
        )
          throw new ApiError(404);
      }
      if (!upload) {
        const file = await read<S['FileAssetResult']>('/api/v1/files/' + parts[0], {
          $ref: '#/components/schemas/FileAssetResult',
        });
        if (
          file.id !== parts[0] ||
          file.organizationId !== state.context.organizationId ||
          (!evaluator && file.uploadedByUserId !== state.user.id) ||
          !submissionMimeTypes.has(file.contentType)
        )
          throw new ApiError(404);
        if (content && file.status !== 'Ready') throw new ApiError(409, { code: 'FILE_NOT_READY' });
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
      const asset = await decode<S['FileAssetResult']>(response, {
        $ref: '#/components/schemas/FileAssetResult',
      });
      if (
        asset.uploadedByUserId !== prepared.userId ||
        asset.organizationId !== prepared.organizationId ||
        (!upload && asset.id !== parts[0])
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      if (!submissionMimeTypes.has(asset.contentType))
        throw new ApiError(415, { code: 'FILE_TYPE_NOT_ALLOWED' });
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
      'Content-Disposition': 'attachment; filename="makan-answer-file.bin"',
    });
    const length = response.headers.get('Content-Length');
    if (length && /^\d+$/.test(length) && !response.headers.get('Content-Encoding'))
      headers.set('Content-Length', length);
    return new NextResponse(stream, { status: response.status, headers });
  } catch (error) {
    const e =
      error instanceof ApiError ? error : new ApiError(503, { code: 'FILE_TRANSFER_UNAVAILABLE' });
    return NextResponse.json(
      { ...e.problem, status: e.status },
      { status: e.status, headers: privateHeaders },
    );
  }
}
export { handler as GET, handler as POST };
