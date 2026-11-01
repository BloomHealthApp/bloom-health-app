import React from 'react';
import { Text } from 'react-native';
import { resolveHabitIcon } from '@/lib/habitIcon';
import { AppIcon } from './AppIcon';

/** A habit's sticker icon, or the emoji an older custom habit still has saved. */
export function HabitIcon({ icon, size = 24 }: { icon: string | null | undefined; size?: number }) {
  const r = resolveHabitIcon(icon);
  if (r.kind === 'icon') return <AppIcon name={r.name} size={size} />;
  return <Text accessibilityElementsHidden importantForAccessibility="no" style={{ fontSize: size * 0.85, lineHeight: size * 1.15 }}>{r.emoji}</Text>;
}
