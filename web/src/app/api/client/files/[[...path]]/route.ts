import { assertBinaryContent } from '@/lib/api/binary-response';
import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, withSessionLock } from '@/lib/server/session';
import { authenticatedFetch, checkOrigin, problem, safeResponse } from '@/lib/server/backend';
import { serverConfig } from '@/lib/server/config';
import { clientValidator } from '@/lib/api/client-contract';
import { ApiError, parseProblem } from '@/lib/api/errors';
import { canAttachConversation, mediaRestricted } from '@/features/personal/messaging/model';
import {
  officialMetadataMatches,
  officialPairPath,
  officialConversationCapabilities,
  type OfficialPair,
} from '@/features/personal/messaging/official-model';
import {
  findConversationSummary,
  isManagedConversation,
  type ConversationSummary,
} from '@/features/personal/messaging/summary';
import type { components } from '@/generated/api/schema';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const responseHeaders = {
  'Cache-Control': 'no-store, private',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
async function decode<T>(
  response: Response,
  schema: string | Parameters<typeof clientValidator>[0],
): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      parseProblem(body, response.status, response.headers.get('Retry-After')),
    );
  const parsed = clientValidator(
    typeof schema === 'string' ? { $ref: '#/components/schemas/' + schema } : schema,
  ).safeParse(body);
  if (!parsed.success) throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
  return parsed.data as T;
}
async function handler(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  if (request.method === 'POST' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const segments = (await params).path ?? [],
    url = new URL(request.url),
    conversationId = url.searchParams.get('conversationId');
  if (!conversationId || !guid.test(conversationId) || url.searchParams.size !== 1)
    return problem(400, 'INVALID_PATH_PARAMETER');
  const upload = request.method === 'POST' && segments.length === 0,
    content = request.method === 'GET' && segments.length === 2 && segments[1] === 'content';
  if (
    !upload &&
    !(request.method === 'GET' && (segments.length === 1 || content) && guid.test(segments[0]))
  )
    return problem(404);
  const contentType = request.headers.get('Content-Type') ?? '';
  if (upload && (!/^multipart\/form-data;\s*boundary=/i.test(contentType) || !request.body))
    return problem(415, 'FILE_MULTIPART_REQUIRED');
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    const prepared = await withSessionLock(id, async () => {
      const state = await getClientState(id);
      if (!state) throw new ApiError(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      async function read<T>(path: string, schema: string | Parameters<typeof clientValidator>[0]) {
        const session = await readSession(id!);
        if (!session) throw new ApiError(401);
        return decode<T>(
          (await authenticatedFetch(id!, session, path, { signal: request.signal })).response,
          schema,
        );
      }
      const summary = await findConversationSummary(
        conversationId,
        (path) =>
          read<ConversationSummary>(path, {
            $ref: '#/components/schemas/ConversationSummaryResult',
          }),
        request.signal,
      );
      const managed = isManagedConversation(summary.type);
      if (summary.official || summary.isOfficial) {
        if (!officialMetadataMatches(summary) || !summary.official) throw new ApiError(403);
        const pair = await read<OfficialPair>(
          officialPairPath(summary.official),
          'OfficialSpacesPairResult',
        );
        const caps = officialConversationCapabilities(summary, pair);
        if (!caps?.canRead || (upload && !caps.canSend)) throw new ApiError(403);
      }
      const conversation = managed
        ? await read<components['schemas']['ManagedConversationResult']>(
            '/api/v1/conversations/' + conversationId,
            'ManagedConversationResult',
          )
        : null;
      // This preflight narrows the UI context. FileAssetResult has no conversation binding;
      // upstream file authorization must still verify the requested file and its grants.
      if (
        conversation &&
        (conversation.conversationId !== conversationId ||
          conversation.type !== summary.type ||
          conversation.scope !== summary.scope ||
          conversation.organizationId !== summary.organizationId)
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      const member = conversation?.participants.find((item) => item.user.userId === state.user.id);
      if (
        conversation &&
        (!member || (conversation.scope === 'Organization' && member.status !== 'Active'))
      )
        throw new ApiError(403);
      if (
        summary.scope === 'Organization' &&
        (state.context.workspaceType !== 'Organization' ||
          state.context.organizationId !== summary.organizationId)
      )
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      if (upload) {
        if (conversation && !canAttachConversation(conversation, state.user.id))
          throw new ApiError(403);
        if (conversation) {
          const restriction = await read<components['schemas']['MemberRestrictionResult']>(
            '/api/v1/conversations/' + conversationId + '/me/restriction',
            'MemberRestrictionResult',
          );
          if (restriction.conversationId !== conversationId || restriction.userId !== state.user.id)
            throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
          if (mediaRestricted(restriction)) throw new ApiError(403);
        }
      }
      const session = await readSession(id);
      if (!session) throw new ApiError(401);
      return {
        revision: state.revision,
        token: session.accessToken,
        userId: state.user.id,
        organizationId: summary.scope === 'Personal' ? null : summary.organizationId,
        personal: summary.scope === 'Personal',
      };
    });
    let checkedAt = 0;
    async function stillCurrent(force = false) {
      if (!force && Date.now() - checkedAt < 500) return;
      checkedAt = Date.now();
      const session = await readSession(id!);
      if (!session) throw new ApiError(401);
      if (session.revision !== prepared.revision)
        throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
      request.signal.throwIfAborted();
    }
    const body = upload
      ? request.body!.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            async transform(chunk, controller) {
              await stillCurrent();
              controller.enqueue(chunk);
            },
          }),
        )
      : undefined;
    // Streams do not hold the refresh/mutation lock and are never replayed automatically.
    const upstream = await fetch(
      new URL(
        upload
          ? '/api/v1/files' + (prepared.personal ? '?workspaceScope=Personal' : '')
          : '/api/v1/files/' + segments[0] + (content ? '/content' : ''),
        serverConfig().backend,
      ),
      {
        method: request.method,
        headers: {
          Authorization: 'Bearer ' + prepared.token,
          Accept: content ? 'application/octet-stream' : 'application/json',
          'Accept-Encoding': 'identity',
          ...(upload ? { 'Content-Type': contentType } : {}),
        },
        body,
        duplex: 'half',
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(120000)]),
      } as RequestInit & { duplex: 'half' },
    );
    await stillCurrent(true);
    if (!upstream.ok) return safeResponse(upstream);
    if (!content) {
      const result = await decode<components['schemas']['FileAssetResult']>(
        upstream,
        'FileAssetResult',
      );
      await stillCurrent(true);
      if (
        upload &&
        (result.uploadedByUserId !== prepared.userId ||
          result.organizationId !== prepared.organizationId)
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      if (!upload && result.id !== segments[0])
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      return NextResponse.json(result, { status: upstream.status, headers: responseHeaders });
    }
    assertBinaryContent(upstream.headers);
    if (!upstream.body) return problem(502, 'FILE_CONTENT_UNAVAILABLE');
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          await stillCurrent();
          const chunk = await reader.read();
          await stillCurrent(true);
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
      ...responseHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="makan-file.bin"',
    });
    const length = upstream.headers.get('Content-Length');
    if (length && /^\d+$/.test(length) && !upstream.headers.get('Content-Encoding'))
      headers.set('Content-Length', length);
    return new NextResponse(stream, { status: upstream.status, headers });
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
