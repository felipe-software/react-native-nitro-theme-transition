/**
 * Four palettes rather than the usual two.
 *
 * A binary light/dark toggle hides a whole class of bugs: it is symmetric, so a
 * transition that only ever plays between two states can look right while being
 * wrong. Cycling through four asymmetric palettes — including two dark ones that
 * differ only slightly — makes a mis-timed reveal obvious, because you can see
 * the wrong intermediate colour.
 */

export type ThemeName = 'light' | 'sepia' | 'dark' | 'midnight';

export type Theme = {
  name: ThemeName;
  label: string;
  /** Drives the status bar, keyboard appearance and every native control's colour scheme. */
  isDark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  accent: string;
  success: string;
  danger: string;
  /** Tint handed to native chrome: tab bar, drawer, native headers, SwiftUI/Compose hosts. */
  tint: string;
};

export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    label: 'Light',
    isDark: false,
    background: '#F6F3EE',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEAE1',
    text: '#211D19',
    muted: '#756D62',
    border: '#E6E0D6',
    primary: '#211D19',
    onPrimary: '#F6F3EE',
    accent: '#B4541E',
    success: '#3E7C4F',
    danger: '#B23B34',
    tint: '#B4541E',
  },
  sepia: {
    name: 'sepia',
    label: 'Sepia',
    isDark: false,
    background: '#F2E7D5',
    surface: '#FBF3E4',
    surfaceAlt: '#E8DAC2',
    text: '#3A2E1E',
    muted: '#7C6A50',
    border: '#DCC9AA',
    primary: '#7A4A17',
    onPrimary: '#FBF3E4',
    accent: '#9A6B2F',
    success: '#4C7A3E',
    danger: '#A63D2B',
    tint: '#7A4A17',
  },
  dark: {
    name: 'dark',
    label: 'Dark',
    isDark: true,
    background: '#141210',
    surface: '#1E1B18',
    surfaceAlt: '#272320',
    text: '#F2EDE4',
    muted: '#A8A096',
    border: '#2E2A26',
    primary: '#EDE6DB',
    onPrimary: '#141210',
    accent: '#E9945C',
    success: '#6FBF7F',
    danger: '#E4756B',
    tint: '#E9945C',
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    isDark: true,
    background: '#080B14',
    surface: '#101728',
    surfaceAlt: '#17203A',
    text: '#E4ECFF',
    muted: '#8C9AC0',
    border: '#1E2942',
    primary: '#C9DAFF',
    onPrimary: '#080B14',
    accent: '#6C9CFF',
    success: '#5FD3A6',
    danger: '#FF7A85',
    tint: '#6C9CFF',
  },
};

/** Stable order — the cycle used by every "next theme" control in the app. */
export const THEME_ORDER: readonly ThemeName[] = ['light', 'sepia', 'dark', 'midnight'];

export function nextThemeName(current: ThemeName): ThemeName {
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}

/** The other end of the light/dark axis, for the plain two-state toggle. */
export function oppositeThemeName(current: ThemeName): ThemeName {
  return THEMES[current].isDark ? 'light' : 'dark';
}
