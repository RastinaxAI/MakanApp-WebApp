import 'server-only';
import { isSessionRead, ExclusiveSessionRequired } from './session-lock';
import { NextResponse } from 'next/server';
import { serverConfig } from './config';
import { writeSession, removeSession, type Session } from './session';
import { parseProblem } from '@/lib/api/errors';
import { validator } from '@/lib/api/contract';
export function problem(status: number, code?: string) {
  return NextResponse.json({ status, code }, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function checkOrigin(request: Request) {
  const expected = new URL(serverConfig().origin);
  return (
    request.headers.get('origin') === expected.origin &&
    request.headers.get('host') === expected.host
  );
}
export async function backendFetch(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(new URL(path, serverConfig().backend), {
    ...init,
    headers,
    cache: 'no-store',
    redirect: 'error',
    signal: init.signal
      ? AbortSignal.any([AbortSignal.timeout(25000), init.signal])
      : AbortSignal.timeout(25000),
  });
}
export async function authenticatedFetch(
  id: string,
  session: Session,
  path: string,
  init: RequestInit = {},
) {
  let current = session;
  async function refresh() {
    const response = await backendFetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        await removeSession(id);
      }
      return response;
    }
    const value = validator({ $ref: '#/components/schemas/RefreshSessionResult' }).safeParse(
      await response.json(),
    );
    if (!value.success) return problem(502, 'CONTRACT_MISMATCH');
    const tokens = value.data as {
      accessToken: string;
      refreshToken: string;
      expiresAtUtc: string;
      refreshExpiresAtUtc: string;
    };
    current = { ...current, ...tokens };
    await writeSession(id, current);
    return null;
  }
  if (Date.parse(current.expiresAtUtc) <= Date.now() + 15000) {
    if (isSessionRead(id)) throw new ExclusiveSessionRequired();
    const error = await refresh();
    if (error) return { response: error, session: current };
  }
  const response = await backendFetch(path, init, current.accessToken);
  // Refresh once on 401 only. Retry reads only: never automatically replay a mutation.
  if (response.status === 401) {
    if (isSessionRead(id)) throw new ExclusiveSessionRequired();
    const error = await refresh();
    if (error) return { response: error, session: current };
    if ((init.method ?? 'GET') === 'GET')
      return { response: await backendFetch(path, init, current.accessToken), session: current };
    return { response: problem(409, 'REAUTHENTICATED_REVIEW_ACTION'), session: current };
  }
  return { response, session: current };
}
export async function safeResponse(
  response: Response,
  schema: Parameters<typeof validator>[0] | null = null,
  validate: typeof validator = validator,
) {
  const headers = new Headers({ 'Cache-Control': 'no-store, private', Vary: 'Cookie' });
  const retry = response.headers.get('retry-after');
  if (retry) headers.set('Retry-After', retry);
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {}
    const p = parseProblem(body, response.status, retry);

    return NextResponse.json(p, { status: response.status, headers });
  }
  if (response.status === 204) return new NextResponse(null, { status: 204, headers });
  const content = response.headers.get('content-type') ?? '';
  if (content.includes('json') || schema) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return problem(502, 'INVALID_JSON');
    }
    if (schema) {
      const parsed = validate(schema).safeParse(body);
      if (!parsed.success) return problem(502, 'CONTRACT_MISMATCH');
      body = parsed.data;
    }
    return NextResponse.json(body, { status: response.status, headers });
  }
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', 'attachment; filename="evidence.bin"');
  return new NextResponse(response.body, { status: response.status, headers });
}
