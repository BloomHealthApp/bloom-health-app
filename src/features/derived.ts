import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { deviceTimezone, localDateInTz } from '@/lib/dates';
import { computeProgress } from '@/lib/progress';
import { indexLogs, scoreDay, summarize, type DayScore, type DayContext } from '@/lib/scoring';
import { useHabits, useLogs, useSettings, useWorkouts } from '@/providers/DataProvider';
import type { DailyLog, Habit } from '@/types/api';

/** Today's local date in the device timezone; refreshes on foreground and every minute (midnight rollover / tz change). */
export function useToday(): { today: string; timezone: string } {
  const read = () => {
    const tz = deviceTimezone();
    return { today: localDateInTz(new Date(), tz), timezone: tz };
  };
  const [v, setV] = useState(read);
  useEffect(() => {
    const upd = () => setV((cur) => {
      const n = read();
      return n.today === cur.today && n.timezone === cur.timezone ? cur : n;
    });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && upd());
    const iv = setInterval(upd, 60_000);
    return () => {
      sub.remove();
      clearInterval(iv);
    };
  }, []);
  return v;
}

export interface Derived {
  today: string;
  timezone: string;
  habits: Habit[];
  activeHabits: Habit[];
  logs: DailyLog[];
  logIndex: Map<string, DailyLog>;
  ctx: DayContext;
  scoreFor: (date: string) => DayScore;
  todayScore: DayScore;
  dayScores: Map<string, DayScore>;
  currentStreak: number;
  longestStreak: number;
  threshold: number;
  loading: boolean;
}

export function useDerived(): Derived {
  const { habits, loading: l1 } = useHabits();
  const { logs, loading: l2 } = useLogs();
  const { settings } = useSettings();
  const { today, timezone } = useToday();

  return useMemo(() => {
    const { activeHabits, liveLogs, ctx, dayScores, todayScore, currentStreak, longestStreak } = computeProgress({ habits, logs, settings, today, timezone });
    const idx = indexLogs(liveLogs);
    return {
      today,
      timezone,
      habits,
      activeHabits,
      logs: liveLogs as DailyLog[],
      logIndex: idx as Map<string, DailyLog>,
      ctx,
      scoreFor: (d: string) => dayScores.get(d) ?? scoreDay(d, ctx, idx),
      todayScore,
      dayScores,
      currentStreak,
      longestStreak,
      threshold: settings.dailyThreshold,
      loading: l1 || l2,
    };
  }, [habits, logs, settings, today, timezone, l1, l2]);
}

export { summarize };
export function useWorkoutsByDate() {
  const { workouts } = useWorkouts();
  return useMemo(() => {
    const m = new Map<string, typeof workouts>();
    for (const w of workouts) m.set(w.localDate, [...(m.get(w.localDate) ?? []), w]);
    return m;
  }, [workouts]);
}
