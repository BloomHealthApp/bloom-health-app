import { useMemo } from 'react';
import { deviceTimezone, localDateInTz } from '@/lib/dates';
import { PeriodValidationError, validatePeriod } from '@/lib/periodRules';
import type { PeriodDraft } from '@/lib/periodsView';
import { HABIT_IDS } from '@/lib/defaults';
import { logId, uuid } from '@/lib/ids';
import { evaluateStatus, type HabitRule } from '@/lib/scoring';
import type { FinishedWorkout } from '@/lib/workoutTimer';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import type { DailyLog, Habit, LogStatus, Period, Settings, Workout, WorkoutType } from '@/types/api';

export type { PeriodDraft };

export function periodPayload(p: PeriodDraft): Record<string, unknown> {
  return { startDate: p.startDate, endDate: p.endDate, flow: p.flow, symptoms: p.symptoms, mood: p.mood, note: p.note };
}

export class ReadOnlyError extends Error {
  constructor() {
    super('Read-only: only the owner can change data.');
    this.name = 'ReadOnlyError';
  }
}

export type HabitDraft = Pick<Habit, 'title' | 'icon' | 'category' | 'trackingType' | 'target' | 'targetMax' | 'targetComparison' | 'unit'> &
  Partial<Pick<Habit, 'schedule' | 'reminder' | 'isActive' | 'sortOrder'>>;

export function habitPayload(h: Habit): Record<string, unknown> {
  return {
    title: h.title,
    icon: h.icon,
    category: h.category,
    trackingType: h.trackingType,
    target: h.target,
    targetMax: h.targetMax,
    targetComparison: h.targetComparison,
    unit: h.unit,
    schedule: h.schedule,
    reminder: h.reminder,
    isActive: h.isActive,
    sortOrder: h.sortOrder,
    isDefault: h.isDefault,
  };
}

/** Owner-only write helpers. Everything is local-first: written to SQLite + queued, then synced. */
export function useActions() {
  const { isOwner } = useAuth();
  const { store, engine, scheduleSync } = useData();

  return useMemo(() => {
    const guard = () => {
      if (!isOwner) throw new ReadOnlyError();
    };
    const now = () => new Date().toISOString();
    const done = () => scheduleSync();

    async function setLog(habit: HabitRule & { id: string }, localDate: string, value: number | null, opts: { status?: LogStatus; note?: string | null } = {}) {
      guard();
      const id = logId(habit.id, localDate);
      const existing = await store.get<DailyLog>('dailyLog', id);
      const status = opts.status ?? evaluateStatus(habit, value);
      const note = opts.note !== undefined ? opts.note : (existing?.note ?? null);
      const entity: DailyLog = {
        id,
        habitId: habit.id,
        localDate,
        value,
        status,
        note,
        version: existing?.version ?? 0,
        updatedAt: now(),
        deletedAt: null,
      };
      await engine.mutate({ entityType: 'dailyLog', entityId: id, op: 'upsert', payload: { value, status, note }, entity: entity as never });
      done();
    }

    async function addToLog(habitId: string, rule: HabitRule, localDate: string, delta: number) {
      const existing = await store.get<DailyLog>('dailyLog', logId(habitId, localDate));
      const next = Math.max(0, (existing?.value ?? 0) + delta);
      await setLog(rule as HabitRule & { id: string }, localDate, next);
    }

    async function saveHabit(draft: HabitDraft, existing?: Habit): Promise<Habit> {
      guard();
      const id = existing?.id ?? uuid();
      const all = await store.getAll<Habit>('habit');
      const habit: Habit = {
        id,
        isDefault: existing?.isDefault ?? false,
        sortOrder: draft.sortOrder ?? existing?.sortOrder ?? all.reduce((m, h) => Math.max(m, h.sortOrder), 0) + 1,
        schedule: draft.schedule ?? existing?.schedule ?? { days: [] },
        reminder: draft.reminder ?? existing?.reminder ?? null,
        isActive: draft.isActive ?? existing?.isActive ?? true,
        title: draft.title,
        icon: draft.icon,
        category: draft.category,
        trackingType: draft.trackingType,
        target: draft.target,
        targetMax: draft.targetMax,
        targetComparison: draft.targetComparison,
        unit: draft.unit,
        version: existing?.version ?? 0,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
        deletedAt: null,
      };
      await engine.mutate({ entityType: 'habit', entityId: id, op: 'upsert', payload: habitPayload(habit), entity: habit as never });
      done();
      return habit;
    }

    async function archiveHabit(h: Habit) {
      guard();
      // Archive = deactivate (service keeps habits and their logs; a delete op would tombstone the habit).
      const habit = { ...h, isActive: false, updatedAt: now() };
      await engine.mutate({ entityType: 'habit', entityId: h.id, op: 'upsert', payload: habitPayload(habit), entity: habit as never });
      done();
    }
    async function restoreHabit(h: Habit) {
      guard();
      const habit = { ...h, isActive: true, updatedAt: now() };
      await engine.mutate({ entityType: 'habit', entityId: h.id, op: 'upsert', payload: habitPayload(habit), entity: habit as never });
      done();
    }

    async function saveWorkout(w: FinishedWorkout, tz: string, notes: string | null = null, existing?: Workout): Promise<void> {
      guard();
      const id = existing?.id ?? uuid();
      const entity: Workout = {
        id,
        type: w.type,
        startedAt: w.startedAt,
        endedAt: w.endedAt,
        durationSeconds: w.durationSeconds,
        pausedSeconds: w.pausedSeconds,
        notes,
        localDate: localDateInTz(new Date(w.startedAt), tz),
        version: existing?.version ?? 0,
        createdAt: existing?.createdAt,
        updatedAt: now(),
        deletedAt: null,
      };
      const payload = {
        type: entity.type as WorkoutType,
        startedAt: entity.startedAt,
        endedAt: entity.endedAt,
        durationSeconds: entity.durationSeconds,
        pausedSeconds: entity.pausedSeconds,
        notes: entity.notes,
        localDate: entity.localDate,
      };
      await engine.mutate({ entityType: 'workout', entityId: id, op: 'upsert', payload, entity: entity as never });
      done();
    }

    async function deleteWorkout(w: Workout) {
      guard();
      await engine.mutate({ entityType: 'workout', entityId: w.id, op: 'delete', payload: {}, entity: { ...w, deletedAt: now() } as never });
      done();
    }

    async function saveSettings(patch: Partial<Pick<Settings, 'dailyThreshold' | 'restDays' | 'reminders' | 'sundayRest'>>, current: Settings) {
      guard();
      const next: Settings = { ...current, ...patch, updatedAt: now() };
      await engine.mutate({
        entityType: 'settings',
        entityId: current.id,
        op: 'upsert',
        // sundayRest is only sent once it is known (older services reject unknown fields); un-sent edits coalesce, so always repeat it
        payload: { dailyThreshold: next.dailyThreshold, restDays: next.restDays, reminders: next.reminders, ...(next.sundayRest !== undefined ? { sundayRest: next.sundayRest } : {}) },
        entity: next as never,
      });
      done();
    }

    /** Validates against the contract rules and the owner's other periods, then queues the write (offline-first). */
    async function savePeriod(draft: PeriodDraft, existing?: Period): Promise<Period> {
      guard();
      const id = existing?.id ?? uuid();
      const all = await store.getAll<Period>('period');
      const reason = validatePeriod(draft, all, localDateInTz(new Date(), deviceTimezone()), id);
      if (reason) throw new PeriodValidationError(reason);
      const entity: Period = { ...draft, id, version: existing?.version ?? 0, createdAt: existing?.createdAt ?? now(), updatedAt: now(), deletedAt: null };
      await engine.mutate({ entityType: 'period', entityId: id, op: 'upsert', payload: periodPayload(draft), entity: entity as never });
      done();
      return entity;
    }
    const startPeriod = (startDate: string) => savePeriod({ startDate, endDate: null, flow: 'medium', symptoms: [], mood: null, note: null });
    const endPeriod = (p: Period, endDate: string) => savePeriod({ ...p, endDate }, p);
    async function deletePeriod(p: Period) {
      guard();
      await engine.mutate({ entityType: 'period', entityId: p.id, op: 'delete', payload: {}, entity: { ...p, deletedAt: now() } as never });
      done();
    }

    return {
      isOwner,
      savePeriod,
      startPeriod,
      endPeriod,
      deletePeriod,
      setLog,
      toggleBoolean: (habit: HabitRule & { id: string }, date: string, on: boolean) => setLog(habit, date, on ? 1 : 0),
      addWater: (rule: HabitRule, date: string, ml: number) => addToLog(HABIT_IDS.water, rule, date, ml),
      setSteps: (rule: HabitRule & { id: string }, date: string, steps: number) => setLog(rule, date, Math.max(0, Math.round(steps))),
      saveHabit,
      archiveHabit,
      restoreHabit,
      saveWorkout,
      deleteWorkout,
      saveSettings,
    };
  }, [isOwner, store, engine, scheduleSync]);
}
