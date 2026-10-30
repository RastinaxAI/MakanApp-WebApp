import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ماکان | ارتباط و یادگیری',
    short_name: 'ماکان',
    description: 'فضای شخصی، آموزشگاه و پیام‌رسان ماکان',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/personal',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f9fc',
    theme_color: '#1169b8',
    icons: [
      { src: '/icons/makan-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/makan-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/makan-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'آموزشگاه', url: '/personal/education' },
      { name: 'پیام‌ها', url: '/personal/messages' },
    ],
  };
}
