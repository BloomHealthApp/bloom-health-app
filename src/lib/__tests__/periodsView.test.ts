import { predict } from '../cycle';
import { validatePeriod } from '../periodRules';
import { buildMonth, cellLabel, cycleSummary, draftError, emptyDraft, historyRows, maxEndDate, monthFor, overdueOngoing, statLines, toggleItem } from '../periodsView';
import type { Period } from '@/types/api';

const per = (id: string, startDate: string, endDate: string | null, over: Partial<Period> = {}): Period => ({
  id, startDate, endDate, flow: 'medium', symptoms: [], mood: null, note: null, version: 1, updatedAt: '', deletedAt: null, ...over,
});
const regular = [per('a', '2026-07-01', '2026-07-05'), per('b', '2026-07-29', '2026-08-02'), per('c', '2026-08-26', '2026-08-30'), per('d', '2026-09-23', '2026-09-27')];

describe('buildMonth', () => {
  it('marks period days and the predicted window, period wins, sunday-first blanks', () => {
    const today = '2026-10-20';
    const cells = buildMonth(2026, 10, regular, predict(regular, today), today);
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]); // Oct 1 2026 is a Thursday
    const byDate = Object.fromEntries(cells.filter(Boolean).map((c) => [c!.date, c!]));
    expect(byDate['2026-10-01'].kind).toBe('none');
    expect(byDate['2026-10-19'].kind).toBe('none'); // window days before today are not shaded
    expect(byDate['2026-10-20'].kind).toBe('predicted');
    expect(byDate['2026-10-23'].kind).toBe('predicted');
    expect(byDate['2026-10-24'].kind).toBe('none');
    expect(byDate['2026-10-20'].isToday).toBe(true);
    expect(byDate['2026-10-21'].isFuture).toBe(true);
    expect(cellLabel(byDate['2026-10-21'])).toContain('estimated window');
  });
  it('shows period days from earlier months and ongoing periods through today', () => {
    const today = '2026-10-06';
    const periods = [...regular, per('e', '2026-10-04', null)];
    const sep = buildMonth(2026, 9, periods, predict(periods, today), today).filter(Boolean);
    expect(sep.filter((c) => c!.kind === 'period').map((c) => c!.date)).toEqual(['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']);
    const oct = buildMonth(2026, 10, periods, predict(periods, today), today).filter(Boolean);
    expect(oct.filter((c) => c!.kind === 'period').map((c) => c!.day)).toEqual([4, 5, 6]);
    expect(cellLabel(oct.find((c) => c!.day === 5)!)).toBe('Oct 5, period day');
  });
  it('monthFor rolls over years', () => {
    expect(monthFor('2026-01-15', -1)).toEqual({ year: 2025, month: 12 });
    expect(monthFor('2026-12-15', 1)).toEqual({ year: 2027, month: 1 });
  });
});

describe('cycleSummary and stats', () => {
  it('covers ongoing, upcoming, late and not-enough-data states', () => {
    expect(cycleSummary(predict([...regular.slice(0, 3), per('x', '2026-09-23', null)], '2026-09-25'), true).title).toBe('Day 3 of period');
    const up = cycleSummary(predict(regular, '2026-10-15'), true);
    expect(up.title).toBe('Next period ~Oct 21');
    expect(up.subtitle).toBe('In about 6 days');
    const late = cycleSummary(predict(regular, '2026-10-30'), true);
    expect(late.title).toBe('Period may be late');
    expect(late.subtitle).toContain('Estimates can be off');
    expect(cycleSummary(predict([regular[0]], '2026-10-15'), true).title).toBe('Log a few cycles to see an estimate');
    expect(cycleSummary(predict([], '2026-10-15'), false).title).toBe('Start tracking');
  });
  it('stat lines show dashes without data and values with it', () => {
    expect(statLines(predict([], '2026-10-01')).map((s) => s.value)).toEqual(['—', '—', '0', '—']);
    expect(statLines(predict(regular, '2026-10-01')).map((s) => s.value)).toEqual(['28 days', '5 days', '3', '~Oct 21']);
  });
});

describe('history, drafts and validation', () => {
  it('lists newest first with ranges and lengths, ignoring deleted', () => {
    const rows = historyRows([...regular, per('z', '2026-10-01', null, { deletedAt: 'x' }), per('o', '2026-10-02', null, { flow: 'heavy', symptoms: ['cramps', 'acne', 'nausea'] })], '2026-10-04');
    expect(rows[0].title).toBe('Oct 2 – ongoing');
    expect(rows[0].subtitle).toBe('3 days · Heavy · Cramps · Acne');
    expect(rows[1].title).toBe('Sep 23 – Sep 27');
    expect(rows).toHaveLength(5);
  });
  it('toggleItem adds, removes and respects the cap', () => {
    expect(toggleItem(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleItem(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleItem(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
  });
  it('draftError gives friendly messages for each rule', () => {
    const today = '2026-10-10';
    expect(draftError(emptyDraft('2026-10-09'), regular, today)).toBeNull();
    expect(draftError(emptyDraft('2026-10-11'), regular, today)).toMatch(/future/);
    expect(draftError({ ...emptyDraft('2026-10-05'), endDate: '2026-10-04' }, regular, today)).toMatch(/on or after/);
    expect(draftError({ ...emptyDraft('2026-09-20'), endDate: '2026-10-05' }, regular, today)).toMatch(/at most 14 days/);
    expect(draftError({ ...emptyDraft('2026-09-25'), endDate: '2026-09-26' }, regular, today)).toMatch(/overlaps/);
    expect(draftError(emptyDraft('2026-10-01'), [...regular, per('o', '2026-10-05', null)], today)).toMatch(/ongoing/);
  });
  it('editing a period ignores itself when checking overlap; deleted periods never block', () => {
    const today = '2026-10-10';
    const d = { startDate: '2026-09-23', endDate: '2026-09-28', flow: 'light' as const, symptoms: [], mood: null, note: null };
    expect(validatePeriod(d, regular, today, 'd')).toBeNull();
    expect(validatePeriod(d, regular, today, 'other')).toBe('overlap');
    expect(validatePeriod(d, regular.map((p) => (p.id === 'd' ? { ...p, deletedAt: 't' } : p)), today, 'other')).toBeNull();
  });
  it('maxEndDate is capped by today and by the 14-day limit', () => {
    expect(maxEndDate('2026-10-01', '2026-10-05')).toBe('2026-10-05');
    expect(maxEndDate('2026-09-01', '2026-10-05')).toBe('2026-09-14');
  });
  it('flags an ongoing period older than 14 days', () => {
    expect(overdueOngoing([per('o', '2026-09-20', null)], '2026-10-10')?.id).toBe('o');
    expect(overdueOngoing([per('o', '2026-10-05', null)], '2026-10-10')).toBeNull();
  });
});
