import { requireClientPage } from '@/lib/server/client-session';
import { PersonalProvider } from '@/features/personal/provider';
import { PersonalShell } from '@/features/personal/shell';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: { absolute: 'ماکان | فضای شخصی' } };
export const dynamic = 'force-dynamic';
export default async function PersonalLayout({ children }: { children: React.ReactNode }) {
  await requireClientPage();
  return (
    <PersonalProvider>
      <PersonalShell>{children}</PersonalShell>
    </PersonalProvider>
  );
}
