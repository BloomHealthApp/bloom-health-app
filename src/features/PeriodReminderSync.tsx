import { useEffect } from 'react';
import { predict } from '@/lib/cycle';
import { isPeriodTrackerOn } from '@/lib/profile';
import { cancelPeriodReminder } from '@/notifications/scheduler';
import { expoNotifApi } from '@/notifications/expoAdapter';
import { useAuth } from '@/providers/AuthProvider';
import { usePeriods } from '@/providers/DataProvider';
import { useToday } from './derived';
import { applyPeriodReminder, getPeriodReminderPref, reminderStorage } from './periodReminder';

/** Mounted inside DataProvider: keeps the optional reminder in step with the latest estimate. Renders nothing. */
export function PeriodReminderSync() {
  const { user } = useAuth();
  const { periods } = usePeriods();
  const { today } = useToday();
  const on = isPeriodTrackerOn(user);
  const nextStart = on ? predict(periods, today).nextStart : null;
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      if (!on) {
        await cancelPeriodReminder(expoNotifApi, reminderStorage).catch(() => {});
        return;
      }
      const enabled = await getPeriodReminderPref(userId);
      if (!cancelled) await applyPeriodReminder({ enabled, nextStart, askPermission: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, on, nextStart]);
  return null;
}
