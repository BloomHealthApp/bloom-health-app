import { addDays, chunkWeeks, monthName, weekdayOf } from './dates';
import { MILESTONES, nextMilestone } from './scoring';

export interface MilestoneProgress {
  /** null once every milestone is reached */
  next: number | null;
  remaining: number;
  percent: number;
}

/** Progress from the last milestone passed to the next one. */
export function milestoneProgress(streak: number): MilestoneProgress {
  const next = nextMilestone(streak);
  if (next === null) return { next: null, remaining: 0, percent: 100 };
  const from = [...MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  return { next, remaining: next - streak, percent: Math.round(((streak - from) / (next - from)) * 100) };
}

/** Sunday-first weeks ending with the week of `today`. Days after today are null. */
export function activityWeeks(today: string, weeks: number): (string | null)[][] {
  const lastSunday = addDays(today, -weekdayOf(today));
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(lastSunday, i - (weeks - 1) * 7)).map((d) => (d > today ? null : d));
  return chunkWeeks(cells);
}

/** Short month names and the week column each starts in. A first label is dropped if the next would overlap it. */
export function monthLabels(weeks: (string | null)[][]): { week: number; label: string }[] {
  const labels: { week: number; label: string }[] = [];
  let last = '';
  weeks.forEach((week, i) => {
    const first = week.find((d) => d !== null);
    if (!first) return;
    const month = first.slice(0, 7);
    if (month === last) return;
    last = month;
    labels.push({ week: i, label: monthName(Number(month.slice(5))).slice(0, 3) });
  });
  return labels.length > 1 && labels[1].week - labels[0].week < 3 ? labels.slice(1) : labels;
}
