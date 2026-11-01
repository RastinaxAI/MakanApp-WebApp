import type { Metadata, Viewport } from 'next';
import tokens from '../../design/tokens.json';
import '@fontsource-variable/vazirmatn';
import '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css';
import './globals.css';
import '@/design/tokens.css';
import './jalali-date-input.css';
import { RootProviders } from '@/components/providers';
export const metadata: Metadata = {
  title: { default: 'ماکان | ارتباط و یادگیری', template: '%s | ماکان' },
  description: 'فضای شخصی و آموزشی ماکان برای فرد عادی، دانشجو، استاد، والدین و مدیر آموزشگاه',
  robots: { index: false, follow: false },
  applicationName: 'ماکان',
  appleWebApp: { capable: true, title: 'ماکان', statusBarStyle: 'default' },
  icons: { icon: '/icons/makan-192.png', apple: '/icons/makan-apple-180.png' },
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
            __html: `try{var t=localStorage.getItem('makan-theme')==='dark'?'dark':'light';document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',${JSON.stringify({ light: tokens.light.bg, dark: tokens.dark.bg })}[t]);}catch{document.documentElement.dataset.theme='light';}`,
          }}
        />
      </head>
      <body>
        <RootProviders>{children}</RootProviders>
        {process.env.MAKAN_TEST_MODE === 'fixture' && (
          <div className="fixture-indicator" aria-hidden="true">
            محیط آزمون محلی · دادهٔ ساختگی
          </div>
        )}
      </body>
    </html>
  );
}
