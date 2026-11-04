'use client';
import { useEffect, useRef, useState } from 'react';
/** Per-account/context UI memory; a failed store never blocks the visible interaction. */
export function useViewState<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  const [value, setValue] = useState(initial),
    [loadedKey, setLoadedKey] = useState('');
  const validator = useRef(validate);
  validator.current = validate;
  const initialValue = useRef(initial);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      setValue(validator.current(saved) ? saved : initialValue.current);
    } catch {
      setValue(initialValue.current);
    }
    setLoadedKey(key);
  }, [key]);
  useEffect(() => {
    if (loadedKey !== key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, loadedKey, value]);
  return [value, setValue, loadedKey === key] as const;
}
