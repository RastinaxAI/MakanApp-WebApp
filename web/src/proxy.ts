import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_RETURN_COOKIE, safeAuthReturnPath } from '@/lib/auth-return';
/** Remember navigation without copying invitation data into the login URL or access logs. */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.headers.get('next-router-prefetch') === '1') return response;
  const path = safeAuthReturnPath(request.nextUrl.pathname + request.nextUrl.search);
  if (path)
    response.cookies.set(
      AUTH_RETURN_COOKIE,
      path.length <= 700
        ? path
        : request.nextUrl.pathname.length <= 700
          ? request.nextUrl.pathname
          : '/personal',
      {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 600,
      },
    );
  return response;
}
export const config = { matcher: '/personal/:path*' };
