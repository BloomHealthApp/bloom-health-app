import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Card, Row, Screen } from '@/components/ui';
import { deviceStepsAvailable, getAutoStepsPref, requestDeviceSteps, setAutoStepsPref } from '@/features/autoSteps';
import { useAuth } from '@/providers/AuthProvider';
import { MIN_TOUCH, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function StepsSettings() {
  const { user, isOwner } = useAuth();
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    void getAutoStepsPref(userId).then(setEnabled);
    void deviceStepsAvailable().then(setAvailable);
  }, [userId]);

  if (!isOwner) return <Redirect href="/settings" />;

  const toggle = async (on: boolean) => {
    if (!userId) return;
    setNote(null);
    const allowed = on ? await requestDeviceSteps() : false;
    if (on && !allowed) setNote('Bloom Health needs permission to read steps. You can still enter them by hand.');
    setEnabled(allowed);
    await setAutoStepsPref(userId, allowed);
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
          Reads your daily totals when you open the app, including the past 7 days. A number you enter yourself is kept for that day. Anyone with viewer access can see your steps.
        </AppText>
        {!available ? <AppText variant="caption" muted style={{ marginTop: spacing.sm }}>Step data isn&apos;t available on this device or in this version of the app.</AppText> : null}
        {note ? <AppText variant="caption" style={{ marginTop: spacing.sm }}>{note}</AppText> : null}
      </Card>
    </Screen>
  );
}
