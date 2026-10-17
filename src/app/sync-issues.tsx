import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { AppText, Button, Card, Row, Screen } from '@/components/ui';
import type { QueuedOp } from '@/db/store';
import { useData, useSyncStatus } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';

const NAMES: Record<string, string> = { habit: 'Habit', dailyLog: 'Daily log', workout: 'Workout', settings: 'Settings' };
const EXPLAIN: Record<string, string> = {
  conflict: 'Changed elsewhere first. The server version was kept.',
  rejected: 'The server refused this change, so it was not applied.',
  failed: 'Could not reach the server after several tries.',
};

export default function SyncIssues() {
  const { engine, store } = useData();
  const status = useSyncStatus();
  const [ops, setOps] = useState<QueuedOp[]>([]);
  const [pendingCount, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const all = await store.listOps();
      if (!alive) return;
      setOps(all.filter((o) => o.status !== 'pending'));
      setPending(all.length - all.filter((o) => o.status !== 'pending').length);
    };
    void load();
    const unsub = store.subscribe(() => void load());
    return () => {
      alive = false;
      unsub();
    };
  }, [store]);

  const retryable = ops.filter((o) => o.status === 'failed').length;
  return (
    <Screen header={<ScreenHeader title="Sync" right={<SyncStatusChip />} />}>
      <Card tint>
        <AppText variant="bodyStrong">{pendingCount} waiting to upload · {ops.length} need attention</AppText>
        {status.lastSyncedAt ? <AppText variant="caption" muted>Last synced {new Date(status.lastSyncedAt).toLocaleTimeString()}</AppText> : null}
        {status.lastError ? <AppText variant="caption" muted>Last error: {status.lastError}</AppText> : null}
        <Row style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button title="Sync now" onPress={() => void engine.sync()} style={{ flex: 1 }} />
          {retryable > 0 ? <Button title="Retry failed" variant="secondary" onPress={() => void engine.retryFailed()} style={{ flex: 1 }} /> : null}
        </Row>
      </Card>
      {ops.length === 0 ? <EmptyState title="All clear" message="No sync issues." mood="happy" /> : null}
      {ops.map((o) => (
        <Card key={o.operationId}>
          <AppText variant="bodyStrong">{NAMES[o.entityType] ?? o.entityType} · {o.op}</AppText>
          <AppText variant="caption" muted>{EXPLAIN[o.status]}{o.lastError ? ` (${o.lastError})` : ''}</AppText>
          <View style={{ height: spacing.sm }} />
          <Button title="Dismiss" variant="secondary" onPress={() => void engine.discardOp(o.operationId)} accessibilityLabel={`Dismiss ${NAMES[o.entityType]} issue`} />
        </Card>
      ))}
    </Screen>
  );
}
