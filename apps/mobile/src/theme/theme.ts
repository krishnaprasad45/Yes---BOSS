/**
 * Design tokens derived from the Google Stitch design.
 * Light theme: lavender-gray canvas, white rounded cards, indigo accent.
 */
export const colors = {
  // Surfaces
  bg: '#F4F5FB', // app canvas
  card: '#FFFFFF',
  cardAlt: '#F7F8FC', // subtle inset (search bars, list rows)

  // Brand
  primary: '#5B5BF0', // indigo accent (buttons, active states)
  primaryDark: '#4B45D1',
  primarySoft: '#EDEEFE', // tinted indigo tile background

  // Text
  text: '#16172B',
  textMuted: '#8A8FA3',
  textFaint: '#AEB2C2',

  // Status
  success: '#16A34A',
  successSoft: '#E5F6EC',
  danger: '#E5484D',
  dangerSoft: '#FCEBEC',
  warning: '#F59E0B',
  warningSoft: '#FEF3E2',

  // Category / icon-tile tints
  tileIndigo: '#EDEEFE',
  tileGreen: '#E5F6EC',
  tileOrange: '#FEF1E3',
  tilePurple: '#F1ECFD',
  tileTeal: '#E2F7F4',

  iconIndigo: '#5B5BF0',
  iconGreen: '#16A34A',
  iconOrange: '#F97316',
  iconPurple: '#7C5CF0',
  iconTeal: '#0FB5AE',
  iconRed: '#E5484D',

  // Lines
  border: '#ECEEF4',
  divider: '#F0F1F6',
} as const;

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

/** Soft card shadow (iOS) + elevation (Android). */
export const shadow = {
  card: {
    shadowColor: '#1B1C3A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
