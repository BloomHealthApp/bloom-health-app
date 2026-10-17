import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ViewerBanner } from '@/components/ViewerBanner';
import { TypeChips, WORKOUT_TYPES, WorkoutTimer } from '@/components/WorkoutTimer';
import { AppText, Button, Card, ErrorBanner, Loading, Row, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { useToday } from '@/features/derived';
import { useActiveWorkout, useNow } from '@/features/useActiveWorkout';
import { prettyDate } from '@/lib/dates';
import { formatDuration } from '@/lib/format';
import { manualWorkout } from '@/lib/workoutTimer';
import { useWorkouts } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';
import type { Workout, WorkoutType } from '@/types/api';

export default function WorkoutScreen() {
  const actions = useActions();
  const { timezone } = useToday();
  const { workouts, loading } = useWorkouts();
  const timer = useActiveWorkout();
  const now = useNow(!!timer.state);
  const [type, setType] = useState<WorkoutType>('strength');
  const [manualType, setManualType] = useState<WorkoutType>('strength');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState<Workout | null>(null);
  const [discard, setDiscard] = useState(false);

  const recent = useMemo(() => [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20), [workouts]);
  const mins = Number(minutes);
  const manualValid = minutes.trim() !== '' && Number.isFinite(mins) && mins > 0 && mins <= 600;

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <Screen header={<ScreenHeader title="Workout" />}>
      <ViewerBanner />
      {err ? <ErrorBanner message={err} /> : null}
      {actions.isOwner ? (
        <>
          {!timer.loaded ? (
            <Loading />
          ) : (
            <WorkoutTimer
              state={timer.state}
              nowMs={now}
              selectedType={type}
              onSelectType={setType}
              onStart={() => run(() => timer.start(type))}
              onPause={() => run(async () => void (await timer.pause()))}
              onResume={() => run(async () => void (await timer.resume()))}
              onFinish={() =>
                run(async () => {
                  const f = await timer.finish();
                  if (f) await actions.saveWorkout(f, timezone, null);
                })
              }
              onDiscard={() => setDiscard(true)}
            />
          )}
          <Card>
            <AppText variant="heading">Add a past session</AppText>
            <View style={{ height: spacing.md }} />
            <TypeChips value={manualType} onChange={setManualType} />
            <View style={{ height: spacing.md }} />
            <Field label="Minutes" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="45" error={minutes && !manualValid ? 'Enter 1 to 600 minutes' : null} />
            <View style={{ height: spacing.sm }} />
            <Field label="Notes (optional)" value={notes} onChangeText={setNotes} maxLength={200} />
            <View style={{ height: spacing.md }} />
            <Button
              title="Save session"
              disabled={!manualValid}
              onPress={() =>
                run(async () => {
                  await actions.saveWorkout(manualWorkout(manualType, mins, Date.now()), timezone, notes.trim() || null);
                  setMinutes('');
                  setNotes('');
                })
              }
            />
          </Card>
        </>
      ) : null}

      <AppText variant="heading" accessibilityRole="header">Recent sessions</AppText>
      {loading ? <Loading /> : recent.length === 0 ? <EmptyState title="No workouts yet" message={actions.isOwner ? 'Start the timer or add a past session.' : 'Nothing logged yet.'} mood="sleepy" /> : null}
      {recent.map((w) => {
        const meta = WORKOUT_TYPES.find((t) => t.type === w.type);
        return (
          <Card key={w.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }} accessible accessibilityLabel={`${meta?.label} on ${prettyDate(w.localDate)}, ${formatDuration(w.durationSeconds)}${w.notes ? ', note: ' + w.notes : ''}`}>
                <AppText variant="bodyStrong">{meta?.icon} {meta?.label} · {formatDuration(w.durationSeconds)}</AppText>
                <AppText variant="caption" muted>{prettyDate(w.localDate)}{w.pausedSeconds ? ` · paused ${formatDuration(w.pausedSeconds)}` : ''}</AppText>
                {w.notes ? <AppText variant="caption">{w.notes}</AppText> : null}
              </View>
              {actions.isOwner ? <Button title="Delete" variant="ghost" onPress={() => setDel(w)} accessibilityLabel={`Delete ${meta?.label} session`} /> : null}
            </Row>
          </Card>
        );
      })}

      <ConfirmationDialog visible={!!del} destructive title="Delete this session?" message="This removes it from your history on all devices." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { const w = del!; setDel(null); void run(() => actions.deleteWorkout(w)); }} />
      <ConfirmationDialog visible={discard} destructive title="Discard this workout?" message="The running timer will be thrown away and nothing will be saved." confirmLabel="Discard" onCancel={() => setDiscard(false)} onConfirm={() => { setDiscard(false); void timer.discard(); }} />
    </Screen>
  );
}
