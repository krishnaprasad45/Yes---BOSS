/**
 * Design tokens derived from the Google Stitch design.
 *
 * Colors now live in `palettes.ts` (light + dark) and are served at runtime via
 * `useTheme()` in `ThemeContext`. This static `colors` export = the dark palette
 * and is kept only as a fallback for non-component code; UI should read
 * `useTheme().colors` so it follows the active theme.
 */
export { dark as colors } from './palettes';
export type { Palette } from './palettes';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/** Card definition on dark comes from a hairline border + a soft ambient shadow. */
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
