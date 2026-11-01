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
  onDanger: string;
  /** background of error banners */
  dangerTint: string;
  /** the diagonal shine on glass surfaces: top-left, middle, bottom-right */
  edgeHighlight: string;
  edgeShade: string;
  edgeGlow: string;
  /** mascot cheek colour; when unset, it is the primary mixed with pink */
  blush?: string;
  /** 5-step heatmap ramp, index 0 = no data */
  heat: [string, string, string, string, string];
}

export interface Theme {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
  darkColors: ThemeColors;
}

export const GLASS_ALPHA = { light: 0.72, dark: 0.68 };
const glassColor = (surface: string, isDark: boolean) => surface + Math.round((isDark ? GLASS_ALPHA.dark : GLASS_ALPHA.light) * 255).toString(16).padStart(2, '0').toUpperCase();

/** How strongly the backdrop glows show, in `GlassBackdrop`. */
export const GLOW_OPACITY = { light: 0.22, dark: 0.3 };

/** A theme with the palette for the current appearance applied to `colors`. */
export interface ActiveTheme extends Theme {
  isDark: boolean;
  /** the surface colour made see-through, for panels over the backdrop glow */
  glass: string;
}

export const resolveTheme = (name: ThemeName, isDark: boolean): ActiveTheme => {
  const t = THEMES[name];
  const colors = isDark ? t.darkColors : t.colors;
  return { ...t, isDark, colors, glass: glassColor(colors.surface, isDark) };
};

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
    edgeHighlight: '#FFFFFF',
    edgeShade: '#F1D3E2',
    edgeGlow: mix('#F1D3E2', '#D65B98', 0.35),
    success: '#4E9F7D',
    warning: '#C98A2B',
    danger: '#C23B4E',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    heat: ramp('#F8D7E8', '#D65B98'),
  },
  darkColors: {
    bg: '#1C1118',
    surface: '#2A1A24',
    tint: '#43243A',
    primary: '#E56FAA',
    onPrimary: '#1C0A14',
    accent: '#F39AC6',
    secondary: '#4A2B3C',
    text: '#FBE9F2',
    textMuted: '#C9A9BA',
    border: '#4A2E3F',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#4A2E3F',
    edgeGlow: '#E56FAA',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    heat: ramp('#43243A', '#E56FAA'),
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
    edgeHighlight: '#FFFFFF',
    edgeShade: '#DDD4F5',
    edgeGlow: mix('#DDD4F5', '#B9A7E8', 0.35),
    success: '#4E9F7D',
    warning: '#B97A1E',
    danger: '#B7364A',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    heat: ramp('#E9E2FF', '#8D77CF'),
  },
  darkColors: {
    bg: '#15121F',
    surface: '#211C30',
    tint: '#30284A',
    primary: '#B9A7E8',
    onPrimary: '#1C1530',
    accent: '#CFC2F2',
    secondary: '#3A3158',
    text: '#EFEAFB',
    textMuted: '#B0A6CB',
    border: '#3A3256',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#3A3256',
    edgeGlow: '#B9A7E8',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    heat: ramp('#30284A', '#B9A7E8'),
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
    edgeHighlight: '#FFFFFF',
    edgeShade: '#CFE8DB',
    edgeGlow: mix('#CFE8DB', '#6E9D88', 0.35),
    success: '#3F8F6A',
    warning: '#C27B2D',
    danger: '#BF4A4A',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    heat: ramp('#DDF3E7', '#5E8F79'),
  },
  darkColors: {
    bg: '#0F1815',
    surface: '#1A2622',
    tint: '#24382F',
    primary: '#7FBFA3',
    onPrimary: '#0B1F17',
    accent: '#A3D6BF',
    secondary: '#2E3F38',
    text: '#E6F3ED',
    textMuted: '#A2B8AE',
    border: '#2F4239',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#2F4239',
    edgeGlow: '#7FBFA3',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    heat: ramp('#24382F', '#7FBFA3'),
  },
};

export const forestTrail: Theme = {
  name: 'forestTrail',
  label: 'Forest Trail',
  colors: {
    bg: '#EEF3EA',
    surface: '#FFFFFF',
    tint: '#BFD8C2',
    primary: '#1E5B3A',
    onPrimary: '#FFFFFF',
    accent: '#17482E',
    secondary: '#D9C49A',
    text: '#1F3329',
    textMuted: '#526257',
    border: '#AFC6B2',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#AFC6B2',
    edgeGlow: mix('#AFC6B2', '#1E5B3A', 0.35),
    success: '#2F855A',
    warning: '#B5701F',
    danger: '#B23A3A',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    blush: '#D9A77F',
    heat: ramp('#BFD8C2', '#1E5B3A'),
  },
  darkColors: {
    bg: '#0F1A14',
    surface: '#18261E',
    tint: '#22392C',
    primary: '#4FB07E',
    onPrimary: '#06190F',
    accent: '#7FD1A5',
    secondary: '#2C4136',
    text: '#E7F1EA',
    textMuted: '#A3B8AB',
    border: '#2F4538',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#2F4538',
    edgeGlow: '#4FB07E',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    blush: '#C9966E',
    heat: ramp('#22392C', '#4FB07E'),
  },
};

export const midnightNavy: Theme = {
  name: 'midnightNavy',
  label: 'Midnight Navy',
  colors: {
    bg: '#E9EEF6',
    surface: '#FFFFFF',
    tint: '#B8CBE4',
    primary: '#12305A',
    onPrimary: '#FFFFFF',
    accent: '#1D4F8C',
    secondary: '#A9BFD9',
    text: '#16263D',
    textMuted: '#4F5F75',
    border: '#B0C1D8',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#B0C1D8',
    edgeGlow: mix('#B0C1D8', '#12305A', 0.35),
    success: '#2F855A',
    warning: '#B7791F',
    danger: '#C53030',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    blush: '#D9A77F',
    heat: ramp('#B8CBE4', '#12305A'),
  },
  darkColors: {
    bg: '#0C1524',
    surface: '#15213A',
    tint: '#1E2F4D',
    primary: '#5B9BE6',
    onPrimary: '#06142A',
    accent: '#8FBDF2',
    secondary: '#26395A',
    text: '#E6EDF7',
    textMuted: '#A1B1C9',
    border: '#2B3D5C',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#2B3D5C',
    edgeGlow: '#5B9BE6',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    blush: '#C9966E',
    heat: ramp('#1E2F4D', '#5B9BE6'),
  },
};

export const sunsetEmber: Theme = {
  name: 'sunsetEmber',
  label: 'Sunset Ember',
  colors: {
    bg: '#FFF6EE',
    surface: '#FFFFFF',
    tint: '#FFD9BC',
    primary: '#B84A0E',
    onPrimary: '#FFFFFF',
    accent: '#9C3D0A',
    secondary: '#F2C9A0',
    text: '#3A2213',
    textMuted: '#75503A',
    border: '#EFC7A8',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#EFC7A8',
    edgeGlow: mix('#EFC7A8', '#B84A0E', 0.35),
    success: '#2F855A',
    warning: '#B5701F',
    danger: '#B23A3A',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    blush: '#E8A27A',
    heat: ramp('#FFD9BC', '#B84A0E'),
  },
  darkColors: {
    bg: '#1A120C',
    surface: '#281B12',
    tint: '#40291A',
    primary: '#F08A3C',
    onPrimary: '#241006',
    accent: '#F7B27A',
    secondary: '#4A3020',
    text: '#FBEDE2',
    textMuted: '#C9AE9B',
    border: '#4A3324',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#4A3324',
    edgeGlow: '#F08A3C',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    blush: '#C9966E',
    heat: ramp('#40291A', '#F08A3C'),
  },
};

export const graphiteGrey: Theme = {
  name: 'graphiteGrey',
  label: 'Graphite Grey',
  colors: {
    bg: '#F2F3F4',
    surface: '#FFFFFF',
    tint: '#D5D8DC',
    primary: '#4A4F57',
    onPrimary: '#FFFFFF',
    accent: '#3A3F46',
    secondary: '#BFC4CA',
    text: '#1F2328',
    textMuted: '#5A6068',
    border: '#C4C8CD',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#C4C8CD',
    edgeGlow: mix('#C4C8CD', '#4A4F57', 0.35),
    success: '#2F855A',
    warning: '#B5701F',
    danger: '#B23A3A',
    onDanger: '#FFFFFF',
    dangerTint: '#FDECEF',
    blush: '#C9B8AE',
    heat: ramp('#D5D8DC', '#4A4F57'),
  },
  darkColors: {
    bg: '#121315',
    surface: '#1E2023',
    tint: '#2E3135',
    primary: '#A8AEB6',
    onPrimary: '#15171A',
    accent: '#C8CDD3',
    secondary: '#383C41',
    text: '#ECEEF0',
    textMuted: '#A9AEB5',
    border: '#3A3E43',
    edgeHighlight: '#FFFFFF',
    edgeShade: '#3A3E43',
    edgeGlow: '#A8AEB6',
    success: '#5CC48C',
    warning: '#E0A94F',
    danger: '#F0716F',
    onDanger: '#2A0A0A',
    dangerTint: '#3A1A1E',
    blush: '#B09A8E',
    heat: ramp('#2E3135', '#A8AEB6'),
  },
};

export const THEMES: Record<ThemeName, Theme> = { forestTrail, midnightNavy, cottonCandy, lavenderDream, sunsetEmber, graphiteGrey, mintPeach };
/** The themes offered in the picker. Mint Peach is left out but stays in THEMES for accounts already using it. */
export const THEME_LIST: Theme[] = [forestTrail, midnightNavy, cottonCandy, lavenderDream, sunsetEmber, graphiteGrey];
export const DEFAULT_THEME: ThemeName = 'forestTrail';
