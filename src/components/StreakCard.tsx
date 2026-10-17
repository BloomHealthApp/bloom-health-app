import React from 'react';
import { View } from 'react-native';
import { MILESTONES, isMilestone, nextMilestone } from '@/lib/scoring';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { BubuMascot } from './BubuMascot';
import { AppText, Card, Row } from './ui';

export function StreakCard({ current, longest }: { current: number; longest: number }) {
  const { theme } = useTheme();
  const next = nextMilestone(current);
  const celebrating = current > 0 && isMilestone(current);
  return (
    <Card tint accessible accessibilityLabel={`Current streak ${current} days. Longest streak ${longest} days.${next ? ` Next milestone ${next} days.` : ''}`}>
      <Row style={{ gap: spacing.lg }}>
        {celebrating ? <BubuMascot mood="cheer" size={72} /> : null}
        <View style={{ flex: 1 }}>
          {celebrating ? <AppText variant="label" accent>Milestone reached: {current} days!</AppText> : null}
          <Row style={{ alignItems: 'flex-end', gap: spacing.sm }}>
            <AppText variant="big" accent>🔥 {current}</AppText>
            <AppText variant="bodyStrong" style={{ marginBottom: 6 }}>day streak</AppText>
          </Row>
          <AppText variant="caption" muted>Longest: {longest} days{next ? ` · next milestone ${next}` : ' · every milestone reached'}</AppText>
        </View>
      </Row>
      <Row style={{ gap: spacing.sm, marginTop: spacing.md }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {MILESTONES.map((m) => (
          <View key={m} style={{ paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: 999, backgroundColor: longest >= m ? theme.colors.primary : theme.colors.surface }}>
            <AppText variant="caption" style={{ color: longest >= m ? theme.colors.onPrimary : theme.colors.textMuted }}>{m}</AppText>
          </View>
        ))}
      </Row>
    </Card>
  );
}
