// The service seeds the default habits with icon slugs (e.g. "sunrise"), while custom habits use emoji.
// Always render through habitGlyph() so a slug never shows up as clipped text.
const SLUG_GLYPHS: Record<string, string> = {
  sunrise: '🌅',
  dumbbell: '🏋️',
  'candy-off': '🍭',
  salad: '🥗',
  utensils: '🍽️',
  droplet: '💧',
  footprints: '👣',
  moon: '🌙',
  sparkles: '✨',
};

const FALLBACK = '🌸';
const SLUG_RE = /^[a-z][a-z0-9-]*$/i;

export function habitGlyph(icon: string | null | undefined): string {
  const v = (icon ?? '').trim();
  if (!v) return FALLBACK;
  if (SLUG_RE.test(v)) return SLUG_GLYPHS[v.toLowerCase()] ?? FALLBACK;
  return v;
}
