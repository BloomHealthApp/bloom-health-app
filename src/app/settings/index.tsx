import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsRow';
import { AppText, Card, Screen } from '@/components/ui';
import { ViewerBanner } from '@/components/ViewerBanner';
import { DISCLAIMER } from '@/lib/messages';
import { cancelAllReminders } from '@/notifications/scheduler';
import { expoNotifApi } from '@/notifications/expoAdapter';
import { nativeAlarmApi } from '@/notifications/alarmAdapter';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings, useSyncStatus } from '@/providers/DataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, isOwner } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const sync = useSyncStatus();
  const [confirmOut, setConfirmOut] = useState(false);
  const remindersOn = settings.reminders.filter((r) => r.enabled).length;

  return (
    <Screen header={<ScreenHeader title="Settings" />}>
      <ViewerBanner />
      <SettingsGroup title="Preferences">
        <Card>
          <SettingsRow icon="sparkles" title="Appearance" detail={`${theme.label} · ${theme.isDark ? 'Dark' : 'Light'}`} onPress={() => router.push('/settings/appearance')} />
          <SettingsRow icon="flame" title="Daily goal" detail={`${settings.dailyThreshold}%`} onPress={() => router.push('/settings/daily-goal')} />
          {isOwner ? <SettingsRow icon="bell" title="Reminders" detail={`${remindersOn} of ${settings.reminders.length} on`} onPress={() => router.push('/settings/reminders')} /> : null}
        </Card>
      </SettingsGroup>
      <SettingsGroup title="Your data">
        <Card>
          <SettingsRow icon="check" title={isOwner ? 'Manage habits' : 'View habits'} onPress={() => router.push('/habits')} />
          <SettingsRow icon="calendar" title="Sync" detail={sync.pending > 0 ? `${sync.pending} waiting` : undefined} onPress={() => router.push('/settings/sync')} />
        </Card>
      </SettingsGroup>
      <SettingsGroup title="Account">
        <Card>
          <SettingsRow icon="close" title="Sign out" danger chevron={false} onPress={() => setConfirmOut(true)} />
        </Card>
      </SettingsGroup>
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
