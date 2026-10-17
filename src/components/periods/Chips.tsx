import React from 'react';
import { Pressable, View } from 'react-native';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '../ui';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/** Wrapping chip row; `multi` toggles many values, otherwise a single (optionally clearable) choice. 44pt targets, state is not colour-only (checked/selected). */
export function ChipRow<T extends string>({ label, options, selected, onToggle, multi }: { label: string; options: ChipOption<T>[]; selected: T[]; onToggle: (v: T) => void; multi?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" muted>{label}</AppText>
      <View accessibilityRole={multi ? undefined : 'radiogroup'} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityState={multi ? { checked: on } : { selected: on }}
              accessibilityLabel={`${label}: ${o.label}`}
              style={{ minHeight: MIN_TOUCH, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? theme.colors.primary : theme.colors.tint, borderWidth: on ? 0 : 1, borderColor: theme.colors.border }}
            >
              <AppText variant="label" style={{ color: on ? theme.colors.onPrimary : theme.colors.text }}>{on ? '✓ ' : ''}{o.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
