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
import { getAutoStepsPref, readDeviceSteps } from './autoSteps';
import { useToday } from './derived';

/** Owner only: fills the Steps habit from the phone while auto-tracking is on. Never throws from a sync. */
export function useAutoSteps(habit: (HabitRule & { id: string }) | undefined) {
  const { user, isOwner } = useAuth();
  const { store } = useData();
  const actions = useActions();
  const { today } = useToday();
  const [enabled, setEnabled] = useState(false);
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

  /** Replaces today's log with the phone's total, returning control of the day to auto-tracking. */
  const applyPhoneCount = useCallback(async () => {
    if (!habit) return;
    const [total] = await readDeviceSteps([today]);
    if (!total || total.steps <= 0) throw new Error('Your phone has no steps for today yet.');
    await actions.setSteps(habit, today, total.steps, 'device');
  }, [habit, today, actions]);

  return { enabled, refresh, applyPhoneCount };
}
