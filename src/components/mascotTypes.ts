export const MASCOT_MOODS = ['happy', 'sleepy', 'cheer', 'sad', 'eating', 'loved', 'celebrating', 'hydrate', 'workout', 'thinking'] as const;

export type MascotMood = (typeof MASCOT_MOODS)[number];
