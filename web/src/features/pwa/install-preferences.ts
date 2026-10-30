import { isFocusedPage } from '@/config/navigation';
export const installDismissalKey = 'makan:pwa-install-dismissed:v1';
export const installPromotionAllowed = (path: string) =>
  path.startsWith('/personal') && path !== '/personal/workspaces' && !isFocusedPage(path);
