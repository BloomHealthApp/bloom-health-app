import { Redirect, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReminderRow } from '@/components/reminders/ReminderRow';
import { AppText, Button, Card, ErrorBanner, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { getReminderModes, getReminderVolumes, setReminderModes, setReminderVolumes } from '@/features/reminderModes';
import { useGuarded } from '@/features/useGuarded';
import { canShowFullScreenAlarm, openFullScreenAlarmSettings } from '@/notifications/alarmAdapter';
import type { ReminderMode, ReminderModes, ReminderVolumes } from '@/notifications/scheduler';
import { useAuth } from '@/providers/AuthProvider';
import { useData, useSettings } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { Reminder } from '@/types/api';

export default function RemindersScreen() {
  const { user, isOwner } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const actions = useActions();
  const { reminderStatus, refreshReminders } = useData();
  const { err, guarded } = useGuarded();
  const [modes, setModes] = useState<ReminderModes>({});
  const [volumes, setVolumes] = useState<ReminderVolumes>({});
  const [previewing, setPreviewing] = useState<Reminder['key'] | null>(null);
  const [fullScreenAllowed, setFullScreenAllowed] = useState(true);
  const userId = user?.id;
  const hasLoudAlarm = Object.values(modes).includes('loudAlarm');
  const loudAlarmFallback = reminderStatus?.status === 'scheduled' ? reminderStatus.loudAlarmFallback : undefined;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void Promise.all([getReminderModes(userId), getReminderVolumes(userId)]).then(([m, v]) => {
      if (cancelled) return;
      setModes(m);
      setVolumes(v);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Closing the preview stops its sound when the user leaves this page.
  useFocusEffect(useCallback(() => () => setPreviewing(null), []));

  useEffect(() => {
    if (!hasLoudAlarm) return;
    let cancelled = false;
    void canShowFullScreenAlarm().then((allowed) => {
      if (!cancelled) setFullScreenAllowed(allowed);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasLoudAlarm, reminderStatus]);

  const setReminder = (key: Reminder['key'], patch: Partial<Reminder>, ask = false) =>
    guarded(async () => {
      const next = settings.reminders.map((r) => (r.key === key ? { ...r, ...patch } : r));
      await actions.saveSettings({ reminders: next }, settings);
      if (ask) await refreshReminders(true);
    });

  const chooseMode = (key: Reminder['key'], mode: ReminderMode) => {
    const unchanged = (modes[key] ?? 'notification') === mode;
    if (unchanged) {
      setPreviewing(previewing === key ? null : key);
      return;
    }
    setPreviewing(null);
    void setReminderMode(key, mode);
  };

  const setReminderVolume = (key: Reminder['key'], volume: number) =>
    guarded(async () => {
      if (!userId) return;
      const next = { ...volumes, [key]: volume };
      setVolumes(next);
      await setReminderVolumes(userId, next);
      await refreshReminders();
    });

  const setReminderMode = (key: Reminder['key'], mode: ReminderMode) =>
    guarded(async () => {
      if (!userId) return;
      const next = { ...modes, [key]: mode };
      setModes(next);
      await setReminderModes(userId, next);
      await refreshReminders(mode !== 'notification', mode === 'loudAlarm');
    });

  if (!isOwner) return <Redirect href="/settings" />;

  return (
    <Screen header={<ScreenHeader title="Reminders" />}>
      {err ? <ErrorBanner message={err} /> : null}
      <Card style={{ gap: spacing.md }}>
        {reminderStatus?.status === 'denied' ? (
          <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
            <AppText style={{ color: theme.colors.danger }} variant="bodyStrong">Notifications are turned off for Bloom Health.</AppText>
            <AppText variant="caption" muted>Reminders will not appear until you allow notifications.</AppText>
            <Button title={reminderStatus.canAskAgain ? 'Allow notifications' : 'Open system settings'} variant="secondary" onPress={() => (reminderStatus.canAskAgain ? void refreshReminders(true) : void Linking.openSettings())} />
          </View>
        ) : null}
        {settings.reminders.map((r) => (
          <ReminderRow
            key={r.key}
            reminder={r}
            mode={modes[r.key] ?? 'notification'}
            volume={volumes[r.key] ?? 1}
            previewing={previewing === r.key}
            onChange={(patch) => setReminder(r.key, patch, patch.enabled === true)}
            onChooseMode={(m) => chooseMode(r.key, m)}
            onVolumeChange={(v) => setReminderVolume(r.key, v)}
          />
        ))}
        {loudAlarmFallback ? (
          <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
            <AppText style={{ color: theme.colors.danger }} variant="bodyStrong">Loud alarms are not active.</AppText>
            <AppText variant="caption" muted>
              {loudAlarmFallback === 'unavailable'
                ? 'They need iOS 26 or later on iPhone, or a newer app version. Your alarms use the standard alarm sound for now, and silent mode can mute it.'
                : 'Allow alarms for Bloom Health to turn them on. Your alarms use the standard alarm sound for now, and silent mode can mute it.'}
            </AppText>
            {loudAlarmFallback === 'unavailable' ? null : (
              <Button title={loudAlarmFallback === 'needsPermission' ? 'Allow alarms' : 'Open system settings'} variant="secondary" onPress={() => (loudAlarmFallback === 'needsPermission' ? void refreshReminders(true, true) : void Linking.openSettings())} />
            )}
          </View>
        ) : null}
        {hasLoudAlarm && !loudAlarmFallback && !fullScreenAllowed ? (
          <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
            <AppText variant="bodyStrong">Loud alarms can&apos;t open full screen.</AppText>
            <AppText variant="caption" muted>They still ring, but as a notification. Allow full-screen alerts to see them over your lock screen.</AppText>
            <Button title="Allow full-screen alerts" variant="secondary" onPress={() => void openFullScreenAlarmSettings()} />
          </View>
        ) : null}
        <AppText variant="caption" muted>Tap an option to preview it. Your choice is saved on this device only.</AppText>
        <AppText variant="caption" muted>Times use this device&apos;s timezone and are rescheduled automatically if it changes.</AppText>
      </Card>
    </Screen>
  );
}
