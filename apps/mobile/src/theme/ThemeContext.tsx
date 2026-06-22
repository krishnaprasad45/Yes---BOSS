import React, { createContext, useContext, useMemo, useState } from 'react';
import { dark, light, type Palette, type ThemeMode } from './palettes';

const KEY = 'theme-mode';

// In debug builds MMKV (TurboModule) is unavailable — use a plain object shim.
const store = __DEV__
  ? { getString: (_k: string) => undefined as string | undefined, set: (_k: string, _v: string) => {} }
  : (() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
      return new MMKV({ id: 'yes-boss-ui' });
    })();

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
