import { elapsedSeconds, finishTimer, formatClock, manualWorkout, parseTimer, pauseTimer, resumeTimer, serializeTimer, startTimer } from '../workoutTimer';

const T0 = Date.parse('2026-10-17T05:00:00Z');
describe('workout timer', () => {
  it('derives elapsed from timestamps only (survives kill via serialize/parse)', () => {
    const s = startTimer('yoga', T0);
    const restored = parseTimer(serializeTimer(s))!;
    expect(elapsedSeconds(restored, T0 + 90_000)).toBe(90);
    // "app killed" for an hour, still correct
    expect(elapsedSeconds(restored, T0 + 3_600_000)).toBe(3600);
  });
  it('pause freezes the clock; resume continues; pausedSeconds accumulates over multiple pauses', () => {
    let s = startTimer('strength', T0);
    s = pauseTimer(s, T0 + 60_000);
    expect(elapsedSeconds(s, T0 + 600_000)).toBe(60);
    s = resumeTimer(s, T0 + 120_000); // paused 60s
    expect(elapsedSeconds(s, T0 + 180_000)).toBe(120);
    s = pauseTimer(s, T0 + 200_000);
    s = resumeTimer(s, T0 + 230_000); // paused 30s more
    const done = finishTimer(s, T0 + 300_000);
    expect(done.pausedSeconds).toBe(90);
    expect(done.durationSeconds).toBe(210);
    expect(done.endedAt).toBe(new Date(T0 + 300_000).toISOString());
  });
  it('finishing while paused counts the open pause', () => {
    let s = startTimer('cardio', T0);
    s = pauseTimer(s, T0 + 100_000);
    const done = finishTimer(s, T0 + 160_000);
    expect(done.durationSeconds).toBe(100);
    expect(done.pausedSeconds).toBe(60);
  });
  it('manual entry', () => {
    const w = manualWorkout('walking', 45, T0);
    expect(w.durationSeconds).toBe(2700);
    expect(Date.parse(w.endedAt) - Date.parse(w.startedAt)).toBe(2_700_000);
  });
  it('clock format and corrupt state', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(parseTimer('{bad')).toBeNull();
    expect(parseTimer(null)).toBeNull();
  });
});
