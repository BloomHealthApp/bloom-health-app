import React from 'react';
import { Pressable, View } from 'react-native';
import { cycleSummary } from '@/lib/periodsView';
import type { Prediction } from '@/lib/cycle';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { BubuMascot } from './BubuMascot';
import { AppText, Row } from './ui';

/** Small Home card for owners with the tracker on (never rendered for viewers). Tapping opens the tracker. */
export function CycleCard({ prediction, hasPeriods, onPress }: { prediction: Prediction; hasPeriods: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const s = cycleSummary(prediction, hasPeriods);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Period tracker. ${s.title}. ${s.subtitle}`}
      accessibilityHint="Opens your private period tracker"
      style={({ pressed }) => ({ minHeight: MIN_TOUCH, backgroundColor: theme.colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: spacing.md, opacity: pressed ? 0.85 : 1 })}
    >
      <Row style={{ gap: spacing.md }}>
        <BubuMascot mood={s.mood} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="caption" muted>🔒 Private cycle</AppText>
          <AppText variant="bodyStrong">{s.title}</AppText>
          <AppText variant="caption" muted numberOfLines={2}>{s.subtitle}</AppText>
        </View>
        <AppText variant="heading" accent accessibilityElementsHidden importantForAccessibility="no">›</AppText>
      </Row>
    </Pressable>
  );
}
