import React from 'react';
import { Pressable, View } from 'react-native';
import { THEME_LIST } from '@/theme/themes';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme, type AppearanceMode } from '@/theme/ThemeProvider';
import type { ThemeName } from '@/types/api';
import { AppText, Row } from './ui';

const MODES: { mode: AppearanceMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

function AppearancePicker() {
  const { theme, appearance, setAppearance } = useTheme();
  return (
    <Row accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ gap: spacing.sm }}>
      {MODES.map(({ mode, label }) => {
        const selected = mode === appearance;
        return (
          <Pressable
            key={mode}
            onPress={() => setAppearance(mode)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label} appearance`}
            style={{ flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 2, borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? theme.colors.tint : theme.colors.surface }}
          >
            <AppText variant="bodyStrong">{label}</AppText>
          </Pressable>
        );
      })}
    </Row>
  );
}

export function ThemePicker({ onPick }: { onPick?: (n: ThemeName) => void }) {
  const { theme, setThemeName } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppearancePicker />
      <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={{ gap: spacing.sm }}>
      {THEME_LIST.map((t) => {
        const selected = t.name === theme.name;
        const swatch = theme.isDark ? t.darkColors : t.colors;
        return (
          <Pressable
            key={t.name}
            onPress={() => {
              setThemeName(t.name);
              onPick?.(t.name);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${t.label} theme`}
            style={{ minHeight: MIN_TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.surface }}
          >
            <Row style={{ gap: 4 }}>
              {[swatch.tint, swatch.primary, swatch.secondary, swatch.bg].map((col, i) => (
                <View key={i} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: col, borderWidth: 1, borderColor: swatch.border }} />
              ))}
            </Row>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>{t.label}</AppText>
            {selected ? <AppText variant="label" accent>Selected</AppText> : null}
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}
