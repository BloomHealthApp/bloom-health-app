import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { finishTimer, parseTimer, pauseTimer, resumeTimer, serializeTimer, startTimer, type FinishedWorkout, type TimerState } from '@/lib/workoutTimer';
import { useData } from '@/providers/DataProvider';
import type { WorkoutType } from '@/types/api';

const KEY = 'activeWorkout';

/** Running-workout state persisted in SQLite meta; elapsed time is derived from timestamps at render time. */
export function useActiveWorkout() {
  const { store, ready } = useData();
  const [state, setState] = useState<TimerState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    store.getMeta(KEY).then((raw) => {
      setState(parseTimer(raw));
      setLoaded(true);
    });
  }, [store, ready]);

  const persist = useCallback(
    async (next: TimerState | null) => {
      setState(next);
      await store.setMeta(KEY, next ? serializeTimer(next) : null);
    },
    [store],
  );

  return {
    loaded,
    state,
    start: (type: WorkoutType) => persist(startTimer(type, Date.now())),
    pause: () => state && persist(pauseTimer(state, Date.now())),
    resume: () => state && persist(resumeTimer(state, Date.now())),
    /** Returns the finished session and clears the timer. */
    finish: async (): Promise<FinishedWorkout | null> => {
      if (!state) return null;
      const f = finishTimer(state, Date.now());
      await persist(null);
      return f;
    },
    discard: () => persist(null),
  };
}

/** Re-renders every `ms` while `active`, and immediately on foreground, returning Date.now(). */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), ms);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [active, ms]);
  return now;
}
