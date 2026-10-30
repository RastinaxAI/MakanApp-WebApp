'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { defaultBackTarget } from '@/config/navigation';
type Destination = { path: string; href: string };
type Registry = {
  destinations: Map<string, Destination>;
  register: (id: string, path: string, href: string) => () => void;
};
const Context = createContext<Registry | null>(null);
export function PageBackProvider({ children }: { children: ReactNode }) {
  const [destinations, setDestinations] = useState(() => new Map<string, Destination>());
  const register = useCallback((id: string, path: string, href: string) => {
    setDestinations((previous) => new Map(previous).set(id, { path, href }));
    return () =>
      setDestinations((previous) => {
        const next = new Map(previous);
        next.delete(id);
        return next;
      });
  }, []);
  const value = useMemo(() => ({ destinations, register }), [destinations, register]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
/** Declare the contextual destination without adding another back control to the page. */
export function PageBack({ href }: { href: string }) {
  const path = usePathname(),
    id = useId(),
    register = useContext(Context)?.register;
  useEffect(() => register?.(id, path, href), [id, path, href, register]);
  return null;
}
export function usePageBackTarget() {
  const path = usePathname(),
    registry = useContext(Context);
  const match =
    registry && [...registry.destinations.values()].reverse().find((item) => item.path === path);
  return match?.href ?? defaultBackTarget(path);
}
