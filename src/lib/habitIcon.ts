import { isIconName, type IconName } from '@/icons/iconArt';

// Habits store an icon name (e.g. "sunrise"). Older custom habits may hold an emoji, which is kept as saved.
export const FALLBACK_ICON: IconName = 'sparkles';

const EMOJI_ICONS: Record<string, IconName> = {
  '🌅': 'sunrise',
  '🏋️': 'dumbbell',
  '🍬': 'candy-off',
  '🍭': 'candy-off',
  '🥗': 'salad',
  '🍟': 'salad',
  '🍽️': 'utensils',
  '💧': 'droplet',
  '👟': 'footprints',
  '👣': 'footprints',
  '🌙': 'moon',
  '✨': 'sparkles',
};

export const ICON_LABELS: Record<IconName, string> = {
  home: 'Home', chart: 'Chart', calendar: 'Calendar', gear: 'Gear', sunrise: 'Sunrise', dumbbell: 'Dumbbell', 'candy-off': 'No candy', salad: 'Salad', utensils: 'Meal', droplet: 'Water', footprints: 'Shoe', moon: 'Moon', sparkles: 'Sparkles', bell: 'Notification bell', 'bell-off': 'Notifications off', volume: 'Loud alarm', 'alarm-clock': 'Alarm clock', notification: 'Notification', check: 'Enabled', close: 'Disabled', flame: 'Flame', lock: 'Lock', eyes: 'Eyes', run: 'Running', walk: 'Walking', yoga: 'Yoga', badminton: 'Badminton', book: 'Book', heart: 'Heart', apple: 'Apple', coffee: 'Coffee', bed: 'Bed', pencil: 'Pencil', bike: 'Bike', leaf: 'Leaf', sun: 'Sun', pill: 'Medicine', music: 'Music', smile: 'Smile',
};

export const HABIT_ICON_CHOICES: readonly IconName[] = ['sparkles', 'sunrise', 'moon', 'sun', 'bed', 'dumbbell', 'run', 'walk', 'footprints', 'yoga', 'badminton', 'bike', 'droplet', 'salad', 'apple', 'utensils', 'candy-off', 'coffee', 'pill', 'book', 'pencil', 'music', 'leaf', 'heart', 'smile', 'flame', 'calendar', 'chart'];

const SLUG_RE = /^[a-z][a-z0-9-]*$/i;

export type ResolvedHabitIcon = { kind: 'icon'; name: IconName } | { kind: 'emoji'; emoji: string };

export function resolveHabitIcon(icon: string | null | undefined): ResolvedHabitIcon {
  const v = (icon ?? '').trim();
  if (!v) return { kind: 'icon', name: FALLBACK_ICON };
  if (SLUG_RE.test(v)) {
    const slug = v.toLowerCase();
    return { kind: 'icon', name: isIconName(slug) ? slug : FALLBACK_ICON };
  }
  const mapped = EMOJI_ICONS[v];
  return mapped ? { kind: 'icon', name: mapped } : { kind: 'emoji', emoji: v };
}
