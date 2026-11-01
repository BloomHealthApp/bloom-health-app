import { AppIcon } from '@/icons/AppIcon';
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { MAX_DAILY_STEPS } from '@/lib/deviceSteps';
import { formatNumber } from '@/lib/format';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { Segmented } from './Field';
import { AppText, Button, Card, Row } from './ui';

const QUICK_ADDS = [50, 100, 200];
type StepMode = 'auto' | 'manual';
const MODES: { value: StepMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'manual', label: 'Manual' },
];

/** The whole number to add from what was typed, or null if it can't be added. */
export function parseStepAmount(text: string): number | null {
  const trimmed = text.replace(/,/g, '').trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 && n <= MAX_DAILY_STEPS ? n : null;
}

interface Props {
  steps: number;
  goal: number;
  goalMax?: number | null;
  readOnly?: boolean;
  source?: 'manual' | 'device';
  mode?: StepMode;
  autoAvailable?: boolean;
  /** Set when the last switch to Auto was refused. */
  modeNote?: string | null;
  onModeChange?: (mode: StepMode) => void;
  onAdd?: (delta: number) => void;
}

export function StepsCard({ steps, goal, goalMax, readOnly, source, mode = 'manual', autoAvailable, modeNote, onModeChange, onAdd }: Props) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  const amount = parseStepAmount(text);
  const add = (n: number) => {
    onAdd?.(n);
    setLastAdded(n);
  };
  const changeMode = (next: StepMode) => {
    setLastAdded(null);
    onModeChange?.(next);
  };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: spacing.sm }}><AppIcon name="footprints" size={28} /><AppText variant="heading">Steps</AppText></Row>
        <AppText variant="bodyStrong" accent>
          {formatNumber(steps)} / {formatNumber(goal)}
          {goalMax ? `-${formatNumber(goalMax)}` : ''}
        </AppText>
      </Row>
      {source === 'device' && steps > 0 ? <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>From your phone</AppText> : null}
      {!readOnly ? (
        <>
          {autoAvailable ? (
            <View style={{ marginTop: spacing.md }}><Segmented label="Record steps" value={mode} options={MODES} onChange={changeMode} /></View>
          ) : (
            <AppText variant="caption" muted style={{ marginTop: spacing.sm }}>Auto-tracking isn&apos;t available in this version of the app.</AppText>
          )}
          {modeNote ? <AppText variant="caption" style={{ marginTop: spacing.sm }}>{modeNote}</AppText> : null}
          {mode === 'manual' && onAdd ? (
            <>
              <Row style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {QUICK_ADDS.map((n) => (
                  <Button key={n} title={`+${n}`} variant="secondary" onPress={() => add(n)} style={{ flex: 1 }} accessibilityLabel={`Add ${n} steps`} />
                ))}
              </Row>
              <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  keyboardType="number-pad"
                  placeholder="Steps to add"
                  placeholderTextColor={theme.colors.textMuted}
                  accessibilityLabel="Steps to add"
                  style={{ flex: 1, minHeight: MIN_TOUCH, borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: spacing.md, fontFamily: fonts.semibold, fontSize: 13, color: theme.colors.text, backgroundColor: theme.colors.bg }}
                />
                <Button
                  title="Add"
                  disabled={amount === null}
                  onPress={() => {
                    if (amount === null) return;
                    add(amount);
                    setText('');
                  }}
                  accessibilityLabel="Add typed steps"
                />
                <Button
                  title="Undo"
                  variant="ghost"
                  disabled={lastAdded === null}
                  onPress={() => {
                    if (lastAdded === null) return;
                    onAdd(-lastAdded);
                    setLastAdded(null);
                  }}
                  style={{ paddingHorizontal: spacing.md }}
                  accessibilityLabel={lastAdded === null ? 'Undo last add' : `Remove ${lastAdded} steps`}
                />
              </Row>
            </>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
