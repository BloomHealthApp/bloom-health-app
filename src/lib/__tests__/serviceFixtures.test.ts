import svc from '../__fixtures__/service-scoring.json';
import { summarize, type HabitRule, type RestDayMode } from '../scoring';

// Runs the service's shared fixtures (bubu-bloom-service/testdata/scoring.json) through the app's scoring lib.
describe('service fixtures', () => {
  const habits = svc.habits.map((h) => ({
    id: h.id,
    trackingType: h.trackingType,
    target: h.target,
    targetMax: null,
    targetComparison: h.comparison,
    schedule: { days: (h as { days?: number[] }).days ?? [] },
    isActive: h.active,
  }));
  for (const c of svc.cases) {
    it(c.name, () => {
      const logs = Object.entries(c.logs).flatMap(([localDate, m]) =>
        Object.entries(m as Record<string, { value?: number; status?: string }>).map(([habitId, l]) => ({
          habitId, localDate, value: l.value ?? null, status: l.status,
        })),
      );
      const s = summarize(c.from, c.to, c.today, {
        habits: habits as unknown as HabitRule[],
        logs: logs as never,
        threshold: c.settings.threshold,
        restDays: c.settings.restDays,
        restDayMode: c.settings.restMode as RestDayMode,
      });
      expect(s.currentStreak).toBe(c.expect.current);
      expect(s.longestStreak).toBe(c.expect.longest);
      for (const [d, pct] of Object.entries(c.expect.percents)) {
        expect(s.days.find((x) => x.localDate === d)!.completionPercent).toBeCloseTo(pct as number, 1);
      }
    });
  }
});
