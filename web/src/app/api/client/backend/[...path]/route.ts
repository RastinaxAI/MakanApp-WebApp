import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  clientOperationFor as operationFor,
  clientValidator as validator,
} from '@/lib/api/client-contract';
import { isClientOperation, requiresSchoolContext } from '@/lib/client-surface';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, writeSession, withSessionLock, withSessionRead } from '@/lib/server/session';
import { authenticatedFetch, checkOrigin, problem, safeResponse } from '@/lib/server/backend';
import { ApiError } from '@/lib/api/errors';
export const runtime = 'nodejs';
async function handler(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (request.method !== 'GET' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const segments = (await params).path;
  if (segments.some((s) => !s || s === '.' || s === '..' || /[\\/?#%]/.test(s)))
    return problem(404);
  const path = '/' + segments.join('/');
  // File operations use the dedicated streaming, conversation-bound BFF.
  if (path === '/api/v1/files' || path.startsWith('/api/v1/files/')) return problem(404);
  const op = operationFor(request.method, path);
  if (!op || !isClientOperation(op.method, op.path)) return problem(404);
  const templateSegments = op.path.slice(1).split('/');
  for (const definition of op.parameters.filter((p) => p.in === 'path')) {
    const index = templateSegments.indexOf(`{${definition.name}}`);
    if (index < 0 || !validator(definition.schema).safeParse(segments[index]).success)
      return problem(400, 'INVALID_PATH_PARAMETER');
  }
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    const access = request.method === 'GET' ? withSessionRead : withSessionLock;
    return await access(id, async () => {
      const state = await getClientState(id);
      if (!state) return problem(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        return problem(409, 'CONTEXT_CHANGED');
      if (requiresSchoolContext(path) && state.context.workspaceType !== 'Organization')
        return problem(403, 'ORGANIZATION_WORKSPACE_REQUIRED');
      const inputUrl = new URL(request.url),
        query = new URLSearchParams();
      for (const [key, value] of inputUrl.searchParams) {
        const definition = op.parameters.find((p) => p.in === 'query' && p.name === key);
        if (!definition || query.has(key)) return problem(400, 'UNKNOWN_QUERY_PARAMETER');
        const parsed =
          definition.schema.type === 'integer' || definition.schema.type === 'number'
            ? Number(value)
            : definition.schema.type === 'boolean'
              ? value === 'true'
                ? true
                : value === 'false'
                  ? false
                  : value
              : value;
        if (!validator(definition.schema).safeParse(parsed).success)
          return problem(400, 'INVALID_QUERY_PARAMETER');
        if (/^(page|pageNumber|pageSize)$/i.test(key) && typeof parsed === 'number' && parsed < 1)
          return problem(400, 'INVALID_PAGINATION');
        query.append(key, value);
      }
      for (const definition of op.parameters.filter((p) => p.in === 'query' && p.required))
        if (!query.has(definition.name)) return problem(400, 'MISSING_QUERY_PARAMETER');
      let body: string | undefined;
      if (op.body) {
        const parsed = validator(op.body).safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return NextResponse.json(
            { status: 400, code: 'VALIDATION_ERROR', errors: parsed.error.flatten().fieldErrors },
            { status: 400, headers: { 'Cache-Control': 'no-store' } },
          );
        body = JSON.stringify(parsed.data);
      }
      const session = await readSession(id);
      if (!session) return problem(401);
      const { response } = await authenticatedFetch(
        id,
        session,
        path + (query.size ? '?' + query : ''),
        {
          method: request.method,
          signal: request.signal,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body,
        },
      );
      if (
        (path === '/api/v1/workspaces/select' ||
          /^\/api\/v1\/guardian\/children\/[^/]+\/select$/.test(path)) &&
        response.ok
      ) {
        const after = await readSession(id);
        if (after)
          await writeSession(id, { ...after, revision: randomUUID(), contextSignature: undefined });
      }
      const result = await safeResponse(response, op.response, validator);
      result.headers.set('X-Makan-Context', (await readSession(id))?.revision ?? '');
      return result;
    });
  } catch (error) {
    return problem(
      error instanceof ApiError
        ? error.status
        : error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
          ? 504
          : 503,
      error instanceof ApiError ? error.problem.code : 'UPSTREAM_UNAVAILABLE',
    );
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
