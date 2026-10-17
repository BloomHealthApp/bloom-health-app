import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ViewerBanner } from '@/components/ViewerBanner';
import { AppText, Button, Card, ErrorBanner, Row, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { useDerived } from '@/features/derived';
import { addDays, formatMinutes12h, hhmmToMinutes, minutesSinceMidnightInTz, minutesToHHmm, prettyDate } from '@/lib/dates';
import { describeTarget, formatHabitValue } from '@/lib/format';
import { effectiveStatus } from '@/lib/scoring';
import { spacing } from '@/theme/tokens';

export default function HabitDetail() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const router = useRouter();
  const d = useDerived();
  const actions = useActions();
  const habit = d.habits.find((h) => h.id === id);
  const localDate = date ?? d.today;
  const log = d.logIndex.get(`${id}:${localDate}`);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const future = localDate > d.today;
  const readOnly = !actions.isOwner || future;

  useEffect(() => {
    if (!habit) return;
    const v = log?.value;
    setText(v === null || v === undefined ? '' : habit.trackingType === 'timeOfDay' ? minutesToHHmm(v) : String(v));
    setNote(log?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habit?.id, log?.version, log?.updatedAt, localDate]);

  if (!habit) {
    return (
      <Screen header={<ScreenHeader title="Habit" />}>
        <EmptyState title="Habit not found" message="It may have been removed." mood="sad" actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const status = effectiveStatus(habit, log);
  const save = async (value: number | null, opts?: { status?: 'skipped' }) => {
    setErr(null);
    try {
      await actions.setLog(habit, localDate, value, { note: note.trim() || null, ...opts });
      router.back();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  const parsed: number | null = (() => {
    if (text.trim() === '') return null;
    if (habit.trackingType === 'timeOfDay') return hhmmToMinutes(text);
    const n = Number(text.replace(/,/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();
  const invalid = text.trim() !== '' && parsed === null;

  const history = Array.from({ length: 7 }, (_, i) => addDays(d.today, -i));

  return (
    <Screen header={<ScreenHeader title={`${habit.icon} ${habit.title}`} />}>
      <ViewerBanner />
      <Card tint>
        <AppText variant="caption" muted>{prettyDate(localDate)}{future ? ' · upcoming' : ''}</AppText>
        <AppText variant="heading">{formatHabitValue(habit, log?.value ?? null)}</AppText>
        <AppText muted>Goal: {describeTarget(habit)} · {status === 'complete' ? 'completed' : status === 'partial' ? 'in progress' : status === 'skipped' ? 'skipped' : 'not completed yet'}</AppText>
      </Card>
      {err ? <ErrorBanner message={err} /> : null}

      {future ? <AppText muted>You can&apos;t log future days.</AppText> : null}

      {!readOnly ? (
        <>
          {habit.trackingType === 'boolean' ? (
            <Row style={{ gap: spacing.sm }}>
              <Button title="Done" onPress={() => save(1)} style={{ flex: 1 }} />
              <Button title="Not done" variant="secondary" onPress={() => save(0)} style={{ flex: 1 }} />
            </Row>
          ) : (
            <>
              <Field
                label={habit.trackingType === 'timeOfDay' ? 'Time (24h, HH:mm)' : habit.trackingType === 'duration' ? 'Minutes' : `Amount${habit.unit ? ` (${habit.unit})` : ''}`}
                value={text}
                onChangeText={setText}
                keyboardType={habit.trackingType === 'timeOfDay' ? 'numbers-and-punctuation' : 'decimal-pad'}
                placeholder={habit.trackingType === 'timeOfDay' ? '05:00' : String(habit.target)}
                error={invalid ? (habit.trackingType === 'timeOfDay' ? 'Use a 24-hour time like 05:30' : 'Enter a positive number') : null}
              />
              {habit.trackingType === 'timeOfDay' && parsed !== null ? <AppText variant="caption" muted>{formatMinutes12h(parsed)}</AppText> : null}
              <Row style={{ gap: spacing.sm }}>
                {habit.trackingType === 'timeOfDay' ? (
                  <Button title="Now" variant="secondary" onPress={() => setText(minutesToHHmm(minutesSinceMidnightInTz(new Date(), d.timezone)))} />
                ) : null}
                <Button title="Save" disabled={invalid || parsed === null} onPress={() => save(parsed)} style={{ flex: 1 }} />
              </Row>
            </>
          )}
          <Field label="Note (optional)" value={note} onChangeText={setNote} multiline maxLength={300} />
          <Row style={{ gap: spacing.sm }}>
            <Button title={status === 'skipped' ? 'Unskip' : 'Skip this day'} variant="ghost" onPress={() => (status === 'skipped' ? save(null) : save(null, { status: 'skipped' }))} />
            {log ? <Button title="Clear" variant="ghost" onPress={() => save(null)} /> : null}
          </Row>
          <Button title="Edit habit" variant="secondary" onPress={() => router.push({ pathname: '/habit/form', params: { id: habit.id } })} />
        </>
      ) : log?.note ? (
        <Card><AppText variant="label" muted>Note</AppText><AppText>{log.note}</AppText></Card>
      ) : null}

      <AppText variant="heading" accessibilityRole="header">Last 7 days</AppText>
      <Card>
        {history.map((day) => {
          const l = d.logIndex.get(`${habit.id}:${day}`);
          const st = effectiveStatus(habit, l);
          return (
            <View key={day} style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 36, alignItems: 'center' }} accessible accessibilityLabel={`${prettyDate(day)}: ${formatHabitValue(habit, l?.value ?? null)}, ${st}`}>
              <AppText>{prettyDate(day)}</AppText>
              <AppText variant="bodyStrong" accent={st === 'complete'} muted={st !== 'complete'}>{st === 'skipped' ? 'Skipped' : formatHabitValue(habit, l?.value ?? null)}</AppText>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
