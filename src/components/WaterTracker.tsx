import React from 'react';
import { View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Mascot } from './Mascot';
import { AppText, Button, Card, Row } from './ui';

export function WaterTracker({ ml, goal, readOnly, onAdd }: { ml: number; goal: number; readOnly?: boolean; onAdd?: (delta: number) => void }) {
  const { theme } = useTheme();
  const pct = Math.min(1, goal > 0 ? ml / goal : 0);
  return (
    <Card>
      <Row style={{ gap: spacing.md }}>
        <Mascot mood="hydrate" size={80} />
        <AppText variant="heading" style={{ flex: 1 }}>💧 Water</AppText>
        <AppText variant="bodyStrong" accent accessibilityLabel={`${formatNumber(ml)} of ${formatNumber(goal)} millilitres`}>
          {formatNumber(ml)} / {formatNumber(goal)} ml
        </AppText>
      </Row>
      <View
        style={{ height: 14, backgroundColor: theme.colors.tint, borderRadius: 7, marginVertical: spacing.md, overflow: 'hidden' }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      >
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 7 }} />
      </View>
      {!readOnly && onAdd ? (
        <Row style={{ gap: spacing.sm }}>
          <Button title="+250 ml" variant="secondary" onPress={() => onAdd(250)} style={{ flex: 1 }} accessibilityLabel="Add 250 millilitres of water" />
          <Button title="+500 ml" onPress={() => onAdd(500)} style={{ flex: 1 }} accessibilityLabel="Add 500 millilitres of water" />
          <Button title="Undo" variant="ghost" disabled={ml <= 0} onPress={() => onAdd(-250)} style={{ paddingHorizontal: spacing.md }} accessibilityLabel="Remove 250 millilitres" />
        </Row>
      ) : null}
    </Card>
  );
}
