import { authenticatedFetch, checkOrigin, problem, safeResponse } from '@/lib/server/backend';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { readSession, withSessionLock } from '@/lib/server/session';
import { ApiError } from '@/lib/api/errors';
import { validator } from '@/lib/api/contract';
export const runtime = 'nodejs';
async function handler(request: Request, { params }: { params: Promise<{ action?: string[] }> }) {
  const parts = (await params).action ?? [];
  const allowed =
    (request.method === 'GET' && parts.length === 0) ||
    (request.method === 'DELETE' &&
      parts.length === 1 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[0])) ||
    (request.method === 'POST' && parts.length === 1 && parts[0] === 'revoke-others');
  if (!allowed || new URL(request.url).search) return problem(404);
  if (request.method !== 'GET' && !checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    return await withSessionLock(id, async () => {
      const state = await getClientState(id);
      if (!state) return problem(401);
      if (request.headers.get('X-Makan-Context') !== state.revision)
        return problem(409, 'CONTEXT_CHANGED');
      const session = await readSession(id);
      if (!session) return problem(401);
      const path = '/api/v1/auth/sessions' + (parts.length ? '/' + parts[0] : '');
      const { response } = await authenticatedFetch(id, session, path, {
        method: request.method,
        signal: request.signal,
      });
      const result = await safeResponse(
        response,
        request.method === 'GET'
          ? { type: 'array', items: { $ref: '#/components/schemas/UserSessionResult' } }
          : null,
        validator,
      );
      result.headers.set('X-Makan-Context', state.revision);
      return result;
    });
  } catch (error) {
    return problem(
      error instanceof ApiError ? error.status : 503,
      error instanceof ApiError ? error.problem.code : 'UPSTREAM_UNAVAILABLE',
    );
  }
}
export { handler as GET, handler as DELETE, handler as POST };
