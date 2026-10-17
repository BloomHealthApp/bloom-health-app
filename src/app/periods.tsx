import { Redirect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { PeriodsView } from '@/components/periods/PeriodsView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { useToday } from '@/features/derived';
import { applyPeriodReminder, getPeriodReminderPref, reminderNote, setPeriodReminderPref } from '@/features/periodReminder';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { predict } from '@/lib/cycle';
import { isPeriodTrackerOn } from '@/lib/profile';
import type { PeriodReminderResult } from '@/notifications/scheduler';
import { useAuth } from '@/providers/AuthProvider';
import { useData, usePeriods, useSyncStatus } from '@/providers/DataProvider';

/** Private period tracker. Owner-only and only while the tracker is enabled; anyone else is sent back (viewers never see it). */
export default function PeriodsScreen() {
  const { user, status } = useAuth();
  const allowed = isPeriodTrackerOn(user);
  if (status === 'signedIn' && !allowed) return <Redirect href="/(tabs)" />;
  return <PeriodsRoute />;
}

function PeriodsRoute() {
  const { user } = useAuth();
  const { periods, loading } = usePeriods();
  const { today } = useToday();
  const actions = useActions();
  const { syncNow } = useData();
  const sync = useSyncStatus();
  useSyncOnFocus();
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
    <Screen onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'} header={<ScreenHeader title="Period tracker" />}>
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
    </Screen>
  );
}
