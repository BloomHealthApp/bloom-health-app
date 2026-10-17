import React from 'react';
import { View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { BubuMascot } from './BubuMascot';
import type { MascotMood } from './mascotTypes';
import { AppText, Button } from './ui';

export function EmptyState({ title, message, mood = 'thinking', actionLabel, onAction }: { title: string; message?: string; mood?: MascotMood; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.md }}>
      <BubuMascot mood={mood} size={110} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>{title}</AppText>
      {message ? <AppText muted style={{ textAlign: 'center' }}>{message}</AppText> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
