import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { HABIT_ICON_CHOICES, ICON_LABELS, resolveHabitIcon } from '@/lib/habitIcon';
import { AppText } from '@/components/ui';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppIcon } from './AppIcon';

const CELL = MIN_TOUCH + 4;

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const { theme } = useTheme();
  const current = resolveHabitIcon(value);
  const cell = (selected: boolean) => ({ width: CELL, height: CELL, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: radius.sm, borderWidth: 2, borderColor: selected ? theme.colors.accent : 'transparent', backgroundColor: selected ? theme.colors.tint : theme.colors.surface });
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">Icon</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Icon" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {current.kind === 'emoji' ? (
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: true }} accessibilityLabel="Current emoji" onPress={() => onChange(value)} style={cell(true)}>
            <Text style={{ fontSize: 24 }}>{current.emoji}</Text>
          </Pressable>
        ) : null}
        {HABIT_ICON_CHOICES.map((name) => {
          const selected = current.kind === 'icon' && current.name === name;
          return (
            <Pressable key={name} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={ICON_LABELS[name]} onPress={() => onChange(name)} style={cell(selected)}>
              <AppIcon name={name} size={32} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
