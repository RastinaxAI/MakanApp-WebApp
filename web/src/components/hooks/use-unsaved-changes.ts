'use client';
import * as uiText from '@/content/fa';
import { useEffect } from 'react';

/** Protect links, explicit navigation controls and unload; forms persist their own drafts. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const follow = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest('a[href]') : null;
      const navigation =
        target instanceof Element ? target.closest('button[data-navigation-target]') : null;
      if (
        ((link && !link.hasAttribute('download') && !link.getAttribute('href')?.startsWith('#')) ||
          navigation) &&
        !window.confirm(uiText.text_afe183ddd169)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', follow, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', follow, true);
    };
  }, [dirty]);
}
