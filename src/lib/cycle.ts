// Pure cycle math for the private period tracker. Estimates only, never medical advice.
import { addDays, dateRange, diffDays } from './dates';

export const MAX_CYCLES_AVERAGED = 6;
export const MIN_CYCLES_FOR_ESTIMATE = 2;
export const PREDICTION_WINDOW_DAYS = 2;

export interface PeriodLike {
  startDate: string;
  /** null/undefined while ongoing */
  endDate?: string | null;
  deletedAt?: string | null;
}

/** Non-deleted periods, oldest first. */
export function livePeriods<P extends PeriodLike>(periods: P[]): P[] {
  return periods.filter((p) => !p.deletedAt).sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
}

/** Start-to-start gaps in days, oldest first (all of them). */
export function cycleGaps(periods: PeriodLike[]): number[] {
  const live = livePeriods(periods);
  const out: number[] = [];
  for (let i = 1; i < live.length; i++) out.push(diffDays(live[i].startDate, live[i - 1].startDate));
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Average of up to the last 6 gaps, rounded to whole days; null without any completed cycle. */
export function averageCycleLength(periods: PeriodLike[]): number | null {
  const gaps = cycleGaps(periods).slice(-MAX_CYCLES_AVERAGED);
  return gaps.length ? Math.round(mean(gaps)) : null;
}

/** Inclusive length in days of a finished period (null while ongoing). */
export function periodLength(p: PeriodLike): number | null {
  return p.endDate ? diffDays(p.endDate, p.startDate) + 1 : null;
}

/** Average length of the last 6 finished periods, rounded; null when none has ended yet. */
export function averagePeriodLength(periods: PeriodLike[]): number | null {
  const lens = livePeriods(periods)
    .map(periodLength)
    .filter((n): n is number => n !== null && n > 0)
    .slice(-MAX_CYCLES_AVERAGED);
  return lens.length ? Math.round(mean(lens)) : null;
}

export function ongoingPeriod<P extends PeriodLike>(periods: P[]): P | null {
  const live = livePeriods(periods);
  for (let i = live.length - 1; i >= 0; i--) if (!live[i].endDate) return live[i];
  return null;
}

/** 1-based day of the period that covers `today` (ongoing counts through today), else null. */
export function dayOfPeriod(periods: PeriodLike[], today: string): number | null {
  for (const p of livePeriods(periods)) {
    if (p.startDate > today) continue;
    const end = p.endDate ?? today;
    if (today <= end) return diffDays(today, p.startDate) + 1;
  }
  return null;
}

export type CycleState = 'ongoing' | 'upcoming' | 'late' | 'no_estimate';

export interface Prediction {
  state: CycleState;
  cycleCount: number;
  averageCycle: number | null;
  averagePeriod: number | null;
  lastStart: string | null;
  /** estimated next start; only with >= 2 cycles */
  nextStart: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  /** days from today to nextStart (negative once it has passed) */
  daysUntil: number | null;
  /** days past the estimate while state === 'late' */
  daysLate: number | null;
  /** day of period when state === 'ongoing' (or today falls inside a finished period) */
  dayOfPeriod: number | null;
}

export function predict(periods: PeriodLike[], today: string): Prediction {
  const live = livePeriods(periods);
  const gaps = cycleGaps(live);
  const averageCycle = averageCycleLength(live);
  const lastStart = live.length ? live[live.length - 1].startDate : null;
  const base: Prediction = {
    state: 'no_estimate',
    cycleCount: gaps.length,
    averageCycle,
    averagePeriod: averagePeriodLength(live),
    lastStart,
    nextStart: null,
    windowStart: null,
    windowEnd: null,
    daysUntil: null,
    daysLate: null,
    dayOfPeriod: dayOfPeriod(live, today),
  };
  const ongoing = ongoingPeriod(live);
  const estimate = gaps.length >= MIN_CYCLES_FOR_ESTIMATE && averageCycle !== null && lastStart !== null;
  if (estimate) {
    const nextStart = addDays(lastStart, averageCycle);
    base.nextStart = nextStart;
    base.windowStart = addDays(nextStart, -PREDICTION_WINDOW_DAYS);
    base.windowEnd = addDays(nextStart, PREDICTION_WINDOW_DAYS);
    base.daysUntil = diffDays(nextStart, today);
  }
  if (ongoing && ongoing.startDate <= today) {
    base.state = 'ongoing';
    return base;
  }
  if (!estimate || base.nextStart === null || base.windowEnd === null) return base;
  if (today > base.windowEnd) {
    base.state = 'late';
    base.daysLate = diffDays(today, base.nextStart);
  } else {
    base.state = 'upcoming';
  }
  return base;
}

/** Dates (inclusive) of the shaded prediction window that are still relevant (today or later), else []. */
export function predictedWindowDates(pred: Prediction, today: string): string[] {
  if (pred.state !== 'upcoming' || !pred.windowStart || !pred.windowEnd) return [];
  return dateRange(pred.windowStart, pred.windowEnd).filter((d) => d >= today);
}

/**
 * Period days as neutral dates for scoring: start..end, an ongoing period runs through `today`.
 * Empty unless the owner's tracker is enabled (viewers never call this: they use the server summary).
 */
export function periodNeutralDates(periods: PeriodLike[], today: string, trackerEnabled: boolean): string[] {
  if (!trackerEnabled) return [];
  const out = new Set<string>();
  for (const p of livePeriods(periods)) {
    const end = p.endDate ?? today;
    if (p.startDate > end) continue;
    for (const d of dateRange(p.startDate, end)) out.add(d);
  }
  return [...out].sort();
}
