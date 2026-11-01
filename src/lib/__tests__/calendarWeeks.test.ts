import { chunkWeeks, monthBounds, weekdayOf } from '../dates';

const grid = (y: number, m: number) => {
  const { from, to } = monthBounds(y, m);
  const days = Array.from({ length: Number(to.slice(8)) }, (_, i) => i + 1);
  return chunkWeeks<number>([...Array<null>(weekdayOf(from)).fill(null), ...days]);
};

describe('chunkWeeks', () => {
  it('puts each date under its weekday (November 2026 starts on a Sunday)', () => {
    const weeks = grid(2026, 11);
    expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks[1][0]).toBe(8);
    expect(weeks[4]).toEqual([29, 30, null, null, null, null, null]);
  });
  it('keeps exactly seven cells in every row, whatever day the month starts on', () => {
    for (let m = 1; m <= 12; m++) for (const week of grid(2027, m)) expect(week).toHaveLength(7);
  });
  it('returns no rows for no cells', () => {
    expect(chunkWeeks([])).toEqual([]);
  });
});
