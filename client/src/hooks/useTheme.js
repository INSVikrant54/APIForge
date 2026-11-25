import { useEffect, useState } from 'react';

const STORAGE_KEY_THEME = 'apiforge_theme';

/** Applies and persists the user's light/dark theme choice. */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  return { theme, setTheme };
}
