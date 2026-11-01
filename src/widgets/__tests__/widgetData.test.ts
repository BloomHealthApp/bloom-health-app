import { computeProgress } from '@/lib/progress';
import type { HabitRule, LogLike } from '@/lib/scoring';
import { THEMES } from '@/theme/themes';
import {
  __resetPublishState,
  buildSnapshot,
  loadSnapshot,
  publishSignedOut,
  publishSnapshot,
  resolveForDay,
  saveSnapshot,
  SNAPSHOT_KEY,
  signedOutSnapshot,
  unopenedSnapshot,
  type SnapshotInput,
  type SnapshotStorage,
} from '../widgetData';
import { widgetPalette } from '../widgetTheme';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }));

function memoryStorage(): SnapshotStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: async (k) => data[k] ?? null, setItem: async (k, v) => void (data[k] = v) };
}

const score = (completed: number, eligible: number, successful = false, neutral = false) => ({
  eligible,
  completed,
  completionPercent: eligible === 0 ? 0 : Math.round((completed / eligible) * 10000) / 100,
  successful,
  neutral,
});

const base = (over: Partial<SnapshotInput> = {}): SnapshotInput => ({
  role: 'owner',
  theme: 'cottonCandy',
  today: '2026-03-10',
  timezone: 'UTC',
  todayScore: score(3, 5),
  currentStreak: 4,
  longestStreak: 9,
  now: 1000,
  ...over,
});

describe('buildSnapshot', () => {
  it('reports counts, rounded percent, streaks and an encouraging message', () => {
    const s = buildSnapshot(base());
    expect(s).toMatchObject({ state: 'ready', percent: 60, completed: 3, eligible: 5, currentStreak: 4, longestStreak: 9, readOnly: false, dayOutcome: 'open', mood: 'happy' });
    expect(s.message).toBe('Over halfway there. Keep blooming!');
  });
  it('rounds fractional percents', () => {
    expect(buildSnapshot(base({ todayScore: score(1, 3) })).percent).toBe(33);
    expect(buildSnapshot(base({ todayScore: score(2, 3) })).percent).toBe(67);
  });
  it('celebrates when everything is done', () => {
    const s = buildSnapshot(base({ todayScore: score(5, 5, true), currentStreak: 1 }));
    expect(s.percent).toBe(100);
    expect(s.mood).toBe('celebrating');
    expect(s.dayOutcome).toBe('success');
  });
  it('cheers a streak of 3+ at 80%+', () => {
    const s = buildSnapshot(base({ todayScore: score(4, 5, true), currentStreak: 5 }));
    expect(s.message).toContain('5 days in a row');
    expect(s.mood).toBe('cheer');
  });
  it('is sleepy and gentle with 0% and no streak', () => {
    const s = buildSnapshot(base({ todayScore: score(0, 5), currentStreak: 0 }));
    expect(s.mood).toBe('sleepy');
    expect(s.message.length).toBeGreaterThan(5);
  });
  it('reports noHabits when nothing is scheduled', () => {
    const s = buildSnapshot(base({ todayScore: score(0, 0, false, true), currentStreak: 2 }));
    expect(s).toMatchObject({ state: 'noHabits', percent: 0, eligible: 0, mood: 'sleepy', dayOutcome: 'neutral' });
    expect(s.message).toMatch(/Nothing scheduled/);
  });
  it('viewer accounts get the same progress, marked read-only', () => {
    const o = buildSnapshot(base());
    const v = buildSnapshot(base({ role: 'viewer' }));
    expect({ ...v, readOnly: false }).toEqual(o);
    expect(v.readOnly).toBe(true);
  });
  it('uses the real scoring output (no re-implemented rules)', () => {
    const habits: HabitRule[] = [
      { id: 'a', trackingType: 'boolean', target: 1, targetComparison: 'atLeast' },
      { id: 'b', trackingType: 'quantity', target: 2000, targetComparison: 'atLeast' },
    ];
    const logs: LogLike[] = [];
    for (const d of ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']) {
      logs.push({ habitId: 'a', localDate: d, value: 1 }, { habitId: 'b', localDate: d, value: d === '2026-03-10' ? 500 : 2500 });
    }
    const p = computeProgress({ habits, logs, settings: { dailyThreshold: 100, restDays: [] }, today: '2026-03-10', timezone: 'UTC' });
    const s = buildSnapshot(base({ todayScore: p.todayScore, currentStreak: p.currentStreak, longestStreak: p.longestStreak }));
    expect(s).toMatchObject({ completed: 1, eligible: 2, percent: 50, currentStreak: 3, longestStreak: 3, state: 'ready' });
  });
});

describe('placeholders', () => {
  it('signed out asks the user to sign in', () => {
    const s = signedOutSnapshot('mintPeach');
    expect(s).toMatchObject({ state: 'signedOut', theme: 'mintPeach', message: 'Open Bloom Health to sign in', currentStreak: 0 });
  });
  it('unopened asks the user to open the app', () => {
    expect(unopenedSnapshot().message).toBe('Open Bloom Health to get started');
  });
  it('are untouched by day resolution', () => {
    const s = signedOutSnapshot();
    expect(resolveForDay(s, new Date('2030-01-01T00:00:00Z'))).toBe(s);
  });
});

describe('resolveForDay', () => {
  const snap = (over = {}) => ({ ...buildSnapshot(base({ todayScore: score(4, 5, true), currentStreak: 5 })), ...over });
  it('is a no-op on the same day', () => {
    const s = snap();
    expect(resolveForDay(s, new Date('2026-03-10T20:00:00Z'))).toBe(s);
  });
  it('starts a new day at 0% and keeps a streak that ended successfully yesterday', () => {
    const r = resolveForDay(snap(), new Date('2026-03-11T08:00:00Z'));
    expect(r).toMatchObject({ localDate: '2026-03-11', percent: 0, completed: 0, currentStreak: 5, longestStreak: 9, dayOutcome: 'open' });
  });
  it('resets the streak if the stored day was not a success', () => {
    const r = resolveForDay(snap({ dayOutcome: 'open' }), new Date('2026-03-11T08:00:00Z'));
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(9);
  });
  it('resets the streak after a skipped day', () => {
    expect(resolveForDay(snap(), new Date('2026-03-12T08:00:00Z')).currentStreak).toBe(0);
  });
  it('uses the stored timezone to decide what day it is', () => {
    const s = snap({ timezone: 'Asia/Kolkata' });
    // 20:00Z on the 10th is already the 11th in IST
    expect(resolveForDay(s, new Date('2026-03-10T20:00:00Z')).localDate).toBe('2026-03-11');
  });
});

describe('persistence + publishing', () => {
  beforeEach(() => __resetPublishState());

  it('falls back to the unopened state when nothing or garbage is stored', async () => {
    const st = memoryStorage();
    expect((await loadSnapshot(st)).state).toBe('unopened');
    st.data[SNAPSHOT_KEY] = '{not json';
    expect((await loadSnapshot(st)).state).toBe('unopened');
    st.data[SNAPSHOT_KEY] = JSON.stringify({ version: 99 });
    expect((await loadSnapshot(st)).state).toBe('unopened');
    const broken: SnapshotStorage = { getItem: async () => { throw new Error('boom'); }, setItem: async () => {} };
    expect((await loadSnapshot(broken)).state).toBe('unopened');
  });

  it('round-trips a snapshot', async () => {
    const st = memoryStorage();
    const s = buildSnapshot(base());
    await saveSnapshot(s, st);
    expect(await loadSnapshot(st)).toEqual(s);
  });

  it('publishes (persist + refresh) only when something visible changed, unless forced', async () => {
    const st = memoryStorage();
    const refresh = jest.fn(async () => {});
    const s = buildSnapshot(base());
    await publishSnapshot(s, { storage: st, refresh });
    await publishSnapshot({ ...s, updatedAt: 5 }, { storage: st, refresh });
    expect(refresh).toHaveBeenCalledTimes(1);
    await publishSnapshot({ ...s, percent: 80 }, { storage: st, refresh });
    expect(refresh).toHaveBeenCalledTimes(2);
    await publishSnapshot({ ...s, percent: 80 }, { storage: st, refresh, force: true });
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(JSON.parse(st.data[SNAPSHOT_KEY]).percent).toBe(80);
  });

  it('sign-out replaces progress with the signed-out state and redraws', async () => {
    const st = memoryStorage();
    const refresh = jest.fn(async () => {});
    await publishSnapshot(buildSnapshot(base()), { storage: st, refresh });
    await publishSignedOut('lavenderDream', { storage: st, refresh });
    const saved = JSON.parse(st.data[SNAPSHOT_KEY]);
    expect(saved).toMatchObject({ state: 'signedOut', theme: 'lavenderDream', message: 'Open Bloom Health to sign in', currentStreak: 0 });
    expect(refresh).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'signedOut' }));
  });

  it('a failing storage or refresh never throws into the app', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const refresh = jest.fn(async () => { throw new Error('native missing'); });
    await expect(publishSnapshot(buildSnapshot(base()), { storage: memoryStorage(), refresh })).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('widgetPalette', () => {
  const channels = (v: string) => (v.startsWith('rgba') ? v.slice(5, -1).split(', ').map(Number) : [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)));
  const over = (panel: string, wall: number) => {
    const [r, g, b, a] = channels(panel);
    return [r, g, b].map((x) => x * a + wall * (1 - a));
  };
  const lum = (rgb: number[]) => {
    const [r, g, b] = rgb.map((x) => x / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const names = Object.keys(THEMES) as (keyof typeof THEMES)[];

  it('maps each theme and appearance to its colours', () => {
    expect(widgetPalette('cottonCandy')).toMatchObject({ text: THEMES.cottonCandy.colors.text, glassFrom: 'rgba(255, 255, 255, 0.88)' });
    expect(widgetPalette('midnightNavy', true)).toMatchObject({ text: THEMES.midnightNavy.darkColors.text, track: THEMES.midnightNavy.darkColors.secondary });
  });
  it('only emits colours the widget library accepts', () => {
    for (const name of names) for (const dark of [false, true]) {
      for (const v of Object.values(widgetPalette(name, dark))) expect(v).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/);
    }
  });
  it('keeps text readable on any wallpaper', () => {
    for (const name of names) for (const dark of [false, true]) for (const wall of [0, 255]) {
      const p = widgetPalette(name, dark);
      for (const panel of [p.glassFrom, p.glassTo]) {
        const bg = over(panel, wall);
        const where = `${name} dark=${dark} wall=${wall} ${panel}`;
        expect([where, contrast(channels(p.text), bg) >= 4.5]).toEqual([where, true]);
        expect([where, contrast(channels(p.muted), bg) >= 4.5]).toEqual([where, true]);
      }
    }
  });
});
