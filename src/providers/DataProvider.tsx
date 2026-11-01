import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { MemoryStore } from '@/db/memoryStore';
import { SqliteStore } from '@/db/sqliteStore';
import type { Store } from '@/db/store';
import { defaultSettings } from '@/lib/defaults';
import { deviceTimezone } from '@/lib/dates';
import { uuid } from '@/lib/ids';
import { getReminderModes, getReminderVolumes } from '@/features/reminderModes';
import { nativeAlarmApi } from '@/notifications/alarmAdapter';
import { expoNotifApi } from '@/notifications/expoAdapter';
import { syncReminders, type SyncResult } from '@/notifications/scheduler';
import { SyncEngine, type SyncStatus } from '@/sync/engine';
import { livePeriods } from '@/lib/cycle';
import type { DailyLog, EntityType, Habit, Period, Settings, Workout } from '@/types/api';
import { useAuth } from './AuthProvider';

interface Ctx {
  store: Store;
  engine: SyncEngine;
  ready: boolean;
  scheduleSync: (delayMs?: number) => void;
  syncNow: () => Promise<void>;
  reminderStatus: SyncResult | null;
  /** Re-run reminder scheduling; pass askPermission=true from a user gesture, and askAlarmPermission=true only when the user chose Loud alarm. */
  refreshReminders: (askPermission?: boolean, askAlarmPermission?: boolean) => Promise<SyncResult | null>;
}
const DataCtx = createContext<Ctx | null>(null);

const asyncStorage = {
  get: (k: string) => AsyncStorage.getItem('bubu.' + k),
  set: (k: string, v: string | null) => (v === null ? AsyncStorage.removeItem('bubu.' + k) : AsyncStorage.setItem('bubu.' + k, v)),
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, api, updateUser } = useAuth();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const store = useMemo<Store>(() => {
    try {
      return new SqliteStore();
    } catch {
      return new MemoryStore();
    }
  }, []);
  const roleRef = useRef(user?.role ?? null);
  roleRef.current = user?.role ?? null;
  const deviceIdRef = useRef('device');
  const engine = useMemo(() => new SyncEngine(store, api, { deviceId: 'pending', getRole: () => roleRef.current }), [store, api]);
  // engine opts is read at call time; patch deviceId once known
  const [reminderStatus, setReminderStatus] = useState<SyncResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await store.init();
      const owner = await store.getMeta('cacheUserId');
      if (owner && user && owner !== user.id) await store.clearAll();
      if (user) await store.setMeta('cacheUserId', user.id);
      let dev = await store.getMeta('deviceId');
      if (!dev) {
        dev = uuid();
        await store.setMeta('deviceId', dev);
      }
      deviceIdRef.current = dev;
      engine.setDeviceId(dev);
      await engine.refreshStatus();
      if (!cancelled) setReady(true);
      void engine.sync();
    })().catch((e) => {
      console.warn('Could not open the local database', e);
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, engine, user?.id]);

  useEffect(() => store.subscribe(() => void qc.invalidateQueries({ queryKey: ['store'] })), [store, qc]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSync = useCallback(
    (delayMs = 400) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void engine.sync(), delayMs);
    },
    [engine],
  );
  const syncNow = useCallback(() => engine.sync(), [engine]);

  const settingsRef = useRef<Settings | null>(null);
  const refreshReminders = useCallback(
    async (askPermission = false, askAlarmPermission = false) => {
      if (!user || user.role !== 'owner') return null; // reminders are for the habit owner
      const s = settingsRef.current ?? defaultSettings();
      try {
        const [modes, volumes] = await Promise.all([getReminderModes(user.id), getReminderVolumes(user.id)]);
        const r = await syncReminders({ api: expoNotifApi, storage: asyncStorage, reminders: s.reminders, timezone: deviceTimezone(), askPermission, modes, volumes, alarmApi: nativeAlarmApi, askAlarmPermission });
        setReminderStatus(r);
        return r;
      } catch {
        return null;
      }
    },
    [user],
  );
  const settingsQuery = useQuery({ queryKey: ['store', 'settings'], queryFn: () => store.getAll<Settings>('settings'), enabled: ready });
  const settingsSig = JSON.stringify(settingsQuery.data?.[0]?.reminders ?? null);
  useEffect(() => {
    settingsRef.current = settingsQuery.data?.[0] ?? null;
    if (ready) void refreshReminders(false);
  }, [settingsSig, ready, refreshReminders, settingsQuery.data]);

  useEffect(() => {
    const checkTimezone = async () => {
      const tz = deviceTimezone();
      if (user && tz !== user.timezone) {
        try {
          updateUser(await api.patchMe({ timezone: tz }));
        } catch {
          /* offline; retried next foreground */
        }
      }
      void refreshReminders(false); // signature includes timezone => reschedules only when it changed
    };
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        void engine.sync();
        void checkTimezone();
      }
    });
    const net = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      engine.setOffline(!online);
      if (online) void engine.sync();
    });
    const iv = setInterval(async () => {
      const due = await engine.nextDueAt();
      if (due !== null && due <= Date.now()) void engine.sync();
    }, 10_000);
    void checkTimezone();
    return () => {
      sub.remove();
      net();
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, user?.id]);

  const value = useMemo(
    () => ({ store, engine, ready, scheduleSync, syncNow, reminderStatus, refreshReminders }),
    [store, engine, ready, scheduleSync, syncNow, reminderStatus, refreshReminders],
  );
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useData outside DataProvider');
  return c;
}

export function useEntities<T>(type: EntityType): { data: T[]; loading: boolean } {
  const { store, ready } = useData();
  const q = useQuery({ queryKey: ['store', type], queryFn: () => store.getAll<T>(type), enabled: ready });
  return { data: q.data ?? EMPTY, loading: !ready || q.isLoading };
}
const EMPTY: never[] = [];

export function useHabits() {
  const { data, loading } = useEntities<Habit>('habit');
  return { habits: useMemo(() => [...data].filter((h) => !h.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder), [data]), loading };
}
export function useLogs() {
  const { data, loading } = useEntities<DailyLog>('dailyLog');
  return { logs: data, loading };
}
export function useWorkouts() {
  const { data, loading } = useEntities<Workout>('workout');
  return { workouts: useMemo(() => data.filter((w) => !w.deletedAt), [data]), loading };
}
/** The owner's non-deleted periods, oldest first. Always empty for viewers (they never receive period data). */
export function usePeriods() {
  const { user } = useAuth();
  const { data, loading } = useEntities<Period>('period');
  const owner = user?.role === 'owner';
  return { periods: useMemo(() => (owner ? livePeriods(data) : []), [data, owner]), loading };
}
export function useSettings(): { settings: Settings; loading: boolean } {
  const { data, loading } = useEntities<Settings>('settings');
  return { settings: data[0] ?? defaultSettings(), loading };
}

export function useSyncStatus(): SyncStatus {
  const { engine } = useData();
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getStatus(),
    () => engine.getStatus(),
  );
}
