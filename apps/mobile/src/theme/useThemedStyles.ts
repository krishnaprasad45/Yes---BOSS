import { useMemo } from 'react';
import { useTheme } from './ThemeContext';
import type { Palette } from './palettes';

/**
 * Builds a per-theme StyleSheet and memoises it until the palette changes.
 * Pair with a `makeStyles = (colors: Palette) => StyleSheet.create({...})`
 * factory so styles follow the active light/dark theme.
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
