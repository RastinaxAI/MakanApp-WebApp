'use client';
import { createContext, useContext, useEffect, type ReactNode, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
const ScrollScope = createContext('public');
export function ScrollMemoryProvider({
  namespace,
  children,
}: {
  namespace: string;
  children: ReactNode;
}) {
  return <ScrollScope.Provider value={namespace}>{children}</ScrollScope.Provider>;
}
export function useScrollMemory(ref: RefObject<HTMLElement | null>, slot: string) {
  const scope = useContext(ScrollScope),
    pathname = usePathname();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const key = `makan:draft:scroll:${scope}:${pathname}:${slot}`;
    let top = 0;
    try {
      top = Number(sessionStorage.getItem(key) ?? 0);
    } catch {}
    if (!Number.isFinite(top) || top < 0) top = 0;
    let lastTop = top;
    const record = () => {
      lastTop = element.scrollTop;
    };
    element.addEventListener('scroll', record, { passive: true });
    let observer: MutationObserver | undefined;
    const restore = () => {
      element.scrollTop = top;
      if (element.scrollTop >= top - 1) observer?.disconnect();
    };
    const frame = requestAnimationFrame(restore);
    if (top > 0) {
      observer = new MutationObserver(restore);
      observer.observe(element, { childList: true, subtree: true });
    }
    const timer = setTimeout(() => observer?.disconnect(), 5000);
    const stop = () => observer?.disconnect();
    element.addEventListener('wheel', stop, { passive: true });
    element.addEventListener('touchstart', stop, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer?.disconnect();
      element.removeEventListener('wheel', stop);
      element.removeEventListener('touchstart', stop);
      element.removeEventListener('scroll', record);
      try {
        sessionStorage.setItem(key, String(lastTop));
      } catch {}
    };
  }, [scope, pathname, slot, ref]);
}
