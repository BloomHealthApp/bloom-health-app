import fixtures from '../__fixtures__/scoring.json';
import {
  computeStreaks,
  effectiveRestDays,
  evaluateStatus,
  habitProgress,
  isMilestone,
  milestonesReached,
  nextMilestone,
  scoreDay,
  summarize,
  type HabitRule,
  type RestDayMode,
} from '../scoring';
import { addDays, localDateInTz, minutesSinceMidnightInTz, startOfWeek, weekdayOf } from '../dates';

describe('shared fixtures', () => {
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const extra = c as { sundayRest?: boolean; sundayRestAbsent?: boolean; neutralDates?: string[] };
      // Older cases do not mention Sundays and keep the raw restDays; new cases opt in to the Sunday default explicitly.
      const useSunday = extra.sundayRest !== undefined || extra.sundayRestAbsent;
      const s = summarize(c.from, c.to, c.today, {
        habits: c.habits as HabitRule[],
        logs: c.logs as never,
        threshold: c.threshold,
        restDays: useSunday ? effectiveRestDays({ restDays: c.restDays, sundayRest: extra.sundayRest }) : c.restDays,
        restDayMode: c.restDayMode as RestDayMode,
        neutralDates: extra.neutralDates,
      });
      expect(s.currentStreak).toBe(c.expect.currentStreak);
      expect(s.longestStreak).toBe(c.expect.longestStreak);
      const expDays = (c.expect as { days?: { localDate: string; completionPercent: number; successful: boolean }[] }).days;
      if (expDays) {
        for (const e of expDays) {
          const got = s.days.find((d) => d.localDate === e.localDate)!;
          expect(got.completionPercent).toBeCloseTo(e.completionPercent, 2);
          expect(got.successful).toBe(e.successful);
        }
      }
    });
  }
});

describe('evaluateStatus', () => {
  const base = { id: 'x', targetMax: null };
  it('boolean', () => {
    const r: HabitRule = { ...base, trackingType: 'boolean', target: 1, targetComparison: 'atLeast' };
    expect(evaluateStatus(r, 1)).toBe('complete');
    expect(evaluateStatus(r, 0)).toBe('incomplete');
    expect(evaluateStatus(r, null)).toBe('incomplete');
  });
  it('duration between: >= min complete, below is partial', () => {
    const r: HabitRule = { ...base, trackingType: 'duration', target: 90, targetMax: 120, targetComparison: 'between' };
    expect(evaluateStatus(r, 95)).toBe('complete');
    expect(evaluateStatus(r, 130)).toBe('complete');
    expect(evaluateStatus(r, 30)).toBe('partial');
    expect(evaluateStatus(r, 0)).toBe('incomplete');
  });
  it('quantity atMost', () => {
    const r: HabitRule = { ...base, trackingType: 'quantity', target: 3, targetComparison: 'atMost' };
    expect(evaluateStatus(r, 2)).toBe('complete');
    expect(evaluateStatus(r, 4)).toBe('incomplete');
  });
  it('timeOfDay by', () => {
    const r: HabitRule = { ...base, trackingType: 'timeOfDay', target: 1080, targetComparison: 'by' };
    expect(evaluateStatus(r, 1080)).toBe('complete');
    expect(evaluateStatus(r, 1081)).toBe('incomplete');
  });
  it('progress ratio for quantity', () => {
    const r: HabitRule = { ...base, trackingType: 'quantity', target: 2000, targetComparison: 'atLeast' };
    expect(habitProgress(r, 500)).toBeCloseTo(0.25);
    expect(habitProgress(r, 5000)).toBe(1);
  });
});

describe('daily completion', () => {
  it('habit created later is not eligible before creation date; zero eligible is neutral', () => {
    const habits: HabitRule[] = [
      { id: 'a', trackingType: 'boolean', target: 1, targetComparison: 'atLeast', createdAt: '2026-10-05T10:00:00Z' },
    ];
    const before = scoreDay('2026-10-04', { habits, logs: [], timezone: 'UTC' });
    expect(before.eligible).toBe(0);
    expect(before.neutral).toBe(true);
    const after = scoreDay('2026-10-05', { habits, logs: [], timezone: 'UTC' });
    expect(after.eligible).toBe(1);
    expect(after.completionPercent).toBe(0);
  });
  it('inactive habits are ignored', () => {
    const habits: HabitRule[] = [
      { id: 'a', trackingType: 'boolean', target: 1, targetComparison: 'atLeast', isActive: false },
      { id: 'b', trackingType: 'boolean', target: 1, targetComparison: 'atLeast' },
    ];
    const d = scoreDay('2026-10-05', { habits, logs: [{ habitId: 'b', localDate: '2026-10-05', value: 1 }] });
    expect(d.eligible).toBe(1);
    expect(d.successful).toBe(true);
  });
});

describe('streaks and milestones', () => {
  it('computeStreaks handles empty input', () => {
    expect(computeStreaks([], '2026-10-01')).toEqual({ current: 0, longest: 0 });
  });
  it('milestones', () => {
    expect(milestonesReached(14)).toEqual([3, 7, 14]);
    expect(nextMilestone(14)).toBe(30);
    expect(nextMilestone(100)).toBeNull();
    expect(isMilestone(7)).toBe(true);
    expect(isMilestone(8)).toBe(false);
  });
});

describe('timezone-aware dates', () => {
  it('same instant is a different local date across timezones', () => {
    const instant = new Date('2026-10-17T20:00:00Z');
    expect(localDateInTz(instant, 'UTC')).toBe('2026-10-17');
    expect(localDateInTz(instant, 'Asia/Kolkata')).toBe('2026-10-18'); // 01:30 next day
    expect(localDateInTz(instant, 'America/Los_Angeles')).toBe('2026-10-17');
    expect(minutesSinceMidnightInTz(instant, 'Asia/Kolkata')).toBe(90);
  });
  it('day arithmetic across month/year boundaries and DST-free UTC math', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekdayOf('2026-10-04')).toBe(0);
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28');
  });
});

describe('effectiveRestDays', () => {
  it('adds Sunday when sundayRest is true or absent', () => {
    expect(effectiveRestDays({ restDays: [], sundayRest: true })).toEqual([0]);
    expect(effectiveRestDays({ restDays: [] })).toEqual([0]);
    expect(effectiveRestDays({ restDays: [3, 6], sundayRest: undefined })).toEqual([0, 3, 6]);
  });
  it('keeps the configured days only when sundayRest is false, and never duplicates Sunday', () => {
    expect(effectiveRestDays({ restDays: [3], sundayRest: false })).toEqual([3]);
    expect(effectiveRestDays({ restDays: [0, 2], sundayRest: true })).toEqual([0, 2]);
    expect(effectiveRestDays({ restDays: null, sundayRest: false })).toEqual([]);
  });
});

describe('neutral dates', () => {
  const habits: HabitRule[] = [{ id: 'a', trackingType: 'boolean', target: 1, targetComparison: 'atLeast' }];
  it('behave like rest days: restDay=true, unsuccessful ones are neutral', () => {
    const d = scoreDay('2026-10-07', { habits, logs: [], neutralDates: ['2026-10-07'] });
    expect(d).toMatchObject({ restDay: true, neutral: true, successful: false });
  });
  it('a successful neutral date is a normal success', () => {
    const d = scoreDay('2026-10-07', { habits, logs: [{ habitId: 'a', localDate: '2026-10-07', value: 1 }], neutralDates: ['2026-10-07'] });
    expect(d).toMatchObject({ restDay: true, neutral: false, successful: true });
  });
  it('dates not listed are unaffected', () => {
    expect(scoreDay('2026-10-08', { habits, logs: [], neutralDates: ['2026-10-07'] })).toMatchObject({ restDay: false });
  });
});
