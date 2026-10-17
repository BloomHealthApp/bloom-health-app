import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeName } from '@/types/api';
import { DEFAULT_THEME, THEMES, type Theme } from './themes';

const KEY = 'bubu.theme';

interface Ctx {
  theme: Theme;
  setThemeName: (n: ThemeName) => void;
}
const ThemeCtx = createContext<Ctx>({ theme: THEMES[DEFAULT_THEME], setThemeName: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v && v in THEMES) setName(v as ThemeName);
      })
      .catch(() => {});
  }, []);

  const setThemeName = useCallback((n: ThemeName) => {
    setName(n);
    AsyncStorage.setItem(KEY, n).catch(() => {});
  }, []);

  const value = useMemo(() => ({ theme: THEMES[name], setThemeName }), [name, setThemeName]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
