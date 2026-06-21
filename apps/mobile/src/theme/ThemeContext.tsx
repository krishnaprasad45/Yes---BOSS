import React, { createContext, useContext, useMemo, useState } from 'react';
import { MMKV } from 'react-native-mmkv';
import { dark, light, type Palette, type ThemeMode } from './palettes';

// Tiny dedicated store so the saved choice is read synchronously on first
// render — no theme flash on cold start.
const store = new MMKV({ id: 'yes-boss-ui' });
const KEY = 'theme-mode';

interface ThemeValue {
  mode: ThemeMode;
  colors: Palette;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => ((store.getString(KEY) as ThemeMode | undefined) ?? 'dark'),
  );

  const value = useMemo<ThemeValue>(() => {
    const setMode = (m: ThemeMode) => {
      store.set(KEY, m);
      setModeState(m);
    };
    return {
      mode,
      colors: mode === 'dark' ? dark : light,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
