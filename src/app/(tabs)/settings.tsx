import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, Switch, TextInput, View } from 'react-native';
import { Avatar } from '@/avatars/Avatar';
import { AvatarPicker } from '@/avatars/AvatarPicker';
import { avatarLabel, isAvatarId } from '@/avatars/avatarCatalog';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Field } from '@/components/Field';
import { GenderPicker } from '@/components/GenderPicker';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { ThemePicker } from '@/components/ThemePicker';
import { ViewerBanner } from '@/components/ViewerBanner';
import { AppText, Button, Card, ErrorBanner, Row, Screen } from '@/components/ui';
import { USE_MOCK_API, API_BASE_URL } from '@/config';
import { useActions } from '@/features/actions';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { parseHHmm, WEEKDAY_LABELS } from '@/lib/dates';
import { REMINDER_LABELS } from '@/lib/defaults';
import { DISCLAIMER } from '@/lib/messages';
import { genderPatch, isPeriodTrackerOn, showTrackerSwitch, sundayRestOn } from '@/lib/profile';
import { cancelAllReminders } from '@/notifications/scheduler';
import { expoNotifApi } from '@/notifications/expoAdapter';
import { useAuth } from '@/providers/AuthProvider';
import { useData, useSettings, useSyncStatus } from '@/providers/DataProvider';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Gender, Reminder, ThemeName } from '@/types/api';

export default function SettingsTab() {
  const router = useRouter();
  const { user, api, updateUser, signOut, isOwner } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const actions = useActions();
  const { syncNow, reminderStatus, refreshReminders } = useData();
  const sync = useSyncStatus();
  useSyncOnFocus();
  const [name, setName] = useState(user?.displayName ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => setName(user?.displayName ?? ''), [user?.displayName]);

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

  return (
    <Screen onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'}>
      <Row style={{ justifyContent: 'space-between' }}>
        <AppText variant="title" accessibilityRole="header">Settings</AppText>
        <SyncStatusChip onPress={() => router.push('/sync-issues')} />
      </Row>
      <ViewerBanner />
      {err ? <ErrorBanner message={err} /> : null}
      {msg ? <AppText variant="caption" accent accessibilityLiveRegion="polite">{msg}</AppText> : null}

      <Section title="Profile">
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Pressable
            onPress={() => setPickingAvatar(true)}
            accessibilityRole="button"
            accessibilityLabel={`Change avatar. Current: ${isAvatarId(user?.avatar) ? avatarLabel(user?.avatar) : 'none chosen'}`}
            style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
          >
            <Avatar id={user?.avatar} size={96} decorative />
          </Pressable>
          <Button title="Change avatar" variant="ghost" onPress={() => setPickingAvatar(true)} />
        </View>
        <AppText muted>{user?.email}{user?.phone ? ` · ${user.phone}` : ''} · {isOwner ? 'Owner' : `Viewer of ${user?.ownerDisplayName}`}</AppText>
        <Field label="Display name" value={name} onChangeText={setName} maxLength={40} />
        <Button
          title="Save name"
          variant="secondary"
          disabled={!name.trim() || name.trim() === user?.displayName}
          onPress={() => guarded(async () => { updateUser(await api.patchMe({ displayName: name.trim() })); setMsg('Name updated.'); })}
        />
        <GenderPicker value={user?.gender} onChange={(g: Gender | null) => guarded(async () => { updateUser(await api.patchMe(genderPatch(g))); setMsg('Profile updated.'); })} />
        {showTrackerSwitch(user) ? (
          <View style={{ gap: spacing.sm }}>
            <Row style={{ gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Period tracker</AppText>
                <AppText variant="caption" muted>Private to you. Period days also won&apos;t break your streak.</AppText>
              </View>
              <Switch
                value={isPeriodTrackerOn(user)}
                onValueChange={(v) => guarded(async () => { updateUser(await api.patchMe({ periodTrackerEnabled: v })); })}
                accessibilityLabel="Period tracker"
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                style={{ minHeight: MIN_TOUCH }}
              />
            </Row>
            {isPeriodTrackerOn(user) ? <Button title="Open period tracker" variant="secondary" onPress={() => router.push('/periods')} /> : null}
          </View>
        ) : null}
      </Section>

      <Section title="Appearance">
        <ThemePicker onPick={(n: ThemeName) => void api.patchMe({ theme: n }).then(updateUser).catch(() => {})} />
      </Section>

      <Section title="Daily goal">
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText>Count a day as successful at</AppText>
          <Row style={{ gap: spacing.sm }}>
            <Button title="−" variant="secondary" disabled={!isOwner || settings.dailyThreshold <= 50} onPress={() => guarded(() => actions.saveSettings({ dailyThreshold: Math.max(50, settings.dailyThreshold - 5) }, settings))} accessibilityLabel="Decrease goal by 5 percent" style={{ paddingHorizontal: spacing.lg }} />
            <AppText variant="heading" accent style={{ minWidth: 56, textAlign: 'center' }} accessibilityLabel={`${settings.dailyThreshold} percent`}>{settings.dailyThreshold}%</AppText>
            <Button title="+" variant="secondary" disabled={!isOwner || settings.dailyThreshold >= 100} onPress={() => guarded(() => actions.saveSettings({ dailyThreshold: Math.min(100, settings.dailyThreshold + 5) }, settings))} accessibilityLabel="Increase goal by 5 percent" style={{ paddingHorizontal: spacing.lg }} />
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
        <AppText variant="label" muted>Other rest days (do not break your streak)</AppText>
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
        <Section title="Reminders">
          {reminderStatus?.status === 'denied' ? (
            <View accessibilityRole="alert" style={{ gap: spacing.sm }}>
              <AppText style={{ color: theme.colors.danger }} variant="bodyStrong">Notifications are turned off for Bloom Health.</AppText>
              <AppText variant="caption" muted>Reminders will not appear until you allow notifications.</AppText>
              <Button title={reminderStatus.canAskAgain ? 'Allow notifications' : 'Open system settings'} variant="secondary" onPress={() => (reminderStatus.canAskAgain ? void refreshReminders(true) : void Linking.openSettings())} />
            </View>
          ) : null}
          {settings.reminders.map((r) => (
            <ReminderRow key={r.key} reminder={r} onChange={(patch) => setReminder(r.key, patch, patch.enabled === true)} />
          ))}
          <AppText variant="caption" muted>Times use this device&apos;s timezone and are rescheduled automatically if it changes.</AppText>
        </Section>
      ) : null}

      <Section title="Habits & data">
        <Button title={isOwner ? 'Manage habits' : 'View habits'} variant="secondary" onPress={() => router.push('/habits')} />
        <Button title="Sync now" variant="secondary" onPress={() => void syncNow()} loading={sync.state === 'syncing'} />
        <Button title={`Sync issues${sync.failed ? ` (${sync.failed})` : ''}`} variant="ghost" onPress={() => router.push('/sync-issues')} />
      </Section>

      <Section title="Account">
        <Button title="Sign out" variant="danger" onPress={() => setConfirmOut(true)} />
      </Section>

      <AppText variant="caption" muted style={{ textAlign: 'center' }}>{DISCLAIMER}</AppText>
      <AppText variant="caption" muted style={{ textAlign: 'center' }}>
        v{Constants.expoConfig?.version ?? '1.0.0'} · {USE_MOCK_API ? 'Demo mode (mock API)' : API_BASE_URL}
      </AppText>

      <Modal visible={pickingAvatar} animationType="slide" transparent onRequestClose={() => setPickingAvatar(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View accessibilityViewIsModal style={{ backgroundColor: theme.colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md }}>
            <AppText variant="heading" accessibilityRole="header">Choose your Bloom</AppText>
            <AvatarPicker
              value={user?.avatar}
              disabled={savingAvatar}
              onChange={(id) => {
                if (id === user?.avatar) return setPickingAvatar(false);
                setSavingAvatar(true);
                guarded(async () => {
                  updateUser(await api.patchMe({ avatar: id }));
                  setMsg('Avatar updated.');
                  setPickingAvatar(false);
                }).finally(() => setSavingAvatar(false));
              }}
            />
            {err ? <ErrorBanner message={err} /> : null}
            <Button title="Close" variant="secondary" onPress={() => setPickingAvatar(false)} />
          </View>
        </View>
      </Modal>

      <ConfirmationDialog
        visible={confirmOut}
        destructive
        title="Sign out?"
        message={sync.pending > 0 ? `You have ${sync.pending} unsynced change(s). Signing out will discard them.` : 'You will need a new email code to sign back in.'}
        confirmLabel="Sign out"
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setConfirmOut(false);
          await cancelAllReminders(expoNotifApi, { get: (k) => AsyncStorage.getItem('bubu.' + k), set: (k, v) => (v === null ? AsyncStorage.removeItem('bubu.' + k) : AsyncStorage.setItem('bubu.' + k, v)) }).catch(() => {});
          await signOut();
        }}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: spacing.md }}>
      <AppText variant="heading" accessibilityRole="header">{title}</AppText>
      {children}
    </Card>
  );
}

function ReminderRow({ reminder, onChange }: { reminder: Reminder; onChange: (p: Partial<Reminder>) => void }) {
  const { theme } = useTheme();
  const [time, setTime] = useState(reminder.time);
  useEffect(() => setTime(reminder.time), [reminder.time]);
  const valid = !!parseHHmm(time);
  const label = REMINDER_LABELS[reminder.key].title;
  return (
    <Row style={{ gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {!valid ? <AppText variant="caption" style={{ color: theme.colors.danger }}>Use HH:mm, e.g. 21:30</AppText> : null}
      </View>
      <TextInput
        value={time}
        onChangeText={setTime}
        onEndEditing={() => {
          const p = parseHHmm(time);
          if (p) onChange({ time: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` });
          else setTime(reminder.time);
        }}
        accessibilityLabel={`${label} time`}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        style={{ width: 84, minHeight: MIN_TOUCH, textAlign: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: valid ? theme.colors.border : theme.colors.danger, fontFamily: fonts.semibold, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.bg }}
      />
      <Switch
        value={reminder.enabled}
        onValueChange={(v) => onChange({ enabled: v })}
        accessibilityLabel={`${label} reminder`}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        style={{ minHeight: MIN_TOUCH }}
      />
    </Row>
  );
}
