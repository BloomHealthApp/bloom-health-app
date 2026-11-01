import React from 'react';
import { View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { Mascot } from './Mascot';
import type { MascotMood } from './mascotTypes';
import { AppText, Button } from './ui';

export function EmptyState({ title, message, mood = 'thinking', actionLabel, onAction }: { title: string; message?: string; mood?: MascotMood; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl, gap: spacing.md }}>
      <Mascot mood={mood} size={96} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>{title}</AppText>
      {message ? <AppText muted style={{ textAlign: 'center' }}>{message}</AppText> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
