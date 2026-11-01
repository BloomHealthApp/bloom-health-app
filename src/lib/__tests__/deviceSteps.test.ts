import { deviceStepDates, MAX_DAILY_STEPS, nextStepTotal, shouldWriteDeviceSteps } from '../deviceSteps';

describe('deviceStepDates', () => {
  it('returns the last 7 days, oldest first', () => {
    const dates = deviceStepDates('2026-11-01', '2026-11-01');
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-10-26');
    expect(dates[6]).toBe('2026-11-01');
  });

  it('stops at the date the service treats as today', () => {
    expect(deviceStepDates('2026-11-02', '2026-11-01')[6]).toBe('2026-11-01');
  });
});

describe('shouldWriteDeviceSteps', () => {
  const log = (value: number | null, source?: 'manual' | 'device', status = 'partial') => ({ value, source, status });

  it('fills a day with no log', () => {
    expect(shouldWriteDeviceSteps(null, 500)).toBe(true);
  });
  it('fills a deleted log', () => {
    expect(shouldWriteDeviceSteps({ ...log(9000, 'manual'), deletedAt: '2026-11-01T00:00:00Z' }, 500)).toBe(true);
  });
  it('never writes zero', () => {
    expect(shouldWriteDeviceSteps(null, 0)).toBe(false);
  });
  it('keeps manual entries', () => {
    expect(shouldWriteDeviceSteps(log(100, 'manual'), 5000)).toBe(false);
  });
  it('treats a log without a source as manual', () => {
    expect(shouldWriteDeviceSteps(log(100), 5000)).toBe(false);
  });
  it('keeps skipped days', () => {
    expect(shouldWriteDeviceSteps(log(null, 'device', 'skipped'), 5000)).toBe(false);
  });
  it('fills an empty manual log', () => {
    expect(shouldWriteDeviceSteps(log(null, 'manual', 'incomplete'), 5000)).toBe(true);
  });
  it('raises a device value', () => {
    expect(shouldWriteDeviceSteps(log(100, 'device'), 5000)).toBe(true);
  });
  it('ignores an unchanged or lower device value', () => {
    expect(shouldWriteDeviceSteps(log(5000, 'device'), 5000)).toBe(false);
    expect(shouldWriteDeviceSteps(log(5000, 'device'), 4000)).toBe(false);
  });
});

describe('nextStepTotal', () => {
  it('adds to the total and starts from an empty day', () => {
    expect(nextStepTotal(1000, 50)).toBe(1050);
    expect(nextStepTotal(null, 200)).toBe(200);
  });
  it('stays within the limits', () => {
    expect(nextStepTotal(100, -200)).toBe(0);
    expect(nextStepTotal(MAX_DAILY_STEPS, 50)).toBe(MAX_DAILY_STEPS);
  });
});
