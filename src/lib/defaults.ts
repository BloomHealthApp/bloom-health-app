import type { Habit, Reminder, Settings } from '@/types/api';

export const DEFAULT_REMINDERS: Reminder[] = [
  { key: 'wakeUp', enabled: true, time: '05:00' },
  { key: 'hydration', enabled: true, time: '11:00' },
  { key: 'workout', enabled: true, time: '17:00' },
  { key: 'eveningCheckIn', enabled: true, time: '21:30' },
  { key: 'bedtime', enabled: true, time: '21:30' },
];

export const REMINDER_LABELS: Record<Reminder['key'], { title: string; body: string }> = {
  wakeUp: { title: 'Good morning', body: 'Rise and shine. Log your wake-up time.' },
  hydration: { title: 'Hydration check', body: 'A little water goes a long way.' },
  workout: { title: 'Workout time', body: 'Ready to move? Start a session.' },
  eveningCheckIn: { title: 'Evening check-in', body: 'Take a minute to review your day.' },
  bedtime: { title: 'Wind down', body: 'Time to start winding down for sleep.' },
};

type DefaultHabit = Pick<
  Habit,
  'id' | 'title' | 'icon' | 'category' | 'trackingType' | 'target' | 'targetMax' | 'targetComparison' | 'unit'
>;

/** Mirrors the service's seeded habits (ids are stable slugs). Used by mock mode only. */
export const DEFAULT_HABIT_DEFS: DefaultHabit[] = [
  { id: 'default-wakeup', title: 'Wake up by 5:00 AM', icon: 'sunrise', category: 'morning', trackingType: 'timeOfDay', target: 300, targetMax: null, targetComparison: 'by', unit: null },
  { id: 'default-exercise', title: 'Exercise 90-120 min', icon: 'dumbbell', category: 'fitness', trackingType: 'duration', target: 90, targetMax: 120, targetComparison: 'between', unit: 'min' },
  { id: 'default-no-sugar', title: 'No added sugar', icon: 'candy-off', category: 'nutrition', trackingType: 'boolean', target: 1, targetMax: null, targetComparison: 'atLeast', unit: null },
  { id: 'default-no-junk', title: 'No junk food', icon: 'salad', category: 'nutrition', trackingType: 'boolean', target: 1, targetMax: null, targetComparison: 'atLeast', unit: null },
  { id: 'default-dinner', title: 'Dinner by 6:00 PM', icon: 'utensils', category: 'nutrition', trackingType: 'timeOfDay', target: 1080, targetMax: null, targetComparison: 'by', unit: null },
  { id: 'default-water', title: 'Water 2000 ml', icon: 'droplet', category: 'hydration', trackingType: 'quantity', target: 2000, targetMax: null, targetComparison: 'atLeast', unit: 'ml' },
  { id: 'default-steps', title: 'Steps 7,000-10,000', icon: 'footprints', category: 'fitness', trackingType: 'quantity', target: 7000, targetMax: 10000, targetComparison: 'atLeast', unit: 'steps' },
  { id: 'default-bedtime', title: 'Bedtime by 10:00 PM', icon: 'moon', category: 'sleep', trackingType: 'timeOfDay', target: 1320, targetMax: null, targetComparison: 'by', unit: null },
];

export const HABIT_IDS = {
  water: 'default-water',
  steps: 'default-steps',
  exercise: 'default-exercise',
} as const;

export function defaultSettings(now = new Date().toISOString()): Settings {
  return {
    id: 'settings',
    dailyThreshold: 80,
    restDays: [],
    restDayMode: 'neutral',
    sundayRest: true,
    reminders: DEFAULT_REMINDERS,
    version: 1,
    updatedAt: now,
  };
}
