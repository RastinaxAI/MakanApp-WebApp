'use client';
import { useEffect } from 'react';

/** Protect in-page links and browser unload; storage persistence belongs to the form. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const follow = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest('a[href]') : null;
      if (
        link &&
        !link.hasAttribute('download') &&
        !link.getAttribute('href')?.startsWith('#') &&
        !window.confirm('تغییرات ذخیره نشده‌اند. از این صفحه خارج می‌شوید؟')
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
