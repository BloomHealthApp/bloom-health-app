import { periodNeutralDates } from '../cycle';
import { applyServerSummary, computeProgress, type ServerSummary } from '../progress';
import type { HabitRule, LogLike } from '../scoring';

const habit: HabitRule = { id: 'h1', trackingType: 'boolean', target: 1, targetComparison: 'atLeast' };
const log = (localDate: string): LogLike => ({ habitId: 'h1', localDate, value: 1 });
const settings = { dailyThreshold: 80, restDays: [] as number[], restDayMode: 'neutral' as const };

// 2026-10-04 and 2026-10-11 are Sundays.
describe('computeProgress (owner, local)', () => {
  const base = { habits: [habit], timezone: 'UTC' };

  it('Sunday rest (absent = on) keeps the streak across an unlogged Sunday', () => {
    const p = computeProgress({ ...base, logs: [log('2026-10-03'), log('2026-10-05')], settings, today: '2026-10-05' });
    expect(p.currentStreak).toBe(2);
    expect(p.dayScores.get('2026-10-04')).toMatchObject({ restDay: true, neutral: true });
  });

  it('sundayRest=false makes an unlogged Sunday break the streak', () => {
    const p = computeProgress({ ...base, logs: [log('2026-10-03'), log('2026-10-05')], settings: { ...settings, sundayRest: false }, today: '2026-10-05' });
    expect(p.currentStreak).toBe(1);
    expect(p.dayScores.get('2026-10-04')).toMatchObject({ restDay: false, successful: false });
  });

  it('period days (neutralDates) never break the streak, and a logged one counts', () => {
    const periods = [{ startDate: '2026-10-06', endDate: '2026-10-07' }];
    const neutralDates = periodNeutralDates(periods, '2026-10-08', true);
    const logs = [log('2026-10-05'), log('2026-10-07'), log('2026-10-08')];
    const withPeriod = computeProgress({ ...base, logs, settings, today: '2026-10-08', neutralDates });
    expect(withPeriod.currentStreak).toBe(3); // Oct 5, Oct 7 (logged on a neutral day counts), Oct 8
    expect(withPeriod.dayScores.get('2026-10-06')).toMatchObject({ restDay: true, neutral: true });
    const without = computeProgress({ ...base, logs, settings, today: '2026-10-08' });
    expect(without.currentStreak).toBe(2); // Oct 6 unlogged breaks it
  });

  it('a disabled tracker contributes no neutral dates', () => {
    expect(periodNeutralDates([{ startDate: '2026-10-06', endDate: '2026-10-07' }], '2026-10-08', false)).toEqual([]);
  });
});

describe('computeProgress (viewer, server summary)', () => {
  const summary: ServerSummary = {
    currentStreak: 9,
    longestStreak: 12,
    days: [
      { localDate: '2026-10-06', completionPercent: 0, successful: false, restDay: true },
      { localDate: '2026-10-07', completionPercent: 100, successful: true, restDay: false },
    ],
  };
  const input = { habits: [habit], logs: [log('2026-10-07')], settings, today: '2026-10-07', timezone: 'UTC' };

  it('uses the server streaks and day flags instead of local scoring', () => {
    const local = computeProgress(input);
    expect(local.currentStreak).toBe(1); // local alone cannot know about the hidden period day
    const viewer = computeProgress({ ...input, serverSummary: summary });
    expect(viewer.currentStreak).toBe(9);
    expect(viewer.longestStreak).toBe(12);
    expect(viewer.dayScores.get('2026-10-06')).toMatchObject({ restDay: true, neutral: true, successful: false });
    expect(viewer.todayScore).toMatchObject({ successful: true, completionPercent: 100 });
  });

  it('applyServerSummary leaves days the summary does not cover untouched and marks successful rest days as counted', () => {
    const days = computeProgress(input).days;
    const out = applyServerSummary(days, { ...summary, days: [{ localDate: '2026-10-07', completionPercent: 100, successful: true, restDay: true }] });
    const d7 = out.find((d) => d.localDate === '2026-10-07')!;
    expect(d7).toMatchObject({ restDay: true, successful: true, neutral: false });
    const first = out[0];
    expect(first).toEqual(days[0]);
  });
});
