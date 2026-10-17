import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { BubuMascot } from '@/components/BubuMascot';
import { EmptyState } from '@/components/EmptyState';
import { HabitCard } from '@/components/HabitCard';
import { ProgressRing } from '@/components/ProgressRing';
import { StepsCard } from '@/components/StepsCard';
import { StreakCard } from '@/components/StreakCard';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { ViewerBanner } from '@/components/ViewerBanner';
import { WaterTracker } from '@/components/WaterTracker';
import { AppText, Button, Card, ErrorBanner, Loading, Row, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { useDerived, useWorkoutsByDate } from '@/features/derived';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { prettyDate } from '@/lib/dates';
import { HABIT_IDS } from '@/lib/defaults';
import { formatDuration } from '@/lib/format';
import { dailyMessage } from '@/lib/messages';
import { effectiveStatus } from '@/lib/scoring';
import { useAuth } from '@/providers/AuthProvider';
import { useData, useSyncStatus } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';

export default function Home() {
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const d = useDerived();
  const actions = useActions();
  const sync = useSyncStatus();
  const { syncNow } = useData();
  const byDate = useWorkoutsByDate();
  useSyncOnFocus(isOwner ? undefined : 30_000); // viewer freshness: poll every 30 s while Home is focused
  const [err, setErr] = React.useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  const water = d.activeHabits.find((h) => h.id === HABIT_IDS.water);
  const steps = d.activeHabits.find((h) => h.id === HABIT_IDS.steps);
  const rest = d.activeHabits.filter((h) => h.id !== HABIT_IDS.water && h.id !== HABIT_IDS.steps);
  const valueOf = (id: string) => d.logIndex.get(`${id}:${d.today}`)?.value ?? null;
  const msg = dailyMessage(d.today, d.todayScore.completionPercent, d.currentStreak);
  const todaysWorkouts = byDate.get(d.today) ?? [];
  const workoutSecs = todaysWorkouts.reduce((a, w) => a + w.durationSeconds, 0);
  const name = isOwner ? user?.displayName : user?.ownerDisplayName;
  const offlineEmpty = sync.state === 'offline' && d.habits.length === 0;

  return (
    <Screen onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" muted>{prettyDate(d.today)}</AppText>
          <AppText variant="title" accessibilityRole="header">{isOwner ? `Hi, ${name}` : `${name}'s day`}</AppText>
        </View>
        <SyncStatusChip onPress={() => router.push('/sync-issues')} />
      </Row>
      <ViewerBanner />
      {err ? <ErrorBanner message={err} /> : null}
      {sync.state === 'offline' ? (
        <View accessibilityRole="alert"><AppText variant="caption" muted>You are offline. {isOwner ? 'Changes are saved on this device and will sync later.' : 'Showing the last synced data.'}</AppText></View>
      ) : null}

      {d.loading ? (
        <Loading />
      ) : d.activeHabits.length === 0 ? (
        offlineEmpty ? (
          <EmptyState title="Offline for now" message="Connect to the internet once to load your habits." mood="sad" actionLabel="Try again" onAction={() => void syncNow()} />
        ) : (
          <EmptyState title="No habits yet" message={isOwner ? 'Add a habit to start blooming.' : 'Nothing to show yet. Pull down to refresh.'} actionLabel={isOwner ? 'Add a habit' : undefined} onAction={isOwner ? () => router.push('/habit/form') : undefined} />
        )
      ) : (
        <>
          <Card tint>
            <Row style={{ gap: spacing.lg }}>
              <ProgressRing percent={d.todayScore.completionPercent} size={120} stroke={12} sublabel="today" />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Row style={{ gap: spacing.sm }}>
                  <BubuMascot mood={msg.mood} size={56} />
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>{msg.text}</AppText>
                </Row>
                <AppText variant="caption" muted>
                  {d.todayScore.completed} of {d.todayScore.eligible} habits · goal {d.threshold}%
                </AppText>
              </View>
            </Row>
          </Card>

          <StreakCard current={d.currentStreak} longest={d.longestStreak} />

          {water ? <WaterTracker ml={valueOf(water.id) ?? 0} goal={water.target} readOnly={!isOwner} onAdd={(ml) => run(() => actions.addWater(water, d.today, ml))} /> : null}
          {steps ? <StepsCard steps={valueOf(steps.id) ?? 0} goal={steps.target} goalMax={steps.targetMax} readOnly={!isOwner} onSave={(n) => run(() => actions.setSteps(steps, d.today, n))} /> : null}

          <AppText variant="heading" accessibilityRole="header">Today&apos;s habits</AppText>
          <View style={{ gap: spacing.sm }}>
            {rest.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                value={valueOf(h.id)}
                status={effectiveStatus(h, d.logIndex.get(`${h.id}:${d.today}`))}
                readOnly={!isOwner}
                onToggle={(on) => run(() => actions.toggleBoolean(h, d.today, on))}
                onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id, date: d.today } })}
              />
            ))}
          </View>

          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">🏋️ Workout</AppText>
                <AppText variant="caption" muted>
                  {todaysWorkouts.length ? `${todaysWorkouts.length} session${todaysWorkouts.length > 1 ? 's' : ''} today · ${formatDuration(workoutSecs)}` : 'No sessions logged today'}
                </AppText>
              </View>
              <Button title={isOwner ? 'Open' : 'View'} variant="secondary" onPress={() => router.push('/workout')} />
            </Row>
          </Card>
        </>
      )}
    </Screen>
  );
}
