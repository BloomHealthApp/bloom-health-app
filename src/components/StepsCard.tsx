import React, { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { formatNumber } from '@/lib/format';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Card, Row } from './ui';

export function StepsCard({ steps, goal, goalMax, readOnly, onSave }: { steps: number; goal: number; goalMax?: number | null; readOnly?: boolean; onSave?: (n: number) => void }) {
  const { theme } = useTheme();
  const [text, setText] = useState(steps ? String(steps) : '');
  useEffect(() => setText(steps ? String(steps) : ''), [steps]);
  const parsed = Number(text.replace(/,/g, ''));
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 200000;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <AppText variant="heading">👟 Steps</AppText>
        <AppText variant="bodyStrong" accent>
          {formatNumber(steps)} / {formatNumber(goal)}
          {goalMax ? `-${formatNumber(goalMax)}` : ''}
        </AppText>
      </Row>
      {!readOnly && onSave ? (
        <Row style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            placeholder="Enter today's steps"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Steps today"
            style={{ flex: 1, minHeight: MIN_TOUCH + 4, borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: spacing.md, fontFamily: fonts.semibold, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.bg }}
          />
          <Button title="Save" disabled={!valid} onPress={() => onSave(parsed)} accessibilityLabel="Save steps" />
        </Row>
      ) : null}
    </Card>
  );
}
