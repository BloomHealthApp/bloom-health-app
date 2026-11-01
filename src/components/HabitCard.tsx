import { GlassLayer } from './GlassLayer';
import React from 'react';
import { Pressable, View } from 'react-native';
import { describeTarget, formatHabitValue } from '@/lib/format';
import { HabitIcon } from '@/icons/HabitIcon';
import type { LogStatus } from '@/lib/scoring';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { Habit } from '@/types/api';
import { AppText } from './ui';

interface Props {
  habit: Habit;
  value: number | null;
  status: LogStatus;
  readOnly?: boolean;
  onToggle?: (on: boolean) => void;
  onPress?: () => void;
}

const STATUS_TEXT: Record<LogStatus, string> = { complete: 'completed', incomplete: 'not completed', partial: 'in progress', skipped: 'skipped' };

export function HabitCard({ habit, value, status, readOnly, onToggle, onPress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const done = status === 'complete';
  const isBool = habit.trackingType === 'boolean';
  const summary = `${habit.title}, ${STATUS_TEXT[status]}. ${isBool ? '' : formatHabitValue(habit, value) + '. '}Goal: ${describeTarget(habit)}`;

  const badge = (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: done ? c.primary : c.border,
        backgroundColor: done ? c.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done ? <AppText variant="label" style={{ color: c.onPrimary }}>✓</AppText> : status === 'partial' ? <AppText variant="caption" accent>…</AppText> : null}
    </View>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.glass, borderRadius: radius.lg, paddingRight: spacing.sm }}>
      <GlassLayer radius={radius.lg} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={summary}
        accessibilityHint={readOnly ? 'Opens details' : 'Opens details to log a value'}
        style={{ flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
          <HabitIcon icon={habit.icon} size={32} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>{habit.title}</AppText>
          <AppText variant="caption" muted>{isBool ? describeTarget(habit) : `${formatHabitValue(habit, value)} · ${describeTarget(habit)}`}</AppText>
        </View>
      </Pressable>
      {isBool && !readOnly ? (
        <Pressable
          onPress={() => onToggle?.(!done)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Mark ${habit.title} ${done ? 'not done' : 'done'}`}
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
        >
          {badge}
        </Pressable>
      ) : (
        <View style={{ minWidth: MIN_TOUCH, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{badge}</View>
      )}
    </View>
  );
}
