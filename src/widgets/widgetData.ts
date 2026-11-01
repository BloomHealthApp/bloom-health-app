// Platform-neutral data layer for home-screen widgets: builds, persists and publishes the WidgetSnapshot.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MascotMood } from '@/components/mascotTypes';
import { diffDays, localDateInTz } from '@/lib/dates';
import { dailyMessage } from '@/lib/messages';
import type { DayScore } from '@/lib/scoring';
import { DEFAULT_THEME, THEMES } from '@/theme/themes';
import type { Role, ThemeName } from '@/types/api';

export const SNAPSHOT_KEY = 'bubu.widget.snapshot';
export const SNAPSHOT_VERSION = 1;
export const FALLBACK_THEME: ThemeName = DEFAULT_THEME;

/**
 * ready      - signed in, habits scheduled today
 * noHabits   - signed in, nothing scheduled today (rest day / no habits yet)
 * signedOut  - the user signed out: widget asks them to sign in
 * unopened   - nothing persisted yet (app never opened since install): widget asks them to open the app
 */
export type WidgetState = 'ready' | 'noHabits' | 'signedOut' | 'unopened';

export interface WidgetSnapshot {
  version: number;
  state: WidgetState;
  theme: ThemeName;
  /** the app's appearance when this was saved; absent on older snapshots, which show as light */
  dark?: boolean;
  /** the local day (in `timezone`) that percent/completed/eligible describe */
  localDate: string;
  timezone: string;
  currentStreak: number;
  longestStreak: number;
  percent: number;
  completed: number;
  eligible: number;
  /** how the described day counts toward streaks; lets a later day tell whether the streak survived */
  dayOutcome: 'success' | 'neutral' | 'open';
  mood: MascotMood;
  message: string;
  /** viewer accounts see the owner's progress, read-only */
  readOnly: boolean;
  updatedAt: number;
}

export interface SnapshotInput {
  role: Role;
  theme: ThemeName;
  dark?: boolean;
  today: string;
  timezone: string;
  todayScore: Pick<DayScore, 'eligible' | 'completed' | 'completionPercent' | 'successful' | 'neutral'>;
  currentStreak: number;
  longestStreak: number;
  now?: number;
}

function messageFor(localDate: string, percent: number, streak: number): { text: string; mood: MascotMood } {
  const m = dailyMessage(localDate, percent, streak);
  return percent >= 100 ? { text: m.text, mood: 'celebrating' } : m;
}

/** Snapshot of a signed-in user's day, derived from the scoring output (lib/scoring.ts via lib/progress.ts). */
export function buildSnapshot(i: SnapshotInput): WidgetSnapshot {
  const { eligible, completed } = i.todayScore;
  const percent = eligible === 0 ? 0 : Math.max(0, Math.min(100, Math.round(i.todayScore.completionPercent)));
  const msg =
    eligible === 0
      ? { text: 'Nothing scheduled today. Enjoy the rest!', mood: 'sleepy' as MascotMood }
      : messageFor(i.today, percent, i.currentStreak);
  return {
    version: SNAPSHOT_VERSION,
    state: eligible === 0 ? 'noHabits' : 'ready',
    theme: i.theme,
    dark: !!i.dark,
    localDate: i.today,
    timezone: i.timezone,
    currentStreak: i.currentStreak,
    longestStreak: i.longestStreak,
    percent,
    completed,
    eligible,
    dayOutcome: i.todayScore.successful ? 'success' : i.todayScore.neutral ? 'neutral' : 'open',
    mood: msg.mood,
    message: msg.text,
    readOnly: i.role === 'viewer',
    updatedAt: i.now ?? Date.now(),
  };
}

function placeholder(state: 'signedOut' | 'unopened', theme: ThemeName, text: string, now: number, dark = false): WidgetSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    state,
    theme,
    dark,
    localDate: '',
    timezone: 'UTC',
    currentStreak: 0,
    longestStreak: 0,
    percent: 0,
    completed: 0,
    eligible: 0,
    dayOutcome: 'open',
    mood: 'sleepy',
    message: text,
    readOnly: false,
    updatedAt: now,
  };
}

export const signedOutSnapshot = (theme: ThemeName = FALLBACK_THEME, now = Date.now(), dark = false) =>
  placeholder('signedOut', theme, 'Open Bloom Health to sign in', now, dark);
export const unopenedSnapshot = (theme: ThemeName = FALLBACK_THEME, now = Date.now()) =>
  placeholder('unopened', theme, 'Open Bloom Health to get started', now);

/**
 * The app may have been closed for hours or days when the OS asks the widget to redraw. Re-express a stored snapshot for
 * the current day: a new day starts at 0 %, and the streak only survives if the stored day counted (or was neutral)
 * and no whole day has been skipped since.
 */
export function resolveForDay(s: WidgetSnapshot, now: Date = new Date()): WidgetSnapshot {
  if ((s.state !== 'ready' && s.state !== 'noHabits') || !s.localDate) return s;
  const today = localDateInTz(now, s.timezone);
  const gap = diffDays(today, s.localDate);
  if (gap <= 0) return s;
  const kept = gap === 1 && s.dayOutcome !== 'open';
  const currentStreak = kept ? s.currentStreak : 0;
  const msg = messageFor(today, 0, currentStreak);
  return {
    ...s,
    localDate: today,
    currentStreak,
    percent: 0,
    completed: 0,
    dayOutcome: 'open',
    mood: msg.mood,
    message: s.state === 'noHabits' ? s.message : msg.text,
  };
}

function isSnapshot(v: unknown): v is WidgetSnapshot {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    s.version === SNAPSHOT_VERSION &&
    typeof s.state === 'string' &&
    typeof s.theme === 'string' &&
    s.theme in THEMES &&
    typeof s.currentStreak === 'number' &&
    typeof s.longestStreak === 'number' &&
    typeof s.percent === 'number' &&
    typeof s.message === 'string'
  );
}

export interface SnapshotStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Last persisted snapshot, or the "never opened" placeholder when nothing (valid) is stored. Never throws. */
export async function loadSnapshot(storage: SnapshotStorage = AsyncStorage): Promise<WidgetSnapshot> {
  try {
    const raw = await storage.getItem(SNAPSHOT_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isSnapshot(parsed)) return parsed;
    }
  } catch {
    /* fall through */
  }
  return unopenedSnapshot();
}

export async function saveSnapshot(s: WidgetSnapshot, storage: SnapshotStorage = AsyncStorage): Promise<void> {
  await storage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
}

/** Everything that affects what is drawn (not updatedAt), used to skip redundant redraws. */
export function snapshotSignature(s: WidgetSnapshot): string {
  const { updatedAt: _ignored, ...rest } = s;
  return JSON.stringify(rest);
}

export interface Publisher {
  storage?: SnapshotStorage;
  /** redraw hook; defaults to the platform adapter */
  refresh?: (s: WidgetSnapshot) => Promise<void>;
}

let lastSignature: string | null = null;

/**
 * Persist `s` and redraw any widgets. Skips both when nothing visible changed since the last publish, unless `force`
 * (e.g. on app foreground, where a redraw is cheap insurance against a stale widget).
 */
export async function publishSnapshot(s: WidgetSnapshot, opts: Publisher & { force?: boolean } = {}): Promise<void> {
  const sig = snapshotSignature(s);
  if (!opts.force && sig === lastSignature) return;
  lastSignature = sig;
  try {
    await saveSnapshot(s, opts.storage);
    // lazy: the adapter is only needed when something is actually drawn
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const refresh = opts.refresh ?? (require('./widgetAdapter') as typeof import('./widgetAdapter')).requestWidgetRefresh;
    await refresh(s);
  } catch (e) {
    lastSignature = null;
    console.warn('[widget] could not publish snapshot', e);
  }
}

/** Sign-out: replace progress with the signed-out placeholder (keeps the theme so the widget still looks right). */
export function publishSignedOut(theme: ThemeName, opts: Publisher = {}, dark = false): Promise<void> {
  return publishSnapshot(signedOutSnapshot(theme, Date.now(), dark), opts);
}

export function __resetPublishState(): void {
  lastSignature = null;
}
