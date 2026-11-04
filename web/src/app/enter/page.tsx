import * as uiText from '@/content/fa';
import { LoginForm } from '@/features/auth/login';
import { serverConfig } from '@/lib/server/config';
import { canonicalLocalLoginUrl } from '@/lib/login-origin';
import { headers, cookies } from 'next/headers';
import { AUTH_RETURN_COOKIE, safeAuthReturnPath } from '@/lib/auth-return';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: uiText.text_b11c67f6d491 } };
export default async function Enter() {
  const canonical = canonicalLocalLoginUrl((await headers()).get('host'), serverConfig().origin);
  if (canonical) {
    const target = new URL(canonical);
    target.pathname = '/enter';
    redirect(target.href);
  }
  let returnPath: string | null = null;
  try {
    returnPath = safeAuthReturnPath((await cookies()).get(AUTH_RETURN_COOKIE)?.value ?? '');
  } catch {}
  return <LoginForm returnPath={returnPath} />;
}
