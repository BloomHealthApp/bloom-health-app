import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { Switch } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Card, Row, Screen } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { useAutoSteps } from '@/features/useAutoSteps';
import { HABIT_IDS } from '@/lib/defaults';
import { useAuth } from '@/providers/AuthProvider';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function StepsSettings() {
  const { isOwner } = useAuth();
  const { theme } = useTheme();
  const d = useDerived();
  const { enabled, available, setMode } = useAutoSteps(d.activeHabits.find((h) => h.id === HABIT_IDS.steps));
  const [note, setNote] = useState<string | null>(null);

  if (!isOwner) return <Redirect href="/settings" />;

  const toggle = async (on: boolean) => {
    setNote(null);
    if (!(await setMode(on ? 'auto' : 'manual'))) setNote('Bloom Health needs permission to read steps. You can still add them by hand.');
  };

  return (
    <Screen header={<ScreenHeader title="Auto-track steps" />}>
      <Card>
        <Row style={{ justifyContent: 'space-between', gap: spacing.md }}>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>Fill in steps from my phone</AppText>
          <Switch
            value={enabled}
            disabled={!available}
            onValueChange={(on) => void toggle(on)}
            accessibilityLabel="Fill in steps from my phone"
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            style={{ minHeight: MIN_TOUCH }}
          />
        </Row>
        <AppText variant="caption" muted style={{ marginTop: spacing.sm }}>
          Reads your daily totals when you open the app, including the past 7 days. Days you added by hand keep their number, except today, which switches to your phone&apos;s total. Anyone with viewer access can see your steps.
        </AppText>
        {!available ? <AppText variant="caption" muted style={{ marginTop: spacing.sm }}>Step data isn&apos;t available on this device or in this version of the app.</AppText> : null}
        {note ? <AppText variant="caption" style={{ marginTop: spacing.sm }}>{note}</AppText> : null}
      </Card>
    </Screen>
  );
}
