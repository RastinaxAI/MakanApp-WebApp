import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  backendFetch,
  authenticatedFetch,
  checkOrigin,
  problem,
  safeResponse,
} from '@/lib/server/backend';
import {
  readSession,
  writeSession,
  removeSession,
  withSessionLock,
  cookieOptions,
} from '@/lib/server/session';
import { CLIENT_COOKIE, clientSessionId } from '@/lib/server/client-session';
import { validator } from '@/lib/api/contract';
import { phoneInputSchema, otpInputSchema } from '@/lib/auth-input';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  if (!checkOrigin(request)) return problem(403, 'ORIGIN_REJECTED');
  const { action } = await params;
  if (!['challenge', 'verify', 'logout'].includes(action)) return problem(404);
  try {
    if (action === 'logout') {
      const id = await clientSessionId();
      if (id)
        await withSessionLock(id, async () => {
          const session = await readSession(id);
          if (session)
            await authenticatedFetch(id, session, '/api/v1/auth/logout', { method: 'POST' }).catch(
              () => {},
            );
          await removeSession(id);
        });
      const result = new NextResponse(null, { status: 204 });
      result.cookies.set(CLIENT_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
      return result;
    }
    const body = await request.json().catch(() => null);
    const parsed = validator({
      $ref: `#/components/schemas/${action === 'challenge' ? 'RequestOtpCommand' : 'VerifyOtpCommand'}`,
    }).safeParse(body);
    if (!parsed.success) return problem(400, 'VALIDATION_ERROR');
    const input = parsed.data as Record<string, unknown>;
    const phone = phoneInputSchema.safeParse(input.phoneNumber);
    if (!phone.success) return problem(400, 'VALIDATION_ERROR');
    const otp = action === 'verify' ? otpInputSchema.safeParse(input.code) : null;
    if (otp && !otp.success) return problem(400, 'VALIDATION_ERROR');
    const response = await backendFetch(
      `/api/v1/auth/otp/${action === 'challenge' ? 'challenges' : 'verify'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          phoneNumber: phone.data,
          ...(otp?.success ? { code: otp.data } : {}),
        }),
      },
    );
    if (!response.ok || action === 'challenge')
      return safeResponse(
        response,
        action === 'challenge' ? { $ref: '#/components/schemas/RequestOtpResult' } : null,
      );
    const tokens = validator({ $ref: '#/components/schemas/VerifyOtpResult' }).safeParse(
      await response.json().catch(() => null),
    );
    if (!tokens.success) return problem(502, 'CONTRACT_MISMATCH');
    const value = tokens.data as {
      accessToken: string;
      refreshToken: string;
      expiresAtUtc: string;
      refreshExpiresAtUtc: string;
      user: { id: string };
    };
    let accepted = false;
    let createdSessionId: string | undefined;
    try {
      const me = await backendFetch('/api/v1/me', {}, value.accessToken);
      if (!me.ok) return safeResponse(me);
      const identity = validator({ $ref: '#/components/schemas/CurrentUserResult' }).safeParse(
        await me.json().catch(() => null),
      );
      if (
        !identity.success ||
        (identity.data as { id: string }).id.toLowerCase() !== value.user.id.toLowerCase()
      )
        return problem(502, 'CONTRACT_MISMATCH');
      const id = randomUUID();
      await writeSession(id, {
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        expiresAtUtc: value.expiresAtUtc,
        refreshExpiresAtUtc: value.refreshExpiresAtUtc,
        userId: value.user.id,
        revision: randomUUID(),
      });
      createdSessionId = id;
      const old = await clientSessionId();
      if (old) await withSessionLock(old, () => removeSession(old));
      const result = NextResponse.json(
        { authenticated: true },
        { headers: { 'Cache-Control': 'no-store, private' } },
      );
      result.cookies.set(CLIENT_COOKIE, id, cookieOptions());
      accepted = true;
      return result;
    } finally {
      if (!accepted) {
        if (createdSessionId) await removeSession(createdSessionId).catch(() => {});
        await backendFetch('/api/v1/auth/logout', { method: 'POST' }, value.accessToken).catch(
          () => {},
        );
      }
    }
  } catch (error) {
    return problem(
      error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 504 : 503,
      'UPSTREAM_UNAVAILABLE',
    );
  }
}
