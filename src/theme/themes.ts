import type { ThemeName } from '@/types/api';

export interface ThemeColors {
  bg: string;
  surface: string;
  /** pastel tint used for chips, ring tracks, empty heat cells */
  tint: string;
  primary: string;
  onPrimary: string;
  /** darker readable variant of the brand color for text/icons on light surfaces */
  accent: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  /** 5-step heatmap ramp, index 0 = no data */
  heat: [string, string, string, string, string];
}

export interface Theme {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
}
const ramp = (tint: string, strong: string): ThemeColors['heat'] => [
  tint,
  mix(tint, strong, 0.35),
  mix(tint, strong, 0.6),
  mix(tint, strong, 0.85),
  strong,
];

// Spec palettes: Cotton Candy #F8D7E8 / #D65B98 / #FFF9F5, Lavender Dream #E9E2FF / #B9A7E8 / #51436B,
// Mint Peach #DDF3E7 / #FFE3D6 / #6E9D88. Remaining roles (text, border, status) are derived for contrast.
export const cottonCandy: Theme = {
  name: 'cottonCandy',
  label: 'Cotton Candy',
  colors: {
    bg: '#FFF9F5',
    surface: '#FFFFFF',
    tint: '#F8D7E8',
    primary: '#D65B98',
    onPrimary: '#FFFFFF',
    accent: '#C0407F',
    secondary: '#FFE3D6',
    text: '#4A2B3C',
    textMuted: '#7D5C6D',
    border: '#F1D3E2',
    success: '#4E9F7D',
    warning: '#C98A2B',
    danger: '#C23B4E',
    heat: ramp('#F8D7E8', '#D65B98'),
  },
};

export const lavenderDream: Theme = {
  name: 'lavenderDream',
  label: 'Lavender Dream',
  colors: {
    bg: '#F8F6FF',
    surface: '#FFFFFF',
    tint: '#E9E2FF',
    primary: '#B9A7E8',
    onPrimary: '#51436B',
    accent: '#6B58A6',
    secondary: '#D9CFF7',
    text: '#51436B',
    textMuted: '#6F6389',
    border: '#DDD4F5',
    success: '#4E9F7D',
    warning: '#B97A1E',
    danger: '#B7364A',
    heat: ramp('#E9E2FF', '#8D77CF'),
  },
};

export const mintPeach: Theme = {
  name: 'mintPeach',
  label: 'Mint Peach',
  colors: {
    bg: '#F7FCF9',
    surface: '#FFFFFF',
    tint: '#DDF3E7',
    primary: '#6E9D88',
    onPrimary: '#0F2A20',
    accent: '#3F7A62',
    secondary: '#FFE3D6',
    text: '#27453A',
    textMuted: '#587568',
    border: '#CFE8DB',
    success: '#3F8F6A',
    warning: '#C27B2D',
    danger: '#BF4A4A',
    heat: ramp('#DDF3E7', '#5E8F79'),
  },
};

export const THEMES: Record<ThemeName, Theme> = { cottonCandy, lavenderDream, mintPeach };
export const THEME_LIST: Theme[] = [cottonCandy, lavenderDream, mintPeach];
export const DEFAULT_THEME: ThemeName = 'cottonCandy';
