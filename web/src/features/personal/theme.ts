'use client';
import { useEffect, useState } from 'react';
import tokens from '../../../design/tokens.json';
export type PersonalTheme = 'light' | 'dark';
function applyTheme(value: PersonalTheme) {
  document.documentElement.dataset.theme = value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens[value].bg);
}
export function useThemePreference() {
  const [theme, setTheme] = useState<PersonalTheme>('light');
  const [error, setError] = useState('');
  useEffect(() => {
    const sync = () => {
      let value: PersonalTheme = 'light';
      try {
        value = localStorage.getItem('makan-theme') === 'dark' ? 'dark' : 'light';
      } catch {}
      applyTheme(value);
      setTheme(value);
    };
    sync();
    window.addEventListener('makan-theme-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
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
      setError('ظاهر برای این صفحه تغییر کرد؛ ذخیرهٔ انتخاب در این مرورگر در دسترس نیست.');
    }
  }
  return { theme, changeTheme, error };
}
