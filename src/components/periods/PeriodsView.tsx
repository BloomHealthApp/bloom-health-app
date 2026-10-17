// Presentational period tracker (owner only). All data/actions come in as props so the route stays thin and this view
// can be rendered in tests and previews without providers.
import React, { useMemo, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { BubuMascot } from '../BubuMascot';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { EmptyState } from '../EmptyState';
import { AppText, Button, Card, ErrorBanner, Loading, Row } from '../ui';
import { ChipRow } from './Chips';
import { ongoingPeriod, predict } from '@/lib/cycle';
import { addDays, monthName, WEEKDAY_SHORT, shortDate } from '@/lib/dates';
import {
  DISCLAIMER_PERIODS,
  FLOW_LABELS,
  MOOD_LABELS,
  PRIVACY_NOTE,
  SYMPTOM_LABELS,
  buildMonth,
  cellLabel,
  cycleSummary,
  draftError,
  draftFromPeriod,
  emptyDraft,
  historyRows,
  maxEndDate,
  monthFor,
  overdueOngoing,
  statLines,
  toggleItem,
  type CalendarCell,
  type PeriodDraft,
} from '@/lib/periodsView';
import { PERIOD_FLOWS, PERIOD_MAX_NOTE, PERIOD_MOODS, PERIOD_SYMPTOMS, type Period } from '@/types/api';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export interface PeriodsViewProps {
  periods: Period[];
  today: string;
  loading?: boolean;
  error?: string | null;
  onStart: (date: string) => Promise<Period | void>;
  onEnd: (p: Period, date: string) => Promise<void>;
  onSave: (draft: PeriodDraft, existing?: Period) => Promise<void>;
  onDelete: (p: Period) => Promise<void>;
  reminder?: { enabled: boolean; note: string | null; onChange: (on: boolean) => void };
}

interface Editing {
  existing?: Period;
  draft: PeriodDraft;
}

export function PeriodsView({ periods, today, loading, error, onStart, onEnd, onSave, onDelete, reminder }: PeriodsViewProps) {
  const { theme } = useTheme();
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Period | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const pred = useMemo(() => predict(periods, today), [periods, today]);
  const summary = cycleSummary(pred, periods.length > 0);
  const ongoing = ongoingPeriod(periods);
  const { year, month } = monthFor(today, offset);
  const cells = useMemo(() => buildMonth(year, month, periods, pred, today), [year, month, periods, pred, today]);
  const rows = useMemo(() => historyRows(periods, today), [periods, today]);
  const overdue = overdueOngoing(periods, today);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setLocalError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Could not save.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startNow = () =>
    run(async () => {
      const p = await onStart(today);
      if (p) setEditing({ existing: p, draft: draftFromPeriod(p) });
    });
  const endNow = () => ongoing && run(() => onEnd(ongoing, today));

  const openDay = (c: CalendarCell) => {
    const covering = periods.find((p) => !p.deletedAt && p.startDate <= c.date && c.date <= (p.endDate ?? today));
    if (covering) setEditing({ existing: covering, draft: draftFromPeriod(covering) });
    else if (!c.isFuture) setEditing({ draft: emptyDraft(c.date) });
  };

  if (loading) return <Loading label="Loading your tracker" />;

  const err = localError ?? error ?? null;
  return (
    <View style={{ gap: spacing.lg }}>
      <View accessible accessibilityLabel={`Private. ${PRIVACY_NOTE}`} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: theme.colors.secondary, borderRadius: radius.md, padding: spacing.md }}>
        <AppText accessibilityElementsHidden importantForAccessibility="no">🔒</AppText>
        <AppText variant="caption" style={{ flex: 1 }}>{PRIVACY_NOTE}</AppText>
      </View>
      {err ? <ErrorBanner message={err} /> : null}

      <Card tint>
        <Row style={{ gap: spacing.md }}>
          <BubuMascot mood={summary.mood} size={84} />
          <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${summary.title}. ${summary.subtitle}`}>
            <AppText variant="heading">{summary.title}</AppText>
            <AppText variant="caption" muted>{summary.subtitle}</AppText>
          </View>
        </Row>
        <Row style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {ongoing ? (
            <Button title="End period" onPress={() => void endNow()} loading={busy} style={{ flex: 1 }} accessibilityHint="Ends the ongoing period today" />
          ) : (
            <Button title="Start period" onPress={() => void startNow()} loading={busy} style={{ flex: 1 }} accessibilityHint="Logs today as the first day" />
          )}
          <Button title="Log past" variant="secondary" onPress={() => setEditing({ draft: emptyDraft(today) })} accessibilityLabel="Log a past period" />
        </Row>
        {overdue ? (
          <AppText variant="caption" style={{ marginTop: spacing.sm, color: theme.colors.danger }} accessibilityRole="alert">
            This period has been ongoing for over 14 days. Edit it to set the end date.
          </AppText>
        ) : null}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Button title="‹" variant="secondary" onPress={() => setOffset((o) => o - 1)} accessibilityLabel="Previous month" style={{ paddingHorizontal: spacing.lg }} />
          <AppText variant="heading" accessibilityLiveRegion="polite">{monthName(month)} {year}</AppText>
          <Button title="›" variant="secondary" disabled={offset >= 1} onPress={() => setOffset((o) => o + 1)} accessibilityLabel="Next month" style={{ paddingHorizontal: spacing.lg }} />
        </Row>
        <Row>
          {WEEKDAY_SHORT.map((w, i) => (
            <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 6 }} accessibilityElementsHidden importantForAccessibility="no">
              <AppText variant="caption" muted>{w}</AppText>
            </View>
          ))}
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((c, i) => (c ? <DayCell key={c.date} cell={c} onPress={() => openDay(c)} /> : <View key={`e${i}`} style={{ width: `${100 / 7}%` }} />))}
        </View>
        <Row style={{ gap: spacing.lg, marginTop: spacing.md, justifyContent: 'center' }} accessible accessibilityLabel="Legend: filled days are period days, dashed days are the estimated window">
          <Legend swatch={{ backgroundColor: theme.colors.primary }} label="Period" />
          <Legend swatch={{ backgroundColor: theme.colors.secondary, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.accent }} label="Estimated window" />
        </Row>
      </Card>

      {editing ? (
        <Editor
          editing={editing}
          periods={periods}
          today={today}
          busy={busy}
          onChange={(draft) => setEditing({ ...editing, draft })}
          onCancel={() => { setEditing(null); setLocalError(null); }}
          onSave={async () => {
            if (await run(() => onSave(editing.draft, editing.existing))) setEditing(null);
          }}
          onDelete={editing.existing ? () => setConfirmDelete(editing.existing as Period) : undefined}
        />
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="heading" accessibilityRole="header">Your cycle</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
          {statLines(pred).map((s) => (
            <View key={s.label} style={{ width: '50%' }} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
              <AppText variant="heading" accent>{s.value}</AppText>
              <AppText variant="caption" muted>{s.label}</AppText>
            </View>
          ))}
        </View>
        {pred.nextStart === null ? <AppText variant="caption" muted>Log a few cycles to see an estimate. The next-start estimate needs at least two full cycles.</AppText> : <AppText variant="caption" muted>Based on your last {Math.min(pred.cycleCount, 6)} cycle{pred.cycleCount === 1 ? '' : 's'}.</AppText>}
      </Card>

      {reminder ? (
        <Card style={{ gap: spacing.sm }}>
          <Row style={{ gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Remind me before my period may start</AppText>
              <AppText variant="caption" muted>A gentle notification two days ahead. It never mentions the word period.</AppText>
            </View>
            <Switch value={reminder.enabled} onValueChange={reminder.onChange} accessibilityLabel="Remind me before my period may start" trackColor={{ true: theme.colors.primary, false: theme.colors.border }} style={{ minHeight: MIN_TOUCH }} />
          </Row>
          {reminder.note ? <AppText variant="caption" accessibilityLiveRegion="polite" style={{ color: theme.colors.accent }}>{reminder.note}</AppText> : null}
        </Card>
      ) : null}

      <AppText variant="heading" accessibilityRole="header">History</AppText>
      {rows.length === 0 ? (
        <EmptyState mood="happy" title="Nothing logged yet" message="Tap Start period on the first day. Your history and estimates will appear here." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {rows.map((r) => (
            <Card key={r.period.id} style={{ paddingVertical: spacing.md }}>
              <Row style={{ gap: spacing.sm }}>
                <View style={{ flex: 1 }} accessible accessibilityLabel={`${r.title}. ${r.subtitle}`}>
                  <AppText variant="bodyStrong">{r.title}</AppText>
                  <AppText variant="caption" muted>{r.subtitle}</AppText>
                </View>
                <Button title="Edit" variant="secondary" onPress={() => setEditing({ existing: r.period, draft: draftFromPeriod(r.period) })} accessibilityLabel={`Edit period starting ${shortDate(r.period.startDate)}`} style={{ paddingHorizontal: spacing.lg }} />
                <Button title="Delete" variant="ghost" onPress={() => setConfirmDelete(r.period)} accessibilityLabel={`Delete period starting ${shortDate(r.period.startDate)}`} style={{ paddingHorizontal: spacing.md }} />
              </Row>
            </Card>
          ))}
        </View>
      )}

      <AppText variant="caption" muted style={{ textAlign: 'center' }}>{DISCLAIMER_PERIODS}</AppText>

      <ConfirmationDialog
        visible={!!confirmDelete}
        destructive
        title="Delete this period?"
        message="It will be removed from your history and estimates."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const p = confirmDelete;
          setConfirmDelete(null);
          if (p && (await run(() => onDelete(p)))) setEditing((e) => (e?.existing?.id === p.id ? null : e));
        }}
      />
    </View>
  );
}

function DayCell({ cell, onPress }: { cell: CalendarCell; onPress: () => void }) {
  const { theme } = useTheme();
  const period = cell.kind === 'period';
  const predicted = cell.kind === 'predicted';
  return (
    <View style={{ width: `${100 / 7}%`, padding: 2 }}>
      <Pressable
        onPress={onPress}
        disabled={cell.isFuture && !predicted && !period}
        accessibilityRole="button"
        accessibilityLabel={cellLabel(cell)}
        accessibilityState={{ selected: period, disabled: cell.isFuture && !period }}
        style={{
          minHeight: MIN_TOUCH,
          aspectRatio: 1,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: period ? theme.colors.primary : predicted ? theme.colors.secondary : 'transparent',
          borderWidth: cell.isToday ? 2 : predicted ? 1 : 0,
          borderStyle: predicted && !cell.isToday ? 'dashed' : 'solid',
          borderColor: cell.isToday ? theme.colors.accent : theme.colors.accent,
        }}
      >
        <AppText variant="label" style={{ fontFamily: period ? fonts.heavy : fonts.semibold, color: period ? theme.colors.onPrimary : cell.isFuture && !predicted ? theme.colors.textMuted : theme.colors.text }}>{cell.day}</AppText>
      </Pressable>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: object; label: string }) {
  return (
    <Row style={{ gap: spacing.xs }}>
      <View style={[{ width: 16, height: 16, borderRadius: 5 }, swatch]} />
      <AppText variant="caption" muted>{label}</AppText>
    </Row>
  );
}

function DateStepper({ label, value, min, max, onChange }: { label: string; value: string; min: string; max: string; onChange: (d: string) => void }) {
  const { theme } = useTheme();
  const step = (n: number) => {
    const next = addDays(value, n);
    if (next >= min && next <= max) onChange(next);
  };
  return (
    <Row style={{ justifyContent: 'space-between' }} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${shortDate(value)}`}>
      <AppText variant="label" muted style={{ width: 84 }}>{label}</AppText>
      <Row style={{ gap: spacing.sm, flex: 1, justifyContent: 'flex-end' }}>
        <Button title="−" variant="secondary" disabled={addDays(value, -1) < min} onPress={() => step(-1)} accessibilityLabel={`${label}, one day earlier`} style={{ paddingHorizontal: spacing.lg }} />
        <AppText variant="bodyStrong" style={{ minWidth: 72, textAlign: 'center', color: theme.colors.text }}>{shortDate(value)}</AppText>
        <Button title="+" variant="secondary" disabled={addDays(value, 1) > max} onPress={() => step(1)} accessibilityLabel={`${label}, one day later`} style={{ paddingHorizontal: spacing.lg }} />
      </Row>
    </Row>
  );
}

function Editor({ editing, periods, today, busy, onChange, onCancel, onSave, onDelete }: { editing: Editing; periods: Period[]; today: string; busy: boolean; onChange: (d: PeriodDraft) => void; onCancel: () => void; onSave: () => void; onDelete?: () => void }) {
  const { theme } = useTheme();
  const { draft, existing } = editing;
  const error = draftError(draft, periods, today, existing?.id);
  const ongoing = draft.endDate === null;
  const minStart = addDays(today, -400);
  return (
    <Card style={{ gap: spacing.md }} accessibilityLabel={existing ? 'Edit period' : 'Log a period'}>
      <AppText variant="heading" accessibilityRole="header">{existing ? 'Edit period' : 'Log a period'}</AppText>
      <DateStepper label="Started" value={draft.startDate} min={minStart} max={today} onChange={(startDate) => onChange({ ...draft, startDate, endDate: draft.endDate && draft.endDate < startDate ? startDate : draft.endDate })} />
      <Pressable
        onPress={() => onChange({ ...draft, endDate: ongoing ? maxEndDate(draft.startDate, today) : null })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ongoing }}
        accessibilityLabel="Still ongoing"
        style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: ongoing ? theme.colors.primary : 'transparent' }}>
          {ongoing ? <AppText variant="label" style={{ color: theme.colors.onPrimary }}>✓</AppText> : null}
        </View>
        <AppText variant="bodyStrong">Still ongoing</AppText>
      </Pressable>
      {!ongoing && draft.endDate ? <DateStepper label="Ended" value={draft.endDate} min={draft.startDate} max={maxEndDate(draft.startDate, today)} onChange={(endDate) => onChange({ ...draft, endDate })} /> : null}
      <ChipRow label="Flow" options={PERIOD_FLOWS.map((f) => ({ value: f, label: FLOW_LABELS[f] }))} selected={[draft.flow]} onToggle={(flow) => onChange({ ...draft, flow })} />
      <ChipRow multi label="Symptoms" options={PERIOD_SYMPTOMS.map((s) => ({ value: s, label: SYMPTOM_LABELS[s] }))} selected={draft.symptoms} onToggle={(s) => onChange({ ...draft, symptoms: toggleItem(draft.symptoms, s) })} />
      <ChipRow label="Mood" options={PERIOD_MOODS.map((m) => ({ value: m, label: MOOD_LABELS[m] }))} selected={draft.mood ? [draft.mood] : []} onToggle={(m) => onChange({ ...draft, mood: draft.mood === m ? null : m })} />
      <View style={{ gap: 6 }}>
        <AppText variant="label" muted>Note</AppText>
        <TextInput
          value={draft.note ?? ''}
          onChangeText={(t) => onChange({ ...draft, note: t.length ? t.slice(0, PERIOD_MAX_NOTE) : null })}
          accessibilityLabel="Note"
          placeholder="Anything you want to remember"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={PERIOD_MAX_NOTE}
          style={{ minHeight: 88, textAlignVertical: 'top', borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: spacing.md, fontFamily: fonts.semibold, fontSize: 16, color: theme.colors.text }}
        />
      </View>
      {error ? <AppText variant="caption" style={{ color: theme.colors.danger }} accessibilityRole="alert">{error}</AppText> : null}
      <Row style={{ gap: spacing.sm }}>
        <Button title="Save" onPress={onSave} disabled={!!error} loading={busy} style={{ flex: 1 }} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </Row>
      {onDelete ? <Button title="Delete this period" variant="ghost" onPress={onDelete} /> : null}
    </Card>
  );
}
