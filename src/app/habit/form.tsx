import { IconPicker } from '@/icons/IconPicker';
import { FALLBACK_ICON } from '@/lib/habitIcon';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Field, Segmented } from '@/components/Field';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Button, ErrorBanner, Screen } from '@/components/ui';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { useActions } from '@/features/actions';
import { useHabits } from '@/providers/DataProvider';
import { hhmmToMinutes, minutesToHHmm } from '@/lib/dates';
import type { Comparison, Habit, TrackingType } from '@/types/api';

const TYPES: { value: TrackingType; label: string }[] = [
  { value: 'boolean', label: 'Yes / No' },
  { value: 'quantity', label: 'Amount' },
  { value: 'duration', label: 'Minutes' },
  { value: 'timeOfDay', label: 'Time of day' },
];

export default function HabitForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { habits } = useHabits();
  const actions = useActions();
  const existing = habits.find((h) => h.id === id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? FALLBACK_ICON);
  const [type, setType] = useState<TrackingType>(existing?.trackingType ?? 'boolean');
  const [target, setTarget] = useState(existing ? (existing.trackingType === 'timeOfDay' ? minutesToHHmm(existing.target) : String(existing.target)) : '');
  const [targetMax, setTargetMax] = useState(existing?.targetMax ? String(existing.targetMax) : '');
  const [cmp, setCmp] = useState<Comparison>(existing?.targetComparison ?? 'atLeast');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!actions.isOwner) {
    return (
      <Screen header={<ScreenHeader title="Habit" />}>
        <AppText muted>Only the owner can edit habits.</AppText>
      </Screen>
    );
  }

  const targetNum = type === 'boolean' ? 1 : type === 'timeOfDay' ? hhmmToMinutes(target) : Number(target);
  const maxNum = targetMax.trim() ? Number(targetMax) : null;
  const errors: string[] = [];
  if (!title.trim()) errors.push('Give the habit a name.');
  if (title.length > 60) errors.push('Name is too long (max 60).');
  if (type !== 'boolean' && (targetNum === null || !Number.isFinite(targetNum) || targetNum <= 0)) errors.push(type === 'timeOfDay' ? 'Enter a time like 06:30.' : 'Enter a target greater than 0.');
  if (maxNum !== null && (!Number.isFinite(maxNum) || (targetNum !== null && maxNum < targetNum))) errors.push('Maximum must be at least the target.');

  const save = async () => {
    if (errors.length) {
      setErr(errors[0]);
      return;
    }
    try {
      const comparison: Comparison =
        type === 'boolean' ? 'atLeast'
        : type === 'timeOfDay' ? (cmp === 'atLeast' ? 'atLeast' : 'by')
        : type === 'quantity' ? (cmp === 'atMost' ? 'atMost' : 'atLeast')
        : cmp === 'atMost' ? 'atMost' : maxNum ? 'between' : 'atLeast';
      await actions.saveHabit(
        {
          title: title.trim(),
          icon: icon.trim() || FALLBACK_ICON,
          category: existing?.category ?? 'custom',
          trackingType: type,
          target: targetNum ?? 1,
          targetMax: type === 'boolean' || type === 'timeOfDay' ? null : maxNum,
          targetComparison: comparison,
          unit: type === 'quantity' ? unit.trim() || null : type === 'duration' ? 'min' : null,
        },
        existing,
      );
      router.back();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <Screen header={<ScreenHeader title={existing ? 'Edit habit' : 'New habit'} />}>
      {err ? <ErrorBanner message={err} /> : null}
      <Field label="Name" value={title} onChangeText={setTitle} maxLength={60} placeholder="e.g. Read 10 pages" />
      <IconPicker value={icon} onChange={setIcon} />
      <Segmented label="How do you track it?" options={TYPES} value={type} onChange={setType} />
      {type === 'quantity' || type === 'duration' ? (
        <>
          <Field label={type === 'duration' ? 'Target minutes' : 'Target amount'} value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
          <Field label="Recommended maximum (optional)" value={targetMax} onChangeText={setTargetMax} keyboardType="decimal-pad" />
          {type === 'quantity' ? <Field label="Unit (e.g. glasses, pages)" value={unit} onChangeText={setUnit} maxLength={16} /> : null}
          <Segmented label="Goal" options={[{ value: 'atLeast' as Comparison, label: 'At least' }, { value: 'atMost' as Comparison, label: 'At most' }]} value={cmp === 'atMost' ? 'atMost' : 'atLeast'} onChange={setCmp} />
        </>
      ) : null}
      {type === 'timeOfDay' ? (
        <>
          <Field label="Time (24h, HH:mm)" value={target} onChangeText={setTarget} placeholder="06:30" />
          <Segmented label="Goal" options={[{ value: 'by' as Comparison, label: 'Before' }, { value: 'atLeast' as Comparison, label: 'After' }]} value={cmp === 'atLeast' ? 'atLeast' : 'by'} onChange={setCmp} />
        </>
      ) : null}
      <Button title="Save habit" onPress={save} />
      {existing && existing.isActive ? <Button title="Archive habit" variant="danger" onPress={() => setConfirm(true)} /> : null}
      {existing && !existing.isActive ? <Button title="Restore habit" variant="secondary" onPress={async () => { await actions.restoreHabit(existing); router.back(); }} /> : null}
      <ConfirmationDialog
        visible={confirm}
        destructive
        title="Archive this habit?"
        message="It will stop counting toward your daily score. Your past logs are kept and you can restore it any time."
        confirmLabel="Archive"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await actions.archiveHabit(existing as Habit);
          router.back();
        }}
      />
    </Screen>
  );
}
