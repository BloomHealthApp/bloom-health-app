import { ICON_NAMES } from '@/icons/iconArt';
import { HABIT_ICON_CHOICES, ICON_LABELS, resolveHabitIcon } from '../habitIcon';

const icon = (name: string) => ({ kind: 'icon', name });

describe('resolveHabitIcon', () => {
  it('maps the names the service seeds to icons, ignoring case', () => {
    for (const slug of ['sunrise', 'dumbbell', 'candy-off', 'salad', 'utensils', 'droplet', 'footprints', 'moon', 'sparkles']) expect(resolveHabitIcon(slug)).toEqual(icon(slug));
    expect(resolveHabitIcon('Droplet')).toEqual(icon('droplet'));
  });
  it('falls back for an unknown name or nothing', () => {
    for (const v of ['some-new-slug', '', '   ', null, undefined]) expect(resolveHabitIcon(v)).toEqual(icon('sparkles'));
  });
  it('moves the old default emoji to their icons', () => {
    expect(resolveHabitIcon('🌅')).toEqual(icon('sunrise'));
    expect(resolveHabitIcon(' 💧 ')).toEqual(icon('droplet'));
  });
  it('keeps any other saved emoji as it is', () => {
    expect(resolveHabitIcon('🧘')).toEqual({ kind: 'emoji', emoji: '🧘' });
  });
});

describe('icon catalog', () => {
  it('labels every icon and only offers real ones', () => {
    for (const n of ICON_NAMES) expect(ICON_LABELS[n]).toBeTruthy();
    for (const n of HABIT_ICON_CHOICES) expect(ICON_NAMES).toContain(n);
    expect(new Set(HABIT_ICON_CHOICES).size).toBe(HABIT_ICON_CHOICES.length);
  });
});
