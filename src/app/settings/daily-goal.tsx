import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Button, Card, ErrorBanner, Row, Screen } from '@/components/ui';
import { ViewerBanner } from '@/components/ViewerBanner';
import { useActions } from '@/features/actions';
import { useGuarded } from '@/features/useGuarded';
import { WEEKDAY_LABELS } from '@/lib/dates';
import { sundayRestOn } from '@/lib/profile';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings } from '@/providers/DataProvider';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

// No side padding: the button's usual padding would push the row past the card on a phone.
const STEPPER_BUTTON = { width: MIN_TOUCH, paddingHorizontal: 0 };

export default function DailyGoalScreen() {
  const { isOwner } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const actions = useActions();
  const { err, guarded } = useGuarded();
  return (
    <Screen header={<ScreenHeader title="Daily goal" />}>
      <ViewerBanner />
      {err ? <ErrorBanner message={err} /> : null}
      <Card style={{ gap: spacing.md }}>
        <Row style={{ gap: spacing.md }}>
          <AppText style={{ flex: 1 }}>Count a day as successful at</AppText>
          <Row style={{ gap: spacing.xs }}>
            <Button title="−" variant="secondary" disabled={!isOwner || settings.dailyThreshold <= 50} onPress={() => guarded(() => actions.saveSettings({ dailyThreshold: Math.max(50, settings.dailyThreshold - 5) }, settings))} accessibilityLabel="Decrease goal by 5 percent" style={STEPPER_BUTTON} />
            <AppText variant="heading" accent style={{ minWidth: 52, textAlign: 'center' }} accessibilityLabel={`${settings.dailyThreshold} percent`}>{settings.dailyThreshold}%</AppText>
            <Button title="+" variant="secondary" disabled={!isOwner || settings.dailyThreshold >= 100} onPress={() => guarded(() => actions.saveSettings({ dailyThreshold: Math.min(100, settings.dailyThreshold + 5) }, settings))} accessibilityLabel="Increase goal by 5 percent" style={STEPPER_BUTTON} />
          </Row>
        </Row>
        <Row style={{ gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Sundays don&apos;t break my streak</AppText>
            <AppText variant="caption" muted>An unlogged Sunday is skipped. Log enough habits and it counts as a normal day.</AppText>
          </View>
          <Switch
            value={sundayRestOn(settings)}
            disabled={!isOwner}
            onValueChange={(v) => guarded(() => actions.saveSettings({ sundayRest: v }, settings))}
            accessibilityLabel="Sundays don't break my streak"
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            style={{ minHeight: MIN_TOUCH }}
          />
        </Row>
        <AppText variant="label" muted>Choose your rest days</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {WEEKDAY_LABELS.map((w, i) => {
            const on = settings.restDays.includes(i);
            return (
              <Pressable
                key={w}
                disabled={!isOwner}
                onPress={() => guarded(() => actions.saveSettings({ restDays: on ? settings.restDays.filter((x) => x !== i) : [...settings.restDays, i].sort() }, settings))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: !isOwner }}
                accessibilityLabel={`${w} rest day`}
                style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.colors.primary : theme.colors.tint, opacity: isOwner ? 1 : 0.6 }}
              >
                <AppText variant="label" style={{ color: on ? theme.colors.onPrimary : theme.colors.text }}>{w}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
