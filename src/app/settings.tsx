import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Switch, View } from 'react-native';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ThemePicker } from '@/components/ThemePicker';
import { ViewerBanner } from '@/components/ViewerBanner';
import { ReminderRow } from '@/components/reminders/ReminderRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Button, Card, ErrorBanner, Row, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { getReminderModes, getReminderVolumes, setReminderModes, setReminderVolumes } from '@/features/reminderModes';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { WEEKDAY_LABELS } from '@/lib/dates';
import { DISCLAIMER } from '@/lib/messages';
import { sundayRestOn } from '@/lib/profile';
import { canShowFullScreenAlarm, nativeAlarmApi, openFullScreenAlarmSettings } from '@/notifications/alarmAdapter';
import { cancelAllReminders, type ReminderMode, type ReminderModes, type ReminderVolumes } from '@/notifications/scheduler';
import { expoNotifApi } from '@/notifications/expoAdapter';
import { useAuth } from '@/providers/AuthProvider';
import { useData, useSettings, useSyncStatus } from '@/providers/DataProvider';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder, ThemeName } from '@/types/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, api, updateUser, signOut, isOwner } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const actions = useActions();
  const { syncNow, reminderStatus, refreshReminders } = useData();
  const sync = useSyncStatus();
  useSyncOnFocus();
  const [err, setErr] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
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

  // Closing the preview stops its sound when the user leaves this tab.
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

  const guarded = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

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

  return (
    <Screen header={<ScreenHeader title="Settings" />} onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'}>
      <ViewerBanner />
      {err ? <ErrorBanner message={err} /> : null}

      <Section title="Appearance" detail={`${theme.label} · ${theme.isDark ? 'Dark' : 'Light'}`}>
        <ThemePicker onPick={(n: ThemeName) => void api.patchMe({ theme: n }).then(updateUser).catch(() => {})} />
      </Section>

      <Section title="Daily goal" detail="Your streak, your pace">
        <Row style={{ gap: spacing.md }}>
          <AppText style={{ flex: 1 }}>Count a day as successful at</AppText>
          <Row style={{ gap: spacing.xs }}>
            <Button title="−" variant="secondary" disabled={!isOwner || settings.dailyThreshold <= 50} onPress={() => guarded(() => actions.saveSettings({ dailyThreshold: Math.max(50, settings.dailyThreshold - 5) }, settings))} accessibilityLabel="Decrease goal by 5 percent" style={STEPPER_BUTTON} />
            <AppText variant="heading" accent style={{ minWidth: 52, textAlign: 'center' }} accessibilityLabel={`${settings.dailyThreshold} percent`}>{settings.dailyThreshold}%</AppText>
            <Button title="+" variant="secondary" disabled={!isOwner || settings.dailyThreshold >= 100} onPress={() => guarded(() => actions.saveSettings({ dailyThreshold: Math.min(100, settings.dailyThreshold + 5) }, settings))} accessibilityLabel="Increase goal by 5 percent" style={STEPPER_BUTTON} />
          </Row>
        </Row>
        <Row style={{ gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Sundays don&apos;t break my streak</AppText>
            <AppText variant="caption" muted>An unlogged Sunday is skipped. Log enough habits and it counts as a normal day.</AppText>
          </View>
          <Switch
            value={sundayRestOn(settings)}
            disabled={!isOwner}
            onValueChange={(v) => guarded(() => actions.saveSettings({ sundayRest: v }, settings))}
            accessibilityLabel="Sundays don't break my streak"
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            style={{ minHeight: MIN_TOUCH }}
          />
        </Row>
        <AppText variant="label" muted>Choose your rest days</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {WEEKDAY_LABELS.map((w, i) => {
            const on = settings.restDays.includes(i);
            return (
              <Pressable
                key={w}
                disabled={!isOwner}
                onPress={() => guarded(() => actions.saveSettings({ restDays: on ? settings.restDays.filter((x) => x !== i) : [...settings.restDays, i].sort() }, settings))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: !isOwner }}
                accessibilityLabel={`${w} rest day`}
                style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.colors.primary : theme.colors.tint, opacity: isOwner ? 1 : 0.6 }}
              >
                <AppText variant="label" style={{ color: on ? theme.colors.onPrimary : theme.colors.text }}>{w}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {isOwner ? (
        <Section title="Reminders" detail={`${settings.reminders.filter((reminder) => reminder.enabled).length} of ${settings.reminders.length} on`}>
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
        </Section>
      ) : null}

      <Section title="More">
        <Button title={isOwner ? 'Manage habits' : 'View habits'} variant="secondary" onPress={() => router.push('/habits')} />
        <Button title="Sync now" variant="secondary" onPress={() => void syncNow()} loading={sync.state === 'syncing'} />
        <Button title="Sync issues" variant="ghost" onPress={() => router.push('/sync-issues')} />
      </Section>

      <Section title="Account">
        <Button title="Sign out" variant="danger" onPress={() => setConfirmOut(true)} />
      </Section>

      <AppText variant="caption" muted style={{ textAlign: 'center' }}>{DISCLAIMER}</AppText>

      <ConfirmationDialog
        visible={confirmOut}
        destructive
        title="Sign out?"
        message={sync.pending > 0 ? `You have ${sync.pending} unsynced change(s). Signing out will discard them.` : 'You will need a new email code to sign back in.'}
        confirmLabel="Sign out"
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setConfirmOut(false);
          await cancelAllReminders(expoNotifApi, { get: (k) => AsyncStorage.getItem('bubu.' + k), set: (k, v) => (v === null ? AsyncStorage.removeItem('bubu.' + k) : AsyncStorage.setItem('bubu.' + k, v)) }, nativeAlarmApi).catch(() => {});
          await signOut();
        }}
      />
    </Screen>
  );
}

// No side padding: the button's usual padding would push the row past the card on a phone.
const STEPPER_BUTTON = { width: MIN_TOUCH, paddingHorizontal: 0 };

function Section({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: spacing.md }}>
      <Row style={{ justifyContent: 'space-between', gap: spacing.md }}>
        <AppText variant="heading" accessibilityRole="header">{title}</AppText>
        {detail ? <AppText variant="caption" muted numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>{detail}</AppText> : null}
      </Row>
      {children}
    </Card>
  );
}
