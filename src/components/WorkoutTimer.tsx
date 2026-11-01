import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '@/icons/AppIcon';
import type { IconName } from '@/icons/iconArt';
import { elapsedSeconds, formatClock, isPaused, type TimerState } from '@/lib/workoutTimer';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { WorkoutType } from '@/types/api';
import { AppText, Button, Card, Row } from './ui';

export const WORKOUT_TYPES: { type: WorkoutType; label: string; icon: IconName }[] = [
  { type: 'strength', label: 'Strength', icon: 'dumbbell' },
  { type: 'cardio', label: 'Cardio', icon: 'run' },
  { type: 'yoga', label: 'Yoga', icon: 'yoga' },
  { type: 'walking', label: 'Walking', icon: 'walk' },
  { type: 'badminton', label: 'Badminton', icon: 'badminton' },
  { type: 'other', label: 'Other', icon: 'sparkles' },
];

export function TypeChips({ value, onChange }: { value: WorkoutType; onChange: (t: WorkoutType) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup">
      {WORKOUT_TYPES.map((w) => {
        const sel = w.type === value;
        return (
          <Pressable
            key={w.type}
            onPress={() => onChange(w.type)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
            accessibilityLabel={w.label}
            style={{ minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: sel ? theme.colors.primary : theme.colors.tint }}
          >
            <Row style={{ gap: spacing.xs }}>
              <AppIcon name={w.icon} size={22} />
              <AppText variant="label" style={{ color: sel ? theme.colors.onPrimary : theme.colors.text }}>{w.label}</AppText>
            </Row>
          </Pressable>
        );
      })}
    </View>
  );
}

export function WorkoutTimer({
  state,
  nowMs,
  selectedType,
  onSelectType,
  onStart,
  onPause,
  onResume,
  onFinish,
  onDiscard,
}: {
  state: TimerState | null;
  nowMs: number;
  selectedType: WorkoutType;
  onSelectType: (t: WorkoutType) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  if (!state) {
    return (
      <Card>
        <AppText variant="heading">Start a workout</AppText>
        <View style={{ height: spacing.md }} />
        <TypeChips value={selectedType} onChange={onSelectType} />
        <View style={{ height: spacing.lg }} />
        <Button title="Start" onPress={onStart} accessibilityLabel="Start workout timer" />
      </Card>
    );
  }
  const secs = elapsedSeconds(state, nowMs);
  const paused = isPaused(state);
  const meta = WORKOUT_TYPES.find((w) => w.type === state.type);
  return (
    <Card tint>
      <Row style={{ gap: spacing.xs }}>
        {meta ? <AppIcon name={meta.icon} size={22} /> : null}
        <AppText variant="label" accent>{meta?.label} {paused ? '· paused' : '· in progress'}</AppText>
      </Row>
      <AppText variant="big" style={{ fontSize: 40, lineHeight: 48, textAlign: 'center', marginVertical: spacing.md }} accessibilityLiveRegion="none" accessibilityLabel={`Elapsed ${Math.floor(secs / 60)} minutes ${secs % 60} seconds`}>
        {formatClock(secs)}
      </AppText>
      <Row style={{ gap: spacing.sm }}>
        <Button title={paused ? 'Resume' : 'Pause'} variant="secondary" onPress={paused ? onResume : onPause} style={{ flex: 1 }} />
        <Button title="Finish" onPress={onFinish} style={{ flex: 1 }} />
      </Row>
      <Button title="Discard" variant="ghost" onPress={onDiscard} style={{ marginTop: spacing.sm }} />
    </Card>
  );
}
