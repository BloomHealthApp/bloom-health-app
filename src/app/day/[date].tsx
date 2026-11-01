import { AppIcon } from '@/icons/AppIcon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { HabitCard } from '@/components/HabitCard';
import { ProgressRing } from '@/components/ProgressRing';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ViewerBanner } from '@/components/ViewerBanner';
import { WORKOUT_TYPES } from '@/components/WorkoutTimer';
import { AppText, Card, Row, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { useDerived, useWorkoutsByDate } from '@/features/derived';
import { prettyDate } from '@/lib/dates';
import { formatDuration } from '@/lib/format';
import { effectiveStatus, eligibleHabits } from '@/lib/scoring';
import { spacing } from '@/theme/tokens';

export default function DayDetail() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const d = useDerived();
  const actions = useActions();
  const byDate = useWorkoutsByDate();
  const day = date ?? d.today;
  const score = d.scoreFor(day);
  const eligibleIds = new Set(eligibleHabits(d.activeHabits, day, d.timezone).map((h) => h.id));
  const habits = d.activeHabits.filter((h) => eligibleIds.has(h.id));
  const workouts = byDate.get(day) ?? [];
  const future = day > d.today;

  return (
    <Screen header={<ScreenHeader title={prettyDate(day)} />}>
      <ViewerBanner />
      <Card tint>
        <Row style={{ gap: spacing.lg }}>
          <ProgressRing percent={future ? 0 : score.completionPercent} size={96} stroke={10} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{future ? 'Upcoming day' : score.neutral ? (score.restDay ? 'Rest day' : 'No habits scheduled') : score.successful ? 'Goal reached' : 'Goal not reached'}</AppText>
            {!future ? <AppText variant="caption" muted>{score.completed} of {score.eligible} habits · goal {d.threshold}%{score.restDay ? ' · rest day' : ''}</AppText> : null}
          </View>
        </Row>
      </Card>
      <AppText variant="heading" accessibilityRole="header">Habits</AppText>
      <View style={{ gap: spacing.sm }}>
        {habits.map((h) => {
          const l = d.logIndex.get(`${h.id}:${day}`);
          return (
            <HabitCard
              key={h.id}
              habit={h}
              value={l?.value ?? null}
              status={effectiveStatus(h, l)}
              readOnly
              onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id, date: day } })}
            />
          );
        })}
        {habits.length === 0 ? <AppText muted>No habits were scheduled for this day.</AppText> : null}
      </View>
      <AppText variant="heading" accessibilityRole="header">Workouts</AppText>
      {workouts.length === 0 ? <AppText muted>No workouts logged.</AppText> : null}
      {workouts.map((w) => {
        const meta = WORKOUT_TYPES.find((t) => t.type === w.type);
        return (
          <Card key={w.id} accessible accessibilityLabel={`${meta?.label}, ${formatDuration(w.durationSeconds)}`}>
            <Row style={{ gap: spacing.xs }}>
              {meta ? <AppIcon name={meta.icon} size={22} /> : null}
              <AppText variant="bodyStrong">{meta?.label} · {formatDuration(w.durationSeconds)}</AppText>
            </Row>
            {w.notes ? <AppText variant="caption" muted>{w.notes}</AppText> : null}
          </Card>
        );
      })}
      {actions.isOwner && !future ? <AppText variant="caption" muted>Tap a habit to edit its value for this day.</AppText> : null}
    </Screen>
  );
}
