import { THEMES } from '@/theme/themes';
import type { ThemeName } from '@/types/api';

export type Hex = `#${string}`;

export interface WidgetPalette {
  /** widget background (the theme's pastel tint) */
  background: Hex;
  /** inner rounded panel behind the stats */
  card: Hex;
  /** primary text */
  text: Hex;
  /** secondary text */
  muted: Hex;
  /** ring progress + flame */
  accent: Hex;
  /** ring track */
  track: Hex;
}

/** Maps the user's active app theme (src/theme/themes.ts) to widget colours. */
export function widgetPalette(name: ThemeName): WidgetPalette {
  const c = (THEMES[name] ?? THEMES.cottonCandy).colors;
  return {
    background: c.tint as Hex,
    card: c.bg as Hex,
    text: c.text as Hex,
    muted: c.textMuted as Hex,
    accent: c.accent as Hex,
    track: c.secondary as Hex,
  };
}
