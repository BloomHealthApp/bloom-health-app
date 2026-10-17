// Pure derivation of today's score + streaks from cached entities. Shared by the Home screen hook
// (features/derived.ts) and the home-screen widget snapshot so scoring rules live in one place (scoring.ts).
//
// Owner: everything is computed locally from synced logs (+ the owner's own period days as `neutralDates`).
// Viewer: never receives period data, so streaks and per-day success/rest flags come from the server's
// GET /stats/summary (`serverSummary`, cached for offline); the local scoring only fills in the habit counts.
import { addDays } from './dates';
import { computeStreaks, effectiveRestDays, scoreDay, scoreRange, type DayContext, type DayScore, type HabitRule, type LogLike, type RestDayMode } from './scoring';

/** The parts of GET /stats/summary used for progress (generic `restDay`, never a reason). */
export interface ServerSummary {
  currentStreak: number;
  longestStreak: number;
  days: { localDate: string; completionPercent: number; successful: boolean; restDay: boolean }[];
}

export interface ProgressInput<H extends HabitRule & { isActive?: boolean }, L extends LogLike> {
  habits: H[];
  logs: L[];
  settings: { dailyThreshold: number; restDays: number[]; restDayMode?: RestDayMode; sundayRest?: boolean };
  today: string;
  timezone: string;
  /** owner only: period days (and any other private neutral dates) expanded by periodNeutralDates */
  neutralDates?: string[];
  /** viewer only: when given, streaks and day flags come from here instead of local scoring */
  serverSummary?: ServerSummary | null;
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

/** Overlays the server's per-day flags onto locally scored days (habit counts stay local). */
export function applyServerSummary(local: DayScore[], summary: ServerSummary): DayScore[] {
  const byDate = new Map(summary.days.map((d) => [d.localDate, d]));
  return local.map((d) => {
    const s = byDate.get(d.localDate);
    if (!s) return d;
    return {
      ...d,
      completionPercent: s.completionPercent,
      successful: s.successful,
      restDay: s.restDay,
      neutral: s.restDay ? !s.successful : d.eligible === 0,
    };
  });
}

/** Window starts at the earliest log (or 60 days back) and ends today, exactly as the Home screen computes it. */
export function computeProgress<H extends HabitRule & { isActive?: boolean }, L extends LogLike>(input: ProgressInput<H, L>): Progress<H, L> {
  const { habits, logs, settings, today, timezone, serverSummary } = input;
  const activeHabits = habits.filter((h) => h.isActive !== false);
  const liveLogs = logs.filter((l) => !l.deletedAt);
  const ctx: DayContext = {
    habits: activeHabits,
    logs: liveLogs,
    threshold: settings.dailyThreshold,
    restDays: effectiveRestDays(settings),
    restDayMode: settings.restDayMode,
    neutralDates: input.neutralDates,
    timezone,
  };
  const earliest = liveLogs.reduce((m, l) => (l.localDate < m ? l.localDate : m), addDays(today, -60));
  let days = scoreRange(earliest, today, ctx);
  let streaks = computeStreaks(days, today);
  if (serverSummary) {
    days = applyServerSummary(days, serverSummary);
    streaks = { current: serverSummary.currentStreak, longest: serverSummary.longestStreak };
  }
  const dayScores = new Map(days.map((d) => [d.localDate, d]));
  return {
    activeHabits,
    liveLogs,
    ctx,
    days,
    dayScores,
    todayScore: dayScores.get(today) ?? scoreDay(today, ctx),
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
  };
}
