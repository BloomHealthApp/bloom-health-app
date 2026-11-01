import { AppIcon } from '@/icons/AppIcon';
import React, { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { formatNumber } from '@/lib/format';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Card, Row } from './ui';

export function StepsCard({ steps, goal, goalMax, readOnly, onSave, source, autoTracking, onUsePhoneCount }: { steps: number; goal: number; goalMax?: number | null; readOnly?: boolean; onSave?: (n: number) => void; source?: 'manual' | 'device'; autoTracking?: boolean; onUsePhoneCount?: () => void }) {
  const { theme } = useTheme();
  const [text, setText] = useState(steps ? String(steps) : '');
  useEffect(() => setText(steps ? String(steps) : ''), [steps]);
  const parsed = Number(text.replace(/,/g, ''));
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 200000;
  const fromPhone = source === 'device' && steps > 0;
  const enteredByHand = !!autoTracking && !fromPhone && steps > 0;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: spacing.sm }}><AppIcon name="footprints" size={28} /><AppText variant="heading">Steps</AppText></Row>
        <AppText variant="bodyStrong" accent>
          {formatNumber(steps)} / {formatNumber(goal)}
          {goalMax ? `-${formatNumber(goalMax)}` : ''}
        </AppText>
      </Row>
      {fromPhone ? <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>From your phone</AppText> : null}
      {enteredByHand ? <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>Entered manually</AppText> : null}
      {!readOnly && onSave ? (
        <Row style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            placeholder="Enter today's steps"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Steps today"
            style={{ flex: 1, minHeight: MIN_TOUCH, borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: spacing.md, fontFamily: fonts.semibold, fontSize: 13, color: theme.colors.text, backgroundColor: theme.colors.bg }}
          />
          <Button title="Save" disabled={!valid} onPress={() => onSave(parsed)} accessibilityLabel="Save steps" />
        </Row>
      ) : null}
      {!readOnly && enteredByHand && onUsePhoneCount ? <Button title="Use phone count" variant="secondary" onPress={onUsePhoneCount} accessibilityLabel="Use phone count" style={{ marginTop: spacing.sm }} /> : null}
    </Card>
  );
}
