import React from 'react';
import { Pressable, View } from 'react-native';
import { GENDER_OPTIONS, type Gender } from '@/types/api';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { GlassLayer } from './GlassLayer';
import { AppText } from './ui';

/** Optional single choice; tapping the selected option clears it (gender is never required). */
export function GenderPicker({ value, onChange, disabled, label = 'Gender (optional)', hideLabel }: { value: Gender | null | undefined; onChange: (g: Gender | null) => void; disabled?: boolean; label?: string; hideLabel?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : <AppText variant="label" muted>{label}</AppText>}
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {GENDER_OPTIONS.map((o) => {
          const sel = o.value === value;
          return (
            <Pressable
              key={o.value}
              disabled={disabled}
              onPress={() => onChange(sel ? null : o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel, disabled: !!disabled }}
              accessibilityLabel={o.label}
              accessibilityHint={sel ? 'Double tap to clear' : undefined}
              style={{ minHeight: MIN_TOUCH, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: sel ? theme.colors.primary : theme.colors.tint, opacity: disabled ? 0.6 : 1 }}
            >
              <GlassLayer radius={radius.pill} onFill />
              <AppText variant="label" style={{ color: sel ? theme.colors.onPrimary : theme.colors.text }}>{sel ? `${o.label}  ✓` : o.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
