import { habitGlyph } from '@/lib/habitIcon';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Segmented } from '@/components/Field';
import { StreakCard } from '@/components/StreakCard';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { ViewerBanner } from '@/components/ViewerBanner';
import { WeeklyProgressChart, type BarDatum } from '@/components/WeeklyProgressChart';
import { AppText, Button, Card, Loading, Row, Screen } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { addDays, dateRange, monthBounds, monthName, prettyDate, startOfWeek, WEEKDAY_SHORT, weekdayOf } from '@/lib/dates';
import { formatDuration } from '@/lib/format';
import { effectiveStatus, eligibleHabits } from '@/lib/scoring';
import { useAuth } from '@/providers/AuthProvider';
import { useData, useSyncStatus, useWorkouts } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useRouter } from 'expo-router';

export default function Progress() {
  const d = useDerived();
  const { workouts } = useWorkouts();
  const { theme } = useTheme();
  const router = useRouter();
  const { syncNow } = useData();
  const sync = useSyncStatus();
  const { isOwner } = useAuth();
  useSyncOnFocus();
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => {
    if (mode === 'week') {
      const from = addDays(startOfWeek(d.today), offset * 7);
      return { from, to: addDays(from, 6), title: `${prettyDate(from)} – ${prettyDate(addDays(from, 6))}` };
    }
    const [y, m] = d.today.split('-').map(Number);
    const idx = y * 12 + (m - 1) + offset;
    const yy = Math.floor(idx / 12);
    const mm = (idx % 12) + 1;
    const b = monthBounds(yy, mm);
    return { ...b, title: `${monthName(mm)} ${yy}` };
  }, [mode, offset, d.today]);

  const days = useMemo(() => dateRange(range.from, range.to), [range]);
  const bars: BarDatum[] = days.map((date) => {
    const s = d.scoreFor(date);
    const future = date > d.today;
    return { label: mode === 'week' ? WEEKDAY_SHORT[weekdayOf(date)] : '', percent: future ? 0 : s.completionPercent, successful: s.successful, muted: future || s.neutral };
  });
  const past = days.filter((x) => x <= d.today);
  const scored = past.map((x) => d.scoreFor(x)).filter((s) => !s.neutral);
  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + s.completionPercent, 0) / scored.length) : 0;
  const successDays = scored.filter((s) => s.successful).length;
  const inRange = workouts.filter((w) => w.localDate >= range.from && w.localDate <= range.to);
  const wSecs = inRange.reduce((a, w) => a + w.durationSeconds, 0);

  const perHabit = d.activeHabits.map((h) => {
    let elig = 0;
    let done = 0;
    for (const date of past) {
      if (!eligibleHabits([h], date, d.timezone).length) continue;
      const st = effectiveStatus(h, d.logIndex.get(`${h.id}:${date}`));
      if (st === 'skipped') continue;
      elig++;
      if (st === 'complete') done++;
    }
    return { h, pct: elig ? Math.round((done / elig) * 100) : null };
  });

  const summaryLabel = `${mode === 'week' ? 'Weekly' : 'Monthly'} completion chart for ${range.title}. Average ${avg} percent, ${successDays} days reached the goal.`;

  return (
    <Screen onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'}>
      <Row style={{ justifyContent: 'space-between' }}>
        <AppText variant="title" accessibilityRole="header">Progress</AppText>
        <SyncStatusChip onPress={() => router.push('/sync-issues')} />
      </Row>
      <ViewerBanner />
      {d.loading ? (
        <Loading />
      ) : d.logs.length === 0 ? (
        <EmptyState mood="thinking" title="Nothing to chart yet" message={isOwner ? 'Log a few habits and your progress will bloom here.' : 'No progress has been logged yet.'} />
      ) : (
        <>
          <Segmented label="Range" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={mode} onChange={(v) => { setMode(v); setOffset(0); }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Button title="‹" variant="secondary" onPress={() => setOffset((o) => o - 1)} accessibilityLabel="Previous period" style={{ paddingHorizontal: spacing.lg }} />
            <AppText variant="bodyStrong" style={{ flex: 1, textAlign: 'center' }} accessibilityLiveRegion="polite">{range.title}</AppText>
            <Button title="›" variant="secondary" disabled={offset >= 0} onPress={() => setOffset((o) => o + 1)} accessibilityLabel="Next period" style={{ paddingHorizontal: spacing.lg }} />
          </Row>
          <Card>
            <WeeklyProgressChart data={bars} threshold={d.threshold} summaryLabel={summaryLabel} showLabels={mode === 'week'} />
            <Row style={{ justifyContent: 'space-around', marginTop: spacing.md }}>
              <Stat label="Average" value={`${avg}%`} />
              <Stat label="Goal days" value={`${successDays}/${scored.length}`} />
              <Stat label="Workouts" value={`${inRange.length}`} />
              <Stat label="Active time" value={formatDuration(wSecs)} />
            </Row>
          </Card>
          <StreakCard current={d.currentStreak} longest={d.longestStreak} />
          <AppText variant="heading" accessibilityRole="header">By habit</AppText>
          <Card style={{ gap: spacing.md }}>
            {perHabit.map(({ h, pct }) => (
              <View key={h.id} accessible accessibilityLabel={`${h.title}: ${pct === null ? 'no data' : pct + ' percent'}`}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{habitGlyph(h.icon)} {h.title}</AppText>
                  <AppText variant="label" accent>{pct === null ? '—' : `${pct}%`}</AppText>
                </Row>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.colors.tint, marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${pct ?? 0}%`, height: '100%', backgroundColor: theme.colors.primary }} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="heading" accent>{value}</AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}
