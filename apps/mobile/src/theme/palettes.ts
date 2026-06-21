/**
 * Two full color palettes (same keys) for the runtime light/dark switch.
 * `dark` is the default. Screens read the active palette via `useTheme()`.
 */
export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  text: string;
  textMuted: string;
  textFaint: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  tileIndigo: string;
  tileGreen: string;
  tileOrange: string;
  tilePurple: string;
  tileTeal: string;
  iconIndigo: string;
  iconGreen: string;
  iconOrange: string;
  iconPurple: string;
  iconTeal: string;
  iconRed: string;
  border: string;
  divider: string;
}

export const dark: Palette = {
  bg: '#051424',
  card: '#0C1B2C',
  cardAlt: '#142536',
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  primarySoft: 'rgba(45,212,191,0.14)',
  onPrimary: '#04201A',
  text: '#E5EDF7',
  textMuted: '#8A97AD',
  textFaint: '#5C6B82',
  success: '#4EDEA3',
  successSoft: 'rgba(78,222,163,0.14)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.14)',
  warning: '#FBBF77',
  warningSoft: 'rgba(251,191,119,0.14)',
  tileIndigo: 'rgba(124,140,255,0.16)',
  tileGreen: 'rgba(78,222,163,0.16)',
  tileOrange: 'rgba(251,146,60,0.16)',
  tilePurple: 'rgba(168,130,255,0.16)',
  tileTeal: 'rgba(45,212,191,0.16)',
  iconIndigo: '#9DB2FF',
  iconGreen: '#4EDEA3',
  iconOrange: '#FBA94C',
  iconPurple: '#B79DFF',
  iconTeal: '#2DD4BF',
  iconRed: '#FF6B6B',
  border: '#1E2F44',
  divider: '#16263A',
};

export const light: Palette = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  cardAlt: '#EEF1F8',
  primary: '#14B8A6',
  primaryDark: '#0D9488',
  primarySoft: 'rgba(20,184,166,0.12)',
  onPrimary: '#FFFFFF',
  text: '#101828',
  textMuted: '#667085',
  textFaint: '#98A2B3',
  success: '#15A34A',
  successSoft: 'rgba(21,163,74,0.12)',
  danger: '#E5484D',
  dangerSoft: 'rgba(229,72,77,0.10)',
  warning: '#D97706',
  warningSoft: 'rgba(217,119,6,0.12)',
  tileIndigo: 'rgba(79,70,229,0.10)',
  tileGreen: 'rgba(21,163,74,0.10)',
  tileOrange: 'rgba(234,88,12,0.10)',
  tilePurple: 'rgba(124,58,237,0.10)',
  tileTeal: 'rgba(20,184,166,0.10)',
  iconIndigo: '#4F46E5',
  iconGreen: '#15A34A',
  iconOrange: '#EA580C',
  iconPurple: '#7C3AED',
  iconTeal: '#0D9488',
  iconRed: '#E5484D',
  border: '#E6E9F0',
  divider: '#EEF0F6',
};

export type ThemeMode = 'dark' | 'light';
