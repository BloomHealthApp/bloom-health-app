import { useRouter } from 'expo-router';
import React from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { useData, useSyncStatus } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';

export default function SyncScreen() {
  const router = useRouter();
  const { syncNow } = useData();
  const sync = useSyncStatus();
  useSyncOnFocus();
  return (
    <Screen header={<ScreenHeader title="Sync" />} onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'}>
      <Card style={{ gap: spacing.md }}>
        <AppText muted>{sync.pending > 0 ? `${sync.pending} change(s) waiting to sync.` : 'Everything on this device is saved.'}</AppText>
        <Button title="Sync now" variant="secondary" onPress={() => void syncNow()} loading={sync.state === 'syncing'} />
        <Button title="Sync issues" variant="ghost" onPress={() => router.push('/sync-issues')} />
      </Card>
    </Screen>
  );
}
