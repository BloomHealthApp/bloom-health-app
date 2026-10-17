import React from 'react';
import { Pressable } from 'react-native';
import { useSyncStatus } from '@/providers/DataProvider';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './ui';

export function SyncStatusChip({ onPress }: { onPress?: () => void }) {
  const s = useSyncStatus();
  const { theme } = useTheme();
  const c = theme.colors;
  let label = 'Synced';
  let dot = c.success;
  if (s.state === 'syncing') {
    label = 'Syncing…';
    dot = c.accent;
  } else if (s.state === 'offline') {
    label = s.pending > 0 ? `Offline · ${s.pending} pending` : 'Offline';
    dot = c.warning;
  } else if (s.state === 'failed') {
    label = `Failed (${s.failed})`;
    dot = c.danger;
  } else if (s.state === 'pending') {
    label = `Pending (${s.pending})`;
    dot = c.warning;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${label}`}
      accessibilityHint="Opens sync details"
      style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: c.tint }}
    >
      <Dot color={dot} />
      <AppText variant="caption">{label}</AppText>
    </Pressable>
  );
}

function Dot({ color }: { color: string }) {
  return <AppText style={{ color, fontSize: 12, lineHeight: 14 }}>●</AppText>;
}
