'use client';
import * as uiText from '@/content/fa';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import tokens from '../../../design/tokens.json';
export type PersonalTheme = 'light' | 'dark' | 'system';
export function readThemePreference(raw: string | null): PersonalTheme {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}
function applyTheme(value: PersonalTheme) {
  const resolved =
    value === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : value;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens[resolved].bg);
}
type ThemeValue = {
  theme: PersonalTheme;
  changeTheme: (value: PersonalTheme) => void;
  error: string;
};
const ThemeContext = createContext<ThemeValue | null>(null);
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<PersonalTheme>('system'),
    [error, setError] = useState('');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let value: PersonalTheme = 'system';
      try {
        value = readThemePreference(localStorage.getItem('makan-theme'));
      } catch {}
      applyTheme(value);
      setTheme(value);
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('makan-theme-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('makan-theme-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  function changeTheme(value: PersonalTheme) {
    setError('');
    applyTheme(value);
    setTheme(value);
    try {
      localStorage.setItem('makan-theme', value);
      window.dispatchEvent(new Event('makan-theme-changed'));
    } catch {
      setError(uiText.text_d1a91d934e1c);
    }
  }
  return (
    <ThemeContext.Provider value={{ theme, changeTheme, error }}>{children}</ThemeContext.Provider>
  );
}
export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemePreferenceProvider required');
  return value;
}
