import * as uiText from '@/content/fa';
import type { Metadata, Viewport } from 'next';
import tokens from '../../design/tokens.json';
import '@fontsource-variable/vazirmatn';
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css';
import './globals.css';
import '@/design/tokens.css';
import './jalali-date-input.css';
import { RootProviders } from '@/components/providers';
export const metadata: Metadata = {
  title: { default: uiText.text_3ddc4fb260f2, template: uiText.text_9f26748fd7d4 },
  description: uiText.text_5d42da0bfff2,
  robots: { index: false, follow: false },
  applicationName: uiText.brand_name,
  appleWebApp: { capable: true, title: uiText.brand_name, statusBarStyle: 'default' },
  icons: { icon: '/icons/makan-192.png?v=blue-v2', apple: '/icons/makan-apple-180.png?v=blue-v2' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: tokens.light.bg,
  viewportFit: 'cover',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          id="makan-theme-bootstrap"
          dangerouslySetInnerHTML={{
            __html: `try{var p=localStorage.getItem('makan-theme');var t=p==='dark'?'dark':p==='light'?'light':matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.dataset.themePreference=p==='dark'||p==='light'?p:'system';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',${JSON.stringify({ light: tokens.light.bg, dark: tokens.dark.bg })}[t]);}catch{document.documentElement.dataset.theme='light';}`,
          }}
        />
      </head>
      <body>
        <RootProviders>{children}</RootProviders>
        {process.env.MAKAN_TEST_MODE === 'fixture' && (
          <div className="fixture-indicator" aria-hidden="true">
            {uiText.text_b2e9c858df63}
          </div>
        )}
      </body>
    </html>
  );
}
