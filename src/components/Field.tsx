import React from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './ui';

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" muted>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textMuted}
        {...props}
        style={[
          { minHeight: MIN_TOUCH + 8, borderRadius: radius.md, borderWidth: 1, borderColor: error ? theme.colors.danger : theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: spacing.lg, fontFamily: fonts.semibold, fontSize: 16, color: theme.colors.text },
          props.style,
        ]}
      />
      {error ? <AppText variant="caption" style={{ color: theme.colors.danger }} accessibilityRole="alert">{error}</AppText> : null}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" muted>{label}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const sel = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={o.label}
              style={{ minHeight: MIN_TOUCH, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: sel ? theme.colors.primary : theme.colors.tint }}
            >
              <AppText variant="label" style={{ color: sel ? theme.colors.onPrimary : theme.colors.text }}>{o.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
