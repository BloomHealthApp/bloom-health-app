import { DEFAULT_THEME, mix, THEMES } from '@/theme/themes';
import type { ThemeName } from '@/types/api';

export type Hex = `#${string}`;
export type Rgba = `rgba(${number}, ${number}, ${number}, ${number})`;

export interface WidgetPalette {
  /** the see-through panel, as a diagonal gradient over the wallpaper */
  glassFrom: Rgba;
  glassTo: Rgba;
  /** primary text */
  text: Hex;
  /** secondary text */
  muted: Hex;
  /** ring progress + flame */
  accent: Hex;
  /** ring track */
  track: Hex;
}

/** How solid the panel is. A widget can sit on any wallpaper, so it stays more solid than the app's panels to keep text readable. */
export const WIDGET_GLASS_ALPHA = { from: 0.88, to: 0.85 };

const rgba = (hex: string, alpha: number): Rgba => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;

/** Maps the user's active app theme and appearance (src/theme/themes.ts) to widget colours. */
export function widgetPalette(name: ThemeName, dark = false): WidgetPalette {
  const t = THEMES[name] ?? THEMES[DEFAULT_THEME];
  const c = dark ? t.darkColors : t.colors;
  return {
    glassFrom: rgba(c.surface, WIDGET_GLASS_ALPHA.from),
    glassTo: rgba(mix(c.surface, c.tint, 0.25), WIDGET_GLASS_ALPHA.to),
    text: c.text as Hex,
    muted: mix(c.textMuted, c.text, 0.6) as Hex,
    accent: c.accent as Hex,
    track: c.secondary as Hex,
  };
}

/** The shared glass panel style for a widget's root. */
export const widgetGlass = (p: WidgetPalette) => ({
  backgroundGradient: { from: p.glassFrom, to: p.glassTo, orientation: 'TL_BR' as const },
  borderRadius: 24,
});
