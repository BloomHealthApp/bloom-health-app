import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { addDays, deviceTimezone, localDateInTz } from '@/lib/dates';
import { indexLogs, scoreDay, scoreRange, summarize, computeStreaks, type DayScore, type DayContext } from '@/lib/scoring';
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
    const activeHabits = habits.filter((h) => h.isActive);
    const liveLogs = logs.filter((l) => !l.deletedAt);
    const ctx: DayContext = {
      habits: activeHabits,
      logs: liveLogs,
      threshold: settings.dailyThreshold,
      restDays: settings.restDays,
      restDayMode: settings.restDayMode,
      timezone,
    };
    const earliest = liveLogs.reduce((m, l) => (l.localDate < m ? l.localDate : m), addDays(today, -60));
    const days = scoreRange(earliest, today, ctx);
    const dayScores = new Map(days.map((d) => [d.localDate, d]));
    const { current, longest } = computeStreaks(days, today);
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
      todayScore: dayScores.get(today) ?? scoreDay(today, ctx, idx),
      dayScores,
      currentStreak: current,
      longestStreak: longest,
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
