import React, { useCallback, useEffect, useState } from 'react';
import { PeriodsView } from '@/components/periods/PeriodsView';
import { AppText } from '@/components/ui';
import { useActions } from '@/features/actions';
import { useToday } from '@/features/derived';
import { applyPeriodReminder, getPeriodReminderPref, reminderNote, setPeriodReminderPref } from '@/features/periodReminder';
import { predict } from '@/lib/cycle';
import type { PeriodReminderResult } from '@/notifications/scheduler';
import { useAuth } from '@/providers/AuthProvider';
import { usePeriods, useSyncStatus } from '@/providers/DataProvider';

/** The private tracker. Only mount it for owners with the tracker on: `isPeriodTrackerOn` is the gate. */
export function PeriodsPanel() {
  const { user } = useAuth();
  const { periods, loading } = usePeriods();
  const { today } = useToday();
  const actions = useActions();
  const sync = useSyncStatus();
  const [remind, setRemind] = useState(false);
  const [result, setResult] = useState<PeriodReminderResult | null>(null);
  const userId = user?.id ?? '';
  const nextStart = predict(periods, today).nextStart;

  useEffect(() => {
    if (userId) void getPeriodReminderPref(userId).then(setRemind);
  }, [userId]);

  const changeReminder = useCallback(
    async (on: boolean) => {
      setRemind(on);
      await setPeriodReminderPref(userId, on);
      setResult(await applyPeriodReminder({ enabled: on, nextStart, askPermission: on }));
    },
    [userId, nextStart],
  );

  return (
    <>
      {sync.state === 'offline' ? <AppText variant="caption" muted accessibilityRole="alert">You are offline. Entries are saved on this device and sync later.</AppText> : null}
      <PeriodsView
        periods={periods}
        today={today}
        loading={loading}
        onStart={(d) => actions.startPeriod(d)}
        onEnd={async (p, d) => void (await actions.endPeriod(p, d))}
        onSave={async (draft, existing) => void (await actions.savePeriod(draft, existing))}
        onDelete={(p) => actions.deletePeriod(p)}
        reminder={{ enabled: remind, note: reminderNote(result, remind), onChange: (on) => void changeReminder(on) }}
      />
    </>
  );
}
