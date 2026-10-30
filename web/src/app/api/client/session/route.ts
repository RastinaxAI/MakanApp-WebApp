import { NextResponse } from 'next/server';
import { clientSessionId, getClientState } from '@/lib/server/client-session';
import { withSessionRead } from '@/lib/server/session';
import { problem } from '@/lib/server/backend';
import { ApiError } from '@/lib/api/errors';
export const dynamic = 'force-dynamic';
export async function GET() {
  const id = await clientSessionId();
  if (!id) return problem(401);
  try {
    return await withSessionRead(id, async () => {
      const state = await getClientState(id);
      return state
        ? NextResponse.json(state, {
            headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' },
          })
        : problem(401);
    });
  } catch (error) {
    return problem(
      error instanceof ApiError ? error.status : 503,
      error instanceof ApiError ? error.problem.code : 'UPSTREAM_UNAVAILABLE',
    );
  }
}
