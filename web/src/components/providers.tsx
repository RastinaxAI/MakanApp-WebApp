'use client';
import { PwaProvider } from '@/features/pwa/provider';
import { DirectionProvider } from '@radix-ui/react-direction';
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <PwaProvider>{children}</PwaProvider>
    </DirectionProvider>
  );
}
