import { LoginForm } from '@/features/auth/login';
import { serverConfig } from '@/lib/server/config';
import { canonicalLocalLoginUrl } from '@/lib/login-origin';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'ماکان | ورود' } };
export default async function Enter() {
  const canonical = canonicalLocalLoginUrl((await headers()).get('host'), serverConfig().origin);
  if (canonical) {
    const target = new URL(canonical);
    target.pathname = '/enter';
    redirect(target.href);
  }
  return <LoginForm />;
}
