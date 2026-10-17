import type { MascotMood } from '@/components/mascotTypes';

const GENTLE = [
  'Small steps bloom into big habits.',
  'Be kind to yourself today.',
  'Progress, not perfection.',
  'Every glass of water counts.',
  'Rest is part of the routine too.',
];

export function dailyMessage(localDate: string, percent: number, streak: number): { text: string; mood: MascotMood } {
  const seed = localDate.split('-').reduce((a, b) => a + Number(b), 0);
  if (streak >= 3 && percent >= 80) return { text: `${streak} days in a row. Bubu is cheering for you!`, mood: 'cheer' };
  if (percent >= 100) return { text: 'All done for today. Lovely work!', mood: 'cheer' };
  if (percent >= 50) return { text: 'Over halfway there. Keep blooming!', mood: 'happy' };
  if (percent === 0 && streak === 0) return { text: GENTLE[seed % GENTLE.length], mood: 'sleepy' };
  return { text: GENTLE[seed % GENTLE.length], mood: 'happy' };
}

export const DISCLAIMER = 'Bubu Bloom is a personal habit tracker, not medical advice.';
