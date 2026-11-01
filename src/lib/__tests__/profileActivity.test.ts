import { weekdayOf } from '../dates';
import { activityWeeks, milestoneProgress, monthLabels } from '../profileActivity';

describe('milestoneProgress', () => {
  it('measures from the last milestone to the next', () => {
    expect(milestoneProgress(0)).toEqual({ next: 3, remaining: 3, percent: 0 });
    expect(milestoneProgress(5)).toEqual({ next: 7, remaining: 2, percent: 50 });
    expect(milestoneProgress(7)).toEqual({ next: 14, remaining: 7, percent: 0 });
  });
  it('finishes after the last milestone', () => {
    expect(milestoneProgress(100)).toEqual({ next: null, remaining: 0, percent: 100 });
    expect(milestoneProgress(250).next).toBeNull();
  });
});

describe('activityWeeks', () => {
  it('gives 12 Sunday-first weeks ending this week, with no future days', () => {
    const weeks = activityWeeks('2026-11-04', 12); // a Wednesday
    expect(weeks).toHaveLength(12);
    for (const w of weeks) {
      expect(w).toHaveLength(7);
      expect(weekdayOf(w[0] as string)).toBe(0);
    }
    expect(weeks[11]).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', null, null, null]);
  });
  it('ends on a full week on Saturday', () => {
    expect(activityWeeks('2026-11-07', 12)[11][6]).toBe('2026-11-07');
  });
});

describe('monthLabels', () => {
  it('labels each month once, at its first week, in order', () => {
    const labels = monthLabels(activityWeeks('2026-11-04', 53));
    expect(labels.at(-1)).toEqual({ week: 52, label: 'Nov' });
    expect(labels.map((l) => l.week)).toEqual([...labels.map((l) => l.week)].sort((a, b) => a - b));
    expect(labels.length).toBeGreaterThanOrEqual(12);
    expect(labels.length).toBeLessThanOrEqual(13);
    expect(new Set(labels.map((l) => l.week)).size).toBe(labels.length);
  });
  it('drops a first label that would overlap the next', () => {
    const weeks = [['2026-01-25', null], ['2026-02-01', null], ['2026-02-08', null], ['2026-02-15', null], ['2026-03-01', null]];
    expect(monthLabels(weeks).map((l) => l.label)).toEqual(['Feb', 'Mar']);
  });
});
