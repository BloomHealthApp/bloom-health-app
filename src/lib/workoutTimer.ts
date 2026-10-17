// Timestamp-derived workout timer. Nothing here uses setInterval state: elapsed time is always
// computed from persisted timestamps, so it survives backgrounding and process death.
import type { WorkoutType } from '@/types/api';

export interface TimerState {
  type: WorkoutType;
  startedAt: string; // ISO
  pausedMs: number; // accumulated completed pauses
  pausedAt: string | null; // ISO while paused
}

export function startTimer(type: WorkoutType, nowMs: number): TimerState {
  return { type, startedAt: new Date(nowMs).toISOString(), pausedMs: 0, pausedAt: null };
}

export function isPaused(s: TimerState): boolean {
  return s.pausedAt !== null;
}

function totalPausedMs(s: TimerState, nowMs: number): number {
  return s.pausedMs + (s.pausedAt ? Math.max(0, nowMs - Date.parse(s.pausedAt)) : 0);
}

export function elapsedSeconds(s: TimerState, nowMs: number): number {
  const raw = nowMs - Date.parse(s.startedAt) - totalPausedMs(s, nowMs);
  return Math.max(0, Math.floor(raw / 1000));
}

export function pauseTimer(s: TimerState, nowMs: number): TimerState {
  return s.pausedAt ? s : { ...s, pausedAt: new Date(nowMs).toISOString() };
}

export function resumeTimer(s: TimerState, nowMs: number): TimerState {
  if (!s.pausedAt) return s;
  return { ...s, pausedMs: s.pausedMs + Math.max(0, nowMs - Date.parse(s.pausedAt)), pausedAt: null };
}

export interface FinishedWorkout {
  type: WorkoutType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  pausedSeconds: number;
}

export function finishTimer(s: TimerState, nowMs: number): FinishedWorkout {
  const paused = totalPausedMs(s, nowMs);
  return {
    type: s.type,
    startedAt: s.startedAt,
    endedAt: new Date(nowMs).toISOString(),
    durationSeconds: elapsedSeconds(s, nowMs),
    pausedSeconds: Math.round(paused / 1000),
  };
}

/** Manual entry: a finished session of `minutes`, ending at `endMs`. */
export function manualWorkout(type: WorkoutType, minutes: number, endMs: number): FinishedWorkout {
  const dur = Math.round(minutes * 60);
  return {
    type,
    startedAt: new Date(endMs - dur * 1000).toISOString(),
    endedAt: new Date(endMs).toISOString(),
    durationSeconds: dur,
    pausedSeconds: 0,
  };
}

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function serializeTimer(s: TimerState): string {
  return JSON.stringify(s);
}
export function parseTimer(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as TimerState;
    if (typeof v.startedAt === 'string' && typeof v.pausedMs === 'number' && v.type) return v;
  } catch {
    /* corrupt */
  }
  return null;
}
