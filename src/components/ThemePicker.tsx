import React from 'react';
import { Pressable, View } from 'react-native';
import { THEME_LIST } from '@/theme/themes';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeName } from '@/types/api';
import { AppText, Row } from './ui';

export function ThemePicker({ onPick }: { onPick?: (n: ThemeName) => void }) {
  const { theme, setThemeName } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
      {THEME_LIST.map((t) => {
        const selected = t.name === theme.name;
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
              {[t.colors.tint, t.colors.primary, t.colors.secondary, t.colors.bg].map((col, i) => (
                <View key={i} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: col, borderWidth: 1, borderColor: t.colors.border }} />
              ))}
            </Row>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>{t.label}</AppText>
            {selected ? <AppText variant="label" accent>Selected</AppText> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
