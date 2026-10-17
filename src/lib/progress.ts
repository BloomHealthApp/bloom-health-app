// Pure derivation of today's score + streaks from cached entities. Shared by the Home screen hook
// (features/derived.ts) and the home-screen widget snapshot so scoring rules live in one place (scoring.ts).
import { addDays } from './dates';
import { computeStreaks, scoreDay, scoreRange, type DayContext, type DayScore, type HabitRule, type LogLike, type RestDayMode } from './scoring';

export interface ProgressInput<H extends HabitRule & { isActive?: boolean }, L extends LogLike> {
  habits: H[];
  logs: L[];
  settings: { dailyThreshold: number; restDays: number[]; restDayMode?: RestDayMode };
  today: string;
  timezone: string;
}

export interface Progress<H, L> {
  activeHabits: H[];
  liveLogs: L[];
  ctx: DayContext;
  days: DayScore[];
  dayScores: Map<string, DayScore>;
  todayScore: DayScore;
  currentStreak: number;
  longestStreak: number;
}

/** Window starts at the earliest log (or 60 days back) and ends today, exactly as the Home screen computes it. */
export function computeProgress<H extends HabitRule & { isActive?: boolean }, L extends LogLike>(input: ProgressInput<H, L>): Progress<H, L> {
  const { habits, logs, settings, today, timezone } = input;
  const activeHabits = habits.filter((h) => h.isActive !== false);
  const liveLogs = logs.filter((l) => !l.deletedAt);
  const ctx: DayContext = {
    habits: activeHabits,
    logs: liveLogs,
    threshold: settings.dailyThreshold,
    restDays: settings.restDays,
    restDayMode: settings.restDayMode,
    timezone,
  };
  const earliest = liveLogs.reduce((m, l) => (l.localDate < m ? l.localDate : m), addDays(today, -60));
  const days = scoreRange(earliest, today, ctx);
  const dayScores = new Map(days.map((d) => [d.localDate, d]));
  const { current, longest } = computeStreaks(days, today);
  return {
    activeHabits,
    liveLogs,
    ctx,
    days,
    dayScores,
    todayScore: dayScores.get(today) ?? scoreDay(today, ctx),
    currentStreak: current,
    longestStreak: longest,
  };
}
