// Viewer progress: viewers never receive period data, so their streak/day flags come from GET /stats/summary.
// The last summary is cached in the store's meta table so Home still shows the right numbers offline.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useData, useSyncStatus } from '@/providers/DataProvider';
import { addDays } from '@/lib/dates';
import type { ServerSummary } from '@/lib/progress';
import type { Store } from '@/db/store';

export const SUMMARY_META_KEY = 'serverSummary';
/** Days of history requested (the contract caps ranges around a year). */
export const SUMMARY_DAYS = 365;

export function parseCachedSummary(raw: string | null): ServerSummary | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<ServerSummary>;
    if (typeof j.currentStreak !== 'number' || typeof j.longestStreak !== 'number' || !Array.isArray(j.days)) return null;
    return { currentStreak: j.currentStreak, longestStreak: j.longestStreak, days: j.days };
  } catch {
    return null;
  }
}

export async function loadCachedSummary(store: Pick<Store, 'getMeta'>): Promise<ServerSummary | null> {
  return parseCachedSummary(await store.getMeta(SUMMARY_META_KEY));
}

/** Fetches and caches the summary. `fetchSummary` is injected so it is unit-testable without React. */
export async function refreshServerSummary(
  store: Pick<Store, 'setMeta'>,
  fetchSummary: (from: string, to: string) => Promise<ServerSummary>,
  today: string,
): Promise<ServerSummary> {
  const s = await fetchSummary(addDays(today, -SUMMARY_DAYS), today);
  const slim: ServerSummary = {
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    days: s.days.map((d) => ({ localDate: d.localDate, completionPercent: d.completionPercent, successful: d.successful, restDay: d.restDay })),
  };
  await store.setMeta(SUMMARY_META_KEY, JSON.stringify(slim));
  return slim;
}

/** Latest server summary for a viewer (cached copy while offline / loading); null for owners and when nothing is cached yet. */
export function useServerSummary(enabled: boolean, today: string): ServerSummary | null {
  const { api } = useAuth();
  const { store, ready } = useData();
  const sync = useSyncStatus();
  const cache = useQuery({ queryKey: ['store', 'serverSummaryCache'], queryFn: () => loadCachedSummary(store), enabled: enabled && ready, staleTime: Infinity });
  const live = useQuery({
    queryKey: ['serverSummary', today, sync.lastSyncedAt],
    queryFn: () => refreshServerSummary(store, (f, t) => api.getStats(f, t), today),
    enabled: enabled && ready,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
  if (!enabled) return null;
  return live.data ?? cache.data ?? null;
}
