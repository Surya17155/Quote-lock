import { useCallback, useEffect, useState } from 'react';
import type { ResolvedTheme, ThemeMode } from './types';

const STORAGE_KEY = 'quotelock-theme';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next: ResolvedTheme = mode === 'system' ? (query.matches ? 'dark' : 'light') : mode;
      setResolved(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.documentElement.style.colorScheme = next;
      localStorage.setItem(STORAGE_KEY, mode);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => {
      if (current === 'system') return resolved === 'dark' ? 'light' : 'dark';
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [resolved]);

  return { mode, setMode, resolved, toggle };
}
