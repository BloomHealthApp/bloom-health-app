// Pure scoring + streak library. No React / RN imports so it runs under plain Jest and
// can be diffed against the service's fixtures (src/lib/__fixtures__/scoring.json).
import { addDays, dateRange, localDateInTz, weekdayOf } from './dates';

export type TrackingType = 'boolean' | 'quantity' | 'duration' | 'timeOfDay';
export type Comparison = 'atLeast' | 'atMost' | 'between' | 'by';
export type LogStatus = 'complete' | 'incomplete' | 'skipped' | 'partial';
export type RestDayMode = 'neutral' | 'counts';

export const MILESTONES = [3, 7, 14, 30, 100] as const;
export const DEFAULT_THRESHOLD = 80;

export interface HabitRule {
  id: string;
  trackingType: TrackingType;
  target: number;
  targetMax?: number | null;
  targetComparison: Comparison;
  schedule?: { days: number[] } | null; // empty/missing = every day. 0=Sun..6=Sat
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt?: string | null;
}

export interface LogLike {
  habitId: string;
  localDate: string;
  value: number | null;
  status?: LogStatus | null;
  deletedAt?: string | null;
}

/**
 * Status for a single value against a habit's target.
 *  - boolean: value 1 => complete.
 *  - quantity / duration: atLeast & between => complete at >= target (the upper bound of `between`
 *    is a recommendation, exceeding it is never penalised); atMost => complete at <= target.
 *    0 < value < target => partial (scores 0 in the daily %, shown as "in progress").
 *  - timeOfDay (minutes since midnight): "by" / atMost => complete when value <= target; atLeast => >=.
 *  - null value => incomplete.
 */
export function evaluateStatus(rule: HabitRule, value: number | null): LogStatus {
  if (value === null || value === undefined || Number.isNaN(value)) return 'incomplete';
  const { trackingType: t, targetComparison: c, target } = rule;
  if (t === 'boolean') return value >= 1 ? 'complete' : 'incomplete';
  if (t === 'timeOfDay') {
    if (c === 'atLeast') return value >= target ? 'complete' : 'incomplete';
    return value <= target ? 'complete' : 'incomplete';
  }
  // quantity / duration
  if (c === 'atMost') return value <= target ? 'complete' : 'incomplete';
  if (c === 'by') return value <= target ? 'complete' : 'incomplete';
  if (value >= target) return 'complete';
  return value > 0 ? 'partial' : 'incomplete';
}

/** 0..1 progress for rings/bars (not used for the daily percent). */
export function habitProgress(rule: HabitRule, value: number | null): number {
  if (value === null) return 0;
  if (rule.trackingType === 'boolean') return value >= 1 ? 1 : 0;
  if (evaluateStatus(rule, value) === 'complete') return 1;
  if (rule.trackingType === 'timeOfDay' || rule.targetComparison === 'atMost') return 0;
  return rule.target > 0 ? Math.max(0, Math.min(1, value / rule.target)) : 0;
}

export function isScheduledOn(rule: HabitRule, localDate: string): boolean {
  const days = rule.schedule?.days;
  if (!days || days.length === 0) return true;
  return days.includes(weekdayOf(localDate));
}

export function effectiveStatus(rule: HabitRule, log: LogLike | undefined): LogStatus {
  if (!log || log.deletedAt) return 'incomplete';
  if (log.status === 'skipped') return 'skipped';
  if (log.value !== null && log.value !== undefined) return evaluateStatus(rule, log.value);
  return log.status === 'complete' ? 'complete' : 'incomplete';
}

export interface DayContext {
  habits: HabitRule[];
  logs: LogLike[];
  threshold?: number;
  restDays?: number[];
  restDayMode?: RestDayMode;
  /**
   * YYYY-MM-DD dates that behave exactly like a rest day (restDay=true). The lib does not know why a date is
   * neutral (Sunday default, period days, ...): callers build this list (see effectiveRestDays / periodNeutralDates).
   */
  neutralDates?: string[];
  /** timezone used to derive each habit's first eligible date from createdAt */
  timezone?: string;
}

export interface DayScore {
  localDate: string;
  eligible: number;
  completed: number;
  completionPercent: number;
  successful: boolean;
  restDay: boolean;
  /** neutral days neither extend nor break a streak */
  neutral: boolean;
}

const neutralSets = new WeakMap<string[], Set<string>>();
function neutralSet(dates: string[] | undefined): Set<string> | null {
  if (!dates || dates.length === 0) return null;
  let set = neutralSets.get(dates);
  if (!set) {
    set = new Set(dates);
    neutralSets.set(dates, set);
  }
  return set;
}

/** Rest weekdays that apply: the configured ones plus Sunday unless `sundayRest` is explicitly false (absent = on). */
export function effectiveRestDays(settings: { restDays?: number[] | null; sundayRest?: boolean | null }): number[] {
  const days = new Set(settings.restDays ?? []);
  if (settings.sundayRest !== false) days.add(0);
  return [...days].sort((a, b) => a - b);
}

export function indexLogs(logs: LogLike[]): Map<string, LogLike> {
  const m = new Map<string, LogLike>();
  for (const l of logs) m.set(`${l.habitId}:${l.localDate}`, l);
  return m;
}

function habitStartDate(h: HabitRule, tz?: string): string | null {
  if (!h.createdAt) return null;
  const d = new Date(h.createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return localDateInTz(d, tz ?? 'UTC');
}

export function eligibleHabits(habits: HabitRule[], localDate: string, tz?: string): HabitRule[] {
  return habits.filter((h) => {
    if (h.isActive === false || h.deletedAt) return false;
    if (!isScheduledOn(h, localDate)) return false;
    const start = habitStartDate(h, tz);
    if (start && localDate < start) return false;
    return true;
  });
}

export function scoreDay(localDate: string, ctx: DayContext, index?: Map<string, LogLike>): DayScore {
  const idx = index ?? indexLogs(ctx.logs);
  const threshold = ctx.threshold ?? DEFAULT_THRESHOLD;
  const restDay = (ctx.restDays ?? []).includes(weekdayOf(localDate)) || (neutralSet(ctx.neutralDates)?.has(localDate) ?? false);
  const mode = ctx.restDayMode ?? 'neutral';

  let eligible = 0;
  let completed = 0;
  for (const h of eligibleHabits(ctx.habits, localDate, ctx.timezone)) {
    const st = effectiveStatus(h, idx.get(`${h.id}:${localDate}`));
    if (st === 'skipped') continue;
    eligible++;
    if (st === 'complete') completed++;
  }
  const pct = eligible === 0 ? 0 : Math.round((completed / eligible) * 10000) / 100;
  const meets = eligible > 0 && pct >= threshold;

  if (restDay) {
    // counts: the rest day itself counts as a successful day.
    // neutral: an unsuccessful rest day neither breaks nor extends the streak; logging enough habits makes it a normal success.
    const success = mode === 'counts' || meets;
    return {
      localDate,
      eligible,
      completed,
      completionPercent: pct,
      successful: success,
      restDay: true,
      neutral: !success,
    };
  }
  return {
    localDate,
    eligible,
    completed,
    completionPercent: pct,
    successful: meets,
    restDay: false,
    neutral: eligible === 0,
  };
}

export function scoreRange(from: string, to: string, ctx: DayContext): DayScore[] {
  const idx = indexLogs(ctx.logs);
  return dateRange(from, to).map((d) => scoreDay(d, ctx, idx));
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * `days` ascending and ending at `today` (or earlier). Today being unfinished never breaks a streak:
 * if today is not (yet) successful the current streak is counted from yesterday.
 */
export function computeStreaks(days: DayScore[], today: string): Streaks {
  const past = days.filter((d) => d.localDate <= today);
  let longest = 0;
  let run = 0;
  for (const d of past) {
    if (d.neutral) continue;
    if (d.successful) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const d = past[i];
    if (d.neutral) continue;
    if (d.successful) {
      current++;
    } else if (d.localDate === today && i === past.length - 1) {
      continue; // today still in progress
    } else {
      break;
    }
  }
  return { current, longest };
}

export function milestonesReached(streak: number): number[] {
  return MILESTONES.filter((m) => streak >= m);
}
export function nextMilestone(streak: number): number | null {
  return MILESTONES.find((m) => m > streak) ?? null;
}
export function isMilestone(streak: number): boolean {
  return (MILESTONES as readonly number[]).includes(streak);
}

export interface Summary {
  currentStreak: number;
  longestStreak: number;
  days: { localDate: string; completionPercent: number; successful: boolean; restDay: boolean }[];
  milestones: number[];
}

/** Mirrors GET /stats/summary (workout fields are computed separately). */
export function summarize(from: string, to: string, today: string, ctx: DayContext): Summary {
  const last = to < today ? to : today;
  const days = scoreRange(from, last, ctx);
  const { current, longest } = computeStreaks(days, today);
  return {
    currentStreak: current,
    longestStreak: longest,
    days: days.map((d) => ({
      localDate: d.localDate,
      completionPercent: d.completionPercent,
      successful: d.successful,
      restDay: d.restDay,
    })),
    milestones: milestonesReached(longest),
  };
}

export { addDays };
