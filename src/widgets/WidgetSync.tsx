import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDerived } from '@/features/derived';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { buildSnapshot, publishSignedOut, publishSnapshot, type WidgetSnapshot } from './widgetData';

/**
 * Mounted inside DataProvider (signed-in only). Re-publishes the widget snapshot whenever its inputs change:
 * a habit log changes, a sync pull/push lands in SQLite, the day rolls over, or the theme changes (all flow through
 * useDerived / useTheme), and again whenever the app returns to the foreground. Renders nothing.
 * Viewer accounts see the owner's cached data, so they publish the same snapshot read-only.
 */
export function WidgetSync() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const d = useDerived();
  const latest = useRef<WidgetSnapshot | null>(null);

  const { today, timezone, todayScore, currentStreak, longestStreak, loading } = d;
  const role = user?.role ?? 'owner';
  useEffect(() => {
    if (loading) return;
    latest.current = buildSnapshot({ role, theme: theme.name, today, timezone, todayScore, currentStreak, longestStreak });
    void publishSnapshot(latest.current);
  }, [loading, role, theme.name, today, timezone, todayScore, currentStreak, longestStreak]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && latest.current) void publishSnapshot({ ...latest.current, updatedAt: Date.now() }, { force: true });
    });
    return () => sub.remove();
  }, []);

  return null;
}

/** Mounted in the root Shell: shows the "sign in" state on the widget as soon as the user is signed out. */
export function useWidgetSignedOut(status: 'loading' | 'signedOut' | 'signedIn', themeName: Parameters<typeof publishSignedOut>[0]) {
  useEffect(() => {
    if (status === 'signedOut') void publishSignedOut(themeName);
  }, [status, themeName]);
}
