import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { localDateInTz } from '@/lib/dates';
import { deviceStepDates, shouldWriteDeviceSteps } from '@/lib/deviceSteps';
import { logId } from '@/lib/ids';
import type { HabitRule } from '@/lib/scoring';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import type { DailyLog } from '@/types/api';
import { useActions } from './actions';
import { deviceStepsAvailable, getAutoStepsPref, readDeviceSteps, requestDeviceSteps, setAutoStepsPref } from './autoSteps';
import { useToday } from './derived';

/** Owner only: fills the Steps habit from the phone while auto-tracking is on. Never throws from a sync. */
export function useAutoSteps(habit: (HabitRule & { id: string }) | undefined) {
  const { user, isOwner } = useAuth();
  const { store } = useData();
  const actions = useActions();
  const { today } = useToday();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const running = useRef(false);
  const userId = user?.id;
  const userTimezone = user?.timezone;

  const refresh = useCallback(async () => {
    if (!isOwner || !userId || !habit || running.current) return;
    running.current = true;
    try {
      const on = await getAutoStepsPref(userId);
      setEnabled(on);
      if (!on) return;
      // The service judges "today" by the saved timezone, which lags the device after travel.
      const latest = userTimezone ? localDateInTz(new Date(), userTimezone) : today;
      for (const { date, steps } of await readDeviceSteps(deviceStepDates(today, latest))) {
        const log = await store.get<DailyLog>('dailyLog', logId(habit.id, date));
        if (shouldWriteDeviceSteps(log, steps)) await actions.setSteps(habit, date, steps, 'device');
      }
    } catch {
      /* the next focus or foreground retries */
    } finally {
      running.current = false;
    }
  }, [isOwner, userId, userTimezone, habit, today, store, actions]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    if (isOwner) void deviceStepsAvailable().then(setAvailable);
  }, [isOwner]);

  /** Returns false when permission was refused. Choosing Auto hands today back to the phone. */
  const setMode = useCallback(
    async (mode: 'auto' | 'manual'): Promise<boolean> => {
      if (!userId) return false;
      if (mode === 'manual') {
        setEnabled(false);
        await setAutoStepsPref(userId, false);
        return true;
      }
      if (!(await requestDeviceSteps())) return false;
      await setAutoStepsPref(userId, true);
      setEnabled(true);
      if (habit) {
        const [total] = await readDeviceSteps([today]);
        const log = await store.get<DailyLog>('dailyLog', logId(habit.id, today));
        // With no phone total yet, keep the number but mark it so the phone can take over once it passes it.
        const steps = total && total.steps > 0 ? total.steps : (log?.value ?? 0);
        if (steps > 0 && log?.status !== 'skipped') await actions.setSteps(habit, today, steps, 'device');
      }
      await refresh();
      return true;
    },
    [userId, habit, today, store, actions, refresh],
  );

  return { enabled, available, refresh, setMode };
}
