import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MemoryStore } from '@/db/memoryStore';
import { addDays, deviceTimezone, localDateInTz } from '@/lib/dates';
import { defaultSettings as mockDefaultSettings } from '@/lib/defaults';
import type { Period, User } from '@/types/api';
import { useDerived, type Derived } from '../derived';
import { SUMMARY_META_KEY, loadCachedSummary, parseCachedSummary, refreshServerSummary } from '../serverSummary';

const TODAY = localDateInTz(new Date(), deviceTimezone());

const mock = {
  user: null as User | null,
  getStats: jest.fn(),
  store: new MemoryStore(),
  periods: [] as Period[],
  periodReads: 0,
};
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ user: mock.user, api: { getStats: mock.getStats } }) }));
jest.mock('@/providers/DataProvider', () => ({
  useHabits: () => ({ habits: [], loading: false }),
  useLogs: () => ({ logs: [], loading: false }),
  useSettings: () => ({ settings: mockDefaultSettings(), loading: false }),
  usePeriods: () => {
    mock.periodReads++;
    return { periods: mock.periods, loading: false };
  },
  useWorkouts: () => ({ workouts: [], loading: false }),
  useData: () => ({ store: mock.store, ready: true }),
  useSyncStatus: () => ({ lastSyncedAt: 1 }),
}));

const user = (role: 'owner' | 'viewer'): User => ({ id: 'u', email: 'a@b.co', displayName: 'A', avatar: null, timezone: 'UTC', theme: 'cottonCandy', role, sharedSpaceId: 's', ownerDisplayName: 'O', gender: 'female', periodTrackerEnabled: role === 'owner' });
const summary = (streak: number) => ({ currentStreak: streak, longestStreak: streak + 3, days: [{ localDate: TODAY, completionPercent: 100, successful: true, restDay: false }], workoutCount: 0, workoutSeconds: 0, milestones: [] });

let latest: Derived | null = null;
function Probe({ sink }: { sink: (d: Derived) => void }) {
  const d = useDerived();
  React.useEffect(() => sink(d));
  return null;
}
async function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let t!: renderer.ReactTestRenderer;
  await act(async () => {
    t = renderer.create(
      <QueryClientProvider client={qc}>
        <Probe sink={(d) => { latest = d; }} />
      </QueryClientProvider>,
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  return Object.assign(t, { qc });
}

beforeEach(() => {
  mock.store = new MemoryStore();
  mock.getStats.mockReset();
  mock.periods = [];
  mock.periodReads = 0;
  latest = null;
});

describe('viewer progress comes from GET /stats/summary', () => {
  it('uses the server streaks, requests a window ending today, and caches the summary', async () => {
    mock.user = user('viewer');
    mock.getStats.mockResolvedValue(summary(9));
    const t = await mount();
    expect(mock.getStats).toHaveBeenCalledTimes(1);
    expect(mock.getStats.mock.calls[0][1]).toBe(TODAY);
    expect(latest!.currentStreak).toBe(9);
    expect(latest!.longestStreak).toBe(12);
    const cached = await loadCachedSummary(mock.store);
    expect(cached).toMatchObject({ currentStreak: 9, longestStreak: 12 });
    expect(JSON.stringify(cached)).not.toMatch(/period/i);
    act(() => t.unmount());
    t.qc.clear();
  });

  it('works offline: falls back to the cached summary when the request fails', async () => {
    mock.user = user('viewer');
    await mock.store.setMeta(SUMMARY_META_KEY, JSON.stringify({ currentStreak: 5, longestStreak: 8, days: [] }));
    mock.getStats.mockRejectedValue(new Error('offline'));
    const t = await mount();
    expect(latest!.currentStreak).toBe(5);
    expect(latest!.longestStreak).toBe(8);
    act(() => t.unmount());
    t.qc.clear();
  });

  it('with nothing cached and no network it still renders from local scoring (streak 0, Sunday default)', async () => {
    mock.user = user('viewer');
    mock.getStats.mockRejectedValue(new Error('offline'));
    const t = await mount();
    expect(latest!.currentStreak).toBe(0);
    act(() => t.unmount());
    t.qc.clear();
  });

  it('never fetches for owners, who compute locally (and period days are neutral)', async () => {
    mock.user = user('owner');
    mock.periods = [{ id: 'p', startDate: addDays(TODAY, -2), endDate: null, flow: 'medium', symptoms: [], mood: null, note: null, version: 1, updatedAt: '', deletedAt: null }];
    const t = await mount();
    expect(mock.getStats).not.toHaveBeenCalled();
    expect(latest!.dayScores.get(addDays(TODAY, -1))).toMatchObject({ restDay: true });
    act(() => t.unmount());
    t.qc.clear();
  });

  it('a viewer ignores any period rows that might be present (neutral dates only come from the server)', async () => {
    mock.user = user('viewer');
    mock.getStats.mockResolvedValue({ ...summary(2), days: [] });
    mock.periods = [{ id: 'p', startDate: addDays(TODAY, -2), endDate: null, flow: 'medium', symptoms: [], mood: null, note: null, version: 1, updatedAt: '', deletedAt: null }];
    const t = await mount();
    // usePeriods already returns [] for viewers in the real provider; the derived hook must not treat the days as neutral either
    const d = latest!.dayScores.get(addDays(TODAY, -1))!;
    expect(d.restDay).toBe(new Date(`${addDays(TODAY, -1)}T00:00:00Z`).getUTCDay() === 0);
    act(() => t.unmount());
    t.qc.clear();
  });
});

describe('serverSummary helpers', () => {
  it('parseCachedSummary rejects junk', () => {
    expect(parseCachedSummary(null)).toBeNull();
    expect(parseCachedSummary('nope')).toBeNull();
    expect(parseCachedSummary('{"currentStreak":"1"}')).toBeNull();
    expect(parseCachedSummary('{"currentStreak":1,"longestStreak":2,"days":[]}')).toEqual({ currentStreak: 1, longestStreak: 2, days: [] });
  });
  it('refreshServerSummary stores only the slim shape', async () => {
    const store = new MemoryStore();
    const out = await refreshServerSummary(store, async () => ({ ...summary(4), workoutCount: 3 } as never), TODAY);
    expect(Object.keys(out).sort()).toEqual(['currentStreak', 'days', 'longestStreak']);
    expect(await loadCachedSummary(store)).toEqual(out);
  });
});
