import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import type { ThemeName } from '@/types/api';
import { DEFAULT_THEME, resolveTheme, THEMES, type ActiveTheme } from './themes';

const KEY = 'bubu.theme';
const APPEARANCE_KEY = 'bubu.appearance';

export type AppearanceMode = 'system' | 'light' | 'dark';
const isMode = (v: string | null): v is AppearanceMode => v === 'system' || v === 'light' || v === 'dark';

interface Ctx {
  theme: ActiveTheme;
  setThemeName: (n: ThemeName) => void;
  appearance: AppearanceMode;
  setAppearance: (m: AppearanceMode) => void;
}
const ThemeCtx = createContext<Ctx>({ theme: resolveTheme(DEFAULT_THEME, false), setThemeName: () => {}, appearance: 'system', setAppearance: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);
  const [appearance, setMode] = useState<AppearanceMode>('system');
  const scheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v && v in THEMES) setName(v as ThemeName);
      })
      .catch(() => {});
    AsyncStorage.getItem(APPEARANCE_KEY)
      .then((v) => {
        if (isMode(v)) setMode(v);
      })
      .catch(() => {});
  }, []);

  // Keeps native UI (alerts, pickers, keyboard) on the same appearance as the app.
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  const setThemeName = useCallback((n: ThemeName) => {
    setName(n);
    AsyncStorage.setItem(KEY, n).catch(() => {});
  }, []);

  const setAppearance = useCallback((m: AppearanceMode) => {
    setMode(m);
    AsyncStorage.setItem(APPEARANCE_KEY, m).catch(() => {});
  }, []);

  const isDark = appearance === 'dark' || (appearance === 'system' && scheme === 'dark');
  const value = useMemo(() => ({ theme: resolveTheme(name, isDark), setThemeName, appearance, setAppearance }), [name, isDark, setThemeName, appearance, setAppearance]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
