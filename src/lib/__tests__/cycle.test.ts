import {
  averageCycleLength,
  averagePeriodLength,
  cycleGaps,
  dayOfPeriod,
  periodNeutralDates,
  predict,
  predictedWindowDates,
} from '../cycle';
import { addDays } from '../dates';

const p = (startDate: string, endDate: string | null = null, deletedAt: string | null = null) => ({ startDate, endDate, deletedAt });

// regular 28-day cycles, 5-day periods
const regular = [p('2026-07-01', '2026-07-05'), p('2026-07-29', '2026-08-02'), p('2026-08-26', '2026-08-30'), p('2026-09-23', '2026-09-27')];

describe('cycle math', () => {
  it('regular cycles: gaps, averages and next-start estimate', () => {
    expect(cycleGaps(regular)).toEqual([28, 28, 28]);
    expect(averageCycleLength(regular)).toBe(28);
    expect(averagePeriodLength(regular)).toBe(5);
    const pr = predict(regular, '2026-10-05');
    expect(pr).toMatchObject({ state: 'upcoming', nextStart: '2026-10-21', windowStart: '2026-10-19', windowEnd: '2026-10-23', daysUntil: 16, cycleCount: 3, lastStart: '2026-09-23' });
  });

  it('irregular cycles average and round', () => {
    const irregular = [p('2026-01-01', '2026-01-04'), p('2026-01-27', '2026-01-31'), p('2026-03-02', '2026-03-05')]; // gaps 26, 34
    expect(cycleGaps(irregular)).toEqual([26, 34]);
    expect(averageCycleLength(irregular)).toBe(30);
    expect(averagePeriodLength(irregular)).toBe(4); // (4+5+4)/3 = 4.33
    expect(predict(irregular, '2026-03-10').nextStart).toBe('2026-04-01');
  });

  it('uses only the last 6 gaps', () => {
    let d = '2026-01-01';
    const many = [p(d, null)];
    for (const gap of [40, 40, 20, 20, 20, 20, 20, 20]) {
      d = addDays(d, gap);
      many.push(p(d, null));
    }
    expect(cycleGaps(many)).toHaveLength(8);
    expect(averageCycleLength(many)).toBe(20); // the two 40s fall outside the last 6
  });

  it('fewer than 2 cycles: no estimate', () => {
    expect(predict([], '2026-10-05')).toMatchObject({ state: 'no_estimate', nextStart: null, averageCycle: null, cycleCount: 0 });
    const one = predict([p('2026-09-01', '2026-09-05')], '2026-10-05');
    expect(one).toMatchObject({ state: 'no_estimate', nextStart: null, cycleCount: 0 });
    const two = [p('2026-08-01', '2026-08-05'), p('2026-08-29', '2026-09-02')]; // one gap only
    const r = predict(two, '2026-09-10');
    expect(r).toMatchObject({ state: 'no_estimate', nextStart: null, cycleCount: 1, averageCycle: 28 });
    expect(predictedWindowDates(r, '2026-09-10')).toEqual([]);
  });

  it('ongoing period: state, day-of-period and neutral expansion through today', () => {
    const periods = [...regular.slice(0, 3), p('2026-09-23', null)];
    const pr = predict(periods, '2026-09-25');
    expect(pr.state).toBe('ongoing');
    expect(pr.dayOfPeriod).toBe(3);
    expect(dayOfPeriod(periods, '2026-09-23')).toBe(1);
    expect(periodNeutralDates([p('2026-09-23', null)], '2026-09-25', true)).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
  });

  it('day of period for a finished period and outside periods', () => {
    expect(dayOfPeriod(regular, '2026-09-27')).toBe(5);
    expect(dayOfPeriod(regular, '2026-09-28')).toBeNull();
    expect(dayOfPeriod([], '2026-09-28')).toBeNull();
  });

  it("'may be late' once today is past the predicted window, and not before", () => {
    expect(predict(regular, '2026-10-23').state).toBe('upcoming'); // last day of window
    const late = predict(regular, '2026-10-26');
    expect(late).toMatchObject({ state: 'late', daysLate: 5, daysUntil: -5 });
    expect(predictedWindowDates(late, '2026-10-26')).toEqual([]);
  });

  it('predicted window dates start from today when the window has begun', () => {
    const pr = predict(regular, '2026-10-20');
    expect(predictedWindowDates(pr, '2026-10-20')).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  });

  it('ignores deleted periods', () => {
    const withDeleted = [...regular, p('2026-10-10', '2026-10-12', '2026-10-11T00:00:00Z')];
    expect(cycleGaps(withDeleted)).toEqual([28, 28, 28]);
    expect(periodNeutralDates(withDeleted, '2026-10-15', true)).not.toContain('2026-10-10');
  });

  it('neutral expansion: start..end inclusive, deduped, empty when the tracker is disabled', () => {
    const dates = periodNeutralDates([p('2026-10-01', '2026-10-03'), p('2026-10-03', '2026-10-04')], '2026-10-10', true);
    expect(dates).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(periodNeutralDates(regular, '2026-10-10', false)).toEqual([]);
  });
});
