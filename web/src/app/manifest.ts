import * as uiText from '@/content/fa';
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: uiText.text_3ddc4fb260f2,
    short_name: uiText.brand_name,
    description: uiText.text_e45237af4393,
    lang: 'fa',
    dir: 'rtl',
    start_url: '/personal',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f8fd',
    theme_color: '#156fee',
    icons: [
      {
        src: '/icons/makan-192.png?v=blue-v2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/makan-512.png?v=blue-v2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/makan-maskable-512.png?v=blue-v2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: uiText.navigation_education, url: '/personal/education' },
      { name: uiText.navigation_messages, url: '/personal/messages' },
    ],
  };
}
