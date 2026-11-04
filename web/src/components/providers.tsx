'use client';
import { PwaProvider } from '@/features/pwa/provider';
import { DirectionProvider } from '@radix-ui/react-direction';
import { ThemePreferenceProvider } from '@/features/personal/theme';
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <ThemePreferenceProvider>
        <PwaProvider>{children}</PwaProvider>
      </ThemePreferenceProvider>
    </DirectionProvider>
  );
}
